import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    getEvents,
    type ApiEventRow,
    createEvent,
    updateEvent,
    deleteEvent,
    type UpsertEventPayload,
} from "../api/client";
import EventCard from "../components/EventCard";
import AdminEventForm from "../components/AdminEventForm";
import { useAdminAccess } from "../hooks/useAdminAccess";

export default function Events() {
    const [events, setEvents] = useState<ApiEventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [category, setCategory] = useState<string>("all");
    const { isAdmin, token } = useAdminAccess();
    const [adminMode, setAdminMode] = useState<"create" | "edit">("create");
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [eventSubmitting, setEventSubmitting] = useState(false);
    const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
    const [eventMessage, setEventMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [eventFormResetCounter, setEventFormResetCounter] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        getEvents()
            .then((data) => {
                if (cancelled) return;
                setEvents(data);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) setError("Не удалось загрузить события.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const refreshEventsSilently = useCallback(async () => {
        try {
            const updated = await getEvents();
            setEvents(updated);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const categories = useMemo(() => {
        const set = new Set<string>();
        for (const ev of events) {
            if (ev.category) set.add(ev.category);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
    }, [events]);

    const filtered = useMemo(() => {
        const text = q.trim().toLowerCase();
        return [...events].filter((ev) => {
            const okCategory = category === "all" || ev.category === category;

            const okText =
                text.length === 0 ||
                ev.title.toLowerCase().includes(text) ||
                ev.venue.toLowerCase().includes(text) ||
                (ev.description ?? "").toLowerCase().includes(text);

            return okCategory && okText;
        });
    }, [events, q, category]);

    // делим на ближайшие и прошедшие
    const now = Date.now();

    const upcoming = useMemo(
        () =>
            filtered
                .filter((ev) => new Date(ev.startAt).getTime() >= now)
                .sort(
                    (a, b) =>
                        new Date(a.startAt).getTime() -
                        new Date(b.startAt).getTime()
                ),
        [filtered, now]
    );

    const past = useMemo(
        () =>
            filtered
                .filter((ev) => new Date(ev.startAt).getTime() < now)
                .sort(
                    (a, b) =>
                        new Date(b.startAt).getTime() -
                        new Date(a.startAt).getTime()
                ),
        [filtered, now]
    );

    const adminEvents = useMemo(
        () =>
            [...events].sort(
                (a, b) =>
                    new Date(b.startAt).getTime() -
                    new Date(a.startAt).getTime()
            ),
        [events]
    );

    const selectedEvent = useMemo(
        () => adminEvents.find((ev) => ev.id === selectedEventId) ?? null,
        [adminEvents, selectedEventId]
    );

    const adminFormInitialValues = useMemo(() => {
        if (adminMode !== "edit" || !selectedEvent) return null;
        return {
            title: selectedEvent.title,
            category: selectedEvent.category ?? "",
            startAt: selectedEvent.startAt,
            endAt: selectedEvent.endAt ?? "",
            venue: selectedEvent.venue,
            price:
                typeof selectedEvent.price === "number"
                    ? String(selectedEvent.price)
                    : "",
            description: selectedEvent.description ?? "",
        };
    }, [adminMode, selectedEvent]);

    const adminFormResetKey = `${adminMode}-${selectedEventId ?? "none"}-${eventFormResetCounter}`;

    const handleAdminEventSubmit = useCallback(
        async (payload: UpsertEventPayload) => {
            if (!token) {
                setEventMessage({
                    type: "error",
                    text: "Авторизуйтесь заново, чтобы редактировать события.",
                });
                return;
            }

            setEventSubmitting(true);
            setEventMessage(null);

            try {
                if (adminMode === "edit" && selectedEvent) {
                    await updateEvent(selectedEvent.id, payload, token);
                    setEventMessage({
                        type: "success",
                        text: "Событие обновлено.",
                    });
                } else {
                    await createEvent(payload, token);
                    setEventMessage({
                        type: "success",
                        text: "Новое событие добавлено.",
                    });
                    setEventFormResetCounter((v) => v + 1);
                }
                await refreshEventsSilently();
                if (adminMode === "create") {
                    setSelectedEventId(null);
                }
            } catch (err) {
                console.error(err);
                setEventMessage({
                    type: "error",
                    text:
                        err instanceof Error
                            ? err.message
                            : "Не удалось сохранить событие.",
                });
            } finally {
                setEventSubmitting(false);
            }
        },
        [token, adminMode, selectedEvent, refreshEventsSilently]
    );

    const handleDeleteEvent = useCallback(
        async (id: number) => {
            if (!token) {
                setEventMessage({
                    type: "error",
                    text: "Авторизуйтесь заново, чтобы управлять событиями.",
                });
                return;
            }
            setDeleteBusyId(id);
            setEventMessage(null);
            try {
                await deleteEvent(id, token);
                setEventMessage({
                    type: "success",
                    text: "Событие удалено.",
                });
                setSelectedEventId((prev) => (prev === id ? null : prev));
                await refreshEventsSilently();
            } catch (err) {
                console.error(err);
                setEventMessage({
                    type: "error",
                    text:
                        err instanceof Error
                            ? err.message
                            : "Удаление недоступно. Возможно, есть зарегистрированные участники.",
                });
            } finally {
                setDeleteBusyId(null);
            }
        },
        [token, refreshEventsSilently]
    );

    return (
        <section className="space-y-4">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">События клуба</h1>
                <p className="text-sm text-gray-700">
                    Здесь собраны культурно-массовые мероприятия DogHub: прогулки,
                    митапы, фотосессии и другие активности клуба.
                </p>
            </header>

            {isAdmin && (
                <section className="rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-black/5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Режим администратора
                            </p>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Управление событиями
                            </h2>
                        </div>
                        <div className="rounded-2xl bg-gray-100 p-1 text-sm font-medium text-gray-700">
                            <button
                                type="button"
                                onClick={() => setAdminMode("create")}
                                className={`rounded-xl px-3 py-1.5 transition ${
                                    adminMode === "create"
                                        ? "bg-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                Новое событие
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdminMode("edit")}
                                className={`rounded-xl px-3 py-1.5 transition ${
                                    adminMode === "edit"
                                        ? "bg-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                Редактирование
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <AdminEventForm
                            heading={
                                adminMode === "create"
                                    ? "Новое событие"
                                    : selectedEvent
                                        ? `Редактирование: ${selectedEvent.title}`
                                        : "Выберите событие справа"
                            }
                            subheading={
                                adminMode === "create"
                                    ? "Заполните поля, чтобы моментально добавить встречу в ленту."
                                    : "Все изменения сохраняются сразу после нажатия кнопки."
                            }
                            submitLabel={
                                adminMode === "create"
                                    ? "Создать событие"
                                    : "Сохранить изменения"
                            }
                            submitting={eventSubmitting}
                            initialValues={adminFormInitialValues}
                            resetKey={adminFormResetKey}
                            onSubmit={handleAdminEventSubmit}
                            actionSlot={
                                adminMode === "edit" && selectedEvent ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                                        disabled={
                                            deleteBusyId === selectedEvent.id ||
                                            (selectedEvent.registeredCount ?? 0) > 0
                                        }
                                        className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                    >
                                        {deleteBusyId === selectedEvent.id
                                            ? "Удаляем…"
                                            : "Удалить"}
                                    </button>
                                ) : undefined
                            }
                        />

                        <div className="space-y-3 rounded-3xl border border-dashed border-gray-200 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    События клуба
                                </h3>
                                <span className="text-xs text-gray-500">
                                    Всего: {events.length}
                                </span>
                            </div>
                            <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
                                {adminEvents.map((ev) => (
                                    <div
                                        key={ev.id}
                                        className={`rounded-2xl border px-3 py-2 text-sm shadow-sm transition ${
                                            selectedEventId === ev.id
                                                ? "border-black/40 bg-black/5"
                                                : "border-gray-200 bg-white hover:border-black/20"
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {ev.title}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(ev.startAt).toLocaleString("ru-RU", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {ev.registeredCount !== undefined && (
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                                                            ev.registeredCount > 0
                                                                ? "bg-amber-100 text-amber-900"
                                                                : "bg-emerald-100 text-emerald-800"
                                                        }`}
                                                    >
                                                        {ev.registeredCount > 0
                                                            ? `Записано: ${ev.registeredCount}`
                                                            : "Пока без записей"}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAdminMode("edit");
                                                        setSelectedEventId(ev.id);
                                                    }}
                                                    className="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black"
                                                >
                                                    Редактировать
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteEvent(ev.id)}
                                                    disabled={
                                                        (ev.registeredCount ?? 0) > 0 ||
                                                        deleteBusyId === ev.id
                                                    }
                                                    className="rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                                >
                                                    {deleteBusyId === ev.id
                                                        ? "Удаляем…"
                                                        : "Удалить"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {eventMessage && (
                                <p
                                    className={`text-xs ${
                                        eventMessage.type === "success"
                                            ? "text-emerald-600"
                                            : "text-red-600"
                                    }`}
                                >
                                    {eventMessage.text}
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* фильтры */}
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Поиск по названию, месту или описанию…"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black sm:w-80"
                />

                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black sm:w-56"
                >
                    <option value="all">Все категории</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>

                <div className="ml-auto text-xs text-gray-500">
                    {loading
                        ? "Загружаем события…"
                        : `Найдено: ${filtered.length}`}
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}

            {!loading && !error && filtered.length === 0 && (
                <p className="text-gray-600">
                    Событий не найдено. Попробуйте изменить фильтры или загляните
                    позже.
                </p>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="space-y-5">
                    {upcoming.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold">Ближайшие</h2>
                            {upcoming.map((ev) => (
                                <Link key={ev.id} to={`/events/${ev.id}`} className="block">
                                    <EventCard ev={ev} />
                                </Link>
                            ))}
                        </div>
                    )}

                    {past.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold">Прошедшие</h2>
                            {past.map((ev) => (
                                <Link key={ev.id} to={`/events/${ev.id}`} className="block">
                                    <EventCard ev={ev} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}