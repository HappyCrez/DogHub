import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getPrograms,
    getProgramDogs,
    type ApiProgramRow,
    type ApiProgramDogRow,
    type ApiDog,
    registerDogForProgram,
    unregisterDogFromProgram,
} from "../api/client";
import DogCard from "../components/DogCard";
import { useAuth } from "../auth/AuthContext";
import { useCurrentMember } from "../hooks/useCurrentMember";

function formatPrice(price: number | null) {
    if (price == null) return "Цена не указана";
    if (price === 0) return "Бесплатно";
    return `${price.toLocaleString("ru-RU")} ₽`;
}

function programTypeLabel(type: string) {
    if (type === "GROUP") return "Групповая";
    if (type === "PERSONAL") return "Персональная";
    return type;
}

export default function ProgramDetails() {
    const { id } = useParams<{ id: string }>();

    const [program, setProgram] = useState<ApiProgramRow | null>(null);
    const [dogs, setDogs] = useState<ApiProgramDogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDogId, setSelectedDogId] = useState<number | "">("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);
    const [cancellingDogId, setCancellingDogId] = useState<number | null>(null);

    const programId = useMemo(
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
        if (!id || Number.isNaN(programId)) return;
        let cancelled = false;

        setLoading(true);
        setError(null);

        // Берём все программы, находим нужную и параллельно тянем собак
        Promise.all([getPrograms(), getProgramDogs(programId)])
            .then(([allPrograms, dogsRows]) => {
                if (cancelled) return;
                setProgram(allPrograms.find((p) => p.id === programId) ?? null);
                setDogs(dogsRows);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Не удалось загрузить данные программы"
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, programId]);

    const refreshProgramDogs = useCallback(async () => {
        if (Number.isNaN(programId)) return;
        try {
            const updated = await getProgramDogs(programId);
            setDogs(updated);
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Не удалось обновить список записей."
            );
        }
    }, [programId]);

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

    if (!id || Number.isNaN(programId)) {
        return (
            <section>
                <p className="text-sm text-red-600">
                    Некорректный идентификатор программы.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к списку программ
                    </Link>
                </p>
            </section>
        );
    }

    if (loading) {
        return (
            <section>
                <p className="text-gray-600">Загружаем программу…</p>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <p className="text-sm text-red-600">{error}</p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к списку программ
                    </Link>
                </p>
            </section>
        );
    }

    if (!program) {
        return (
            <section>
                <p className="text-sm text-red-600">
                    Программа с таким id не найдена.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к списку программ
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
        if (Number.isNaN(programId)) return;

        const dogId =
            typeof selectedDogId === "number"
                ? selectedDogId
                : Number(selectedDogId);

        if (!dogId) {
            setActionError("Выберите собаку, чтобы записаться на программу.");
            return;
        }

        setRegistering(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            await registerDogForProgram(programId, dogId, token);
            setActionSuccess("Собака записана на программу.");
            setSelectedDogId("");
            await refreshProgramDogs();
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
        if (Number.isNaN(programId)) return;

        setCancellingDogId(dogId);
        setActionError(null);
        setActionSuccess(null);
        try {
            await unregisterDogFromProgram(programId, dogId, token);
            setActionSuccess("Собака снята с программы.");
            await refreshProgramDogs();
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Не удалось отменить запись."
            );
        } finally {
            setCancellingDogId(null);
        }
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <Link
                    to="/training"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                >
                    ← Все программы
                </Link>
            </div>

            {/* карточка программы */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <h1 className="text-lg font-semibold">{program.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                        {programTypeLabel(program.type)}
                    </span>
                    <span>{formatPrice(program.price)}</span>
                    <span className="text-gray-400">
                        Записано собак: {program.registeredDogsCount}
                    </span>
                </div>
                {program.description && (
                    <p className="mt-3 text-sm text-gray-700">
                        {program.description}
                    </p>
                )}
            </div>

            {/* управление своими собаками */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Мои собаки</h2>
                    {myRegisteredDogs.length > 0 && (
                        <span className="text-xs text-gray-500">
                            Уже на программе: {myRegisteredDogs.length}
                        </span>
                    )}
                </div>

                {!isAuthenticated ? (
                    <p className="text-sm text-gray-600">
                        <Link
                            to="/auth"
                            className="text-amber-700 underline-offset-2 hover:underline"
                        >
                            Войдите
                        </Link>
                        , чтобы записывать собак на программы DogHub.
                    </p>
                ) : memberLoading ? (
                    <p className="text-sm text-gray-600">
                        Загружаем список ваших собак…
                    </p>
                ) : memberError ? (
                    <p className="text-sm text-red-600">{memberError}</p>
                ) : myDogs.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        У вас пока нет добавленных собак. Создайте карточку питомца в{" "}
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
                                        registering || selectedDogId === "" || !token
                                    }
                                    className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                    {registering ? "Записываем…" : "Записать собаку"}
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">
                                Все ваши собаки уже участвуют в этой программе.
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
                                                    cancellingDogId === dog.id || !token
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

            {/* собаки на программе */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">Записанные собаки</h2>
                    <span className="text-xs text-gray-500">
                        Найдено: {dogsForCards.length}
                    </span>
                </div>

                {dogsForCards.length === 0 ? (
                    <p className="text-gray-600">
                        На эту программу пока никто не записан.
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