import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

const ACCESS_TOKEN_KEY = "doghub_access_token";
const ACCESS_TOKEN_EXPIRES_KEY = "doghub_access_token_expires_at";
const AUTH_USER_KEY = "doghub_user";

export interface AuthUser {
    [key: string]: unknown;
}

interface LoginPayload {
    user: AuthUser;
    token: string;
    expiresAt?: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (payload: LoginPayload) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Инициализация из localStorage при загрузке приложения
    useEffect(() => {
        try {
            const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
            const storedUser = localStorage.getItem(AUTH_USER_KEY);

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.error("Не удалось прочитать данные авторизации из localStorage:", e);
        }
    }, []);

    const login = ({ user, token, expiresAt }: LoginPayload) => {
        setUser(user);
        setToken(token);

        try {
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
            if (expiresAt) {
                localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, expiresAt);
            } else {
                localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
            }
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        } catch (e) {
            console.error("Не удалось сохранить данные авторизации в localStorage:", e);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);

        try {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
        } catch (e) {
            console.error("Не удалось очистить localStorage при выходе:", e);
        }
    };

    const value: AuthContextValue = {
        user,
        token,
        isAuthenticated: !!user && !!token,
        login,
        logout,
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