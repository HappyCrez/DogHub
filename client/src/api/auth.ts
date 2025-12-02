import { API_BASE_URL } from "./client";
import type { AuthUser } from "../auth/AuthContext";

export interface LoginResponse {
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt?: string;
    user: AuthUser;
}

export interface RegisterResponse {
    user: AuthUser;
}

export interface LoginPayload {
    email: string;
    passwordHash: string;
}

export interface RegisterPayload {
    fullName: string;
    email: string;
    phone?: string | null;
    city?: string | null;
    passwordHash: string;
}

async function postAuthJson<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
    });

    let data: any = null;
    try {
        data = await res.json();
    } catch {
        // ignore
    }

    if (!res.ok) {
        const message =
            data && typeof data.error === "string"
                ? data.error
                : "Ошибка при обращении к серверу авторизации";
        throw new Error(message);
    }

    return data as T;
}

export function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
    return postAuthJson<LoginResponse>("/auth/login", payload);
}

export function registerRequest(payload: RegisterPayload): Promise<RegisterResponse> {
    return postAuthJson<RegisterResponse>("/auth/register", payload);
}

export function refreshSessionRequest(): Promise<LoginResponse> {
    return postAuthJson<LoginResponse>("/auth/refresh");
}

export async function logoutRequest(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!res.ok && res.status !== 401) {
        let message = `Ошибка выхода (HTTP ${res.status})`;
        try {
            const data = await res.json();
            if (data && typeof data.error === "string") {
                message = data.error;
            }
        } catch {
            // ignore
        }
        throw new Error(message);
    }
}

