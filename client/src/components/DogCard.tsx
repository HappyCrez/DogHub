import type { ApiDog } from "../api/client";

function formatAge(birthDate?: string | null): string | null {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    if (Number.isNaN(d.getTime())) return null;

    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();

    if (now.getDate() < d.getDate()) {
        months -= 1;
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} г`);
    if (months > 0) parts.push(`${months} мес`);

    return parts.length > 0 ? parts.join(" ") : "меньше месяца";
}

function formatSex(sex: ApiDog["sex"]) {
    if (sex === "M") return "М";
    if (sex === "F") return "Ж";
    return "—";
}

export default function DogCard({ dog }: { dog: ApiDog }) {
    const photo = dog.photo;
    const ageLabel = formatAge(dog.birthDate);
    const hasChip = !!dog.chipNumber;

    return (
        <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md hover:ring-black/10">
            <div className="relative aspect-[4/3] w-full overflow-hidden">
                {photo ? (
                    <img
                        src={photo}
                        alt={dog.dogName}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-amber-50 text-4xl">
                        🐶
                    </div>
                )}

                <span
                    className={[
                        "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow",
                        hasChip
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-300 text-gray-800",
                    ].join(" ")}
                >
                    {hasChip ? "Чипирован" : "Без чипа"}
                </span>
            </div>

            <div className="p-4">
                <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-lg font-semibold">
                        {dog.dogName}
                    </h3>
                    {dog.breed && (
                        <span className="truncate text-xs text-gray-500">
                            {dog.breed}
                        </span>
                    )}
                </div>

                <p className="mt-1 text-sm text-gray-600">
                    Пол: {formatSex(dog.sex)}
                    {ageLabel && <> • Возраст: {ageLabel}</>}
                </p>

                {hasChip ? (
                    <p className="mt-1 text-xs text-gray-500">
                        Чип: {dog.chipNumber}
                    </p>
                ) : (
                    <p className="mt-1 text-xs text-gray-500">
                        Чип не указан
                    </p>
                )}

                <p className="mt-2 text-xs text-gray-600">
                    Владелец: <span className="font-medium">{dog.ownerName}</span>
                </p>

                {dog.tags && dog.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {dog.tags.map((t) => (
                            <span
                                key={t}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                            >
                                #{t}
                            </span>
                        ))}
                    </div>
                )}

                {dog.bio && (
                    <p className="mt-2 line-clamp-3 text-sm text-gray-700">
                        {dog.bio}
                    </p>
                )}
            </div>
        </div>
    );
}