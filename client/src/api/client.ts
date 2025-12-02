export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "/api";

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

async function requestWithAuth<T>(
    path: string,
    token: string,
    init: RequestInit = {}
): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (!token) {
        throw new Error("Для выполнения запроса нужен токен авторизации.");
    }

    headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
    });

    let data: any = null;
    try {
        data = await res.json();
    } catch {
        // тела может не быть — игнорируем
    }

    if (!res.ok) {
        const message =
            data && typeof data.error === "string"
                ? data.error
                : `Ошибка HTTP ${res.status} при запросе ${path}`;
        const error = new Error(message);
        // @ts-expect-error добавляем статус для удобства UI
        error.status = res.status;
        throw error;
    }

    return data as T;
}

/* ===== события ===== */

// Одна строка из /events (SELECT ... FROM events)
export interface ApiEventRow {
    id: number;
    title: string;
    category: string;
    startAt: string;
    endAt?: string | null;
    venue: string;
    price: number | null;
    description: string | null;
}

export function getEvents(): Promise<ApiEventRow[]> {
    return getJson<ApiEventRow[]>("/events");
}

export async function getEvent(id: number): Promise<ApiEventRow | null> {
    const rows = await getJson<ApiEventRow[]>(`/events/${id}`);
    return rows[0] ?? null;
}

/* ===== собаки ===== */

// Поля соответствуют /dogs и /chipped-dogs
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
    return getJson<ApiDog[]>("/dogs");
}

// Только чипированные (chip_number IS NOT NULL)
export function getChippedDogs(): Promise<ApiDog[]> {
    return getJson<ApiDog[]>("/dogs/chiped");
}

export interface ApiEventDogRow {
    dogId: number;
    dogName: string;
    breed: string;
    sex: "M" | "F";
    birthDate?: string | null;
    chipNumber?: string | null;
    photo?: string | null;
    ownerFullName: string;
    ownerCity: string | null;
    tags?: string[] | null;
    bio?: string | null;
}

export function getEventDogs(eventId: number): Promise<ApiEventDogRow[]> {
    return getJson<ApiEventDogRow[]>(`/event_dogs/${eventId}`);
}

export function registerDogForEvent(
    eventId: number,
    dogId: number,
    token: string
) {
    return requestWithAuth(`/events/${eventId}/dogs`, token, {
        method: "POST",
        body: JSON.stringify({ dogId }),
    });
}

export function unregisterDogFromEvent(
    eventId: number,
    dogId: number,
    token: string
) {
    return requestWithAuth(`/events/${eventId}/dogs/${dogId}`, token, {
        method: "DELETE",
    });
}

/* ===== участники + их собаки ===== */

export interface ApiUserWithDogRow {
    memberId: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    avatarUrl: string | null;
    ownerBio: string | null;
    joinDate: string | null;
    membershipEndDate: string | null;
    role: string;

    dogId: number | null;
    dogName: string | null;
    breed: string | null;
    sex: "M" | "F" | null;
    birthDate: string | null;
    chipNumber: string | null;
    dogPhoto: string | null;
    dogTags: string[] | null;
    dogBio: string | null;
}

export function getUsers(): Promise<ApiUserWithDogRow[]> {
    return getJson<ApiUserWithDogRow[]>("/members");
}

/* ===== обучающие программы для собак ===== */

export interface ApiProgramRow {
    id: number;
    title: string;
    type: string;                // "Персональная", "Групповая"
    price: number | null;
    description: string | null;
    registeredDogsCount: number;
}

export function getPrograms(): Promise<ApiProgramRow[]> {
    return getJson<ApiProgramRow[]>("/programs");
}

export interface ApiProgramDogRow {
    dogId: number;
    dogName: string;
    breed: string;
    sex: "M" | "F";
    birthDate?: string | null;
    chipNumber?: string | null;
    photo?: string | null;
    ownerFullName: string;
    ownerCity: string | null;
    tags?: string[] | null;
    bio?: string | null;
}

export function getProgramDogs(programId: number): Promise<ApiProgramDogRow[]> {
    return getJson<ApiProgramDogRow[]>(`/program_dogs/${programId}`);
}

export function registerDogForProgram(
    programId: number,
    dogId: number,
    token: string
) {
    return requestWithAuth(`/programs/${programId}/dogs`, token, {
        method: "POST",
        body: JSON.stringify({ dogId }),
    });
}

export function unregisterDogFromProgram(
    programId: number,
    dogId: number,
    token: string
) {
    return requestWithAuth(`/programs/${programId}/dogs/${dogId}`, token, {
        method: "DELETE",
    });
}

/* ===== тренинги для людей ===== */

// по структуре такие же, как события, поэтому используем тот же тип
export type ApiPeopleTrainingRow = ApiEventRow;

export function getPeopleTrainings(): Promise<ApiPeopleTrainingRow[]> {
    return getJson<ApiPeopleTrainingRow[]>("/people_events");
}

export function registerForTraining(
    trainingId: number,
    token: string,
    memberId?: number
) {
    const payload =
        typeof memberId === "number" ? { memberId } : {};
    return requestWithAuth(`/programs/${trainingId}/members`, token, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function unregisterFromTraining(
    trainingId: number,
    token: string,
    memberId?: number
) {
    const path =
        typeof memberId === "number"
            ? `/programs/${trainingId}/members/${memberId}`
            : `/programs/${trainingId}/members`;
    return requestWithAuth(path, token, {
        method: "DELETE",
    });
}

/* ===== участники события (владельцы) ===== */

export interface ApiEventMemberRow {
    memberId: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    avatarUrl: string | null;
    bio: string | null;
    joinDate: string | null;
    membershipEndDate: string | null;
    role: string;
}

export function getEventMembers(eventId: number): Promise<ApiEventMemberRow[]> {
    return getJson<ApiEventMemberRow[]>(`/event_members/${eventId}`);
}