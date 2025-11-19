import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPrograms, getPeopleTrainings, type ApiProgramRow, type ApiPeopleTrainingRow,} from "../api/client";
import EventCard from "../components/EventCard";

function formatPrice(price: number | null) {
    if (price == null) return "Цена не указана";
    if (price === 0) return "Бесплатно";
    return `${price.toLocaleString("ru-RU")} ₽`;
}

// Читаем тип программы по-русски
function programTypeLabel(type: string) {
    if (type === "GROUP") return "Групповая";
    if (type === "PERSONAL") return "Персональная";
    return type;
}

export default function Training() {
    // программы для собак
    const [programs, setPrograms] = useState<ApiProgramRow[]>([]);
    const [loadingPrograms, setLoadingPrograms] = useState(true);
    const [programsError, setProgramsError] = useState<string | null>(null);
    const [progType, setProgType] = useState<string>("all");
    const [progQ, setProgQ] = useState("");

    // тренинги для людей
    const [trainings, setTrainings] = useState<ApiPeopleTrainingRow[]>([]);
    const [loadingTrainings, setLoadingTrainings] = useState(true);
    const [trainingsError, setTrainingsError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        // программы
        setLoadingPrograms(true);
        getPrograms()
            .then((data) => {
                if (cancelled) return;
                setPrograms(data);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setProgramsError("Не удалось загрузить программы обучения.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingPrograms(false);
            });

        // тренинги для людей
        setLoadingTrainings(true);
        getPeopleTrainings()
            .then((data) => {
                if (cancelled) return;
                setTrainings(data);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setTrainingsError("Не удалось загрузить тренинги для людей.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingTrainings(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    /* ===== фильтры для программ ===== */

    const programTypes = useMemo(() => {
        const set = new Set<string>();
        for (const p of programs) {
            if (p.type) set.add(p.type);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
    }, [programs]);

    const filteredPrograms = useMemo(() => {
        const text = progQ.trim().toLowerCase();
        return programs.filter((p) => {
            const okType = progType === "all" || p.type === progType;

            const okText =
                text.length === 0 ||
                p.title.toLowerCase().includes(text) ||
                (p.description ?? "").toLowerCase().includes(text);

            return okType && okText;
        });
    }, [programs, progType, progQ]);

    /* ===== разделение тренингов на ближайшие / прошедшие ===== */

    const now = Date.now();

    const trainingsUpcoming = useMemo(
        () =>
            trainings
                .filter((t) => new Date(t.startAt).getTime() >= now)
                .sort(
                    (a, b) =>
                        new Date(a.startAt).getTime() -
                        new Date(b.startAt).getTime()
                ),
        [trainings, now]
    );

    const trainingsPast = useMemo(
        () =>
            trainings
                .filter((t) => new Date(t.startAt).getTime() < now)
                .sort(
                    (a, b) =>
                        new Date(b.startAt).getTime() -
                        new Date(a.startAt).getTime()
                ),
        [trainings, now]
    );

    return (
        <section className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Обучение</h1>
                <p className="text-sm text-gray-700">
                    Здесь собраны обучающие программы для собак (персональные и групповые),
                    а также тренинги для владельцев — как запланированные, так и уже проведённые.
                </p>
            </header>

            {/* ===== программы для собак ===== */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">Программы для собак</h2>
                    {!loadingPrograms && !programsError && (
                        <span className="text-xs text-gray-500">
                            Найдено: {filteredPrograms.length}
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                    <input
                        value={progQ}
                        onChange={(e) => setProgQ(e.target.value)}
                        placeholder="Поиск по названию или описанию программы…"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black sm:w-80"
                    />

                    <select
                        value={progType}
                        onChange={(e) => setProgType(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black sm:w-56"
                    >
                        <option value="all">Все типы программ</option>
                        {programTypes.map((t) => (
                            <option key={t} value={t}>
                                {programTypeLabel(t)}
                            </option>
                        ))}
                    </select>
                </div>

                {loadingPrograms && (
                    <p className="text-gray-600">Загружаем программы…</p>
                )}

                {programsError && !loadingPrograms && (
                    <p className="text-sm text-red-600">{programsError}</p>
                )}

                {!loadingPrograms && !programsError && filteredPrograms.length === 0 && (
                    <p className="text-gray-600">
                        Программы не найдены. Попробуйте изменить фильтры или запрос.
                    </p>
                )}

                {!loadingPrograms && !programsError && filteredPrograms.length > 0 && (
                    <div className="space-y-3">
                        {filteredPrograms.map((p) => (
                            <div
                                key={p.id}
                                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
                            >
                                <Link
                                    to={`/programs/${p.id}`}
                                    className="block h-full no-underline"
                                >
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <div>
                                            <h3 className="text-base font-semibold">{p.title}</h3>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5">
                                                    {programTypeLabel(p.type)}
                                                </span>
                                                <span>{formatPrice(p.price)}</span>
                                                <span className="text-gray-400">
                                                    Записано собак: {p.registeredDogsCount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {p.description && (
                                        <p className="mt-2 text-sm text-gray-700">
                                            {p.description}
                                        </p>
                                    )}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ===== тренинги для людей ===== */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">Тренинги для владельцев</h2>
                    {!loadingTrainings && !trainingsError && (
                        <span className="text-xs text-gray-500">
                            Найдено: {trainings.length}
                        </span>
                    )}
                </div>

                {loadingTrainings && (
                    <p className="text-gray-600">Загружаем тренинги…</p>
                )}

                {trainingsError && !loadingTrainings && (
                    <p className="text-sm text-red-600">{trainingsError}</p>
                )}

                {!loadingTrainings && !trainingsError && trainings.length === 0 && (
                    <p className="text-gray-600">
                        Пока нет информации о тренингах для владельцев.
                    </p>
                )}

                {!loadingTrainings && !trainingsError && trainings.length > 0 && (
                    <div className="space-y-4">
                        {trainingsUpcoming.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">
                                    Ближайшие тренинги
                                </h3>
                                <div className="space-y-3">
                                    {trainingsUpcoming.map((t) => (
                                        <Link
                                            key={t.id}
                                            to={`/trainings/${t.id}`}
                                            className="block"
                                        >
                                            <EventCard ev={t} />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {trainingsPast.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">
                                    Прошедшие тренинги
                                </h3>
                                <div className="space-y-3">
                                    {trainingsPast.map((t) => (
                                        <Link
                                            key={t.id}
                                            to={`/trainings/${t.id}`}
                                            className="block"
                                        >
                                            <EventCard ev={t} />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </section>
    );
}