import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { UpsertEventPayload } from "../api/client";

export interface AdminEventFormProps {
    heading: string;
    subheading?: string;
    submitLabel: string;
    submitting: boolean;
    initialValues?: Partial<AdminEventFormState> | null;
    showCategoryField?: boolean;
    accent?: "amber" | "violet";
    resetKey?: string | number;
    actionSlot?: ReactNode;
    onSubmit: (payload: UpsertEventPayload) => Promise<void> | void;
}

interface AdminEventFormState {
    title: string;
    category: string;
    startAt: string;
    endAt: string;
    venue: string;
    price: string;
    description: string;
}

const accentClasses: Record<
    NonNullable<AdminEventFormProps["accent"]>,
    { bg: string; chip: string }
> = {
    amber: {
        bg: "from-amber-50 via-white to-orange-50",
        chip: "bg-amber-100 text-amber-900",
    },
    violet: {
        bg: "from-violet-50 via-white to-fuchsia-50",
        chip: "bg-violet-100 text-violet-900",
    },
};

function toDateTimeInput(value?: string | null): string {
    if (!value) return "";
    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) {
        return value.length >= 16 ? value.slice(0, 16) : value;
    }
    const local = new Date(asDate.getTime() - asDate.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function defaultStartDate(): string {
    const now = new Date(Date.now() + 60 * 60 * 1000);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function deriveState(initial?: Partial<AdminEventFormState> | null): AdminEventFormState {
    return {
        title: initial?.title ?? "",
        category: initial?.category ?? "",
        startAt: initial?.startAt ? toDateTimeInput(initial.startAt) : defaultStartDate(),
        endAt: initial?.endAt ? toDateTimeInput(initial.endAt) : "",
        venue: initial?.venue ?? "",
        price: initial?.price ?? "",
        description: initial?.description ?? "",
    };
}

export default function AdminEventForm({
    heading,
    subheading,
    submitLabel,
    submitting,
    initialValues,
    showCategoryField = true,
    accent = "amber",
    resetKey,
    actionSlot,
    onSubmit,
}: AdminEventFormProps) {
    const [form, setForm] = useState<AdminEventFormState>(() => deriveState(initialValues));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setForm(deriveState(initialValues));
        setError(null);
    }, [initialValues, resetKey]);

    const accentSet = useMemo(() => accentClasses[accent] ?? accentClasses.amber, [accent]);

    function handleChange<K extends keyof AdminEventFormState>(key: K, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (!form.title.trim() || !form.startAt.trim() || !form.venue.trim()) {
            setError("Пожалуйста, заполните название, дату и место проведения.");
            return;
        }

        if (showCategoryField && !form.category.trim()) {
            setError("Выберите категорию события.");
            return;
        }

        if (form.price && Number(form.price) < 0) {
            setError("Цена не может быть отрицательной.");
            return;
        }

        const payload: UpsertEventPayload = {
            title: form.title.trim(),
            startAt: form.startAt,
            venue: form.venue.trim(),
            description: form.description.trim() ? form.description.trim() : null,
        };

        if (showCategoryField) {
            payload.category = form.category.trim();
        }

        if (form.endAt) {
            payload.endAt = form.endAt;
        } else {
            payload.endAt = null;
        }

        if (form.price) {
            const priceValue = Number(form.price);
            if (Number.isNaN(priceValue)) {
                setError("Введите корректное число в поле цены.");
                return;
            }
            payload.price = priceValue;
        } else {
            payload.price = null;
        }

        await onSubmit(payload);
    }

    return (
        <div className={`rounded-3xl bg-gradient-to-br ${accentSet.bg} p-5 shadow-md ring-1 ring-black/5`}>
            <div className="mb-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Панель администратора
                </p>
                <h3 className="text-lg font-semibold text-gray-900">{heading}</h3>
                {subheading && (
                    <p className="text-xs text-gray-600">{subheading}</p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Название
                    </label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => handleChange("title", e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                        placeholder="Например, прогулка в парке"
                    />
                </div>

                {showCategoryField && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Категория
                        </label>
                        <input
                            type="text"
                            value={form.category}
                            onChange={(e) => handleChange("category", e.target.value)}
                            className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                            placeholder="Например, Культура"
                        />
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Начало
                        </label>
                        <input
                            type="datetime-local"
                            value={form.startAt}
                            onChange={(e) => handleChange("startAt", e.target.value)}
                            className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Окончание
                        </label>
                        <input
                            type="datetime-local"
                            value={form.endAt}
                            onChange={(e) => handleChange("endAt", e.target.value)}
                            className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Локация
                    </label>
                    <input
                        type="text"
                        value={form.venue}
                        onChange={(e) => handleChange("venue", e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                        placeholder="Адрес или площадка"
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Стоимость
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="100"
                            value={form.price}
                            onChange={(e) => handleChange("price", e.target.value)}
                            className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                            placeholder="0 — бесплатно"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Описание
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            rows={3}
                            className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                            placeholder="Коротко расскажите, что будет происходить"
                        />
                    </div>
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {submitting ? "Сохраняем…" : submitLabel}
                    </button>
                    {actionSlot}
                </div>
            </form>
        </div>
    );
}

