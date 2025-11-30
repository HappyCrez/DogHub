import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../api/client";
import { useAuth, type AuthUser } from "../auth/AuthContext";

type Mode = "login" | "register";

interface LoginSuccessResponse {
    accessToken: string;
    accessTokenExpiresAt: string;
    user: AuthUser;
}

interface RegisterSuccessResponse {
    user: AuthUser;
}

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(body),
    });

    let data: any = null;
    try {
        data = await res.json();
    } catch {
        // если сервер вернул не-JSON, оставим data = null
    }

    if (!res.ok) {
        const message =
            data && typeof data.error === "string"
                ? data.error
                : "Ошибка при обращении к серверу авторизации";
        throw new Error(message);
    }

    return data as T;
}

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
    "Романово",
    "Троицкое",
];

// базовый класс для всех текстовых инпутов с микро-анимациями
const inputBaseClass =
    "block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none " +
    "bg-white/90 placeholder:text-gray-400 focus:placeholder:text-gray-300 " +
    "transition duration-150 ease-out " +
    "focus:border-black focus:ring-1 focus:ring-black " +
    "transform focus:scale-[1.01] focus:shadow-md";

function getPasswordRules(password: string) {
    return {
        length: password.length >= 8,
        lower: /[a-z]/.test(password),
        upper: /[A-Z]/.test(password),
        digit: /\d/.test(password),
    };
}

