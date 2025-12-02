import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { refreshSessionRequest, logoutRequest } from "../api/auth";
import { setAuthRefreshHandler } from "./tokenRefresher";

const ACCESS_TOKEN_KEY = "doghub_access_token";
const ACCESS_TOKEN_EXPIRES_KEY = "doghub_access_token_expires_at";
const AUTH_USER_KEY = "doghub_user";

export interface AuthUser {
    [key: string]: unknown;
}

interface LoginPayload {
    user: AuthUser;
    token: string;
    accessTokenExpiresAt?: string | null;
}

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isReady: boolean;
    login: (payload: LoginPayload) => void;
    logout: () => void;
    updateUser: (updates: Partial<AuthUser>) => void;
    refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const tokenRef = useRef<string | null>(null);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
    const refreshSessionRef = useRef<(() => Promise<boolean>) | null>(null);

    const clearTimer = () => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    };

    const persistAuthState = useCallback(
        (nextUser: AuthUser, nextToken: string, expiresAt?: string | null) => {
            setUser(nextUser);
            setToken(nextToken);
            tokenRef.current = nextToken;

            try {
                localStorage.setItem(ACCESS_TOKEN_KEY, nextToken);
                if (expiresAt) {
                    localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, expiresAt);
                } else {
                    localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
                }
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
            } catch (e) {
                console.error("Не удалось сохранить данные авторизации в localStorage:", e);
            }
        },
        []
    );

    const clearAuthState = useCallback(() => {
        setUser(null);
        setToken(null);
        tokenRef.current = null;
        clearTimer();

        try {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
        } catch (e) {
            console.error("Не удалось очистить localStorage при выходе:", e);
        }
    }, []);

    const scheduleNextRefresh = useCallback((expiresAt?: string | null) => {
        clearTimer();
        if (!expiresAt) return;

        const timestamp = Date.parse(expiresAt);
        if (Number.isNaN(timestamp)) return;

        const delay = Math.max(timestamp - Date.now() - 60_000, 5_000);
        if (delay <= 0) {
            refreshSessionRef.current?.();
            return;
        }

        refreshTimerRef.current = window.setTimeout(() => {
            refreshSessionRef.current?.();
        }, delay);
    }, []);

    const applySession = useCallback(
        ({ user, token, accessTokenExpiresAt }: LoginPayload) => {
            persistAuthState(user, token, accessTokenExpiresAt ?? null);
            scheduleNextRefresh(accessTokenExpiresAt ?? null);
        },
        [persistAuthState, scheduleNextRefresh]
    );

    const refreshSession = useCallback(async () => {
        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        const promise = (async () => {
            try {
                const data = await refreshSessionRequest();
                applySession({
                    user: data.user,
                    token: data.accessToken,
                    accessTokenExpiresAt: data.accessTokenExpiresAt,
                });
                return true;
            } catch (error) {
                console.warn("Не удалось обновить сессию:", error);
                clearAuthState();
                return false;
            } finally {
                refreshPromiseRef.current = null;
            }
        })();

        refreshPromiseRef.current = promise;
        return promise;
    }, [applySession, clearAuthState]);

    useEffect(() => {
        refreshSessionRef.current = refreshSession;
        return () => {
            if (refreshSessionRef.current === refreshSession) {
                refreshSessionRef.current = null;
            }
        };
    }, [refreshSession]);

    // Инициализация из localStorage при загрузке приложения
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
                const storedUserRaw = localStorage.getItem(AUTH_USER_KEY);
                const storedExpires = localStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY);

                if (storedToken && storedUserRaw) {
                    const parsedUser: AuthUser = JSON.parse(storedUserRaw);
                    persistAuthState(parsedUser, storedToken, storedExpires);

                    const isExpired =
                        storedExpires && !Number.isNaN(Date.parse(storedExpires))
                            ? Date.parse(storedExpires) <= Date.now()
                            : false;

                    if (isExpired) {
                        await refreshSession();
                    } else {
                        scheduleNextRefresh(storedExpires);
                    }
                } else {
                    await refreshSession();
                }
            } catch (e) {
                console.error("Не удалось прочитать данные авторизации из localStorage:", e);
                await refreshSession();
            } finally {
                if (!cancelled) {
                    setIsReady(true);
                }
            }
        };

        init();
        return () => {
            cancelled = true;
            clearTimer();
        };
    }, [persistAuthState, refreshSession, scheduleNextRefresh]);

    useEffect(() => {
        const handler = async () => {
            const success = await refreshSession();
            return success ? tokenRef.current : null;
        };
        setAuthRefreshHandler(handler);
        return () => setAuthRefreshHandler(null);
    }, [refreshSession]);

    const login = useCallback(
        (payload: LoginPayload) => {
            applySession(payload);
        },
        [applySession]
    );

    const logout = useCallback(() => {
        clearAuthState();
        logoutRequest().catch((error) => {
            console.error("Ошибка при выходе:", error);
        });
    }, [clearAuthState]);

    const updateUser = useCallback((updates: Partial<AuthUser>) => {
        if (!updates || typeof updates !== "object") return;

        setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...updates };
            try {
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
            } catch (e) {
                console.error("Не удалось обновить данные пользователя в localStorage:", e);
            }
            return next;
        });
    }, []);

    const value: AuthContextValue = {
        user,
        token,
        isAuthenticated: !!user && !!token,
        isReady,
        login,
        logout,
        updateUser,
        refresh: refreshSession,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth должен использоваться внутри <AuthProvider>");
    }
    return ctx;
}