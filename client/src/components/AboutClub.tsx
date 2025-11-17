import { Link } from "react-router-dom";

export default function AboutClub() {
    return (
        <section
            id="about"
            className="space-y-4 rounded-2xl bg-white p-6 shadow"
            aria-labelledby="about-title"
        >
            <h2 id="about-title" className="text-2xl font-bold">
                О клубе DogHub
            </h2>

            <p className="text-gray-700">
                DogHub — это дружественное сообщество владельцев собак. Мы встречаемся,
                обмениваемся опытом, проводим тренировки и мероприятия, помогаем друг
                другу растить счастливых хвостиков.
            </p>
            <p className="text-gray-700">
                У нас ценят уважительное общение, безопасные прогулки и позитивный
                подход к обучению. Новичкам всегда рады — подскажем площадки,
                инструкторов и полезные ресурсы.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xl">🐕‍🦺</div>
                    <h3 className="mt-1 font-semibold">Прогулки и встречи</h3>
                    <p className="text-sm text-gray-600">
                        Регулярные митапы в парках и на площадках.
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xl">🎓</div>
                    <h3 className="mt-1 font-semibold">Тренировки</h3>
                    <p className="text-sm text-gray-600">
                        Послушание, аджилити и полезные навыки.
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xl">🤝</div>
                    <h3 className="mt-1 font-semibold">Поддержка</h3>
                    <p className="text-sm text-gray-600">
                        Помощь советом для новичков и опытных.
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xl">📅</div>
                    <h3 className="mt-1 font-semibold">Мероприятия</h3>
                    <p className="text-sm text-gray-600">
                        Шоу, фотосессии и добрые инициативы.
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
                <Link
                    to="/events"
                    className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
                >
                    Смотреть ближайшие события
                </Link>
                <Link
                    to="/members"
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 hover:bg-gray-100"
                >
                    Познакомиться с участниками
                </Link>
            </div>
        </section>
    );
}