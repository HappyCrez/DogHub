namespace DogHub;

public class Launch
{
    // Сейчас конфиг задается в виде строки
    private const string connectionConfig =
        "Host=localhost;Port=5432;Username=postgres;Password=tychaaa;Database=doghub_db";
    private const string pathToSQLCommands = "./Assets/SQLCommands.json";

    /// <summary>
    /// Точка входа в программу.
    /// Поднимает HTTP-сервер и больше ничего не делает.
    /// </summary>
    /// <param name="args">В качестве параметров принимает адрес файла конфигурации (пока не используется)</param>
    public static void Main(string[] args)
    {
        // TODO: Чтение и парсинг файла конфигурации
        // Например, для передачи порта открытия сервера, имени БД,
        // логина и пароля пользователя БД и т.д.

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