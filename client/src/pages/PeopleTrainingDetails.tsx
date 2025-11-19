import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getPeopleTrainings,
    getEventMembers,
    type ApiPeopleTrainingRow,
    type ApiEventMemberRow,
} from "../api/client";
import EventCard from "../components/EventCard";
import MemberCard, { type MemberWithDogs } from "../components/MemberCard";

export default function PeopleTrainingDetails() {
    const { id } = useParams<{ id: string }>();

    const [training, setTraining] = useState<ApiPeopleTrainingRow | null>(null);
    const [participants, setParticipants] = useState<ApiEventMemberRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const trainingId = useMemo(
        () => (id ? Number(id) : NaN),
        [id]
    );

    useEffect(() => {
        if (!id || Number.isNaN(trainingId)) return;
        let cancelled = false;

        setLoading(true);
        setError(null);

        Promise.all([getPeopleTrainings(), getEventMembers(trainingId)])
            .then(([allTrainings, members]) => {
                if (cancelled) return;

                const tr = allTrainings.find((t) => t.id === trainingId) ?? null;
                setTraining(tr);
                setParticipants(members);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Не удалось загрузить данные о тренинге"
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, trainingId]);

    if (!id || Number.isNaN(trainingId)) {
        return (
            <section>
                <p className="text-sm text-red-600">
                    Некорректный идентификатор тренинга.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к разделу «Обучение»
                    </Link>
                </p>
            </section>
        );
    }

    if (loading) {
        return (
            <section>
                <p className="text-gray-600">Загружаем тренинг…</p>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <p className="text-sm text-red-600">{error}</p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к разделу «Обучение»
                    </Link>
                </p>
            </section>
        );
    }

    if (!training) {
        return (
            <section>
                <p className="text-gray-600">
                    Тренинг не найден. Возможно, он относится к другому разделу.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/training" className="text-amber-700 hover:underline">
                        ← Вернуться к разделу «Обучение»
                    </Link>
                </p>
            </section>
        );
    }

    // Преобразуем участников в формат MemberWithDogs для переиспользования MemberCard
    const membersForCards: MemberWithDogs[] = participants.map((m) => ({
        id: m.memberId,
        fullName: m.fullName,
        city: m.city,
        avatar: m.avatarUrl ?? undefined,
        bio: m.bio ?? undefined,
        phone: m.phone ?? undefined,
        email: m.email ?? undefined,
        joinDate: m.joinDate ?? undefined,
        membershipEndDate: m.membershipEndDate ?? undefined,
        dogs: [], // здесь нас интересуют именно владельцы, собак не подгружаем
    }));

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <Link
                    to="/training"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                >
                    ← Обучение
                </Link>
            </div>

            {/* карточка самого тренинга */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <EventCard ev={training} />
            </div>

            {/* участники тренинга */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">Участники тренинга</h2>
                    <span className="text-xs text-gray-500">
                        Найдено: {membersForCards.length}
                    </span>
                </div>

                {membersForCards.length === 0 ? (
                    <p className="text-gray-600">
                        На этот тренинг пока никто не записан.
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {membersForCards.map((m) => (
                            <MemberCard key={m.id} member={m} showDogs={false} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}