import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { UpsertProgramPayload } from "../api/client";

export interface AdminProgramFormProps {
    heading: string;
    subheading?: string;
    submitLabel: string;
    submitting: boolean;
    initialValues?: Partial<AdminProgramFormState> | null;
    accent?: "emerald" | "sky";
    resetKey?: string | number;
    actionSlot?: ReactNode;
    onSubmit: (payload: UpsertProgramPayload) => Promise<void> | void;
}

interface AdminProgramFormState {
    title: string;
    type: string;
    price: string;
    description: string;
}

const accentMap: Record<
    NonNullable<AdminProgramFormProps["accent"]>,
    { bg: string; chip: string }
> = {
    emerald: {
        bg: "from-emerald-50 via-white to-lime-50",
        chip: "bg-emerald-100 text-emerald-900",
    },
    sky: {
        bg: "from-sky-50 via-white to-cyan-50",
        chip: "bg-sky-100 text-sky-900",
    },
};

const PROGRAM_TYPES = [
    { value: "GROUP", label: "Групповая" },
    { value: "PERSONAL", label: "Персональная" },
];

function deriveProgramState(initial?: Partial<AdminProgramFormState> | null): AdminProgramFormState {
    return {
        title: initial?.title ?? "",
        type: initial?.type ?? PROGRAM_TYPES[0].value,
        price: initial?.price ?? "",
        description: initial?.description ?? "",
    };
}

export default function AdminProgramForm({
    heading,
    subheading,
    submitLabel,
    submitting,
    initialValues,
    accent = "emerald",
    resetKey,
    actionSlot,
    onSubmit,
}: AdminProgramFormProps) {
    const [form, setForm] = useState<AdminProgramFormState>(() => deriveProgramState(initialValues));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setForm(deriveProgramState(initialValues));
        setError(null);
    }, [initialValues, resetKey]);

    const accentSet = useMemo(() => accentMap[accent] ?? accentMap.emerald, [accent]);

    function handleChange<K extends keyof AdminProgramFormState>(key: K, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (!form.title.trim()) {
            setError("Введите название программы.");
            return;
        }

        if (!form.type) {
            setError("Выберите тип программы.");
            return;
        }

        if (form.price && Number(form.price) < 0) {
            setError("Стоимость не может быть отрицательной.");
            return;
        }

        const payload: UpsertProgramPayload = {
            title: form.title.trim(),
            type: form.type,
            description: form.description.trim() ? form.description.trim() : null,
        };

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
                    Управление программами
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
                        placeholder="Например, Базовый курс послушания"
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Тип
                        </label>
                        <select
                            value={form.type}
                            onChange={(e) => handleChange("type", e.target.value)}
                            className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                        >
                            {PROGRAM_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

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
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Описание
                    </label>
                    <textarea
                        value={form.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                        placeholder="Расскажите о длительности, формате и других деталях"
                    />
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

