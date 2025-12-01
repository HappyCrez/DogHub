import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    API_BASE_URL,
    getUsers,
    getEvents,
    getPeopleTrainings,
    getPrograms,
    getProgramDogs,
    getEventMembers,
    getEventDogs,
    type ApiUserWithDogRow,
    type ApiEventRow,
    type ApiPeopleTrainingRow,
    type ApiProgramRow,
} from "../api/client";
import {
    formatJoined,
    type MemberWithDogs,
} from "../components/MemberCard";
import { programTypeLabel } from "./Training.tsx";
import { groupUsers } from "./Members.tsx";
import { useAuth } from "../auth/AuthContext";

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

function formatPrice(price: number | null) {
    if (price == null) return "Цена не указана";
    if (price === 0) return "Бесплатно";
    return `${price.toLocaleString("ru-RU")} ₽`;
}

interface ProfileEditPayload {
    fullName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    bio: string | null;
}

export default function Account() {
    // Профиль и собаки
    const [rows, setRows] = useState<ApiUserWithDogRow[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Активность: тренировки, события, программы
    const [trainingsLoading, setTrainingsLoading] = useState(false);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [programsLoading, setProgramsLoading] = useState(false);

    const [trainingsError, setTrainingsError] = useState<string | null>(null);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [programsError, setProgramsError] = useState<string | null>(null);

    const [myTrainings, setMyTrainings] = useState<ApiPeopleTrainingRow[]>([]);
    const [myEvents, setMyEvents] = useState<ApiEventRow[]>([]);
    const [myPrograms, setMyPrograms] = useState<ApiProgramRow[]>([]);

    // Модалка редактирования профиля
    const [isEditOpen, setIsEditOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        setLoadingProfile(true);
        setProfileError(null);

        getUsers()
            .then((data) => {
                if (cancelled) return;
                setRows(data);
            })
            .catch((err) => {
                console.error(err);
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

    // Достаём пользователя из контекста авторизации
    const { user: authUser, isAuthenticated } = useAuth();

    // Определяем id участника из объекта user, который вернул бэкенд
    const currentMemberId = useMemo(() => {
        if (!authUser) return null;

        const anyUser = authUser as any;

        // На всякий случай проверяем несколько вариантов имён поля
        let rawId: unknown =
            anyUser.memberId ??
            anyUser.member_id ??
            anyUser.id;

        if (typeof rawId === "string") {
            const n = Number(rawId);
            return Number.isNaN(n) ? null : n;
        }

        if (typeof rawId === "number") {
            return rawId;
        }

        return null;
    }, [authUser]);

    // Ищем участника с таким id в сгруппированном списке
    const currentMember = useMemo(() => {
        if (members.length === 0) return null;

        if (currentMemberId == null) {
            // Фоллбэк: если по какой-то причине id не нашли,
            // оставляем старое поведение — первый участник
            return members[0];
        }

        return (
            members.find((m) => m.id === currentMemberId) ??
            members[0]
        );
    }, [members, currentMemberId]);

    // Загружаем "мою активность", когда знаем текущего пользователя
    useEffect(() => {
        if (!currentMember) return;

        // Фиксируем не-nullовый currentMember в локальной константе
        const member = currentMember;

        let cancelled = false;

        const dogIds = member.dogs.map((d) => d.id);
        const now = new Date();

        async function loadTrainings() {
            try {
                setTrainingsLoading(true);
                setTrainingsError(null);

                const allTrainings = await getPeopleTrainings();
                if (cancelled) return;

                const upcoming = allTrainings.filter((t) => {
                    const start = new Date(t.startAt);
                    return !Number.isNaN(start.getTime()) && start >= now;
                });

                const trainingsWithMe: ApiPeopleTrainingRow[] = [];

                await Promise.all(
                    upcoming.map(async (tr) => {
                        try {
                            const members = await getEventMembers(tr.id);
                            if (
                                !cancelled &&
                                members.some((m) => m.memberId === member.id)
                            ) {
                                trainingsWithMe.push(tr);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    })
                );

                if (!cancelled) {
                    setMyTrainings(trainingsWithMe);
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    setTrainingsError("Не удалось загрузить тренировки.");
                }
            } finally {
                if (!cancelled) {
                    setTrainingsLoading(false);
                }
            }
        }

        async function loadEvents() {
            try {
                setEventsLoading(true);
                setEventsError(null);

                const allEvents = await getEvents();
                if (cancelled) return;

                const eventsWithMyDogs: ApiEventRow[] = [];

                const now = new Date();
                const relevantEvents = allEvents.filter((ev) => {
                    const start = new Date(ev.startAt);
                    return !Number.isNaN(start.getTime()) && start >= now;
                });

                await Promise.all(
                    relevantEvents.map(async (ev) => {
                        try {
                            const dogs = await getEventDogs(ev.id);

                            const hasMyDog = dogs.some((d) =>
                                dogIds.includes(d.dogId)
                            );

                            if (!cancelled && hasMyDog) {
                                eventsWithMyDogs.push(ev);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    })
                );

                if (!cancelled) {
                    setMyEvents(eventsWithMyDogs);
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    setEventsError("Не удалось загрузить события.");
                }
            } finally {
                if (!cancelled) {
                    setEventsLoading(false);
                }
            }
        }

        async function loadPrograms() {
            try {
                setProgramsLoading(true);
                setProgramsError(null);

                const allPrograms = await getPrograms();
                if (cancelled) return;

                const programsWithMyDogs: ApiProgramRow[] = [];

                await Promise.all(
                    allPrograms.map(async (program) => {
                        try {
                            const dogs = await getProgramDogs(program.id);
                            if (!cancelled && dogs.some((d) => dogIds.includes(d.dogId))) {
                                programsWithMyDogs.push(program);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    })
                );

                if (!cancelled) {
                    setMyPrograms(programsWithMyDogs);
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    setProgramsError("Не удалось загрузить программы.");
                }
            } finally {
                if (!cancelled) {
                    setProgramsLoading(false);
                }
            }
        }

        // запускаем три загрузки параллельно
        loadTrainings();
        loadEvents();
        loadPrograms();

        return () => {
            cancelled = true;
        };
    }, [currentMember]);

    // === ГАРД АВТОРИЗАЦИИ ===
    // Если пользователь не залогинен, страница ЛК недоступна — отправляем на /auth
    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }

    if (loadingProfile && !currentMember) {
        return (
            <section className="px-4 py-8">
                <p className="text-gray-600">Загружаем личный профиль…</p>
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

    const firstName =
        currentMember.fullName.split(" ")[0] ?? currentMember.fullName;
    const hasDogs = currentMember.dogs.length > 0;

    const stats = {
        dogs: currentMember.dogs.length,
        trainings: myTrainings.length,
        events: myEvents.length,
        programs: myPrograms.length,
    };

    function handleProfileSaved(memberId: number, payload: ProfileEditPayload) {
        setRows((prev) =>
            prev.map((row) =>
                row.memberId === memberId
                    ? {
                        ...row,
                        fullName: payload.fullName,
                        phone: payload.phone,
                        email: payload.email,
                        city: payload.city,
                        ownerBio: payload.bio,
                    }
                    : row
            )
        );
    }

    return (
        <section className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-8 md:py-10">
            <header className="mb-4 md:mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Личный кабинет
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                    Привет, {firstName}!
                </h1>
                <p className="mt-2 max-w-xl text-sm text-gray-600">
                    Здесь собрана информация о вас, ваших собаках и записях на тренировки
                    и мероприятия клуба DogHub.
                </p>
            </header>
            {/* HERO-блок профиля с градиентом и статистикой */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 p-6 shadow-md md:p-8"
            >
                {/* Декоративные пятна */}
                <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/50 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-1/3 h-44 w-44 rounded-full bg-amber-200/60 blur-3xl" />
                <div className="pointer-events-none absolute inset-x-8 bottom-0 h-20 rounded-3xl bg-white/30 blur-2xl" />

                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 items-start gap-4">
                        <div className="relative">
                            {currentMember.avatar ? (
                                <img
                                    src={currentMember.avatar}
                                    alt={currentMember.fullName}
                                    className="h-20 w-20 rounded-2xl border border-white/60 object-cover shadow-sm sm:h-24 sm:w-24"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-2xl font-semibold text-amber-800 shadow-sm sm:h-24 sm:w-24">
                                    {currentMember.fullName[0] ?? "?"}
                                </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-400 text-white shadow-md">
                                🐾
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold leading-tight text-gray-900 md:text-2xl">
                                    {currentMember.fullName}
                                </h2>
                                <span className="rounded-full bg-black/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                                    Участник DogHub
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                                {currentMember.city && (
                                    <span className="inline-flex items-center gap-1">
                                        <span>📍</span>
                                        <span>{currentMember.city}</span>
                                    </span>
                                )}
                                <span className="h-1 w-1 rounded-full bg-gray-400" />
                                <span>В клубе с {formatJoined(currentMember.joinDate)}</span>
                            </div>

                            {currentMember.bio && (
                                <p className="max-w-xl text-sm text-gray-800">
                                    {currentMember.bio}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Быстрая статистика */}
                    <div className="grid w-full grid-cols-2 gap-3 text-xs text-gray-900 md:w-auto md:grid-cols-2">
                        <ProfileStat
                            label="Собаки"
                            value={stats.dogs}
                            hint={hasDogs ? "в вашем профиле" : "пока не добавлены"}
                        />
                        <ProfileStat
                            label="Тренировки"
                            value={stats.trainings}
                            hint="ближайшие записи"
                        />
                        <ProfileStat
                            label="События"
                            value={stats.events}
                            hint="запланированные"
                        />
                        <ProfileStat
                            label="Программы"
                            value={stats.programs}
                            hint="для ваших собак"
                        />
                    </div>
                </div>

                {/* Кнопки действий */}
                <div className="relative mt-5 flex flex-wrap gap-3 text-xs">
                    <button
                        type="button"
                        onClick={() => setIsEditOpen(true)}
                        className="inline-flex items-center justify-center rounded-xl bg-black px-3.5 py-2 font-semibold text-white shadow-sm transition hover:bg-black/90"
                    >
                        ✏️ Настроить профиль
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl bg-white/80 px-3.5 py-2 font-medium text-gray-900 shadow-sm transition hover:bg-white"
                    >
                        🐶 Добавить собаку
                    </button>
                    <Link
                        to={`/members/${currentMember.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-black/5 px-3.5 py-2 font-medium text-gray-900 shadow-sm transition hover:bg-black/10"
                    >
                        Публичный профиль →
                    </Link>
                </div>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                {/* Левая колонка: о себе + собаки */}
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
                    className="space-y-6"
                >
                    {/* Обо мне и контакты */}
                    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 text-sm font-semibold text-gray-900">
                            Обо мне и контакты
                        </h2>
                        <div className="space-y-3 text-sm text-gray-700">
                            {currentMember.bio ? (
                                <p>{currentMember.bio}</p>
                            ) : (
                                <p className="text-gray-500">
                                    Здесь будет короткая информация о вас. Её можно будет
                                    отредактировать в настройках профиля.
                                </p>
                            )}

                            <div className="grid gap-2 text-xs text-gray-700 sm:grid-cols-2">
                                {currentMember.email && (
                                    <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2">
                                        <span className="text-base">📧</span>
                                        <span className="truncate">{currentMember.email}</span>
                                    </div>
                                )}
                                {currentMember.phone && (
                                    <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2">
                                        <span className="text-base">📞</span>
                                        <span className="truncate">{currentMember.phone}</span>
                                    </div>
                                )}
                                {currentMember.city && (
                                    <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2">
                                        <span className="text-base">📍</span>
                                        <span className="truncate">{currentMember.city}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2">
                                    <span className="text-base">🎓</span>
                                    <span className="truncate">
                                        Уровень: базовый владелец (для примера)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Мои собаки */}
                    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
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
                                У вас пока нет добавленных собак. Нажмите «Добавить собаку» вверху,
                                чтобы создать карточку питомца.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {currentMember.dogs.map((dog) => (
                                    <li
                                        key={dog.id}
                                        className="flex gap-3 rounded-2xl border border-gray-100 px-3 py-2.5 transition hover:-translate-y-[1px] hover:border-amber-200 hover:bg-amber-50/40 hover:shadow-sm"
                                    >
                                        <div className="mt-0.5 h-9 w-9 flex-shrink-0">
                                            {dog.photo ? (
                                                <img
                                                    src={dog.photo}
                                                    alt={dog.name}
                                                    className="h-9 w-9 rounded-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                                                    {dog.name[0]}
                                                </div>
                                            )}
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
                    </div>
                </motion.section>

                {/* Правая колонка: активность */}
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut", delay: 0.18 }}
                    className="space-y-6"
                >
                    {/* Ближайшие тренировки */}
                    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Мои тренировки
                            </h2>
                            <span className="text-[11px] text-gray-500">
                                {trainingsError
                                    ? "Ошибка загрузки"
                                    : myTrainings.length > 0
                                        ? `Найдено: ${myTrainings.length}`
                                        : trainingsLoading
                                            ? "Загружаем…"
                                            : "Нет записей"}
                            </span>
                        </div>

                        {trainingsError && (
                            <p className="mb-1 text-[11px] text-red-600">{trainingsError}</p>
                        )}

                        {myTrainings.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                {trainingsLoading ? (
                                    "Загружаем ваши тренировки…"
                                ) : (
                                    <>
                                        У вас пока нет записей на тренировки. Выберите тренинг в
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
                                {myTrainings.map((tr) => (
                                    <li
                                        key={tr.id}
                                        className="rounded-2xl border border-gray-100 px-3 py-2 transition hover:-translate-y-[1px] hover:border-amber-200 hover:bg-amber-50/40 hover:shadow-sm"
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
                    </div>

                    {/* События */}
                    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Мои события
                            </h2>
                            <span className="text-[11px] text-gray-500">
                                {eventsError
                                    ? "Ошибка загрузки"
                                    : myEvents.length > 0
                                        ? `Найдено: ${myEvents.length}`
                                        : eventsLoading
                                            ? "Загружаем…"
                                            : "Нет записей"}
                            </span>
                        </div>

                        {eventsError && (
                            <p className="mb-1 text-[11px] text-red-600">{eventsError}</p>
                        )}

                        {myEvents.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                {eventsLoading ? (
                                    "Загружаем ваши события…"
                                ) : (
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
                                        className="rounded-2xl border border-gray-100 px-3 py-2 transition hover:-translate-y-[1px] hover:border-amber-200 hover:bg-amber-50/40 hover:shadow-sm"
                                    >
                                        <Link to={`/events/${ev.id}`} className="block">
                                            <p className="font-medium text-gray-900">{ev.title}</p>
                                            <p className="mt-0.5 text-xs text-gray-600">
                                                🗓️ {formatEventDate(ev.startAt)} • 📍 {ev.venue}
                                            </p>
                                            {ev.description && (
                                                <p className="mt-1 text-xs text-gray-700">
                                                    {ev.description}
                                                </p>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Программы */}
                    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Программы для моих собак
                            </h2>
                            <span className="text-[11px] text-gray-500">
                                {programsError
                                    ? "Ошибка загрузки"
                                    : myPrograms.length > 0
                                        ? `Найдено: ${myPrograms.length}`
                                        : programsLoading
                                            ? "Загружаем…"
                                            : "Нет активных программ"}
                            </span>
                        </div>

                        {programsError && (
                            <p className="mb-1 text-[11px] text-red-600">{programsError}</p>
                        )}

                        {myPrograms.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                {programsLoading ? (
                                    "Загружаем программы…"
                                ) : (
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
                                        className="rounded-2xl border border-gray-100 px-3 py-2 transition hover:-translate-y-[1px] hover:border-amber-200 hover:bg-amber-50/40 hover:shadow-sm"
                                    >
                                        <Link to={`/programs/${program.id}`} className="block">
                                            <p className="font-medium text-gray-900">
                                                {program.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-600">
                                                Тип: {programTypeLabel(program.type)} • Участников:{" "}
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
                    </div>
                </motion.section>
            </div>

            {isEditOpen && (
                <ProfileEditModal
                    open={isEditOpen}
                    member={currentMember}
                    onClose={() => setIsEditOpen(false)}
                    onSaved={(payload) => handleProfileSaved(currentMember.id, payload)}
                />
            )}
        </section>
    );
}

function ProfileStat(props: { label: string; value: number; hint?: string }) {
    const { label, value, hint } = props;
    return (
        <div className="flex flex-col rounded-2xl bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
            <span className="text-[11px] font-medium text-gray-500">{label}</span>
            <span className="text-lg font-semibold text-gray-900">{value}</span>
            {hint && (
                <span className="mt-0.5 text-[10px] text-gray-500">
                    {hint}
                </span>
            )}
        </div>
    );
}

interface ProfileEditModalProps {
    open: boolean;
    member: MemberWithDogs;
    onClose: () => void;
    onSaved: (payload: ProfileEditPayload) => void;
}

function ProfileEditModal({
                              open,
                              member,
                              onClose,
                              onSaved,
                          }: ProfileEditModalProps) {
    const [fullName, setFullName] = useState(member.fullName ?? "");
    const [phone, setPhone] = useState(member.phone ?? "");
    const [email, setEmail] = useState(member.email ?? "");
    const [city, setCity] = useState(member.city ?? "");
    const [bio, setBio] = useState(member.bio ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Подхватываем обновлённого участника при повторном открытии
    useEffect(() => {
        if (!open) return;
        setFullName(member.fullName ?? "");
        setPhone(member.phone ?? "");
        setEmail(member.email ?? "");
        setCity(member.city ?? "");
        setBio(member.bio ?? "");
        setError(null);
    }, [open, member]);

    if (!open) return null;

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const token = localStorage.getItem("doghub_access_token");

        if (!token) {
            setError(
                "Не удалось сохранить профиль: вы не авторизованы. Пожалуйста, войдите в аккаунт ещё раз."
            );
            return;
        }

        const payloadForApi = {
            fullName: fullName.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            city: city.trim() || null,
            ownerBio: bio.trim() || null,
        };

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payloadForApi),
            });

            if (res.status === 401) {
                setError(
                    "Сессия истекла или нет доступа к профилю. Попробуйте выйти из аккаунта и войти снова."
                );
                return;
            }

            let responseBody: any = null;
            try {
                responseBody = await res.json();
            } catch {
                // тело могло быть пустым — игнорируем
            }

            if (!res.ok) {
                const msg =
                    (responseBody && (responseBody.error as string)) ||
                    `Ошибка сохранения профиля (HTTP ${res.status})`;
                throw new Error(msg);
            }

            // Обновляем локальное состояние в ЛК
            onSaved({
                fullName: payloadForApi.fullName,
                phone: payloadForApi.phone,
                email: payloadForApi.email,
                city: payloadForApi.city,
                bio: (payloadForApi.ownerBio as string | null) ?? null,
            });

            onClose();
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Не удалось сохранить профиль. Попробуйте ещё раз."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl md:p-6"
            >
                <h2 className="mb-1 text-lg font-semibold text-gray-900">
                    Настройки профиля
                </h2>
                <p className="mb-4 text-xs text-gray-500">
                    Обновите свои данные. Фото пока будет с заглушкой — добавим позже.
                </p>

                {error && (
                    <p className="mb-3 text-xs text-red-600">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Имя и фамилия
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            required
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Телефон
                            </label>
                            <input
                                type="tel"
                                value={phone ?? ""}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                                placeholder="+7..."
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Город
                            </label>
                            <input
                                type="text"
                                value={city ?? ""}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email ?? ""}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Описание (bio)
                        </label>
                        <textarea
                            rows={3}
                            value={bio ?? ""}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            placeholder="Расскажите пару слов о себе и ваших собаках..."
                        />
                    </div>

                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                        Фото профиля сейчас используется как заглушка. Позже здесь появится
                        загрузка своей фотографии 🐾
                    </div>

                    <div className="mt-3 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-black/90 disabled:bg-black disabled:opacity-60"
                        >
                            {saving ? "Сохраняем..." : "Сохранить"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}