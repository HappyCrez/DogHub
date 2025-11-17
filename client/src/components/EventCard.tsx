import type { ApiEventRow } from "../api/client";

function formatDate(iso: string) {
    const d = new Date(iso);
    const dtf = new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
    });
    return dtf.format(d).replace(",", "");
}

function formatPrice(price: number | null) {
    if (price == null) return "Цена не указана";
    if (price === 0) return "Бесплатно";
    return `${price.toLocaleString("ru-RU")} ₽`;
}

export default function EventCard({ ev }: { ev: ApiEventRow }) {
    const date = new Date(ev.startAt);
    const now = Date.now();
    const isPast = date.getTime() < now;

    return (
        <div className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:shadow-md hover:ring-black/10">
            <div className="flex items-start gap-4">
                {/* дата слева */}
                <div className="flex w-20 shrink-0 flex-col items-center rounded-xl bg-amber-100 py-2 text-center">
                    <div className="text-2xl font-extrabold leading-none">
                        {String(date.getDate()).padStart(2, "0")}
                    </div>
                    <div className="text-xs uppercase tracking-wide">
                        {date.toLocaleString("ru-RU", { month: "short" })}
                    </div>
                </div>

                {/* контент справа */}
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{ev.title}</h3>

                        {ev.category && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                                {ev.category}
                            </span>
                        )}

                        {isPast && (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                                прошло
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-gray-600">
                        🗓️ {formatDate(ev.startAt)} • 📍 {ev.venue}
                    </p>

                    {ev.description && (
                        <p className="text-sm text-gray-700">{ev.description}</p>
                    )}

                    <p className="text-xs text-gray-500">
                        {formatPrice(ev.price)}
                    </p>
                </div>
            </div>
        </div>
    );
}
