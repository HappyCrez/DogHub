import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import {
    bookDogService,
    cancelDogService,
    getMyDogServices,
    getServiceTypes,
    type ApiDogServiceRow,
    type ApiDogServicesResponse,
    type ApiServiceType,
    type BookDogServicePayload,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCurrentMember } from "../hooks/useCurrentMember";

type FormState = {
    dogId: string;
    serviceTypeId: string;
    requestedAt: string;
};

type FormMessage =
    | { type: "success"; text: string }
    | { type: "error"; text: string }
    | null;

export default function Services() {
    const { isAuthenticated, token, isReady } = useAuth();
    const { dogs, loading: dogsLoading } = useCurrentMember();

    const [serviceTypes, setServiceTypes] = useState<ApiServiceType[]>([]);
    const [typesError, setTypesError] = useState<string | null>(null);
    const [typesLoading, setTypesLoading] = useState(true);

    const [myServices, setMyServices] = useState<ApiDogServiceRow[]>([]);
    const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
    const [servicesError, setServicesError] = useState<string | null>(null);
    const [servicesLoading, setServicesLoading] = useState(false);

    const [formState, setFormState] = useState<FormState>({
        dogId: "",
        serviceTypeId: "",
        requestedAt: "",
    });
    const [formMessage, setFormMessage] = useState<FormMessage>(null);
    const [submitting, setSubmitting] = useState(false);
    const [listMessage, setListMessage] = useState<FormMessage>(null);
    const [cancelBusyId, setCancelBusyId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        setTypesLoading(true);
        getServiceTypes()
            .then((data) => {
                if (cancelled) return;
                setServiceTypes(data);
            })
            .catch((err) => {
                console.error(err);
                if (!cancelled) setTypesError("Не удалось загрузить услуги клуба.");
            })
            .finally(() => {
                if (!cancelled) setTypesLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const loadMyServices = useCallback(
        async (silent = false) => {
            if (!token) {
                setMyServices([]);
                setStatusLabels({});
                return;
            }
            if (!silent) {
                setServicesLoading(true);
                setServicesError(null);
            }
            try {
                const data: ApiDogServicesResponse = await getMyDogServices(token);
                setMyServices(data.services ?? []);
                setStatusLabels(data.statusLabels ?? {});
            } catch (err) {
                console.error(err);
                setServicesError(
                    err instanceof Error
                        ? err.message
                        : "Не удалось загрузить ваши заявки."
                );
            } finally {
                if (!silent) setServicesLoading(false);
            }
        },
        [token]
    );

    useEffect(() => {
        if (!isReady) return;
        if (!isAuthenticated || !token) {
            setMyServices([]);
            setStatusLabels({});
            setServicesLoading(false);
            return;
        }
        loadMyServices();
    }, [isAuthenticated, token, isReady, loadMyServices]);

    const canSubmit = useMemo(() => {
        return (
            isAuthenticated &&
            !!formState.dogId &&
            !!formState.serviceTypeId &&
            !!formState.requestedAt &&
            !submitting
        );
    }, [formState, isAuthenticated, submitting]);

    const handleFieldChange =
        (field: keyof FormState) =>
        (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormState((prev) => ({
            ...prev,
            [field]: e.target.value,
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!token) {
            setFormMessage({
                type: "error",
                text: "Авторизуйтесь, чтобы записать собаку на услугу.",
            });
            return;
        }
        if (!canSubmit) return;

        setSubmitting(true);
        setFormMessage(null);

        const payload: BookDogServicePayload = {
            dogId: Number(formState.dogId),
            serviceTypeId: Number(formState.serviceTypeId),
            requestedAt: formState.requestedAt,
        };

        try {
            await bookDogService(payload, token);
            setFormMessage({
                type: "success",
                text: "Заявка отправлена. Мы свяжемся с вами для подтверждения.",
            });
        setFormState((prev) => ({
            ...prev,
            requestedAt: "",
        }));
            await loadMyServices(true);
        } catch (err) {
            console.error(err);
            setFormMessage({
                type: "error",
                text:
                    err instanceof Error
                        ? err.message
                        : "Не удалось отправить заявку. Попробуйте позже.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const statusBadge = useCallback(
        (status: string) => {
            const label = statusLabels[status] ?? status;
            const map: Record<string, string> = {
                REQUESTED: "bg-slate-100 text-slate-700",
                SCHEDULED: "bg-amber-100 text-amber-900",
                DONE: "bg-emerald-100 text-emerald-800",
                CANCELED: "bg-rose-100 text-rose-800",
            };
            const classes =
                map[status.toUpperCase()] ?? "bg-gray-100 text-gray-700";
            return (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${classes}`}>
                    {label}
                </span>
            );
        },
        [statusLabels]
    );

    const formatDate = (value: string | null | undefined) => {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleString("ru-RU", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const selectedService = useMemo(
        () =>
            serviceTypes.find(
                (service) => String(service.id) === formState.serviceTypeId
            ),
        [serviceTypes, formState.serviceTypeId]
    );

    const selectedServicePrice = selectedService?.price ?? null;

    const canCancelStatus = (status: string) => {
        const normalized = (status ?? "").toUpperCase();
        return normalized !== "DONE" && normalized !== "CANCELED";
    };

    const handleCancel = useCallback(
        async (serviceId: number) => {
            if (!token) {
                setListMessage({
                    type: "error",
                    text: "Авторизуйтесь снова, чтобы управлять заявками.",
                });
                return;
            }

            setCancelBusyId(serviceId);
            setListMessage(null);
            try {
                await cancelDogService(serviceId, token);
                setListMessage({
                    type: "success",
                    text: "Заявка отменена.",
                });
                await loadMyServices(true);
            } catch (err) {
                console.error(err);
                setListMessage({
                    type: "error",
                    text:
                        err instanceof Error
                            ? err.message
                            : "Не удалось отменить заявку. Попробуйте позже.",
                });
            } finally {
                setCancelBusyId(null);
            }
        },
        [token, loadMyServices]
    );

    return (
        <section className="space-y-6">
            <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Услуги клуба
                </p>
                <h1 className="text-3xl font-bold">С заботой о вашей собаке</h1>
                <p className="text-sm text-gray-700">
                    Чипирование, вакцинация, груминг и другие сервисы DogHub. Выберите услугу,
                    подходящую вашему питомцу, и оставьте заявку онлайн — мы свяжемся для подтверждения времени.
                </p>
            </header>

            <section className="space-y-4 rounded-3xl border border-dashed border-gray-200 bg-white/80 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-semibold">Каталог услуг</h2>
                        <p className="text-sm text-gray-500">
                            Все услуги доступны членам клуба. Ниже указана базовая стоимость каждой услуги.
                        </p>
                    </div>
                    <span className="text-xs text-gray-500">
                        {typesLoading ? "Загружаем…" : `Доступно: ${serviceTypes.length}`}
                    </span>
                </div>
                {typesError && (
                    <p className="text-sm text-red-600">{typesError}</p>
                )}

                {!typesLoading && serviceTypes.length === 0 && !typesError && (
                    <p className="text-sm text-gray-600">
                        Список услуг пока пуст. Загляните позже.
                    </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                    {serviceTypes.map((service) => (
                        <article
                            key={service.id}
                            className="rounded-2xl border border-gray-200 bg-white/60 p-4 shadow-sm transition hover:border-black/20"
                        >
                            <p className="text-base font-semibold text-gray-900">
                                {service.name}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                                Доступно для всех собак клуба. Выберите услугу в форме ниже и мы назначим удобное время.
                            </p>
                            <p className="mt-2 text-sm font-semibold text-gray-900">
                                Стоимость: {service.price != null ? `${service.price} ₽` : "—"}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-black/5">
                    <h2 className="text-lg font-semibold text-gray-900">Запись на услугу</h2>
                    <p className="text-sm text-gray-600">
                        Выберите собаку, услугу и желаемое время. Администратор подтвердит запись по телефону.
                    </p>

                    {!isAuthenticated ? (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            Чтобы оставить заявку,{" "}
                            <span className="font-semibold">войдите в личный кабинет.</span>
                        </div>
                    ) : dogsLoading ? (
                        <p className="mt-4 text-sm text-gray-500">Загружаем список ваших собак…</p>
                    ) : dogs.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                            Добавьте собаку в разделе «Мои собаки», чтобы записать её на услугу.
                        </div>
                    ) : (
                        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                            <label className="block">
                                <span className="text-sm font-medium text-gray-800">Собака</span>
                                <select
                                    className="mt-1 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                                    value={formState.dogId}
                                    onChange={handleFieldChange("dogId")}
                                >
                                    <option value="">Выберите собаку</option>
                                    {dogs.map((dog) => (
                                        <option key={dog.id} value={dog.id}>
                                            {dog.name} · {dog.breed}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="text-sm font-medium text-gray-800">Услуга</span>
                                <select
                                    className="mt-1 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                                    value={formState.serviceTypeId}
                                    onChange={handleFieldChange("serviceTypeId")}
                                >
                                    <option value="">Выберите услугу</option>
                                    {serviceTypes.map((service) => (
                                        <option key={service.id} value={service.id}>
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {selectedService && (
                                <div className="rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                    <p>
                                        <span className="font-semibold">Стоимость:</span>{" "}
                                        {selectedServicePrice != null
                                            ? `${selectedServicePrice} ₽`
                                            : "—"}
                                    </p>
                                </div>
                            )}

                            <label className="block">
                                <span className="text-sm font-medium text-gray-800">Желаемая дата и время</span>
                                <input
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                                    value={formState.requestedAt}
                                    onChange={handleFieldChange("requestedAt")}
                                />
                            </label>

                            {formMessage && (
                                <p
                                    className={`text-sm ${
                                        formMessage.type === "success"
                                            ? "text-emerald-600"
                                            : "text-red-600"
                                    }`}
                                >
                                    {formMessage.text}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="w-full rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-400"
                            >
                                {submitting ? "Отправляем…" : "Записать собаку"}
                            </button>
                        </form>
                    )}
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Мои заявки</h2>
                            <p className="text-sm text-gray-600">
                                История услуг для ваших питомцев.
                            </p>
                        </div>
                        {isAuthenticated && (
                            <button
                                type="button"
                                onClick={() => loadMyServices()}
                                className="rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black"
                            >
                                Обновить
                            </button>
                        )}
                    </div>

                    {!isAuthenticated ? (
                        <p className="mt-4 text-sm text-gray-500">
                            Войдите, чтобы видеть историю услуг вашей собаки.
                        </p>
                    ) : servicesLoading ? (
                        <p className="mt-4 text-sm text-gray-500">Загружаем заявки…</p>
                    ) : servicesError ? (
                        <p className="mt-4 text-sm text-red-600">{servicesError}</p>
                    ) : myServices.length === 0 ? (
                        <p className="mt-4 text-sm text-gray-600">
                            Пока нет записей об услугах. После бронирования они появятся здесь.
                        </p>
                    ) : (
                        <>
                            {listMessage && (
                                <p
                                    className={`mt-4 text-sm ${
                                        listMessage.type === "success"
                                            ? "text-emerald-600"
                                            : "text-red-600"
                                    }`}
                                >
                                    {listMessage.text}
                                </p>
                            )}
                        <div className="mt-4 space-y-3">
                            {myServices.map((service) => (
                                <article
                                    key={service.id}
                                    className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-base font-semibold text-gray-900">
                                                {service.serviceName}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {service.dogName}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {statusBadge(service.status)}
                                            {canCancelStatus(service.status) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancel(service.id)}
                                                    disabled={cancelBusyId === service.id}
                                                    className="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                                >
                                                    {cancelBusyId === service.id
                                                        ? "Отменяем…"
                                                        : "Отменить"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <dl className="mt-3 grid gap-3 text-xs text-gray-600 sm:grid-cols-3">
                                        <div>
                                            <dt className="uppercase tracking-wide text-[10px] text-gray-400">
                                                Запрошено
                                            </dt>
                                            <dd className="mt-0.5 text-sm">
                                                {formatDate(service.requestedAt)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="uppercase tracking-wide text-[10px] text-gray-400">
                                                Выполнено
                                            </dt>
                                            <dd className="mt-0.5 text-sm">
                                                {formatDate(service.performedAt)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="uppercase tracking-wide text-[10px] text-gray-400">
                                                Стоимость
                                            </dt>
                                            <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                                                {typeof service.price === "number"
                                                    ? `${service.price} ₽`
                                                    : "По прейскуранту"}
                                            </dd>
                                        </div>
                                    </dl>
                                </article>
                            ))}
                        </div>
                        </>
                    )}
                </div>
            </section>
        </section>
    );
}

