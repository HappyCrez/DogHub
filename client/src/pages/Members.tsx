import { useEffect, useMemo, useState } from "react";
import MemberCard, {
    type MemberWithDogs,
    type MemberDog,
} from "../components/MemberCard";
import { getUsers, type ApiUserWithDogRow } from "../api/client";

function groupUsers(rows: ApiUserWithDogRow[]): MemberWithDogs[] {
    const map = new Map<number, MemberWithDogs>();

    for (const row of rows) {
        let member = map.get(row.memberId);
        if (!member) {
            member = {
                id: row.memberId,
                fullName: row.fullName,
                city: row.city,
                avatar: row.avatarUrl,
                bio: row.ownerBio ?? undefined,
                phone: row.phone,
                email: row.email,
                joinDate: row.joinDate ?? undefined,
                membershipEndDate: row.membershipEndDate ?? undefined,
                dogs: [],
            };
            map.set(row.memberId, member);
        }

        if (row.dogId !== null && row.dogName !== null) {
            const dog: MemberDog = {
                id: row.dogId,
                name: row.dogName,
                breed: row.breed,
                sex: row.sex,
                birthDate: row.birthDate ?? undefined,
                chipNumber: row.chipNumber ?? undefined,
                photo: row.dogPhoto ?? undefined,
                tags: row.dogTags ?? undefined,
                bio: row.dogBio ?? undefined,
            };
            member.dogs.push(dog);
        }
    }

    return Array.from(map.values()).sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "ru")
    );
}

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