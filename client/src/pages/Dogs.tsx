import { useEffect, useMemo, useState } from "react";
import { getDogs, getChippedDogs, type ApiDog } from "../api/client";
import DogCard from "../components/DogCard";

type Mode = "all" | "chipped";

export default function Dogs() {
    const [dogs, setDogs] = useState<ApiDog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [breed, setBreed] = useState<string>("all");
    const [mode, setMode] = useState<Mode>("all");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const loader = mode === "chipped" ? getChippedDogs : getDogs;

        loader()
            .then((data) => {
                if (cancelled) return;
                setDogs(data);
            })
            .catch((e) => {
                console.error(e);
                if (!cancelled) setError("Не удалось загрузить собак.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [mode]);

    const breeds = useMemo(() => {
        const set = new Set<string>();
        for (const d of dogs) {
            if (d.breed) set.add(d.breed);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
    }, [dogs]);

    const filtered = useMemo(() => {
        const text = q.trim().toLowerCase();

        return dogs.filter((d) => {
            const okBreed = breed === "all" || d.breed === breed;

            const okText =
                text.length === 0 ||
                d.dogName.toLowerCase().includes(text) ||
                (d.breed ?? "").toLowerCase().includes(text) ||
                d.ownerName.toLowerCase().includes(text) ||
                (d.tags ?? []).some((t) => t.toLowerCase().includes(text));

            return okBreed && okText;
        });
    }, [dogs, q, breed]);

    return (
        <section className="space-y-4">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Собаки клуба</h1>
                <p className="text-sm text-gray-700">
                    Здесь отображаются собаки участников DogHub. Можно отфильтровать по породе,
                    выполнить поиск по имени, владельцу или тегам, а также показать только
                    чипированных собак.
                </p>
            </header>

            {/* панель фильтров */}
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Поиск по имени, породе, владельцу или тегам…"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black sm:w-80"
                />

                <select
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black sm:w-56"
                >
                    <option value="all">Все породы</option>
                    {breeds.map((b) => (
                        <option key={b} value={b}>
                            {b}
                        </option>
                    ))}
                </select>

                <div className="flex flex-wrap items-center gap-3 text-sm sm:ml-auto">
                    <label className="inline-flex items-center gap-1">
                        <input
                            type="radio"
                            name="mode"
                            value="all"
                            checked={mode === "all"}
                            onChange={() => setMode("all")}
                            className="h-4 w-4 border-gray-300 text-black focus:ring-black"
                        />
                        <span>Все собаки</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                        <input
                            type="radio"
                            name="mode"
                            value="chipped"
                            checked={mode === "chipped"}
                            onChange={() => setMode("chipped")}
                            className="h-4 w-4 border-gray-300 text-black focus:ring-black"
                        />
                        <span>Только чипированные</span>
                    </label>
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && filtered.length === 0 && (
                <p className="text-gray-600">
                    Собаки не найдены. Попробуйте изменить фильтры или запрос.
                </p>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((dog) => (
                        <DogCard key={dog.dogId} dog={dog} />
                    ))}
                </div>
            )}

            {loading && (
                <p className="text-gray-600">Загружаем собак…</p>
            )}
        </section>
    );
}