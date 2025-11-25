const API_BASE_URL = "http://localhost:5000";

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
    const rows = await getJson<ApiEventRow[]>(`/event/${id}`);
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
    return getJson<ApiDog[]>("/chiped");
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
    return getJson<ApiProgramDogRow[]>(`"/program_dogs/${programId}"`.slice(1, -1));
}

/* ===== тренинги для людей ===== */

// по структуре такие же, как события, поэтому используем тот же тип
export type ApiPeopleTrainingRow = ApiEventRow;

export function getPeopleTrainings(): Promise<ApiPeopleTrainingRow[]> {
    return getJson<ApiPeopleTrainingRow[]>("/people_events");
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