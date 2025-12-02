import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    getPrograms,
    getPeopleTrainings,
    type ApiProgramRow,
    type ApiPeopleTrainingRow,
    createProgram,
    updateProgram,
    deleteProgram,
    createTraining,
    updateTraining,
    deleteTraining,
    type UpsertProgramPayload,
    type UpsertEventPayload,
} from "../api/client";
import EventCard from "../components/EventCard";
import AdminProgramForm from "../components/AdminProgramForm";
import AdminEventForm from "../components/AdminEventForm";
import { useAdminAccess } from "../hooks/useAdminAccess";

function formatPrice(price: number | null) {
    if (price == null) return "Цена не указана";
    if (price === 0) return "Бесплатно";
    return `${price.toLocaleString("ru-RU")} ₽`;
}

// Читаем тип программы по-русски
export function programTypeLabel(type: string) {
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
    const { isAdmin, token } = useAdminAccess();
    const [programMode, setProgramMode] = useState<"create" | "edit">("create");
    const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
    const [programSubmitting, setProgramSubmitting] = useState(false);
    const [programDeleteBusy, setProgramDeleteBusy] = useState<number | null>(null);
    const [programMessage, setProgramMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [programFormResetCounter, setProgramFormResetCounter] = useState(0);

    const [trainingMode, setTrainingMode] = useState<"create" | "edit">("create");
    const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);
    const [trainingSubmitting, setTrainingSubmitting] = useState(false);
    const [trainingDeleteBusy, setTrainingDeleteBusy] = useState<number | null>(null);
    const [trainingMessage, setTrainingMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [trainingFormResetCounter, setTrainingFormResetCounter] = useState(0);

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

    const refreshPrograms = useCallback(async () => {
        try {
            const updated = await getPrograms();
            setPrograms(updated);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const refreshTrainings = useCallback(async () => {
        try {
            const updated = await getPeopleTrainings();
            setTrainings(updated);
        } catch (err) {
            console.error(err);
        }
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

    const sortedPrograms = useMemo(
        () =>
            [...programs].sort((a, b) =>
                a.title.localeCompare(b.title, "ru")
            ),
        [programs]
    );

    const sortedTrainings = useMemo(
        () =>
            [...trainings].sort(
                (a, b) =>
                    new Date(b.startAt).getTime() -
                    new Date(a.startAt).getTime()
            ),
        [trainings]
    );

    const selectedProgram = useMemo(
        () => sortedPrograms.find((p) => p.id === selectedProgramId) ?? null,
        [sortedPrograms, selectedProgramId]
    );

    const selectedTraining = useMemo(
        () => sortedTrainings.find((t) => t.id === selectedTrainingId) ?? null,
        [sortedTrainings, selectedTrainingId]
    );

    const programFormInitialValues = useMemo(() => {
        if (programMode !== "edit" || !selectedProgram) return null;
        return {
            title: selectedProgram.title,
            type: selectedProgram.type,
            price:
                typeof selectedProgram.price === "number"
                    ? String(selectedProgram.price)
                    : "",
            description: selectedProgram.description ?? "",
        };
    }, [programMode, selectedProgram]);

    const trainingFormInitialValues = useMemo(() => {
        if (trainingMode !== "edit" || !selectedTraining) return null;
        return {
            title: selectedTraining.title,
            startAt: selectedTraining.startAt,
            endAt: selectedTraining.endAt ?? "",
            venue: selectedTraining.venue,
            price:
                typeof selectedTraining.price === "number"
                    ? String(selectedTraining.price)
                    : "",
            description: selectedTraining.description ?? "",
        };
    }, [trainingMode, selectedTraining]);

    const programFormResetKey = `${programMode}-${selectedProgramId ?? "none"}-${programFormResetCounter}`;
    const trainingFormResetKey = `${trainingMode}-${selectedTrainingId ?? "none"}-${trainingFormResetCounter}`;

    const handleProgramSubmit = useCallback(
        async (payload: UpsertProgramPayload) => {
            if (!token) {
                setProgramMessage({
                    type: "error",
                    text: "Авторизуйтесь заново, чтобы управлять программами.",
                });
                return;
            }

            setProgramSubmitting(true);
            setProgramMessage(null);

            try {
                if (programMode === "edit" && selectedProgram) {
                    await updateProgram(selectedProgram.id, payload, token);
                    setProgramMessage({
                        type: "success",
                        text: "Программа обновлена.",
                    });
                } else {
                    await createProgram(payload, token);
                    setProgramMessage({
                        type: "success",
                        text: "Новая программа создана.",
                    });
                    setProgramFormResetCounter((v) => v + 1);
                }
                await refreshPrograms();
                if (programMode === "create") {
                    setSelectedProgramId(null);
                }
            } catch (err) {
                console.error(err);
                setProgramMessage({
                    type: "error",
                    text:
                        err instanceof Error
                            ? err.message
                            : "Не удалось сохранить программу.",
                });
            } finally {
                setProgramSubmitting(false);
            }
        },
        [token, programMode, selectedProgram, refreshPrograms]
    );

    const handleProgramDelete = useCallback(
        async (id: number) => {
            if (!token) {
                setProgramMessage({
                    type: "error",
                    text: "Авторизуйтесь заново, чтобы управлять программами.",
                });
                return;
            }

            setProgramDeleteBusy(id);
            setProgramMessage(null);

            try {
                await deleteProgram(id, token);
                setProgramMessage({
                    type: "success",
                    text: "Программа удалена.",
                });
                setSelectedProgramId((prev) => (prev === id ? null : prev));
                await refreshPrograms();
            } catch (err) {
                console.error(err);
                setProgramMessage({
                    type: "error",
                    text:
                        err instanceof Error
                            ? err.message
                            : "Удаление недоступно. Возможно, программа содержит записи.",
                });
            } finally {
                setProgramDeleteBusy(null);
            }
        },
        [token, refreshPrograms]
    );

    const handleTrainingSubmit = useCallback(
        async (payload: UpsertEventPayload) => {
            if (!token) {
                setTrainingMessage({
                    type: "error",
                    text: "Авторизуйтесь заново, чтобы управлять тренингами.",
                });
                return;
            }

            setTrainingSubmitting(true);
            setTrainingMessage(null);

            try {
                if (trainingMode === "edit" && selectedTraining) {
                    await updateTraining(selectedTraining.id, payload, token);
                    setTrainingMessage({
                        type: "success",
                        text: "Тренинг обновлён.",
                    });
                } else {
                    await createTraining(payload, token);
                    setTrainingMessage({
                        type: "success",
                        text: "Новый тренинг создан.",
                    });
                    setTrainingFormResetCounter((v) => v + 1);
                }
                await refreshTrainings();
                if (trainingMode === "create") {
                    setSelectedTrainingId(null);
                }
            } catch (err) {
                console.error(err);
                setTrainingMessage({
                    type: "error",
                    text:
                        err instanceof Error
                            ? err.message
                            : "Не удалось сохранить тренинг.",
                });
            } finally {
                setTrainingSubmitting(false);
            }
        },
        [token, trainingMode, selectedTraining, refreshTrainings]
    );

    const handleTrainingDelete = useCallback(
        async (id: number) => {
            if (!token) {
                setTrainingMessage({
                    type: "error",
                    text: "Авторизуйтесь заново, чтобы управлять тренингами.",
                });
                return;
            }

            setTrainingDeleteBusy(id);
            setTrainingMessage(null);

            try {
                await deleteTraining(id, token);
                setTrainingMessage({
                    type: "success",
                    text: "Тренинг удалён.",
                });
                setSelectedTrainingId((prev) => (prev === id ? null : prev));
                await refreshTrainings();
            } catch (err) {
                console.error(err);
                setTrainingMessage({
                    type: "error",
                    text:
                        err instanceof Error
                            ? err.message
                            : "Удаление недоступно. Возможно, есть зарегистрированные участники.",
                });
            } finally {
                setTrainingDeleteBusy(null);
            }
        },
        [token, refreshTrainings]
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

            {isAdmin && (
                <section className="rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-black/5 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Панель администратора
                            </p>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Управление программами и тренингами
                            </h2>
                        </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                        <div className="space-y-4 rounded-3xl border border-dashed border-gray-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Программы для собак
                                </h3>
                                <div className="rounded-2xl bg-gray-100 p-1 text-sm font-medium text-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProgramMode("create");
                                            setSelectedProgramId(null);
                                        }}
                                        className={`rounded-xl px-3 py-1.5 transition ${
                                            programMode === "create"
                                                ? "bg-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                        Новая программа
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProgramMode("edit")}
                                        className={`rounded-xl px-3 py-1.5 transition ${
                                            programMode === "edit"
                                                ? "bg-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                        Редактирование
                                    </button>
                                </div>
                            </div>

                            <AdminProgramForm
                                heading={
                                    programMode === "create"
                                        ? "Создание программы"
                                        : selectedProgram
                                            ? `Редактирование: ${selectedProgram.title}`
                                            : "Выберите программу ниже"
                                }
                                subheading="Заполняйте карточку и обновляйте расписание без перехода в другие вкладки."
                                submitLabel={
                                    programMode === "create"
                                        ? "Создать программу"
                                        : "Сохранить программу"
                                }
                                submitting={programSubmitting}
                                initialValues={programFormInitialValues}
                                resetKey={programFormResetKey}
                                onSubmit={handleProgramSubmit}
                                actionSlot={
                                    programMode === "edit" && selectedProgram ? (
                                        <button
                                            type="button"
                                            onClick={() => handleProgramDelete(selectedProgram.id)}
                                            disabled={
                                                programDeleteBusy === selectedProgram.id ||
                                                selectedProgram.registeredDogsCount > 0
                                            }
                                            className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                        >
                                            {programDeleteBusy === selectedProgram.id
                                                ? "Удаляем…"
                                                : "Удалить"}
                                        </button>
                                    ) : undefined
                                }
                            />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Список программ
                                    </h4>
                                    <span className="text-xs text-gray-500">
                                        Всего: {programs.length}
                                    </span>
                                </div>
                                <div className="max-h-[320px] space-y-3 overflow-auto pr-1">
                                    {sortedPrograms.map((program) => (
                                        <div
                                            key={program.id}
                                            className={`rounded-2xl border px-3 py-2 text-sm shadow-sm transition ${
                                                selectedProgramId === program.id
                                                    ? "border-black/40 bg-black/5"
                                                    : "border-gray-200 bg-white hover:border-black/20"
                                            }`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {program.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {programTypeLabel(program.type)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                                                            program.registeredDogsCount > 0
                                                                ? "bg-amber-100 text-amber-900"
                                                                : "bg-emerald-100 text-emerald-800"
                                                        }`}
                                                    >
                                                        {program.registeredDogsCount > 0
                                                            ? `Собак: ${program.registeredDogsCount}`
                                                            : "Нет записей"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setProgramMode("edit");
                                                            setSelectedProgramId(program.id);
                                                        }}
                                                        className="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black"
                                                    >
                                                        Редактировать
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleProgramDelete(program.id)}
                                                        disabled={
                                                            program.registeredDogsCount > 0 ||
                                                            programDeleteBusy === program.id
                                                        }
                                                        className="rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                                    >
                                                        {programDeleteBusy === program.id
                                                            ? "Удаляем…"
                                                            : "Удалить"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {programMessage && (
                                    <p
                                        className={`text-xs ${
                                            programMessage.type === "success"
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {programMessage.text}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 rounded-3xl border border-dashed border-gray-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Тренинги для владельцев
                                </h3>
                                <div className="rounded-2xl bg-gray-100 p-1 text-sm font-medium text-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTrainingMode("create");
                                            setSelectedTrainingId(null);
                                        }}
                                        className={`rounded-xl px-3 py-1.5 transition ${
                                            trainingMode === "create"
                                                ? "bg-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                        Новый тренинг
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTrainingMode("edit")}
                                        className={`rounded-xl px-3 py-1.5 transition ${
                                            trainingMode === "edit"
                                                ? "bg-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                        }`}
                                    >
                                        Редактирование
                                    </button>
                                </div>
                            </div>

                            <AdminEventForm
                                heading={
                                    trainingMode === "create"
                                        ? "Создание тренинга"
                                        : selectedTraining
                                            ? `Редактирование: ${selectedTraining.title}`
                                            : "Выберите тренинг ниже"
                                }
                                subheading="Категория «Образование» проставляется автоматически."
                                submitLabel={
                                    trainingMode === "create"
                                        ? "Создать тренинг"
                                        : "Сохранить тренинг"
                                }
                                submitting={trainingSubmitting}
                                initialValues={trainingFormInitialValues}
                                showCategoryField={false}
                                accent="violet"
                                resetKey={trainingFormResetKey}
                                onSubmit={handleTrainingSubmit}
                                actionSlot={
                                    trainingMode === "edit" && selectedTraining ? (
                                        <button
                                            type="button"
                                            onClick={() => handleTrainingDelete(selectedTraining.id)}
                                            disabled={
                                                trainingDeleteBusy === selectedTraining.id ||
                                                (selectedTraining.registeredCount ?? 0) > 0
                                            }
                                            className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                        >
                                            {trainingDeleteBusy === selectedTraining.id
                                                ? "Удаляем…"
                                                : "Удалить"}
                                        </button>
                                    ) : undefined
                                }
                            />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Список тренингов
                                    </h4>
                                    <span className="text-xs text-gray-500">
                                        Всего: {trainings.length}
                                    </span>
                                </div>
                                <div className="max-h-[320px] space-y-3 overflow-auto pr-1">
                                    {sortedTrainings.map((training) => (
                                        <div
                                            key={training.id}
                                            className={`rounded-2xl border px-3 py-2 text-sm shadow-sm transition ${
                                                selectedTrainingId === training.id
                                                    ? "border-black/40 bg-black/5"
                                                    : "border-gray-200 bg-white hover:border-black/20"
                                            }`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {training.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(training.startAt).toLocaleString(
                                                            "ru-RU",
                                                            {
                                                                day: "2-digit",
                                                                month: "short",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            }
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                                                            (training.registeredCount ?? 0) > 0
                                                                ? "bg-amber-100 text-amber-900"
                                                                : "bg-emerald-100 text-emerald-800"
                                                        }`}
                                                    >
                                                        {(training.registeredCount ?? 0) > 0
                                                            ? `Записано: ${training.registeredCount}`
                                                            : "Нет записей"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTrainingMode("edit");
                                                            setSelectedTrainingId(training.id);
                                                        }}
                                                        className="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black"
                                                    >
                                                        Редактировать
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTrainingDelete(training.id)}
                                                        disabled={
                                                            (training.registeredCount ?? 0) > 0 ||
                                                            trainingDeleteBusy === training.id
                                                        }
                                                        className="rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                                    >
                                                        {trainingDeleteBusy === training.id
                                                            ? "Удаляем…"
                                                            : "Удалить"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {trainingMessage && (
                                    <p
                                        className={`text-xs ${
                                            trainingMessage.type === "success"
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {trainingMessage.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

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