import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getUsers, type ApiUserWithDogRow } from "../api/client";
import type { MemberWithDogs } from "../components/MemberCard";
import { formatJoined } from "../components/MemberCard";
import  { groupUsers } from "./Members.tsx"

export default function MemberProfile() {
    const { id } = useParams<{ id: string }>();
    const [rows, setRows] = useState<ApiUserWithDogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const memberId = useMemo(
        () => (id ? Number(id) : NaN),
        [id]
    );

    useEffect(() => {
        let cancelled = false;

        getUsers()
            .then((data) => {
                if (cancelled) return;
                setRows(data);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) {
                    setError("Не удалось загрузить данные участника.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const member: MemberWithDogs | undefined = useMemo(() => {
        if (!Number.isFinite(memberId)) return undefined;
        const grouped = groupUsers(rows);
        return grouped.find((m) => m.id === memberId);
    }, [rows, memberId]);

    if (!id || Number.isNaN(memberId)) {
        return (
            <section>
                <p className="text-red-600 text-sm">
                    Некорректный идентификатор участника.
                </p>
            </section>
        );
    }

    if (loading) {
        return (
            <section>
                <p className="text-gray-600">Загружаем профиль участника…</p>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <p className="text-red-600 text-sm">{error}</p>
                <p className="mt-2 text-sm">
                    <Link to="/members" className="text-amber-700 hover:underline">
                        ← Вернуться к списку участников
                    </Link>
                </p>
            </section>
        );
    }

    if (!member) {
        return (
            <section>
                <p className="text-gray-600">
                    Участник не найден.
                </p>
                <p className="mt-2 text-sm">
                    <Link to="/members" className="text-amber-700 hover:underline">
                        ← Вернуться к списку участников
                    </Link>
                </p>
            </section>
        );
    }

    const hasDogs = member.dogs.length > 0;

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between gap-2">
                <Link
                    to="/members"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                >
                    ← Все участники
                </Link>
            </div>

            {/* шапка профиля */}
            <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-start">
                <img
                    src={
                        member.avatar ??
                        "https://via.placeholder.com/96x96?text=🐾"
                    }
                    alt={member.fullName}
                    className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
                    loading="lazy"
                />

                <div className="min-w-0 flex-1 space-y-2">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {member.fullName}
                        </h1>
                        {member.city && (
                            <p className="text-sm text-gray-600">
                                {member.city}
                            </p>
                        )}
                    </div>

                    {(member.phone || member.email) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                            {member.phone && <span>📞 {member.phone}</span>}
                            {member.email && (
                                <span>
                  📧{" "}
                                    <a
                                        href={`mailto:${member.email}`}
                                        className="underline decoration-dotted underline-offset-2 hover:no-underline"
                                    >
                    {member.email}
                  </a>
                </span>
                            )}
                        </div>
                    )}

                    {member.bio && (
                        <p className="text-sm text-gray-700">
                            {member.bio}
                        </p>
                    )}

                    <p className="text-xs text-gray-500">
                        В клубе с {formatJoined(member.joinDate)}
                    </p>
                </div>
            </div>

            {/* собаки участника */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">
                    Собаки участника
                </h2>

                {!hasDogs ? (
                    <p className="text-sm text-gray-600">
                        У участника пока нет собак в базе DogHub.
                    </p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {member.dogs.map((dog) => (
                            <div
                                key={dog.id}
                                className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-amber-100"
                            >
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                                    {dog.photo ? (
                                        <img
                                            src={dog.photo}
                                            alt={dog.name}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-2xl">
                                            🐶
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="text-base font-semibold">
                                        {dog.name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {dog.breed ?? "Порода не указана"}
                                        {dog.sex &&
                                            ` • Пол: ${dog.sex === "M" ? "М" : "Ж"}`}
                                    </div>
                                    {dog.chipNumber && (
                                        <div className="text-[11px] text-gray-500">
                                            Чип: {dog.chipNumber}
                                        </div>
                                    )}
                                    {dog.tags && dog.tags.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {dog.tags.map((t) => (
                                                <span
                                                    key={t}
                                                    className="rounded-full bg-gray-100 px-2 py-[1px] text-[10px] text-gray-700"
                                                >
                          #{t}
                        </span>
                                            ))}
                                        </div>
                                    )}
                                    {dog.bio && (
                                        <p className="text-xs text-gray-700">
                                            {dog.bio}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}