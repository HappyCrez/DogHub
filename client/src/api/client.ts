// src/api/client.ts

const API_BASE_URL = "http://localhost:5055";

async function getJson<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "GET",
        headers: { Accept: "application/json" },
    });

    if (!res.ok) {
        throw new Error(`Ошибка HTTP ${res.status} при запросе ${path}`);
    }

    return res.json() as Promise<T>;
}

/* ===== события ===== */

export interface ApiEvent {
    id: number;
    title: string;
    category: string;
    status: string;
    startAt: string;
    endAt?: string | null;
    venue: string;
    price?: number | null;
    description?: string | null;
}

export function getEvents(): Promise<ApiEvent[]> {
    return getJson<ApiEvent[]>("/api/events");
}

/* ===== собаки ===== */

// Поля соответствуют get_dogs / get_chiped
export interface ApiDog {
    dogId: number;
    dogName: string;
    breed: string;
    sex: "M" | "F";
    birthDate?: string | null;
    chipNumber?: string | null;
    photo?: string | null;
    tags?: string[] | null;
    bio?: string | null;
    ownerName: string;
    ownerPhone?: string | null;
    ownerEmail?: string | null;
}

// Все собаки (чипированные и нет)
export function getDogs(): Promise<ApiDog[]> {
    return getJson<ApiDog[]>("/api/dogs");
}

// Только чипированные (chip_number IS NOT NULL)
export function getChippedDogs(): Promise<ApiDog[]> {
    return getJson<ApiDog[]>("/api/chipped-dogs");
}