function PasswordRuleItem({ ok, text }: { ok: boolean; text: string }) {
    return (
        <li className="flex items-center gap-2">
            <span
                className={
                    "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold " +
                    (ok
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-500")
                }
            >
                {ok ? "✓" : "•"}
            </span>
            <span className={ok ? "text-emerald-700" : "text-gray-600"}>{text}</span>
        </li>
    );
}

export default function Auth() {
    const [mode, setMode] = useState<Mode>("login");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [cityInput, setCityInput] = useState("");
    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    const [passwordValue, setPasswordValue] = useState("");
    const [passwordConfirmValue, setPasswordConfirmValue] = useState("");
    const [showPasswordHint, setShowPasswordHint] = useState(false); // подсказка по паролю

    const { login } = useAuth();
    const navigate = useNavigate();

    const passwordRules = getPasswordRules(passwordValue);
    const isPasswordStrong =
        passwordRules.length &&
        passwordRules.lower &&
        passwordRules.upper &&
        passwordRules.digit;

    const isPasswordConfirmMatch =
        mode !== "register" ||
        passwordConfirmValue.length === 0 ||
        passwordConfirmValue === passwordValue;

    const buttonLabel = loading
        ? "Отправляем данные…"
        : mode === "login"
            ? "Войти"
            : "Зарегистрироваться";

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage(null);

        // Валидация пароля только при регистрации
        if (mode === "register") {
            if (!isPasswordStrong) {
                setMessage(
                    "Пароль слишком простой. Он должен быть не короче 8 символов и содержать строчные и прописные латинские буквы, а также цифры."
                );
                return;
            }

            if (passwordValue !== passwordConfirmValue) {
                setMessage("Пароли не совпадают. Проверьте ещё раз.");
                return;
            }
        }

        setLoading(true);

        const form = e.currentTarget;
        const formData = new FormData(form);

        try {
            const email = String(formData.get("email") ?? "").trim().toLowerCase();
            const rawPassword = passwordValue;

            // 1) клиентский хэш пароля
            const passwordHash = await hashPassword(rawPassword);

            if (mode === "register") {
                // ====== РЕГИСТРАЦИЯ ======
                const fullName = String(formData.get("fullName") ?? "").trim();
                const phoneRaw = (formData.get("phone") as string | null) ?? "";
                const phone = phoneRaw.trim() || null;
                const city = cityInput.trim() || null;

                const payload = {
                    fullName,
                    email,
                    phone,
                    city,
                    passwordHash,
                };

                const data = await postJson<RegisterSuccessResponse>(
                    "/auth/register",
                    payload
                );

                console.log("Успешная регистрация, user:", data.user);

                setMessage(
                    "Регистрация прошла успешно. Теперь вы можете войти, используя свой email и пароль."
                );

                // Переключаемся в режим логина, чистим пароли
                setMode("login");
                setPasswordValue("");
                setPasswordConfirmValue("");
            } else {
                // ====== ЛОГИН ======
                const payload = {
                    email,
                    passwordHash,
                };

                const data = await postJson<LoginSuccessResponse>(
                    "/auth/login",
                    payload
                );

                console.log("Успешный вход, ответ:", data);

                // Сохраняем пользователя и токен через контекст
                login({
                    user: data.user,
                    token: data.accessToken,
                    expiresAt: data.accessTokenExpiresAt,
                });

                // Перенаправляем в личный кабинет
                navigate("/account");
            }
        } catch (err) {
            console.error(err);
            setMessage(
                err instanceof Error
                    ? err.message
                    : "Не удалось связаться с сервером. Попробуйте позже."
            );
        } finally {
            setLoading(false);
        }
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

    const isPasswordError =
        mode === "register" && passwordValue.length > 0 && !isPasswordStrong;
    const isConfirmError =
        mode === "register" &&
        passwordConfirmValue.length > 0 &&
        passwordConfirmValue !== passwordValue;

    return (
        <section className="space-y-8">
            <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                {/* Левая цветная часть с живым градиентом */}
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
                            Клуб собаководов,
                            <br className="hidden sm:block" />
                            где любят и людей, и собак
                        </h1>

                        <p className="mt-3 max-w-xl text-sm text-gray-700 md:text-base">
                            Регистрируйтесь, чтобы следить за событиями клуба, записывать
                            своих собак на тренировки и знакомиться с другими владельцами.
                        </p>

                        <ul className="mt-5 space-y-2 text-sm text-gray-800">
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-base">🎓</span>
                                <span>
                                    Обучающие программы для собак и тренинги для владельцев.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-base">📅</span>
                                <span>Удобный календарь мероприятий и запись онлайн.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 text-base">💬</span>
                                <span>
                                    Сообщество людей, которые так же без ума от собак, как и вы.
                                </span>
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
                                <div className="space-y-1 group">
                                    <label
                                        htmlFor="fullName"
                                        className="block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-gray-900 group-focus-within:font-semibold"
                                    >
                                        Имя и фамилия
                                    </label>
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        required
                                        autoComplete="name"
                                        className={inputBaseClass}
                                        placeholder="Например, Анна Иванова"
                                    />
                                </div>
                            )}

                            <div className="space-y-1 group">
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-gray-900 group-focus-within:font-semibold"
                                >
                                    E-mail
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className={inputBaseClass}
                                    placeholder="you@example.com"
                                />
                            </div>

                            {mode === "register" && (
                                <div className="space-y-1 group">
                                    <label
                                        htmlFor="phone"
                                        className="block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-gray-900 group-focus-within:font-semibold"
                                    >
                                        Телефон
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        autoComplete="tel"
                                        className={inputBaseClass}
                                        placeholder="+7 900 000-00-00"
                                    />
                                </div>
                            )}

                            {mode === "register" && (
                                <div className="relative space-y-1 group">
                                    <label
                                        htmlFor="city"
                                        className="block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-gray-900 group-focus-within:font-semibold"
                                    >
                                        Город
                                    </label>
                                    <input
                                        id="city"
                                        name="city"
                                        type="text"
                                        required
                                        autoComplete="address-level2"
                                        className={inputBaseClass}
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

                            <div className="space-y-1 group">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-gray-900 group-focus-within:font-semibold"
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
                                    className={
                                        inputBaseClass +
                                        (isPasswordError
                                            ? " border-red-400 focus:border-red-500 focus:ring-red-500"
                                            : "")
                                    }
                                    value={passwordValue}
                                    onChange={(e) => setPasswordValue(e.target.value)}
                                    onFocus={() => setShowPasswordHint(true)}
                                    onBlur={() => setShowPasswordHint(false)}
                                />
                            </div>

                            {/* Подсказки по паролю: только при регистрации И только когда фокус на первом поле */}
                            <AnimatePresence>
                                {mode === "register" && showPasswordHint && (
                                    <motion.div
                                        key="password-hint"
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                        className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600"
                                    >
                                        <p className="mb-1 font-medium text-gray-700">
                                            Пароль должен содержать:
                                        </p>
                                        <ul className="space-y-1">
                                            <PasswordRuleItem
                                                ok={passwordRules.length}
                                                text="не менее 8 символов"
                                            />
                                            <PasswordRuleItem
                                                ok={passwordRules.lower}
                                                text="строчные латинские буквы (a–z)"
                                            />
                                            <PasswordRuleItem
                                                ok={passwordRules.upper}
                                                text="прописные латинские буквы (A–Z)"
                                            />
                                            <PasswordRuleItem
                                                ok={passwordRules.digit}
                                                text="цифры (0–9)"
                                            />
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {mode === "register" && (
                                <div className="space-y-1 group">
                                    <label
                                        htmlFor="passwordConfirm"
                                        className="block text-sm font-medium text-gray-700 transition-colors group-focus-within:text-gray-900 group-focus-within:font-semibold"
                                    >
                                        Повторите пароль
                                    </label>
                                    <input
                                        id="passwordConfirm"
                                        name="passwordConfirm"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        className={
                                            inputBaseClass +
                                            (isConfirmError
                                                ? " border-red-400 focus:border-red-500 focus:ring-red-500"
                                                : "")
                                        }
                                        value={passwordConfirmValue}
                                        onChange={(e) =>
                                            setPasswordConfirmValue(e.target.value)
                                        }
                                    />
                                    {!isPasswordConfirmMatch && (
                                        <p className="text-[11px] text-red-600">
                                            Пароли не совпадают.
                                        </p>
                                    )}
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
                                className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl
                                           bg-gradient-to-r from-black via-gray-900 to-gray-800 px-4 py-2.5 text-sm font-semibold
                                           text-white shadow-md transition duration-150 ease-out
                                           hover:shadow-lg hover:scale-[1.01] active:scale-[0.98]
                                           disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="pointer-events-none absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                                <span className="relative z-10 flex items-center gap-1.5">
                                    <span>{buttonLabel}</span>
                                    {!loading && (
                                        <span className="mt-[1px] text-base transition-transform duration-150 ease-out group-hover:translate-x-0.5">
                                            →
                                        </span>
                                    )}
                                </span>
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