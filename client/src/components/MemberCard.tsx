import type { FC } from "react";

export interface MemberDog {
    id: number;
    name: string;
    breed: string | null;
    sex: "M" | "F" | null;
    birthDate?: string | null;
    chipNumber?: string | null;
    photo?: string | null;
    tags?: string[] | null;
    bio?: string | null;
}

export interface MemberWithDogs {
    id: number;
    fullName: string;
    city?: string | null;
    avatar?: string | null;
    bio?: string | null; // био владельца
    phone?: string | null;
    email?: string | null;
    joinDate?: string | null;
    membershipEndDate?: string | null;
    dogs: MemberDog[];
}

function formatJoined(iso?: string | null) {
    if (!iso) return "дата не указана";
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { year: "numeric", month: "long" });
}

const MemberCard: FC<{ member: MemberWithDogs }> = ({ member }) => {
    const { fullName, city, avatar, bio, phone, email, joinDate, dogs } = member;

    const hasDogs = dogs.length > 0;

    return (
        <div className="group flex flex-col rounded-2xl bg-white p-4 shadow transition hover:shadow-md">
            <div className="flex items-start gap-4">
                <img
                    src={
                        avatar ??
                        "https://via.placeholder.com/64x64?text=🐾"
                    }
                    alt={fullName}
                    className="h-16 w-16 rounded-full object-cover"
                    loading="lazy"
                />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold truncate">
                            {fullName}
                        </h3>
                    </div>

                    {city && (
                        <p className="text-sm text-gray-600">{city}</p>
                    )}

                    {(phone || email) && (
                        <p className="mt-1 text-xs text-gray-600 space-x-2">
                            {phone && <span>📞 {phone}</span>}
                            {email && (
                                <span>
                  📧{" "}
                                    <a
                                        href={`mailto:${email}`}
                                        className="underline hover:no-underline"
                                    >
                    {email}
                  </a>
                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>

            {bio && (
                <p className="mt-3 text-sm text-gray-700">
                    {bio}
                </p>
            )}

            <div className="mt-3">
                <div className="text-sm font-semibold mb-1">
                    Собаки
                </div>

                {hasDogs ? (
                    <ul className="space-y-2">
                        {dogs.map((dog) => (
                            <li
                                key={dog.id}
                                className="rounded-xl border border-gray-200 p-2 flex items-start gap-3"
                            >
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                    {dog.photo ? (
                                        <img
                                            src={dog.photo}
                                            alt={dog.name}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xl">
                                            🐶
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium">
                                        {dog.name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {dog.breed ?? "Порода не указана"}
                                        {dog.sex && ` • ${dog.sex === "M" ? "кобель" : "сука"}`}
                                    </div>
                                    {dog.chipNumber && (
                                        <div className="text-xs text-gray-500">
                                            Чип: {dog.chipNumber}
                                        </div>
                                    )}
                                    {dog.tags && dog.tags.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
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
                                        <p className="mt-1 text-xs text-gray-700">
                                            {dog.bio}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-600">
                        Пока нет собак в базе.
                    </p>
                )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
                В клубе с {formatJoined(joinDate)}
            </div>
        </div>
    );
};

export default MemberCard;