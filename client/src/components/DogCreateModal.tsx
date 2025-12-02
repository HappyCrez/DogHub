import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { motion } from "framer-motion";
import {
    createDog,
    type ApiCreatedDog,
    type CreateDogPayload,
    uploadDogPhoto,
} from "../api/client";

const ALLOWED_DOG_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DOG_PHOTO_SIZE = 5 * 1024 * 1024;

interface DogCreateModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: (dog: ApiCreatedDog) => void;
}

function normalizeTagsInput(input: string): string[] | null {
    const tags = input
        .split(",")
        .map((tag) => tag.replace(/^#/, "").trim())
        .filter((tag) => tag.length > 0);

    return tags.length > 0 ? tags : null;
}

export function DogCreateModal({ open, onClose, onCreated }: DogCreateModalProps) {
    const [name, setName] = useState("");
    const [breed, setBreed] = useState("");
    const [sex, setSex] = useState<"M" | "F">("M");
    const [birthDate, setBirthDate] = useState("");
    const [chipNumber, setChipNumber] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [bio, setBio] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const previewObjectUrlRef = useRef<string | null>(null);

    function setPhotoPreviewSafe(value: string | null, isObjectUrl = false) {
        if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = null;
        }
        setPhotoPreview(value);
        if (isObjectUrl && value) {
            previewObjectUrlRef.current = value;
        }
    }

    useEffect(() => {
        return () => {
            if (previewObjectUrlRef.current) {
                URL.revokeObjectURL(previewObjectUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!open) return;

        setName("");
        setBreed("");
        setSex("M");
        setBirthDate("");
        setChipNumber("");
        setTagsInput("");
        setBio("");
        setPhotoFile(null);
        setPhotoPreviewSafe(null);
        setError(null);
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
        }
    }, [open]);

    if (!open) return null;

    function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) {
            setPhotoFile(null);
            setPhotoPreviewSafe(null);
            return;
        }

        if (!ALLOWED_DOG_PHOTO_TYPES.includes(file.type)) {
            setError("Поддерживаются только JPG, PNG или WEBP.");
            e.target.value = "";
            return;
        }

        if (file.size > MAX_DOG_PHOTO_SIZE) {
            setError("Размер файла не должен превышать 5 МБ.");
            e.target.value = "";
            return;
        }

        setError(null);
        setPhotoFile(file);
        const url = URL.createObjectURL(file);
        setPhotoPreviewSafe(url, true);
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const trimmedName = name.trim();
        const trimmedBreed = breed.trim();

        if (!trimmedName) {
            setError("Укажите кличку собаки.");
            return;
        }

        if (!trimmedBreed) {
            setError("Укажите породу собаки.");
            return;
        }

        const token = localStorage.getItem("doghub_access_token");
        if (!token) {
            setError("Для добавления собаки нужно войти в аккаунт снова.");
            return;
        }

        setSaving(true);
        try {
            let uploadedPhotoUrl: string | null = null;
            if (photoFile) {
                const uploadResult = await uploadDogPhoto(photoFile, token);
                uploadedPhotoUrl = uploadResult.photoUrl;
            }

            const payload: CreateDogPayload = {
                name: trimmedName,
                breed: trimmedBreed,
                sex,
            };

            if (birthDate) {
                payload.birthDate = birthDate;
            }

            if (chipNumber.trim()) {
                payload.chipNumber = chipNumber.trim();
            }

            if (bio.trim()) {
                payload.bio = bio.trim();
            }

            const tags = normalizeTagsInput(tagsInput);
            if (tags) {
                payload.tags = tags;
            }

            if (uploadedPhotoUrl) {
                payload.photo = uploadedPhotoUrl;
            }

            const createdDog = await createDog(payload, token);
            onCreated(createdDog);
            onClose();
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Не удалось добавить собаку. Попробуйте ещё раз."
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
                className="relative w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl md:p-6"
            >
                <h2 className="mb-1 text-lg font-semibold text-gray-900">Добавить собаку</h2>
                <p className="mb-4 text-xs text-gray-500">
                    Заполните карточку питомца и при необходимости загрузите фотографию.
                </p>

                {error && (
                    <p className="mb-3 text-xs text-red-600">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Кличка *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Порода *
                            </label>
                            <input
                                type="text"
                                value={breed}
                                onChange={(e) => setBreed(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Пол
                            </label>
                            <select
                                value={sex}
                                onChange={(e) => setSex(e.target.value === "F" ? "F" : "M")}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            >
                                <option value="M">Кобель</option>
                                <option value="F">Сука</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Дата рождения
                            </label>
                            <input
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Номер чипа
                            </label>
                            <input
                                type="text"
                                value={chipNumber}
                                onChange={(e) => setChipNumber(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                                placeholder="Например, 12345"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Теги (через запятую)
                            </label>
                            <input
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                                placeholder="Например, #спорт, #хендлинг"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Описание
                        </label>
                        <textarea
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                            placeholder="Расскажите о характере, достижениях и особенностях питомца..."
                        />
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-medium text-gray-700">Фотография</p>
                        <div className="mt-3 flex items-center gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Предпросмотр фото собаки"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xl">
                                        🐶
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-1 flex-col gap-2 text-xs text-gray-600">
                                <label className="inline-flex w-fit cursor-pointer items-center justify-center rounded-xl bg-black px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-black/90">
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={handlePhotoChange}
                                    />
                                    Выбрать файл
                                </label>
                                {photoFile && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPhotoFile(null);
                                            setPhotoPreviewSafe(null);
                                            if (photoInputRef.current) {
                                                photoInputRef.current.value = "";
                                            }
                                        }}
                                        className="w-fit rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-white"
                                    >
                                        Сбросить выбор
                                    </button>
                                )}
                                <p className="text-[11px] text-gray-500">
                                    Допустимы JPG, PNG или WEBP до 5 МБ.
                                </p>
                                {photoFile && (
                                    <p className="text-[11px] text-gray-600">
                                        Загружено: {photoFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
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
                            {saving ? "Сохраняем..." : "Добавить"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

