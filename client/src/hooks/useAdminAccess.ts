import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";

export function useAdminAccess() {
    const { user, token, isAuthenticated } = useAuth();

    const role = useMemo(() => {
        if (!user) return null;
        const anyUser = user as Record<string, unknown>;
        const rawRole = anyUser.role ?? anyUser["Role"];
        return typeof rawRole === "string" ? rawRole : null;
    }, [user]);

    const isAdmin = role === "Администратор";

    return {
        isAdmin: Boolean(isAdmin && isAuthenticated),
        token,
        role,
    };
}

