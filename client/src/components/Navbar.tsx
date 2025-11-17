import { Link, NavLink } from "react-router-dom";

type NavItem = {
    to: string;
    label: string;
};

const base = "px-3 py-2 rounded-xl text-sm font-medium transition-colors";
const active = "bg-black text-white";
const idle = "text-gray-700 hover:bg-gray-200";

const navItems: NavItem[] = [
    { to: "/", label: "Главная" },
    { to: "/events", label: "События" },
    { to: "/members", label: "Участники" },
];

export default function Navbar() {
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
            </div>
        </header>
    );
}