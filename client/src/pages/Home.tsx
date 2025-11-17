import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { EventType, Event as UiEvent } from "../types";
import { MEMBERS } from "../data/members";
import {
    getEvents,
    getDogs,
    type ApiEvent,
    type ApiDog,
} from "../api/client";
import AboutClub from "../components/AboutClub";

/* ===== helpers ===== */

function typeLabel(t: EventType) {
    return t === "meetup" ? "Встреча" : t === "training" ? "Тренировка" : "Шоу";
}

function formatDate(iso: string) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
    })
        .format(d)
        .replace(",", "");
}

// Маппинг категории из БД -> тип события во фронте
function mapCategoryToType(category: string): EventType {
    const c = category.toLowerCase();
    if (c.includes("выстав")) return "show"; // Выставка
    if (c.includes("спорт") || c.includes("трен")) return "training";
    return "meetup"; // остальное считаем встречами
}

// Маппинг объекта с сервера к фронтовому типу Event
function mapApiEventToUi(ev: ApiEvent): UiEvent {
    return {
        id: String(ev.id),
        title: ev.title,
        dateISO: ev.startAt,
        place: ev.venue,
        type: mapCategoryToType(ev.category),
        description: ev.description ?? undefined,
    };
}

/* ===== page ===== */

export default function Home() {
    const [events, setEvents] = useState<UiEvent[]>([]);
    const [dogs, setDogs] = useState<ApiDog[]>([]);

    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingDogs, setLoadingDogs] = useState(true);

    const [eventsError, setEventsError] = useState<string | null>(null);
    const [dogsError, setDogsError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        // события
        getEvents()
            .then((apiEvents) => {
                if (cancelled) return;
                const mapped = apiEvents
                    .map(mapApiEventToUi)
                    .sort(
                        (a, b) => +new Date(a.dateISO) - +new Date(b.dateISO)
                    );
                setEvents(mapped);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) setEventsError("Не удалось загрузить события с сервера.");
            })
            .finally(() => {
                if (!cancelled) setLoadingEvents(false);
            });

        // собаки
        getDogs()
            .then((apiDogs) => {
                if (cancelled) return;
                setDogs(apiDogs);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) setDogsError("Не удалось загрузить данные о собаках.");
            })
            .finally(() => {
                if (!cancelled) setLoadingDogs(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const now = Date.now();

    const upcomingAll = useMemo(
        () => events.filter((e) => +new Date(e.dateISO) >= now),
        [events, now]
    );
    const upcoming = useMemo(
        () => upcomingAll.slice(0, 2),
        [upcomingAll]
    );

    const dogOfTheDay = useMemo(() => {
        if (dogs.length === 0) return undefined;
        const start = new Date(new Date().getFullYear(), 0, 0).getTime();
        const dayOfYear = Math.floor((Date.now() - start) / 86_400_000);
        return dogs[dayOfYear % dogs.length];
    }, [dogs]);

    const online = useMemo(
        () => MEMBERS.filter((m) => m.online).slice(0, 3),
        []
    );

    const stats = {
        dogs: dogs.length,
        members: MEMBERS.length,
        upcoming: upcomingAll.length,
    };

    return (
        <section className="space-y-8">
            {/* hero */}
            <div className="rounded-3xl bg-gradient-to-r from-amber-100 to-orange-100 p-6 shadow-sm">
                <h1 className="text-4xl font-extrabold">
                    DogHub — клуб собаководов
                </h1>
                <p className="mt-2 max-w-2xl text-gray-700">
                    Встречи, тренировки и дружное сообщество для тех, кто любит собак.
                </p>
                <div className="mt-4 flex gap-2">
                    <Link
                        to="/events"
                        className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
                    >
                        События клуба
                    </Link>
                    <Link
                        to="/members"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 hover:bg-gray-100"
                    >
                        Участники клуба
                    </Link>
                </div>
            </div>

            {/* stats */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="text-3xl font-extrabold">
                        {stats.dogs}
                    </div>
                    <div className="text-sm text-gray-600">
                        пушистых друзей в базе
                    </div>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="text-3xl font-extrabold">
                        {stats.members}
                    </div>
                    <div className="text-sm text-gray-600">
                        участников клуба
                    </div>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="text-3xl font-extrabold">
                        {stats.upcoming}
                    </div>
                    <div className="text-sm text-gray-600">
                        ближайших событий
                    </div>
                </div>
            </div>

            {/* dog + events */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Собака дня */}
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-xl font-semibold">Собака дня</h2>
                        {/* ссылку "Все собаки →" убрали, т.к. страницы /dogs нет */}
                    </div>

                    {loadingDogs ? (
                        <p className="text-sm text-gray-600">
                            Загружаем собаку дня…
                        </p>
                    ) : dogsError ? (
                        <p className="text-sm text-red-600">{dogsError}</p>
                    ) : dogOfTheDay ? (
                        <div className="overflow-hidden rounded-2xl">
                            <div className="relative aspect-[4/3] w-full overflow-hidden">
                                <img
                                    src={
                                        dogOfTheDay.photo ??
                                        "https://via.placeholder.com/800x600?text=Dog"
                                    }
                                    alt={dogOfTheDay.dogName}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                            <div className="p-3">
                                <div className="flex items-baseline justify-between">
                                    <div className="text-lg font-semibold">
                                        {dogOfTheDay.dogName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {dogOfTheDay.breed}
                                    </div>
                                </div>

                                {dogOfTheDay.tags && dogOfTheDay.tags.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {dogOfTheDay.tags.map((t) => (
                                            <span
                                                key={t}
                                                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                                            >
                        #{t}
                      </span>
                                        ))}
                                    </div>
                                )}

                                {dogOfTheDay.bio && (
                                    <p className="mt-1 text-sm text-gray-700">
                                        {dogOfTheDay.bio}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-600">
                            Пока в базе нет собак.
                        </p>
                    )}
                </div>

                {/* Ближайшие события — с сервера */}
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-xl font-semibold">
                            Ближайшие события
                        </h2>
                        <Link
                            to="/events"
                            className="text-sm text-gray-600 hover:underline"
                        >
                            Все события →
                        </Link>
                    </div>

                    {loadingEvents ? (
                        <p className="text-sm text-gray-600">
                            Загружаем события…
                        </p>
                    ) : eventsError ? (
                        <p className="text-sm text-red-600">
                            {eventsError}
                        </p>
                    ) : upcoming.length > 0 ? (
                        <ul className="space-y-3">
                            {upcoming.map((ev) => (
                                <li
                                    key={ev.id}
                                    className="rounded-xl border border-gray-200 p-3"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {ev.title}
                    </span>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                      {typeLabel(ev.type)}
                    </span>
                                    </div>
                                    <div className="mt-1 text-sm text-gray-600">
                                        🗓️ {formatDate(ev.dateISO)} • 📍 {ev.place}
                                    </div>
                                    {ev.description && (
                                        <div className="mt-1 text-sm text-gray-700">
                                            {ev.description}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600">
                            Пока нет предстоящих событий.
                        </p>
                    )}
                </div>
            </div>

            {/* Онлайн участники — пока локальные */}
            <div className="rounded-2xl bg-white p-4 shadow">
                <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="text-xl font-semibold">
                        Онлайн участники
                    </h2>
                    <Link
                        to="/members"
                        className="text-sm text-gray-600 hover:underline"
                    >
                        Все участники →
                    </Link>
                </div>
                {online.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {online.map((m) => (
                            <div key={m.id} className="flex items-center gap-3">
                                <img
                                    src={m.avatar}
                                    alt={m.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                    loading="lazy"
                                />
                                <div>
                                    <div className="text-sm font-medium leading-none">
                                        {m.name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {m.city}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-600">
                        Сейчас никто не в сети.
                    </p>
                )}
            </div>

            <AboutClub />
        </section>
    );
}