import { useState, useMemo } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type NavItem = {
    to: string;
    label: string;
};

const base = "px-3 py-2 rounded-xl text-sm font-medium transition-colors";
const active = "bg-black text-white";
const idle = "text-gray-700 hover:bg-gray-200";

const navItems: NavItem[] = [
    { to: "/", label: "Главная" },
    { to: "/dogs", label: "Собаки" },
    { to: "/events", label: "События" },
    { to: "/training", label: "Обучение" },
    { to: "/members", label: "Участники" },
];

export default function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    const { displayName, initials, avatarUrl } = useMemo(() => {
        if (!user) {
            return {
                displayName: "Гость",
                initials: "🐾",
                avatarUrl: null as string | null,
            };
        }

        const anyUser = user as any;

        const fullName =
            (typeof anyUser.fullName === "string" && anyUser.fullName) ||
            (typeof anyUser.name === "string" && anyUser.name) ||
            "";

        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        const first = parts[0] ?? "";
        const last = parts[1] ?? "";

        const display =
            first && last
                ? `${first} ${last[0]}.`
                : first || "Профиль";

        const init =
            ((first ? first[0] : "") + (last ? last[0] : "")).toUpperCase() ||
            "🐾";

        const avatar =
            (typeof anyUser.avatarUrl === "string" && anyUser.avatarUrl) ||
            (typeof anyUser.avatar === "string" && anyUser.avatar) ||
            null;

        return {
            displayName: display,
            initials: init,
            avatarUrl: avatar,
        };
    }, [user]);

    const handleLogout = () => {
        setMenuOpen(false);
        logout();
        // Остаёмся на текущей странице, как ты и хотел
    };

    return (
        <header className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
                <Link
                    to="/"
                    aria-label="На главную"
                    className="rounded-lg px-1 text-xl font-extrabold tracking-tight hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                    🐾 DogHub
                </Link>

                <div className="flex items-center gap-32">
                    <nav className="flex gap-1" aria-label="Основная навигация">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === "/"}
                                className={({ isActive }) =>
                                    [base, isActive ? active : idle].join(" ")
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Правый блок: либо "Войти", либо аватарка + имя с дропдауном */}
                    {!isAuthenticated ? (
                        <NavLink
                            to="/auth"
                            className={({ isActive }) =>
                                [
                                    "px-3 py-2 rounded-xl text-sm font-semibold transition-colors border",
                                    isActive
                                        ? "border-black bg-black text-white"
                                        : "border-black/10 text-gray-800 hover:bg-black hover:text-white",
                                ].join(" ")
                            }
                        >
                            Войти
                        </NavLink>
                    ) : (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setMenuOpen((open) => !open)}
                                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50"
                            >
                                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-xs font-semibold text-white">
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt={displayName}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span>{initials}</span>
                                    )}
                                </div>
                                <span className="max-w-[140px] truncate text-gray-900">
                                    {displayName}
                                </span>
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-gray-200 bg-white py-1 text-sm shadow-lg">
                                    <Link
                                        to="/account"
                                        className="block px-3 py-2 text-left text-gray-800 hover:bg-gray-100"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        Личный кабинет
                                    </Link>
                                    <button
                                        type="button"
                                        className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                                        onClick={handleLogout}
                                    >
                                        Выйти
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}