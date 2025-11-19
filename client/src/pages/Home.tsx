import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AboutClub from "../components/AboutClub";
import { getUsers, getEvents, type ApiUserWithDogRow } from "../api/client";

/* ===== types для событий ===== */

type EventRow = {
    id: number;
    title: string;
    category: string;
    status: string;
    startAt: string;
    endAt: string | null;
    venue: string;
    price: number | null;
    description: string | null;
};

type MemberSummary = {
    id: number;
    fullName: string;
    city: string | null;
    avatar: string | null;
    joinDate: string | null;
};

type DogShort = {
    id: number;
    name: string;
    breed: string | null;
    photo: string | null;
    bio: string | null;
};

/* ===== helpers ===== */

function formatEventDate(iso: string) {
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

function formatJoinShort(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { year: "numeric", month: "long" });
}

/* ===== компонент ===== */

export default function Home() {
    const [userRows, setUserRows] = useState<ApiUserWithDogRow[]>([]);
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getUsers(), getEvents()])
            .then(([usersData, eventsData]) => {
                if (cancelled) return;
                setUserRows(usersData);
                setEvents(eventsData as unknown as EventRow[]);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setError("Не удалось загрузить данные с сервера.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // сгруппированные участники (один раз на userId)
    const members: MemberSummary[] = useMemo(() => {
        const map = new Map<number, MemberSummary>();

        for (const row of userRows) {
            if (!map.has(row.memberId)) {
                map.set(row.memberId, {
                    id: row.memberId,
                    fullName: row.fullName,
                    city: row.city ?? null,
                    avatar: row.avatarUrl ?? null,
                    joinDate: row.joinDate ?? null,
                });
            }
        }

        return Array.from(map.values());
    }, [userRows]);

    // уникальные собаки
    const allDogs: DogShort[] = useMemo(() => {
        const dogMap = new Map<number, DogShort>();

        for (const row of userRows) {
            if (row.dogId != null && !dogMap.has(row.dogId)) {
                dogMap.set(row.dogId, {
                    id: row.dogId,
                    name: row.dogName ?? "Без имени",
                    breed: row.breed,
                    photo: row.dogPhoto ?? null,
                    bio: row.dogBio ?? null,
                });
            }
        }

        return Array.from(dogMap.values());
    }, [userRows]);

    // статистика
    const now = Date.now();

    const upcomingEvents = useMemo(() => {
        return events
            .filter((e) => new Date(e.startAt).getTime() >= now)
            .sort(
                (a, b) =>
                    new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
            );
    }, [events, now]);

    const stats = {
        dogs: allDogs.length,
        members: members.length,
        upcoming: upcomingEvents.length,
    };

    // собака дня
    const dogOfTheDay: DogShort | null = useMemo(() => {
        if (allDogs.length === 0) return null;

        const start = new Date(new Date().getFullYear(), 0, 0).getTime();
        const dayOfYear = Math.floor((Date.now() - start) / 86_400_000);
        return allDogs[dayOfYear % allDogs.length];
    }, [allDogs]);

    // ближайшие события (2 шт.)
    const upcomingShort = upcomingEvents.slice(0, 2);

    // последние вступившие участники (3 шт.)
    const recentMembers = useMemo(() => {
        return [...members]
            .filter((m) => m.joinDate)
            .sort(
                (a, b) =>
                    new Date(b.joinDate as string).getTime() -
                    new Date(a.joinDate as string).getTime()
            )
            .slice(0, 4);
    }, [members]);

    return (
        <section className="space-y-8">
            {/* hero */}
            <div className="rounded-3xl bg-gradient-to-r from-amber-100 to-orange-100 p-6 shadow-sm">
                <h1 className="text-4xl font-extrabold">DogHub — клуб собаководов</h1>
                <p className="mt-2 max-w-2xl text-gray-700">
                    Встречи, тренировки и дружное сообщество для тех, кто любит собак.
                </p>
                <div className="mt-4 flex gap-2">
                    <Link
                        to="/members"
                        className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
                    >
                        Посмотреть участников
                    </Link>
                    <Link
                        to="/events"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 hover:bg-gray-100"
                    >
                        События клуба
                    </Link>
                </div>
            </div>

            {/* статистика из БД */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="text-3xl font-extrabold">
                        {loading ? "…" : stats.dogs}
                    </div>
                    <div className="text-sm text-gray-600">пушистых друзей</div>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="text-3xl font-extrabold">
                        {loading ? "…" : stats.members}
                    </div>
                    <div className="text-sm text-gray-600">участников клуба</div>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="text-3xl font-extrabold">
                        {loading ? "…" : stats.upcoming}
                    </div>
                    <div className="text-sm text-gray-600">ближайших событий</div>
                </div>
            </div>

            {/* собака дня + ближайшие события */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Собака дня */}
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-xl font-semibold">Собака дня</h2>
                        <Link
                            to="/dogs"
                            className="text-sm text-gray-600 hover:underline"
                        >
                            Все собаки →
                        </Link>
                    </div>
                    {dogOfTheDay ? (
                        <div className="overflow-hidden rounded-2xl">
                            <div className="relative aspect-[4/3] w-full overflow-hidden">
                                {dogOfTheDay.photo ? (
                                    <img
                                        src={dogOfTheDay.photo}
                                        alt={dogOfTheDay.name}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-4xl">
                                        🐶
                                    </div>
                                )}
                            </div>
                            <div className="p-3">
                                <div className="flex items-baseline justify-between">
                                    <div className="text-lg font-semibold">
                                        {dogOfTheDay.name}
                                    </div>
                                    {dogOfTheDay.breed && (
                                        <div className="text-sm text-gray-500">
                                            {dogOfTheDay.breed}
                                        </div>
                                    )}
                                </div>
                                {dogOfTheDay.bio && (
                                    <p className="mt-1 text-sm text-gray-700">
                                        {dogOfTheDay.bio}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-600">
                            {loading
                                ? "Загружаем собак…"
                                : "Собаки пока не добавлены в базу."}
                        </p>
                    )}
                </div>

                {/* Ближайшие события */}
                <div className="rounded-2xl bg-white p-4 shadow">
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-xl font-semibold">Ближайшие события</h2>
                        <Link
                            to="/events"
                            className="text-sm text-gray-600 hover:underline"
                        >
                            Все события →
                        </Link>
                    </div>
                    {upcomingShort.length > 0 ? (
                        <ul className="space-y-3">
                            {upcomingShort.map((ev) => (
                                <Link key={ev.id} to={`/events/${ev.id}`} className="block">
                                    <li
                                        key={ev.id}
                                        className="rounded-xl border border-gray-200 p-3"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold">{ev.title}</span>
                                            {ev.category && (
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                            {ev.category}
                          </span>
                                            )}
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600">
                                            🗓️ {formatEventDate(ev.startAt)} • 📍 {ev.venue}
                                        </div>
                                        {ev.description && (
                                            <div className="mt-1 text-sm text-gray-700">
                                                {ev.description}
                                            </div>
                                        )}
                                    </li>
                                </Link>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600">
                            {loading
                                ? "Загружаем события…"
                                : "Пока нет предстоящих событий."}
                        </p>
                    )}
                </div>
            </div>

            {/* новые участники вместо «онлайн» */}
            <div className="rounded-2xl bg-white p-4 shadow">
                <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="text-xl font-semibold">Новые участники</h2>
                    <Link
                        to="/members"
                        className="text-sm text-gray-600 hover:underline"
                    >
                        Все участники →
                    </Link>
                </div>

                {error && (
                    <p className="mb-2 text-sm text-red-600">{error}</p>
                )}

                {recentMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {recentMembers.map((m) => (
                            <Link
                                key={m.id}
                                to={`/members/${m.id}`}
                                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:bg-gray-100"
                            >
                                <img
                                    src={
                                        m.avatar ??
                                        "https://via.placeholder.com/40x40?text=🐾"
                                    }
                                    alt={m.fullName}
                                    className="h-10 w-10 rounded-full object-cover"
                                    loading="lazy"
                                />
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium leading-none">
                                        {m.fullName}
                                    </div>
                                    {m.city && (
                                        <div className="text-xs text-gray-600">
                                            {m.city}
                                        </div>
                                    )}
                                    {m.joinDate && (
                                        <div className="text-[11px] text-gray-500">
                                            в клубе с {formatJoinShort(m.joinDate)}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-600">
                        {loading
                            ? "Загружаем участников…"
                            : "Пока нет участников в базе."}
                    </p>
                )}
            </div>

            {/* О клубе */}
            <AboutClub />
        </section>
    );
}
