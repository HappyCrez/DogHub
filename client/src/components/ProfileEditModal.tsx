import {
    useEffect,
    useState,
    type FormEvent,
} from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../api/client";
import type { MemberWithDogs } from "./MemberCard";

export interface ProfileEditPayload {
    fullName: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    bio: string | null;
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
    const [phone, setPhone] = useState(member.phone ?? "");
    const [email, setEmail] = useState(member.email ?? "");
    const [city, setCity] = useState(member.city ?? "");
    const [bio, setBio] = useState(member.bio ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Подхватываем обновлённого участника при повторном открытии
    useEffect(() => {
        if (!open) return;
        setFullName(member.fullName ?? "");
        setPhone(member.phone ?? "");
        setEmail(member.email ?? "");
        setCity(member.city ?? "");
        setBio(member.bio ?? "");
        setError(null);
    }, [open, member]);

    if (!open) return null;

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

        const payloadForApi = {
            fullName: fullName.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            city: city.trim() || null,
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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
        >
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
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                                placeholder="+7..."
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Город
                            </label>
                            <input
                                type="text"
                                value={city ?? ""}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            />
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