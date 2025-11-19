import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getEvent,
    getEventDogs,
    type ApiEventRow,
    type ApiEventDogRow,
    type ApiDog,             // ← добавили тип
} from "../api/client";
import EventCard from "../components/EventCard";
import DogCard from "../components/DogCard";

export default function EventDetails() {
    const { id } = useParams<{ id: string }>();

    const [event, setEvent] = useState<ApiEventRow | null>(null);
    const [dogs, setDogs] = useState<ApiEventDogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const eventId = useMemo(
        () => (id ? Number(id) : NaN),
        [id]
    );

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

    // маппинг ApiEventDogRow → ApiDog для использования существующего DogCard
    const dogsForCards: ApiDog[] = dogs.map((d) => ({
        dogId: d.dogId,
        dogName: d.dogName,
        breed: d.breed,
        sex: d.sex,
        birthDate: d.birthDate ?? null,
        chipNumber: d.chipNumber ?? null,
        photo: d.photo ?? null,          // ← тут теперь берём фото из БД
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