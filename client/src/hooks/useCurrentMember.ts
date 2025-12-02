import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, type AuthUser } from "../auth/AuthContext";
import { getUsers, type ApiUserWithDogRow } from "../api/client";
import { groupUsers } from "../utils/members";
import type { MemberDog, MemberWithDogs } from "../components/MemberCard";

let cachedMembers: MemberWithDogs[] | null = null;
let cachedForMemberId: number | null = null;
let inflightPromise: Promise<MemberWithDogs[]> | null = null;

function resetCache() {
    cachedMembers = null;
    cachedForMemberId = null;
    inflightPromise = null;
}

function extractMemberId(user: AuthUser | null): number | null {
    if (!user) return null;
    const anyUser = user as Record<string, unknown>;

    const possibleId =
        anyUser.memberId ??
        anyUser.member_id ??
        anyUser.id;

    if (typeof possibleId === "number") return possibleId;
    if (typeof possibleId === "string") {
        const parsed = Number(possibleId);
        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
}

async function fetchMembers(
    memberId: number,
    force = false
): Promise<MemberWithDogs[]> {
    if (!force && cachedMembers && cachedForMemberId === memberId) {
        return cachedMembers;
    }

    if (!force && inflightPromise) {
        return inflightPromise;
    }

    inflightPromise = getUsers()
        .then((rows: ApiUserWithDogRow[]) => groupUsers(rows))
        .then((members) => {
            cachedMembers = members;
            cachedForMemberId = memberId;
            return members;
        })
        .finally(() => {
            inflightPromise = null;
        });

    return inflightPromise;
}

export interface UseCurrentMemberResult {
    member: MemberWithDogs | null;
    dogs: MemberDog[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useCurrentMember(): UseCurrentMemberResult {
    const { user, isAuthenticated } = useAuth();
    const [member, setMember] = useState<MemberWithDogs | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    const memberId = useMemo(() => extractMemberId(user), [user]);

    useEffect(() => {
        if (!isAuthenticated || memberId == null) {
            setMember(null);
            setError(null);
            setLoading(false);
            resetCache();
            return;
        }

        const ensuredMemberId = memberId;

        if (cachedMembers && cachedForMemberId !== ensuredMemberId) {
            resetCache();
        }

        let cancelled = false;

        async function load(force = false) {
            setLoading(true);
            setError(null);

            try {
                const members = await fetchMembers(ensuredMemberId, force);
                if (cancelled) return;

                const current =
                    members?.find((m) => m.id === ensuredMemberId) ?? null;

                setMember(current);
            } catch (err) {
                if (cancelled) return;
                console.error(err);
                setMember(null);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Не удалось получить данные пользователя."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        const hasCache = cachedMembers && cachedForMemberId === ensuredMemberId;
        load(!hasCache);

        return () => {
            cancelled = true;
        };
    }, [memberId, isAuthenticated, reloadToken]);

    const refresh = useCallback(() => {
        if (memberId == null) return;
        resetCache();
        setReloadToken((v) => v + 1);
    }, [memberId]);

    const dogs = member?.dogs ?? [];

    return {
        member,
        dogs,
        loading,
        error,
        refresh,
    };
}

