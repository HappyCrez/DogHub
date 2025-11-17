// src/types.ts

// Порода собаки в витринной модели фронта.
export type Breed =
    | "labrador"
    | "husky"
    | "bulldog"
    | "beagle"
    | "poodle"
    | "shepherd"
    | "mixed"
    | "cocker";

export type Sex = "M" | "F";

// Витринная модель собаки на фронте.
// Позже можно будет маппить сюда данные с сервера.
export interface Dog {
    id: string;
    name: string;
    breed: Breed;
    ageMonths: number;
    sex: Sex;
    weightKg?: number;
    tags?: string[];
    photos: string[];    // хотя бы один URL
    ownerId?: string;
    bio?: string;
}

// Тип события в UI.
// Мы будем маппить сюда ответ API (/api/events) из ApiEvent.
export type EventType = "meetup" | "training" | "show";

export interface Event {
    id: string;
    title: string;
    dateISO: string;     // ISO-строка даты/времени
    place: string;
    type: EventType;
    description?: string;
}

// Витринная модель участника клуба.
// Позже можно адаптировать сюда ответ с /api/users.
export interface Member {
    id: string;
    name: string;
    city: string;
    joinedISO: string;   // дата вступления в формате ISO (YYYY-MM-DD)
    dogName: string;
    dogBreed: string;
    avatar: string;
    online?: boolean;
    bio?: string;
}
