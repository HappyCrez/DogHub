import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    getUsers,
    getEvents,
    getPeopleTrainings,
    getPrograms,
    getProgramDogs,
    getEventMembers,
    type ApiUserWithDogRow,
    type ApiEventRow,
    type ApiPeopleTrainingRow,
    type ApiProgramRow,
} from "../api/client";
import { groupUsers } from "./MemberProfile.tsx";
import { formatJoined } from "../components/MemberCard";

// Форматирование даты события — как в EventCard
function formatEventDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "дата не указана";
    const dtf = new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    return dtf.format(d).replace(",", "");
}

// Цена программы
function formatPrice(price: number | null) {
    if (price == null) return "Цена не указана";
    if (price === 0) return "Бесплатно";
    return `${price.toLocaleString("ru-RU")} ₽`;
}

export default function Account() {
    // 1. Профиль и собаки
    const [rows, setRows] = useState<ApiUserWithDogRow[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);

    // 2. Данные по тренингам / событиям / программам
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [dashboardError, setDashboardError] = useState<string | null>(null);
    const [myTrainings, setMyTrainings] = useState<ApiPeopleTrainingRow[]>([]);
    const [myEvents, setMyEvents] = useState<ApiEventRow[]>([]);
    const [myPrograms, setMyPrograms] = useState<ApiProgramRow[]>([]);

    // Загружаем всех участников + их собак
    useEffect(() => {
        let cancelled = false;

        setLoadingProfile(true);
        setProfileError(null);

        getUsers()
            .then((data) => {
                if (cancelled) return;
                setRows(data);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setProfileError("Не удалось загрузить данные профиля.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingProfile(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const members = useMemo(() => groupUsers(rows), [rows]);

    // Пока авторизации нет, берём первого участника как "текущего".
    // Позже сюда можно подставить id из токена / контекста.
    const currentMember = members[0] ?? null;

    // Подгружаем личные тренировки / события / программы,
    // когда профиль участника уже известен.
    useEffect(() => {
        if (!currentMember) return;

        let cancelled = false;

        async function loadDashboard() {
            try {
                setLoadingDashboard(true);
                setDashboardError(null);

                const dogIds = currentMember.dogs.map((d) => d.id);
                const now = new Date();

                const [allTrainings, allEvents, allPrograms] = await Promise.all([
                    getPeopleTrainings(), // /api/people_events
                    getEvents(),          // /api/events
                    getPrograms(),        // /api/programs
                ]);

                const upcomingTrainings = allTrainings.filter((t) => {
                    const start = new Date(t.startAt);
                    return !Number.isNaN(start.getTime()) && start >= now;
                });

                const upcomingEvents = allEvents.filter((ev) => {
                    const start = new Date(ev.startAt);
                    return !Number.isNaN(start.getTime()) && start >= now;
                });

                // Тренировки для человека: смотрим, есть ли участник в event_members
                const trainingsWithMe: ApiPeopleTrainingRow[] = [];
                await Promise.all(
                    upcomingTrainings.map(async (tr) => {
                        try {
                            const members = await getEventMembers(tr.id);
                            if (members.some((m) => m.memberId === currentMember.id)) {
                                trainingsWithMe.push(tr);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    })
                );

                // Общие события (митапы, прогулки и т.п.)
                const eventsWithMe: ApiEventRow[] = [];
                await Promise.all(
                    upcomingEvents.map(async (ev) => {
                        try {
                            const members = await getEventMembers(ev.id);
                            if (members.some((m) => m.memberId === currentMember.id)) {
                                eventsWithMe.push(ev);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    })
                );

                // Программы, в которых участвуют собаки владельца:
                const programsWithMyDogs: ApiProgramRow[] = [];
                await Promise.all(
                    allPrograms.map(async (program) => {
                        try {
                            const dogs = await getProgramDogs(program.id);
                            if (dogs.some((d) => dogIds.includes(d.dogId))) {
                                programsWithMyDogs.push(program);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    })
                );

                if (!cancelled) {
                    setMyTrainings(trainingsWithMe);
                    setMyEvents(eventsWithMe);
                    setMyPrograms(programsWithMyDogs);
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    setDashboardError("Не удалось загрузить ваши записи и программы.");
                }
            } finally {
                if (!cancelled) {
                    setLoadingDashboard(false);
                }
            }
        }

        loadDashboard();

        return () => {
            cancelled = true;
        };
    }, [currentMember]);

    if (loadingProfile && !currentMember) {
        return (
            <section className="px-4 py-8">
                <p className="text-gray-600">Загружаем личный кабинет…</p>
            </section>
        );
    }

    if (profileError) {
        return (
            <section className="px-4 py-8">
                <p className="text-sm text-red-600">{profileError}</p>
                <p className="mt-2 text-sm text-gray-600">
                    Попробуйте обновить страницу чуть позже.
                </p>
            </section>
        );
    }

    if (!currentMember) {
        return (
            <section className="px-4 py-8">
                <p className="text-gray-600">
                    Личный кабинет пока недоступен: не удалось определить текущего пользователя.
                </p>
                <p className="mt-2 text-sm text-gray-600">
                    Когда авторизация будет готова, здесь появятся ваши данные и записи.
                </p>
            </section>
        );
    }

    const hasDogs = currentMember.dogs.length > 0;

    return (
        <section className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-8 md:py-10">
            <header className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Личный кабинет
                    </p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                        Привет, {currentMember.fullName.split(" ")[0]}!
                    </h1>
                    <p className="mt-2 max-w-xl text-sm text-gray-600">
                        Здесь собрана информация о вас, ваших собаках и записях на тренировки
                        и мероприятия клуба DogHub.
                    </p>
                </div>

                <Link
                    to={`/members/${currentMember.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                    Открыть публичный профиль
                </Link>
            </header>

            {dashboardError && (
                <p className="mb-4 text-xs text-red-600">
                    {dashboardError}
                </p>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                {/* Левая колонка: профиль + собаки */}
                <div className="space-y-6">
                    {/* Карточка профиля */}
                    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="relative">
                                {currentMember.avatar ? (
                                    <img
                                        src={currentMember.avatar}
                                        alt={currentMember.fullName}
                                        className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-xl font-semibold text-amber-800 sm:h-20 sm:w-20">
                                        {currentMember.fullName[0] ?? "?"}
                                    </div>
                                )}
                                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow-md">
                                    🐾
                                </span>
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-semibold leading-tight">
                                        {currentMember.fullName}
                                    </h2>
                                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                                        Участник клуба
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                    {currentMember.city && (
                                        <span>📍 {currentMember.city}</span>
                                    )}
                                    {currentMember.city && (
                                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                                    )}
                                    <span>В клубе с {formatJoined(currentMember.joinDate)}</span>
                                </div>

                                {currentMember.bio && (
                                    <p className="text-sm text-gray-700">{currentMember.bio}</p>
                                )}

                                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                    {currentMember.email && (
                                        <span className="rounded-full bg-gray-100 px-2.5 py-1">
                                            📧 {currentMember.email}
                                        </span>
                                    )}
                                    {currentMember.phone && (
                                        <span className="rounded-full bg-gray-100 px-2.5 py-1">
                                            📞 {currentMember.phone}
                                        </span>
                                    )}
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1">
                                        🎓 Уровень: базовый владелец
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-xs">
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-xl bg-black px-3 py-2 font-semibold text-white shadow-sm transition hover:bg-black/90"
                            >
                                Настроить профиль
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                            >
                                Добавить собаку
                            </button>
                        </div>
                    </section>

                    {/* Карточка с собаками */}
                    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Мои собаки
                            </h2>
                            <span className="text-[11px] text-gray-500">
                                {hasDogs
                                    ? `Показано: ${currentMember.dogs.length} из ${currentMember.dogs.length}`
                                    : "Собак пока нет"}
                            </span>
                        </div>

                        {!hasDogs ? (
                            <p className="text-sm text-gray-500">
                                У вас пока нет добавленных собак. Нажмите «Добавить собаку», чтобы
                                создать карточку питомца.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {currentMember.dogs.map((dog) => (
                                    <li
                                        key={dog.id}
                                        className="flex gap-3 rounded-2xl border border-gray-100 px-3 py-2.5 hover:border-amber-200 hover:bg-amber-50/40"
                                    >
                                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                                            {dog.name[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-sm font-semibold">
                                                            {dog.name}
                                                        </span>
                                                        {dog.breed && (
                                                            <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                                                {dog.breed}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {dog.birthDate && (
                                                        <p className="text-[11px] text-gray-500">
                                                            Дата рождения:{" "}
                                                            {new Date(
                                                                dog.birthDate
                                                            ).toLocaleDateString("ru-RU")}
                                                        </p>
                                                    )}
                                                </div>
                                                {dog.tags && dog.tags.length > 0 && (
                                                    <div className="hidden flex-wrap justify-end gap-1 md:flex">
                                                        {dog.tags.slice(0, 3).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {dog.bio && (
                                                <p className="mt-1 text-xs text-gray-600">
                                                    {dog.bio}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {/* Правая колонка: тренировки, события, программы */}
                <div className="space-y-6">
                    {/* Тренировки владельца (для людей) */}
                    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Мои тренировки
                            </h2>
                            <span className="text-[11px] text-gray-500">
                                {myTrainings.length > 0
                                    ? `Найдено: ${myTrainings.length}`
                                    : loadingDashboard
                                        ? "Загружаем…"
                                        : "Нет записей"}
                            </span>
                        </div>

                        {myTrainings.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                {loadingDashboard
                                    ? "Загружаем ваши тренировки…"
                                    : (
                                        <>
                                            У вас пока нет записей на тренировки. Выберите тренинг в разделе{" "}
                                            <Link
                                                to="/training"
                                                className="font-medium text-gray-700 underline-offset-2 hover:underline"
                                            >
                                                «Обучение»
                                            </Link>
                                            .
                                        </>
                                    )}
                            </p>
                        ) : (
                            <ul className="space-y-2.5 text-sm">
                                {myTrainings.map((tr) => (
                                    <li
                                        key={tr.id}
                                        className="rounded-2xl border border-gray-100 px-3 py-2 hover:border-amber-200 hover:bg-amber-50/40"
                                    >
                                        <Link to={`/trainings/${tr.id}`} className="block">
                                            <p className="font-medium text-gray-900">
                                                {tr.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-600">
                                                🗓️ {formatEventDate(tr.startAt)} • 📍 {tr.venue}
                                            </p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Мероприятия */}
                    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Мои события
                            </h2>
                            <span className="text-[11px] text-gray-500">
                                {myEvents.length > 0
                                    ? `Найдено: ${myEvents.length}`
                                    : loadingDashboard
                                        ? "Загружаем…"
                                        : "Нет записей"}
                            </span>
                        </div>

                        {myEvents.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                {loadingDashboard
                                    ? "Загружаем ваши события…"
                                    : (
                                        <>
                                            Пока нет запланированных мероприятий. Загляните в раздел{" "}
                                            <Link
                                                to="/events"
                                                className="font-medium text-gray-700 underline-offset-2 hover:underline"
                                            >
                                                «События»
                                            </Link>
                                            , чтобы записаться.
                                        </>
                                    )}
                            </p>
                        ) : (
                            <ul className="space-y-2.5 text-sm">
                                {myEvents.map((ev) => (
                                    <li
                                        key={ev.id}
                                        className="rounded-2xl border border-gray-100 px-3 py-2 hover:border-amber-200 hover:bg-amber-50/40"
                                    >
                                        <Link to={`/events/${ev.id}`} className="block">
                                            <p className="font-medium text-gray-900">
                                                {ev.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-600">
                                                🗓️ {formatEventDate(ev.startAt)} • 📍 {ev.venue}
                                            </p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Программы для собак */}
                    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Программы для моих собак
                            </h2>
                            <span className="text-[11px] text-gray-500">
                                {myPrograms.length > 0
                                    ? `Найдено: ${myPrograms.length}`
                                    : loadingDashboard
                                        ? "Загружаем…"
                                        : "Нет активных программ"}
                            </span>
                        </div>

                        {myPrograms.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                {loadingDashboard
                                    ? "Загружаем программы…"
                                    : (
                                        <>
                                            Активные программы пока не найдены. Выберите подходящий курс в
                                            разделе{" "}
                                            <Link
                                                to="/training"
                                                className="font-medium text-gray-700 underline-offset-2 hover:underline"
                                            >
                                                «Обучение»
                                            </Link>
                                            .
                                        </>
                                    )}
                            </p>
                        ) : (
                            <ul className="space-y-2.5 text-sm">
                                {myPrograms.map((program) => (
                                    <li
                                        key={program.id}
                                        className="rounded-2xl border border-gray-100 px-3 py-2 hover:border-amber-200 hover:bg-amber-50/40"
                                    >
                                        <Link to={`/programs/${program.id}`} className="block">
                                            <p className="font-medium text-gray-900">
                                                {program.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-600">
                                                Тип: {program.type} • Участников:{" "}
                                                {program.registeredDogsCount}
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-500">
                                                {formatPrice(program.price)}
                                            </p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </section>
    );
}