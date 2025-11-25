namespace DogHub;

public class Launch
{
    /// <summary>
    /// Точка входа в программу.
    /// Поднимает HTTP-сервер и больше ничего не делает.
    /// </summary>
    /// <param name="args">В качестве параметров принимает адрес файла конфигурации (пока не используется)</param>
    public static void Main(string[] args)
    {
        // Загружаем конфиг из .env и собираем строку подключения к БД
        var config = AppConfig.FromEnv();

        // Конфигурируем подключение к БД
        DataBaseModel database = new DataBaseModel(config.BuildConnectionString());
        // TODO::Три попытки тестового соединения с БД
        
        // Поднимаем почтовый сервис
        new MailService(config.BuildMailConfiguration(), database);

        // Поднимаем сервис СУБД
        new Server(database);
    }

    public static int Add(int a, int b)
    {
        return a + b;
    }
}