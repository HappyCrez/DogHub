import { useEffect, useMemo, useState } from "react";
import { getEvents, type ApiEventRow } from "../api/client";
import EventCard from "../components/EventCard";

export default function Events() {
    const [events, setEvents] = useState<ApiEventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [category, setCategory] = useState<string>("all");

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

    return (
        <section className="space-y-4">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">События клуба</h1>
                <p className="text-sm text-gray-700">
                    Здесь собраны культурно-массовые мероприятия DogHub: прогулки,
                    митапы, фотосессии и другие активности клуба.
                </p>
            </header>

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
                                <EventCard key={ev.id} ev={ev} />
                            ))}
                        </div>
                    )}

                    {past.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold">Прошедшие</h2>
                            {past.map((ev) => (
                                <EventCard key={ev.id} ev={ev} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}