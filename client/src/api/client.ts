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

// Одна строка из /api/events (SELECT ... FROM events)
export interface ApiEventRow {
    id: number;
    title: string;
    category: string;
    status: string;
    startAt: string;
    endAt?: string | null;
    venue: string;
    price: number | null;
    description: string | null;
}

export function getEvents(): Promise<ApiEventRow[]> {
    return getJson<ApiEventRow[]>("/api/events");
}

/* ===== собаки ===== */

// Поля соответствуют /api/dogs и /api/chipped-dogs
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
    return getJson<ApiDog[]>("/api/chiped");
}

/* ===== участники + их собаки ===== */

export interface ApiUserWithDogRow {
    userId: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    avatar: string | null;
    ownerBio: string | null;
    joinDate: string | null;
    membershipEndDate: string | null;
    role: string;

    // данные собаки (могут быть null, если у владельца пока нет собак в БД)
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
    return getJson<ApiUserWithDogRow[]>("/api/users");
}
