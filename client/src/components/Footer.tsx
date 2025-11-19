import { Link } from "react-router-dom";
import { SiTelegram, SiVk, SiInstagram } from "react-icons/si";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="mt-8 border-t border-black/5 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-5xl p-4 sm:p-6">
                <div className="grid gap-6 sm:grid-cols-3">
                    <div>
                        <div className="text-lg font-semibold">🐾 DogHub</div>
                        <p className="mt-1 text-sm text-gray-700">
                            Клуб собаководов: встречи, тренировки и поддержка сообщества.
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                            © {year} DogHub. Все права защищены.
                        </p>
                    </div>

                    <div>
                        <div className="text-sm font-semibold">Навигация</div>
                        <ul
                            className="mt-2 space-y-1 text-sm"
                            aria-label="Навигация по разделам сайта"
                        >
                            <li><Link to="/">Главная</Link></li>
                            <li><Link to="/dogs">Собаки</Link></li>
                            <li><Link to="/events">События</Link></li>
                            <li><Link to="/training">Обучение</Link></li>
                            <li><Link to="/members">Участники</Link></li>
                        </ul>
                    </div>

                    <div>
                        <div className="text-sm font-semibold">Контакты</div>
                        <ul className="mt-2 space-y-1 text-sm">
                            <li>
                                📧{" "}
                                <a href="mailto:doghub@mail.ru">
                                    doghub@mail.ru
                                </a>
                            </li>
                            <li>
                                📞{" "}
                                <a href="tel:+74991234567">
                                    +7&nbsp;499&nbsp;123-45-67
                                </a>
                            </li>
                            <li className="pt-1">
                                <div className="flex items-center gap-3">
                                    <a
                                        href="https://t.me/doghub"
                                        className="inline-flex items-center gap-1 hover:opacity-80"
                                        aria-label="Telegram"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <SiTelegram size={18} aria-hidden />
                                        <span>Telegram</span>
                                    </a>
                                    <a
                                        href="https://vk.com/doghub"
                                        className="inline-flex items-center gap-1 hover:opacity-80"
                                        aria-label="VK"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <SiVk size={18} aria-hidden />
                                        <span>VK</span>
                                    </a>
                                    <a
                                        href="https://www.instagram.com/doghub"
                                        className="inline-flex items-center gap-1 hover:opacity-80"
                                        aria-label="Instagram"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <SiInstagram size={18} aria-hidden />
                                        <span>Instagram</span>
                                    </a>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-6 text-xs text-gray-500">
                    Учебный проект. Материалы используются в демонстрационных целях.
                </div>
            </div>
        </footer>
    );
}