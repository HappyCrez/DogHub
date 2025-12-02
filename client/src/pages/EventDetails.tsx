import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getEvent,
    getEventDogs,
    type ApiEventRow,
    type ApiEventDogRow,
    type ApiDog,
    registerDogForEvent,
    unregisterDogFromEvent,
} from "../api/client";
import EventCard from "../components/EventCard";
import DogCard from "../components/DogCard";
import { useAuth } from "../auth/AuthContext";
import { useCurrentMember } from "../hooks/useCurrentMember";

export default function EventDetails() {
    const { id } = useParams<{ id: string }>();

    const [event, setEvent] = useState<ApiEventRow | null>(null);
    const [dogs, setDogs] = useState<ApiEventDogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDogId, setSelectedDogId] = useState<number | "">("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);
    const [cancellingDogId, setCancellingDogId] = useState<number | null>(null);

    const eventId = useMemo(
        () => (id ? Number(id) : NaN),
        [id]
    );

    const { token, isAuthenticated } = useAuth();
    const {
        dogs: myDogs,
        loading: memberLoading,
        error: memberError,
    } = useCurrentMember();

    useEffect(() => {
        if (
            selectedDogId !== "" &&
            !myDogs.some((dog) => dog.id === selectedDogId)
        ) {
            setSelectedDogId("");
        }
    }, [myDogs, selectedDogId]);

    useEffect(() => {
        if (!id || Number.isNaN(eventId)) return;
        let cancelled = false;

        setLoading(true);
        setError(null);

        Promise.all([getEvent(eventId), getEventDogs(eventId)])
            .then(([ev, dogsData]) => {
                if (cancelled) return;
                setEvent(ev);
                setDogs(dogsData);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Не удалось загрузить данные о событии"
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [eventId, id]);

    const refreshEventDogs = useCallback(async () => {
        if (Number.isNaN(eventId)) return;
        try {
            const updated = await getEventDogs(eventId);
            setDogs(updated);
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Не удалось обновить список записей."
            );
        }
    }, [eventId]);

    // Derived collections зависят только от стейта, поэтому
    // считаем их до условных возвратов, чтобы не ломать порядок хуков
    const dogsForCards = useMemo<ApiDog[]>(() => {
        return dogs.map((d) => ({
            dogId: d.dogId,
            dogName: d.dogName,
            breed: d.breed,
            sex: d.sex,
            birthDate: d.birthDate ?? null,
            chipNumber: d.chipNumber ?? null,
            photo: d.photo ?? null,
            tags: d.tags ?? null,
            bio: d.bio ?? null,
            ownerName: d.ownerFullName,
            ownerPhone: null,
            ownerEmail: null,
        }));
    }, [dogs]);

    const registeredDogIds = useMemo(
        () => new Set(dogs.map((d) => d.dogId)),
        [dogs]
    );

    const availableDogs = useMemo(
        () => myDogs.filter((dog) => !registeredDogIds.has(dog.id)),
        [myDogs, registeredDogIds]
    );

    const myRegisteredDogs = useMemo(
        () => myDogs.filter((dog) => registeredDogIds.has(dog.id)),
        [myDogs, registeredDogIds]
    );

    const isEventPast = useMemo(() => {
        if (!event) return false;
        const dateStr = event.endAt ?? event.startAt;
        const date = dateStr ? new Date(dateStr) : null;
        return date ? date.getTime() < Date.now() : false;
    }, [event]);

    if (!id || Number.isNaN(eventId)) {
        return (
            <section>
                <p className="text-sm text-red-600">
                    Некорректный идентификатор события.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/events" className="text-amber-700 hover:underline">
                        ← Вернуться к списку событий
                    </Link>
                </p>
            </section>
        );
    }

    if (loading) {
        return (
            <section>
                <p className="text-gray-600">Загружаем данные события…</p>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <p className="text-sm text-red-600">{error}</p>
                <p className="mt-2 text-sm">
                    <Link to="/events" className="text-amber-700 hover:underline">
                        ← Вернуться к списку событий
                    </Link>
                </p>
            </section>
        );
    }

    if (!event) {
        return (
            <section>
                <p className="text-sm text-red-600">
                    Событие с таким id не найдено.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/events" className="text-amber-700 hover:underline">
                        ← Вернуться к списку событий
                    </Link>
                </p>
            </section>
        );
    }

    async function handleRegisterDog() {
        if (!token) {
            setActionError("Авторизуйтесь, чтобы записать собаку.");
            return;
        }
        if (Number.isNaN(eventId)) return;
        if (isEventPast) {
            setActionError("Это событие уже прошло — запись закрыта.");
            return;
        }

        const dogId =
            typeof selectedDogId === "number"
                ? selectedDogId
                : Number(selectedDogId);

        if (!dogId) {
            setActionError("Выберите собаку, чтобы записаться на событие.");
            return;
        }

        setRegistering(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            await registerDogForEvent(eventId, dogId, token);
            setActionSuccess("Собака успешно записана на событие.");
            setSelectedDogId("");
            await refreshEventDogs();
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Не удалось записать собаку. Попробуйте ещё раз."
            );
        } finally {
            setRegistering(false);
        }
    }

    async function handleCancelRegistration(dogId: number) {
        if (!token) {
            setActionError("Авторизуйтесь, чтобы управлять записями.");
            return;
        }
        if (Number.isNaN(eventId)) return;
        if (isEventPast) {
            setActionError("Нельзя менять записи для прошедшего события.");
            return;
        }

        setCancellingDogId(dogId);
        setActionError(null);
        setActionSuccess(null);
        try {
            await unregisterDogFromEvent(eventId, dogId, token);
            setActionSuccess("Запись собаки отменена.");
            await refreshEventDogs();
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Не удалось снять собаку с события."
            );
        } finally {
            setCancellingDogId(null);
        }
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <Link
                    to="/events"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                >
                    ← Все события
                </Link>
            </div>

            {/* карточка события */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <EventCard ev={event} />
            </div>

            {/* управление своими записями */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Мои собаки</h2>
                    {myRegisteredDogs.length > 0 && (
                        <span className="text-xs text-gray-500">
                            Уже записаны: {myRegisteredDogs.length}
                        </span>
                    )}
                </div>

                {isEventPast ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                        <p className="font-semibold">Событие завершилось</p>
                        <p className="text-amber-800/80">
                            Запись и управление участием недоступны. Загляните в другие мероприятия клуба.
                        </p>
                    </div>
                ) : !isAuthenticated ? (
                    <p className="text-sm text-gray-600">
                        <Link
                            to="/auth"
                            className="text-amber-700 underline-offset-2 hover:underline"
                        >
                            Войдите
                        </Link>
                        , чтобы записывать своих собак на события клуба.
                    </p>
                ) : memberLoading ? (
                    <p className="text-sm text-gray-600">
                        Загружаем список ваших собак…
                    </p>
                ) : memberError ? (
                    <p className="text-sm text-red-600">{memberError}</p>
                ) : myDogs.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        У вас пока нет добавленных собак. Вы можете добавить
                        питомца в{" "}
                        <Link
                            to="/account"
                            className="text-amber-700 underline-offset-2 hover:underline"
                        >
                            личном кабинете
                        </Link>
                        .
                    </p>
                ) : (
                    <div className="space-y-4">
                        {actionError && (
                            <p className="text-xs text-red-600">{actionError}</p>
                        )}
                        {actionSuccess && (
                            <p className="text-xs text-emerald-600">
                                {actionSuccess}
                            </p>
                        )}

                        {availableDogs.length > 0 ? (
                            <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Выберите собаку
                                    </label>
                                    <select
                                        value={selectedDogId === "" ? "" : selectedDogId}
                                        onChange={(e) =>
                                            setSelectedDogId(
                                                e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value)
                                            )
                                        }
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                                    >
                                        <option value="">— Выбрать собаку —</option>
                                        {availableDogs.map((dog) => (
                                            <option key={dog.id} value={dog.id}>
                                                {dog.name}
                                                {dog.breed ? ` (${dog.breed})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleRegisterDog}
                                    disabled={
                                        registering ||
                                        selectedDogId === "" ||
                                        !token ||
                                        isEventPast
                                    }
                                    className="inline-flex min-w-[180px] items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                    {registering ? "Записываем…" : "Записать собаку"}
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">
                                Все ваши собаки уже записаны на это событие.
                            </p>
                        )}

                        {myRegisteredDogs.length > 0 && (
                            <div>
                                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Уже участвуют
                                </h3>
                                <ul className="space-y-2">
                                    {myRegisteredDogs.map((dog) => (
                                        <li
                                            key={dog.id}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {dog.name}
                                                </p>
                                                {dog.breed && (
                                                    <p className="text-xs text-gray-500">
                                                        {dog.breed}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleCancelRegistration(dog.id)
                                                }
                                                disabled={
                                                    cancellingDogId === dog.id ||
                                                    !token ||
                                                    isEventPast
                                                }
                                                className="text-xs font-semibold text-amber-700 underline-offset-2 hover:underline disabled:text-gray-400"
                                            >
                                                {cancellingDogId === dog.id
                                                    ? "Снимаем…"
                                                    : "Отменить запись"}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* собаки на событии */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">Записанные собаки</h2>
                    <span className="text-xs text-gray-500">
                        Найдено: {dogsForCards.length}
                    </span>
                </div>

                {dogsForCards.length === 0 ? (
                    <p className="text-gray-600">
                        На это событие пока никто не записан.
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {dogsForCards.map((dog) => (
                            <DogCard key={dog.dogId} dog={dog} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}