namespace DogHub;

public class Launch
{
    private const string pathToSQLCommands = "./Assets/SQLCommands.json";

    /// <summary>
    /// Точка входа в программу.
    /// Поднимает HTTP-сервер и больше ничего не делает.
    /// </summary>
    /// <param name="args">В качестве параметров принимает адрес файла конфигурации (пока не используется)</param>
    public static void Main(string[] args)
    {
        // Загружаем конфиг из .env и собираем строку подключения к БД
        var config = AppConfig.FromEnv();

        // Поднимаем почтовый сервис
        new MailService(config.BuildMailConfiguration());

        // Конфигурируем подключение к БД
        DataBaseModel dataBase = new DataBaseModel(config.BuildConnectionString());
        // TODO::Три попытки тестового соединения с БД
        
        // Поднимаем сервис СУБД
        new Server(dataBase);
    }

    public static int Add(int a, int b)
    {
        return a + b;
    }
}