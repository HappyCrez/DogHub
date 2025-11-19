import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getPrograms,
    getProgramDogs,
    type ApiProgramRow,
    type ApiProgramDogRow,
    type ApiDog,
} from "../api/client";
import DogCard from "../components/DogCard";

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

    const programId = useMemo(
        () => (id ? Number(id) : NaN),
        [id]
    );

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

    // Преобразуем ApiProgramDogRow → ApiDog для DogCard
    const dogsForCards: ApiDog[] = dogs.map((d) => ({
        dogId: d.dogId,
        dogName: d.dogName,
        breed: d.breed,
        sex: d.sex,
        birthDate: d.birthDate ?? null,
        chipNumber: d.chipNumber ?? null,
        photo: d.photo ?? null,           // ← теперь берём фото
        tags: d.tags ?? null,
        bio: d.bio ?? null,
        ownerName: d.ownerFullName,
        ownerPhone: null,
        ownerEmail: null,
    }));

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