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
        var connectionConfig = config.BuildConnectionString();

        // Инициализация работы с БД
        DataBaseModel dataBase = new DataBaseModel(connectionConfig);
        if (dataBase == null)
        {
            throw new InvalidOperationException("Failed to initialize database connection");
        }

        // Загрузка SQL-команд из JSON
        SQLCommandManager sqlCM = new SQLCommandManager(pathToSQLCommands);
        if (sqlCM == null) 
        {
            throw new InvalidOperationException("Failed to read sql queries");
        }

        // Запуск HTTP-сервера.
        // Конструктор Server содержит бесконечный цикл AcceptTcpClient,
        // поэтому Main не завершится, пока работает сервер.
        new Server(dataBase, sqlCM);
    }

    public static int Add(int a, int b)
    {
        return a + b;
    }
}