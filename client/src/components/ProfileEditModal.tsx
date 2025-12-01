import {
    useEffect,
    useState,
    type FormEvent,
    type ChangeEvent,
} from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../api/client";
import type { MemberWithDogs } from "./MemberCard";
import { CITY_OPTIONS } from "../pages/Auth";

export interface ProfileEditPayload {
    fullName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    bio: string | null;
}

// Форматируем 10 цифр после +7 в вид +7-XXX-XXX-XX-XX
function formatRussianPhone(restDigits: string): string {
    const digits = restDigits.replace(/\D/g, "").slice(0, 10); // максимум 10 цифр
    const parts: string[] = [];

    if (digits.length > 0) parts.push(digits.slice(0, 3));
    if (digits.length > 3) parts.push(digits.slice(3, 6));
    if (digits.length > 6) parts.push(digits.slice(6, 8));
    if (digits.length > 8) parts.push(digits.slice(8, 10));

    return "+7" + (parts.length ? "-" + parts.join("-") : "");
}

// Нормализуем телефон из профиля под ту же маску
function normalizeInitialPhone(raw: string | null | undefined): string {
    if (!raw) return "";
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("7")) {
        digits = digits.slice(1);
    }
    const formatted = formatRussianPhone(digits);
    return formatted || "";
}

interface ProfileEditModalProps {
    open: boolean;
    member: MemberWithDogs;
    onClose: () => void;
    onSaved: (payload: ProfileEditPayload) => void;
}

export function ProfileEditModal({
                                     open,
                                     member,
                                     onClose,
                                     onSaved,
                                 }: ProfileEditModalProps) {
    const [fullName, setFullName] = useState(member.fullName ?? "");
    const [phone, setPhone] = useState(() => normalizeInitialPhone(member.phone));
    const [email, setEmail] = useState(member.email ?? "");
    const [cityInput, setCityInput] = useState(member.city ?? "");
    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [bio, setBio] = useState(member.bio ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Подхватываем обновлённого участника при повторном открытии
    useEffect(() => {
        if (!open) return;
        setFullName(member.fullName ?? "");
        setPhone(normalizeInitialPhone(member.phone));
        setEmail(member.email ?? "");
        setCityInput(member.city ?? "");
        setCitySuggestions([]);
        setShowCityDropdown(false);
        setBio(member.bio ?? "");
        setError(null);
    }, [open, member]);

    if (!open) return null;

    // === Телефон с маской +7-XXX-XXX-XX-XX ===
    function handlePhoneFocus() {
        // при фокусе, если ничего нет — подставляем "+7"
        if (!phone) {
            setPhone("+7");
        }
    }

    function handlePhoneBlur() {
        // если пользователь так и не ввёл цифры, очищаем поле
        if (phone === "+7") {
            setPhone("");
        }
    }

    function handlePhoneChange(e: ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;

        // все цифры из ввода
        let digits = value.replace(/\D/g, "");

        // первая "7" — это код страны, остальные — тело номера
        if (digits.startsWith("7")) {
            digits = digits.slice(1);
        }

        const formatted = formatRussianPhone(digits);
        setPhone(formatted || "+7");
    }

    // === Подсказки городов ===
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

    function handleCityBlur() {
        // Маленькая задержка, чтобы успел отработать onClick по пункту списка
        setTimeout(() => {
            setShowCityDropdown(false);
        }, 100);
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const token = localStorage.getItem("doghub_access_token");

        if (!token) {
            setError(
                "Не удалось сохранить профиль: вы не авторизованы. Пожалуйста, войдите в аккаунт ещё раз."
            );
            return;
        }

        const phoneForApi =
            phone && phone !== "+7" ? phone.trim() : null;

        const payloadForApi = {
            fullName: fullName.trim(),
            phone: phoneForApi,
            email: email.trim() || null,
            city: cityInput.trim() || null,
            ownerBio: bio.trim() || null,
        };

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payloadForApi),
            });

            if (res.status === 401) {
                setError(
                    "Сессия истекла или нет доступа к профилю. Попробуйте выйти из аккаунта и войти снова."
                );
                return;
            }

            let responseBody: any = null;
            try {
                responseBody = await res.json();
            } catch {
                // тело могло быть пустым — игнорируем
            }

            if (!res.ok) {
                const msg =
                    (responseBody && (responseBody.error as string)) ||
                    `Ошибка сохранения профиля (HTTP ${res.status})`;
                throw new Error(msg);
            }

            // Обновляем локальное состояние в ЛК
            onSaved({
                fullName: payloadForApi.fullName,
                phone: payloadForApi.phone,
                email: payloadForApi.email,
                city: payloadForApi.city,
                bio: (payloadForApi.ownerBio as string | null) ?? null,
            });

            onClose();
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Не удалось сохранить профиль. Попробуйте ещё раз."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl md:p-6"
            >
                <h2 className="mb-1 text-lg font-semibold text-gray-900">
                    Настройки профиля
                </h2>
                <p className="mb-4 text-xs text-gray-500">
                    Обновите свои данные. Фото пока будет с заглушкой — добавим позже.
                </p>

                {error && (
                    <p className="mb-3 text-xs text-red-600">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Имя и фамилия
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            required
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Телефон
                            </label>
                            <input
                                type="tel"
                                value={phone ?? ""}
                                onChange={handlePhoneChange}
                                onFocus={handlePhoneFocus}
                                onBlur={handlePhoneBlur}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                                placeholder="+7-900-000-00-00"
                                inputMode="tel"
                            />
                        </div>
                        <div className="relative">
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Город
                            </label>
                            <input
                                type="text"
                                value={cityInput}
                                onChange={handleCityChange}
                                onBlur={handleCityBlur}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                                placeholder="Например, Романово"
                                autoComplete="off"
                            />
                            {showCityDropdown && citySuggestions.length > 0 && (
                                <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-gray-200 bg-white text-xs shadow-lg">
                                    {citySuggestions.map((city) => (
                                        <li key={city}>
                                            <button
                                                type="button"
                                                onClick={() => handleCitySelect(city)}
                                                className="flex w-full items-center px-3 py-2 text-left hover:bg-amber-50"
                                            >
                                                {city}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email ?? ""}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Описание (bio)
                        </label>
                        <textarea
                            rows={3}
                            value={bio ?? ""}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            placeholder="Расскажите пару слов о себе и ваших собаках..."
                        />
                    </div>

                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                        Фото профиля сейчас используется как заглушка. Позже здесь появится
                        загрузка своей фотографии 🐾
                    </div>

                    <div className="mt-3 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-black/90 disabled:bg-black disabled:opacity-60"
                        >
                            {saving ? "Сохраняем..." : "Сохранить"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}