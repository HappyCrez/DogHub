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
    const [profileMenuOpen, setProfileMenuOpen] = useState(false); // дропдаун профиля на десктопе
    const [mobileOpen, setMobileOpen] = useState(false); // мобильное меню

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
        setProfileMenuOpen(false);
        setMobileOpen(false);
        logout();
        // остаёмся на текущей странице
    };

    const handleNavClick = () => {
        // закрываем все меню при переходе по ссылке
        setMobileOpen(false);
        setProfileMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur">
            {/* Верхняя полоса */}
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <Link
                    to="/"
                    aria-label="На главную"
                    className="rounded-lg px-1 text-xl font-extrabold tracking-tight hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    onClick={handleNavClick}
                >
                    🐾 DogHub
                </Link>

                {/* ПК-версия: навигация + профиль */}
                <div className="hidden items-center gap-6 md:flex">
                    <nav className="flex gap-1" aria-label="Основная навигация">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === "/"}
                                className={({ isActive }) =>
                                    [base, isActive ? active : idle].join(" ")
                                }
                                onClick={handleNavClick}
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
                            onClick={handleNavClick}
                        >
                            Войти
                        </NavLink>
                    ) : (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setProfileMenuOpen((open) => !open)}
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

                            {profileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-gray-200 bg-white py-1 text-sm shadow-lg">
                                    <Link
                                        to="/account"
                                        className="block px-3 py-2 text-left text-gray-800 hover:bg-gray-100"
                                        onClick={handleNavClick}
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

                {/* Мобильная версия: кнопка-бургер */}
                <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg p-1 text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black md:hidden"
                    aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen((open) => !open)}
                >
                    <span className="sr-only">Меню</span>
                    <div className="relative h-4 w-4">
                        {/* верхняя линия */}
                        <span
                            className={`absolute left-0 right-0 h-[2px] rounded-full bg-gray-900 transition-transform duration-200 ${
                                mobileOpen
                                    ? "top-1/2 -translate-y-1/2 rotate-45"
                                    : "top-0"
                            }`}
                        />
                        {/* средняя линия */}
                        <span
                            className={`absolute left-0 right-0 h-[2px] rounded-full bg-gray-900 transition-all duration-200 ${
                                mobileOpen
                                    ? "top-1/2 -translate-y-1/2 opacity-0"
                                    : "top-1/2 -translate-y-1/2 opacity-100"
                            }`}
                        />
                        {/* нижняя линия */}
                        <span
                            className={`absolute left-0 right-0 h-[2px] rounded-full bg-gray-900 transition-transform duration-200 ${
                                mobileOpen
                                    ? "top-1/2 -translate-y-1/2 -rotate-45"
                                    : "bottom-0"
                            }`}
                        />
                    </div>
                </button>
            </div>

            {/* Мобильная выпадающая панель */}
            {mobileOpen && (
                <div className="border-t border-black/5 bg-white/95 backdrop-blur md:hidden">
                    <div className="mx-auto max-w-5xl px-4 py-3 space-y-3">
                        <nav className="flex flex-col gap-1" aria-label="Основная навигация">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === "/"}
                                    className={({ isActive }) =>
                                        [
                                            "rounded-xl px-3 py-2 text-sm font-medium",
                                            isActive
                                                ? "bg-black text-white"
                                                : "text-gray-800 hover:bg-gray-100",
                                        ].join(" ")
                                    }
                                    onClick={handleNavClick}
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>

                        <div className="border-t border-gray-100 pt-3">
                            {!isAuthenticated ? (
                                <NavLink
                                    to="/auth"
                                    className="inline-flex w-full items-center justify-center rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-black hover:text-white"
                                    onClick={handleNavClick}
                                >
                                    Войти
                                </NavLink>
                            ) : (
                                <div className="flex flex-col gap-2 text-sm">
                                    <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2">
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
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-gray-900">
                                                {displayName}
                                            </span>
                                            <span className="text-[11px] text-gray-500">
                                                Участник DogHub
                                            </span>
                                        </div>
                                    </div>

                                    <Link
                                        to="/account"
                                        className="rounded-xl bg-black px-3 py-2 text-center text-sm font-semibold text-white hover:bg-black/90"
                                        onClick={handleNavClick}
                                    >
                                        Личный кабинет
                                    </Link>
                                    <button
                                        type="button"
                                        className="rounded-xl px-3 py-2 text-center text-sm font-semibold text-red-600 hover:bg-red-50"
                                        onClick={handleLogout}
                                    >
                                        Выйти
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}