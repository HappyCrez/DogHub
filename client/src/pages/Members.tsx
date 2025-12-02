import { useEffect, useMemo, useState } from "react";
import MemberCard from "../components/MemberCard";
import { getUsers, type ApiUserWithDogRow } from "../api/client";
import { groupUsers } from "../utils/members";

export default function Members() {
    const [rows, setRows] = useState<ApiUserWithDogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState("");

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
                    setError("Не удалось загрузить участников с сервера.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const members = useMemo(() => groupUsers(rows), [rows]);

    const filtered = useMemo(() => {
        const text = q.trim().toLowerCase();
        if (text === "") {
            return members;
        }

        return members.filter((m) => {
            const base =
                m.fullName.toLowerCase().includes(text) ||
                (m.city ?? "").toLowerCase().includes(text);

            const dogsText = m.dogs.some(
                (d) =>
                    d.name.toLowerCase().includes(text) ||
                    (d.breed ?? "").toLowerCase().includes(text)
            );

            return base || dogsText;
        });
    }, [members, q]);

    return (
        <section className="space-y-4">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Участники клуба</h1>
                <p className="text-sm text-gray-700">
                    Здесь отображаются владельцы собак и их питомцы, состоящие в DogHub.
                    Можно искать по имени участника, городу, кличке или породе собаки.
                </p>
            </header>

            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Поиск по имени, городу или собаке…"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black sm:w-96"
                />
            </div>

            {loading && (
                <p className="text-gray-600">Загружаем участников…</p>
            )}

            {error && !loading && (
                <p className="text-red-600 text-sm">{error}</p>
            )}

            {!loading && !error && filtered.length === 0 && (
                <p className="text-gray-600">Ничего не найдено 😕</p>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {filtered.map((m) => (
                        <MemberCard key={m.id} member={m} />
                    ))}
                </div>
            )}
        </section>
    );
}