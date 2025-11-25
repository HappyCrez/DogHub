import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

type Mode = "login" | "register";

const CITY_OPTIONS = [
    "Москва",
    "Санкт-Петербург",
    "Новосибирск",
    "Екатеринбург",
    "Казань",
    "Нижний Новгород",
    "Челябинск",
    "Красноярск",
    "Самара",
    "Уфа",
    "Ростов-на-Дону",
    "Омск",
    "Краснодар",
    "Воронеж",
    "Пермь",
    "Волгоград",
    "Саратов",
    "Тюмень",
    "Тольятти",
    "Барнаул",
    "Ижевск",
    "Махачкала",
    "Хабаровск",
    "Ульяновск",
    "Иркутск",
    "Владивосток",
    "Ярославль",
    "Кемерово",
    "Томск",
    "Набережные Челны",
    "Ставрополь",
    "Оренбург",
    "Новокузнецк",
    "Рязань",
    "Балашиха",
    "Пенза",
];

export default function Auth() {
    const [mode, setMode] = useState<Mode>("login");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [cityInput, setCityInput] = useState("");
    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage(null);
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const payload = Object.fromEntries(formData.entries());

        console.log("Форма авторизации/регистрации (заглушка):", {
            mode,
            payload,
        });

        setTimeout(() => {
            setLoading(false);
            setMessage(
                "Сервер авторизации ещё не реализован. Сейчас это демонстрационный макет формы."
            );
        }, 500);
    }

    function handleCityChange(e: ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setCityInput(value);

        const query = value.trim().toLowerCase();
        if (query.length < 2) {
            setCitySuggestions([]);
            setShowCityDropdown(false);
            return;
        }

        const suggestions = CITY_OPTIONS.filter((city) =>
            city.toLowerCase().startsWith(query)
        );
        setCitySuggestions(suggestions);
        setShowCityDropdown(suggestions.length > 0);
    }

    function handleCitySelect(city: string) {
        setCityInput(city);
        setCitySuggestions([]);
        setShowCityDropdown(false);
    }

    return (
        <section className="space-y-8">
            <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                {/* Левая цветная часть */}
                <div className="relative overflow-hidden rounded-3xl p-8 shadow-md auth-gradient">
                    {/* Декоративные пятна */}
                    <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
                    <div className="pointer-events-none absolute -right-6 bottom-0 h-32 w-32 rounded-full bg-amber-200/60 blur-2xl" />
                    <div className="pointer-events-none absolute inset-x-10 top-1/2 h-24 rounded-3xl bg-white/20 blur-2xl" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur">
                            <span className="text-lg">🐾</span>
                            <span>Добро пожаловать в DogHub</span>
                        </div>

                        <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">
                            Клуб собаководов, <br className="hidden sm:block" />
                            где любят и людей, и собак
                        </h1>

                        <p className="mt-3 max-w-xl text-sm text-gray-700 md:text-base">
                            Регистрируйтесь, чтобы следить за событиями клуба, записывать
                            своих собак на тренировки и знакомиться с другими владельцами.
                        </p>

                        <ul className="mt-5 space-y-2 text-sm text-gray-800">
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-base">🎓</span>
                                <span>Обучающие программы для собак и тренинги для владельцев.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-base">📅</span>
                                <span>Удобный календарь мероприятий и запись онлайн.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-base">💬</span>
                                <span>Сообщество людей, которые так же без ума от собак, как и вы.</span>
                            </li>
                        </ul>

                        <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-800">
                            <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
                                <span className="text-lg">🌳</span>
                                <span>Прогулки, митапы и соревнования</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
                                <span className="text-lg">🦴</span>
                                <span>Поддержка новичков и опытных владельцев</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Правая карточка с формой */}
                <div className="flex items-center">
                    <div className="w-full rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-lg backdrop-blur">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Личный кабинет DogHub
                                </p>
                                <h2 className="mt-1 text-xl font-bold">
                                    {mode === "login" ? "Вход в аккаунт" : "Регистрация"}
                                </h2>
                            </div>
                            <span className="hidden rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white md:inline">
                                beta-версия
                            </span>
                        </div>

                        {/* Переключатель Вход / Регистрация с анимацией */}
                        <div className="mb-5">
                            <div className="relative flex overflow-hidden rounded-2xl bg-gray-100 p-1 text-sm font-medium">
                                <motion.div
                                    className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-sm"
                                    initial={false}
                                    animate={{ x: mode === "login" ? 0 : "100%" }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setMode("login")}
                                    className={`relative z-10 flex-1 rounded-xl px-3 py-2 transition-colors ${
                                        mode === "login"
                                            ? "text-gray-900"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    Вход
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode("register")}
                                    className={`relative z-10 flex-1 rounded-xl px-3 py-2 transition-colors ${
                                        mode === "register"
                                            ? "text-gray-900"
                                            : "text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    Регистрация
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === "register" && (
                                <div className="space-y-1">
                                    <label
                                        htmlFor="fullName"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Имя и фамилия
                                    </label>
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        required
                                        autoComplete="name"
                                        className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                                        placeholder="Например, Анна Иванова"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    E-mail
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {mode === "register" && (
                                <div className="space-y-1">
                                    <label
                                        htmlFor="phone"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Телефон
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        autoComplete="tel"
                                        className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                                        placeholder="+7 900 000-00-00"
                                    />
                                </div>
                            )}

                            {mode === "register" && (
                                <div className="relative space-y-1">
                                    <label
                                        htmlFor="city"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Город
                                    </label>
                                    <input
                                        id="city"
                                        name="city"
                                        type="text"
                                        required
                                        autoComplete="address-level2"
                                        className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                                        placeholder="Например, Барнаул"
                                        value={cityInput}
                                        onChange={handleCityChange}
                                        onFocus={() => {
                                            if (citySuggestions.length > 0) {
                                                setShowCityDropdown(true);
                                            }
                                        }}
                                    />

                                    {showCityDropdown && citySuggestions.length > 0 && (
                                        <ul
                                            className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white text-sm shadow-lg"
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            {citySuggestions.map((city) => (
                                                <li
                                                    key={city}
                                                    className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                                                    onClick={() => handleCitySelect(city)}
                                                >
                                                    {city}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Пароль
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete={
                                        mode === "login" ? "current-password" : "new-password"
                                    }
                                    className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                                />
                            </div>

                            {mode === "register" && (
                                <div className="space-y-1">
                                    <label
                                        htmlFor="passwordConfirm"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Повторите пароль
                                    </label>
                                    <input
                                        id="passwordConfirm"
                                        name="passwordConfirm"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                                    />
                                </div>
                            )}

                            {mode === "register" && (
                                <div className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                                    <input
                                        id="agree"
                                        name="agree"
                                        type="checkbox"
                                        required
                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                                    />
                                    <label htmlFor="agree">
                                        Я согласен(а) с обработкой персональных данных и правилами
                                        клуба DogHub.
                                    </label>
                                </div>
                            )}

                            {message && (
                                <p className="rounded-xl bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading
                                    ? "Отправляем данные…"
                                    : mode === "login"
                                        ? "Войти"
                                        : "Зарегистрироваться"}
                            </button>

                            {mode === "login" ? (
                                <p className="text-xs text-gray-500">
                                    Нет аккаунта?{" "}
                                    <button
                                        type="button"
                                        onClick={() => setMode("register")}
                                        className="font-medium text-gray-800 underline-offset-2 hover:underline"
                                    >
                                        Зарегистрируйтесь
                                    </button>
                                    .
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500">
                                    Уже есть аккаунт?{" "}
                                    <button
                                        type="button"
                                        onClick={() => setMode("login")}
                                        className="font-medium text-gray-800 underline-offset-2 hover:underline"
                                    >
                                        Войдите
                                    </button>
                                    .
                                </p>
                            )}

                            <p className="text-[11px] leading-snug text-gray-400">
                                Когда бэкенд будет готов, здесь появятся реальные запросы к API
                                (login/register), сохранение токена и перенаправление в личный
                                кабинет.
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            <p className="text-center text-xs text-gray-400">
                Вернуться на{" "}
                <Link
                    to="/"
                    className="font-medium text-gray-700 underline-offset-2 hover:underline"
                >
                    главную страницу
                </Link>
                .
            </p>
        </section>
    );
}
