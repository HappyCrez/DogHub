import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getPeopleTrainings,
    getEventMembers,
    type ApiPeopleTrainingRow,
    type ApiEventMemberRow,
    registerForTraining,
    unregisterFromTraining,
} from "../api/client";
import EventCard from "../components/EventCard";
import MemberCard, { type MemberWithDogs } from "../components/MemberCard";
import { useAuth } from "../auth/AuthContext";
import { useCurrentMember } from "../hooks/useCurrentMember";

export default function PeopleTrainingDetails() {
    const { id } = useParams<{ id: string }>();

    const [training, setTraining] = useState<ApiPeopleTrainingRow | null>(null);
    const [participants, setParticipants] = useState<ApiEventMemberRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);
    const [unregistering, setUnregistering] = useState(false);

    const trainingId = useMemo(
        () => (id ? Number(id) : NaN),
        [id]
    );

    const { token, isAuthenticated } = useAuth();
    const {
        member: currentMember,
        loading: memberLoading,
        error: memberError,
    } = useCurrentMember();

    useEffect(() => {
        if (!id || Number.isNaN(trainingId)) return;
        let cancelled = false;

        setLoading(true);
        setError(null);

        Promise.all([getPeopleTrainings(), getEventMembers(trainingId)])
            .then(([allTrainings, members]) => {
                if (cancelled) return;

                const tr = allTrainings.find((t) => t.id === trainingId) ?? null;
                setTraining(tr);
                setParticipants(members);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Не удалось загрузить данные о тренинге"
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, trainingId]);

    const refreshParticipants = useCallback(async () => {
        if (Number.isNaN(trainingId)) return;
        try {
            const updated = await getEventMembers(trainingId);
            setParticipants(updated);
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Не удалось обновить список участников."
            );
        }
    }, [trainingId]);

    const userIsRegistered = useMemo(() => {
        if (!currentMember) return false;
        return participants.some((m) => m.memberId === currentMember.id);
    }, [participants, currentMember]);

    async function handleRegister() {
        if (!token) {
            setActionError("Авторизуйтесь, чтобы записаться на тренинг.");
            return;
        }
        if (Number.isNaN(trainingId)) return;

        setRegistering(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            await registerForTraining(trainingId, token);
            setActionSuccess("Вы записаны на тренинг.");
            await refreshParticipants();
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Не удалось записаться. Попробуйте ещё раз."
            );
        } finally {
            setRegistering(false);
        }
    }

    async function handleUnregister() {
        if (!token) {
            setActionError("Авторизуйтесь, чтобы управлять записями.");
            return;
        }
        if (Number.isNaN(trainingId)) return;

        setUnregistering(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            await unregisterFromTraining(trainingId, token);
            setActionSuccess("Вы отменили участие в тренинге.");
            await refreshParticipants();
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Не удалось отменить участие."
            );
        } finally {
            setUnregistering(false);
        }
    }

    const membersForCards = useMemo<MemberWithDogs[]>(() => {
        return participants.map((m) => ({
            id: m.memberId,
            fullName: m.fullName,
            city: m.city,
            avatar: m.avatarUrl ?? undefined,
            bio: m.bio ?? undefined,
            phone: m.phone ?? undefined,
            email: m.email ?? undefined,
            joinDate: m.joinDate ?? undefined,
            membershipEndDate: m.membershipEndDate ?? undefined,
            dogs: [],
        }));
    }, [participants]);

    const isTrainingPast = useMemo(() => {
        if (!training) return false;
        const dateStr = training.endAt ?? training.startAt;
        const dt = dateStr ? new Date(dateStr) : null;
        return dt ? dt.getTime() < Date.now() : false;
    }, [training]);

    if (!id || Number.isNaN(trainingId)) {
        return (
            <section>
                <p className="text-sm text-red-600">
                    Некорректный идентификатор тренинга.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к разделу «Обучение»
                    </Link>
                </p>
            </section>
        );
    }

    if (loading) {
        return (
            <section>
                <p className="text-gray-600">Загружаем тренинг…</p>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <p className="text-sm text-red-600">{error}</p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к разделу «Обучение»
                    </Link>
                </p>
            </section>
        );
    }

    if (!training) {
        return (
            <section>
                <p className="text-gray-600">
                    Тренинг не найден. Возможно, он относится к другому разделу.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к разделу «Обучение»
                    </Link>
                </p>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <Link
                    to="/training"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                >
                    ← Обучение
                </Link>
            </div>

            {/* карточка самого тренинга */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <EventCard ev={training} />
            </div>

            {/* моё участие */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Моё участие</h2>
                    {currentMember && (
                        <span className="text-xs text-gray-500">
                            {userIsRegistered ? "Вы записаны" : "Вы ещё не участвуете"}
                        </span>
                    )}
                </div>

                {isTrainingPast ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                        <p className="font-semibold">Тренинг уже прошёл</p>
                        <p className="text-amber-800/80">
                            Запись и отмена недоступны. Следите за расписанием, чтобы не пропустить новые мероприятия.
                        </p>
                    </div>
                ) : !isAuthenticated ? (
                    <p className="text-sm text-gray-600">
                        <Link
                            to="/auth"
                            className="text-amber-700 underline-offset-2 hover:underline"
                        >
                            Войдите
                        </Link>
                        , чтобы оставлять заявки на тренинги.
                    </p>
                ) : memberLoading ? (
                    <p className="text-sm text-gray-600">
                        Загружаем данные профиля…
                    </p>
                ) : memberError ? (
                    <p className="text-sm text-red-600">{memberError}</p>
                ) : !currentMember ? (
                    <p className="text-sm text-gray-600">
                        Не удалось определить ваш профиль участника. Попробуйте
                        обновить страницу.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {actionError && (
                            <p className="text-xs text-red-600">{actionError}</p>
                        )}
                        {actionSuccess && (
                            <p className="text-xs text-emerald-600">
                                {actionSuccess}
                            </p>
                        )}

                        {userIsRegistered ? (
                            <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
                                <p>
                                    Вы записаны на этот тренинг как{" "}
                                    <span className="font-semibold">
                                        {currentMember.fullName}
                                    </span>
                                    .
                                </p>
                                <button
                                    type="button"
                                    onClick={handleUnregister}
                                    disabled={unregistering || !token}
                                    className="inline-flex items-center justify-center rounded-xl border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                                >
                                    {unregistering
                                        ? "Отменяем участие…"
                                        : "Отменить участие"}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-gray-700">
                                    Нажмите кнопку ниже, чтобы записаться на тренинг.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleRegister}
                                    disabled={registering || !token}
                                    className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                    {registering ? "Записываем…" : "Записаться"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* участники тренинга */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">Участники тренинга</h2>
                    <span className="text-xs text-gray-500">
                        Найдено: {membersForCards.length}
                    </span>
                </div>

                {membersForCards.length === 0 ? (
                    <p className="text-gray-600">
                        На этот тренинг пока никто не записан.
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {membersForCards.map((m) => (
                            <MemberCard key={m.id} member={m} showDogs={false} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}