import { tryRefreshAccessToken } from "../auth/tokenRefresher";

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
    if (!token) {
        throw new Error("Для выполнения запроса нужен токен авторизации.");
    }

    const send = async (bearer: string) => {
        const headers = new Headers(init.headers ?? {});
        if (!headers.has("Accept")) headers.set("Accept", "application/json");
        if (init.body && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
        headers.set("Authorization", `Bearer ${bearer}`);

        return fetch(`${API_BASE_URL}${path}`, {
            ...init,
            headers,
        });
    };

    let res = await send(token);

    if (res.status === 401) {
        const refreshedToken = await tryRefreshAccessToken();
        if (refreshedToken) {
            res = await send(refreshedToken);
        }
    }

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
    registeredCount?: number;
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

/* ===== услуги клуба ===== */

export interface ApiServiceType {
    id: number;
    name: string;
    price: number | null;
}

export interface ApiDogServiceRow {
    id: number;
    dogId: number;
    dogName: string;
    serviceTypeId: number;
    serviceName: string;
    requestedAt: string;
    performedAt?: string | null;
    price?: number | null;
    status: string;
}

export interface ApiDogServicesResponse {
    services: ApiDogServiceRow[];
    statusLabels: Record<string, string>;
}

export function getServiceTypes(): Promise<ApiServiceType[]> {
    return getJson<ApiServiceType[]>("/services/types");
}

export function getMyDogServices(token: string) {
    return requestWithAuth<ApiDogServicesResponse>("/services/my", token);
}

export interface BookDogServicePayload {
    dogId: number;
    serviceTypeId: number;
    requestedAt: string;
}

export function bookDogService(payload: BookDogServicePayload, token: string) {
    return requestWithAuth("/services/book", token, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function cancelDogService(serviceId: number, token: string) {
    return requestWithAuth(`/services/${serviceId}`, token, {
        method: "DELETE",
    });
}

export interface CreateDogPayload {
    name: string;
    breed: string;
    sex: "M" | "F";
    birthDate?: string | null;
    chipNumber?: string | null;
    photo?: string | null;
    bio?: string | null;
    tags?: string[] | null;
}

export interface ApiCreatedDog {
    id: number;
    memberId: number;
    name: string;
    breed: string;
    sex: "M" | "F";
    birthDate?: string | null;
    chipNumber?: string | null;
    photo?: string | null;
    bio?: string | null;
    tags?: string[] | null;
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

export interface UpsertEventPayload {
    title?: string;
    category?: string | null;
    startAt?: string;
    endAt?: string | null;
    venue?: string;
    price?: number | null;
    description?: string | null;
}

function serializeEventPayload(
    payload: UpsertEventPayload,
    options?: { omitCategory?: boolean }
): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (!options?.omitCategory && payload.category !== undefined) {
        body.category = payload.category;
    }
    if (payload.startAt !== undefined) body.start_at = payload.startAt;
    if (payload.endAt !== undefined) body.end_at = payload.endAt;
    if (payload.venue !== undefined) body.venue = payload.venue;
    if (payload.price !== undefined) body.price = payload.price;
    if (payload.description !== undefined) body.description = payload.description;
    return body;
}

export function createEvent(payload: UpsertEventPayload, token: string) {
    return requestWithAuth("/events", token, {
        method: "POST",
        body: JSON.stringify(serializeEventPayload(payload)),
    });
}

export function updateEvent(
    eventId: number,
    payload: UpsertEventPayload,
    token: string
) {
    return requestWithAuth(`/events/${eventId}`, token, {
        method: "PUT",
        body: JSON.stringify(serializeEventPayload(payload)),
    });
}

export function deleteEvent(eventId: number, token: string) {
    return requestWithAuth(`/events/${eventId}`, token, {
        method: "DELETE",
    });
}

export function createTraining(payload: UpsertEventPayload, token: string) {
    return requestWithAuth("/events/education", token, {
        method: "POST",
        body: JSON.stringify(serializeEventPayload(payload, { omitCategory: true })),
    });
}

export function updateTraining(
    trainingId: number,
    payload: UpsertEventPayload,
    token: string
) {
    return requestWithAuth(`/events/education/${trainingId}`, token, {
        method: "PUT",
        body: JSON.stringify(serializeEventPayload(payload, { omitCategory: true })),
    });
}

export function deleteTraining(trainingId: number, token: string) {
    return deleteEvent(trainingId, token);
}

export interface UpsertProgramPayload {
    title?: string;
    type?: string;
    price?: number | null;
    description?: string | null;
}

function serializeProgramPayload(payload: UpsertProgramPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.type !== undefined) body.type = payload.type;
    if (payload.price !== undefined) body.price = payload.price;
    if (payload.description !== undefined) body.description = payload.description;
    return body;
}

export function createProgram(payload: UpsertProgramPayload, token: string) {
    return requestWithAuth("/programs", token, {
        method: "POST",
        body: JSON.stringify(serializeProgramPayload(payload)),
    });
}

export function updateProgram(
    programId: number,
    payload: UpsertProgramPayload,
    token: string
) {
    return requestWithAuth(`/programs/${programId}`, token, {
        method: "PUT",
        body: JSON.stringify(serializeProgramPayload(payload)),
    });
}

export function deleteProgram(programId: number, token: string) {
    return requestWithAuth(`/programs/${programId}`, token, {
        method: "DELETE",
    });
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

export interface UploadAvatarResponse {
    avatarUrl: string;
}

export async function uploadAvatar(
    file: File,
    token: string
): Promise<UploadAvatarResponse> {
    if (!token) {
        throw new Error("Для загрузки фото нужен токен авторизации.");
    }

    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch(`${API_BASE_URL}/me/avatar`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
        body: formData,
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
                : `Ошибка загрузки аватара (HTTP ${res.status})`;
        throw new Error(message);
    }

    return data as UploadAvatarResponse;
}

export interface UploadDogPhotoResponse {
    photoUrl: string;
}

export async function uploadDogPhoto(
    file: File,
    token: string
): Promise<UploadDogPhotoResponse> {
    if (!token) {
        throw new Error("Для загрузки фото собаки нужен токен авторизации.");
    }

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch(`${API_BASE_URL}/me/dogs/photo`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
        body: formData,
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
                : `Ошибка загрузки фото собаки (HTTP ${res.status})`;
        throw new Error(message);
    }

    return data as UploadDogPhotoResponse;
}

function serializeDogPayload(payload: CreateDogPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
        name: payload.name,
        breed: payload.breed,
        sex: payload.sex,
    };

    if (payload.birthDate !== undefined) body.birthDate = payload.birthDate;
    if (payload.chipNumber !== undefined) body.chipNumber = payload.chipNumber;
    if (payload.photo !== undefined) body.photo = payload.photo;
    if (payload.bio !== undefined) body.bio = payload.bio;
    if (payload.tags !== undefined) body.tags = payload.tags;

    return body;
}

export function createDog(payload: CreateDogPayload, token: string) {
    return requestWithAuth<ApiCreatedDog>("/me/dogs", token, {
        method: "POST",
        body: JSON.stringify(serializeDogPayload(payload)),
    });
}