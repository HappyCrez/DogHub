import type { FC } from "react";
import { Link } from "react-router-dom";

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

export function formatJoined(iso?: string | null) {
    if (!iso) return "дата не указана";
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { year: "numeric", month: "long" });
}

const MemberCard: FC<{ member: MemberWithDogs }> = ({ member }) => {
    const { id, fullName, city, avatar, bio, phone, email, joinDate, dogs } = member;

    return (
        <Link
            to={`/members/${id}`}
            className="group flex flex-col rounded-3xl bg-white/90 p-4 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-black/10"
        >
            {/* шапка */}
            <div className="flex items-start gap-4">
                <img
                    src={
                        avatar ??
                        "https://via.placeholder.com/64x64?text=🐾"
                    }
                    alt={fullName}
                    className="h-14 w-14 rounded-full object-cover"
                    loading="lazy"
                />

                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-tight">
                        {fullName}
                    </h3>
                    {city && (
                        <p className="text-xs text-gray-600">{city}</p>
                    )}

                    {(phone || email) && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                            {phone && <span>📞 {phone}</span>}
                            {email && (
                                <span>
                  📧{" "}
                                    <span className="underline decoration-dotted underline-offset-2 group-hover:no-underline">
                    {email}
                  </span>
                </span>
                            )}
                        </p>
                    )}

                    {bio && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-700">
                            {bio}
                        </p>
                    )}
                </div>
            </div>

            {/* список собак: только имя + порода */}
            <div className="mt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          Собаки
        </span>

                {dogs.length > 0 ? (
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                        {dogs.map((dog) => (
                            <li
                                key={dog.id}
                                className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[11px] text-gray-800"
                            >
                                {dog.name}
                                {dog.breed ? ` — ${dog.breed}` : " — порода не указана"}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-1 text-[11px] text-gray-500">
                        Пока нет собак в базе.
                    </p>
                )}
            </div>

            {/* подвал карточки */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                <span>В клубе с {formatJoined(joinDate)}</span>
                <span className="text-amber-700 group-hover:text-amber-900">
          Профиль →
        </span>
            </div>
        </Link>
    );
};

export default MemberCard;
