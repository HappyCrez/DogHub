interface MemberAvatarProps {
    fullName: string;
    avatarUrl?: string | null;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

const PASTEL_BG_CLASSES = [
    "bg-amber-100 text-amber-900",
    "bg-emerald-100 text-emerald-900",
    "bg-sky-100 text-sky-900",
    "bg-violet-100 text-violet-900",
    "bg-rose-100 text-rose-900",
    "bg-lime-100 text-lime-900",
    "bg-teal-100 text-teal-900",
];

function getInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "🐾";

    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    const letters = (first + second).toUpperCase();

    return letters || "🐾";
}

// псевдослучайный индекс по строке (чтобы цвет был стабилен)
function getPastelClassKey(fullName: string): string {
    let hash = 0;
    const str = fullName || "default";

    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }

    const index = Math.abs(hash) % PASTEL_BG_CLASSES.length;
    return PASTEL_BG_CLASSES[index];
}

// классы размеров
const SIZE_CLASSES: Record<NonNullable<MemberAvatarProps["size"]>, string> = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",                     // для карточек (как было h-14 w-14)
    xl: "h-20 w-20 sm:h-24 sm:w-24 text-xl",      // для большого аватара в профиле
};

export default function MemberAvatar({
                                         fullName,
                                         avatarUrl,
                                         size = "md",
                                         className = "",
                                     }: MemberAvatarProps) {
    const initials = getInitials(fullName);
    const pastelClass = getPastelClassKey(fullName);
    const sizeClasses = SIZE_CLASSES[size];

    if (avatarUrl) {
        return (
            <div
                className={`overflow-hidden rounded-full border border-white/60 shadow-sm ${sizeClasses} ${className}`}
            >
                <img
                    src={avatarUrl}
                    alt={fullName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
            </div>
        );
    }

    return (
        <div
            className={`flex items-center justify-center rounded-full border border-white/60 shadow-sm ${sizeClasses} ${pastelClass} ${className}`}
        >
            <span>{initials}</span>
        </div>
    );
}