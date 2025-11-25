using System;
using DotNetEnv;

namespace DogHub;

/// <summary>
/// Представляет конфигурацию приложения,
/// загружаемую из файла .env.
/// </summary>
public class AppConfig
{
    private const string envPath = "./Assets/.env";

    private readonly string dbHost;
    private readonly string dbPort;
    private readonly string dbUser;
    private readonly string dbName;
    private readonly string dbPassword;

    private readonly string mailUser;
    private readonly string mailPassword;
    private readonly string mailFilePath;
    private readonly string mailTimeout;

    public static bool DEBUG = true;

    /// <summary>
    /// Инициирует поля доступные только для чтения
    /// </summary>
    /// <param name="dbHost">Адрес подключения к БД</param>
    /// <param name="dbPort">Порт подключения к БД</param>
    /// <param name="dbUser">Имя пользователя для подключения</param>
    /// <param name="dbName">Имя БД для подключения</param>
    /// <param name="dbPassword">Пароль пользователя БД</param>
    /// <param name="mailUser">Хост почтовый адрес</param>
    /// <param name="mailPassword">Пароль приложения</param>
    /// <param name="mailFilePath">Путь к тексту сообщения</param>
    /// <param name="mailTimeout">
    /// Время между проверкой состояния БД на изменения
    /// </param>
    private AppConfig
        (string dbHost, string dbPort, string dbUser, string dbName, string dbPassword,
         string mailUser, string mailPassword, string mailFilePath, string mailTimeout)
    {
        this.dbHost = dbHost;
        this.dbPort = dbPort;
        this.dbUser = dbUser;
        this.dbName = dbName;
        this.dbPassword = dbPassword;

        this.mailUser = mailUser;
        this.mailPassword = mailPassword;
        this.mailFilePath = mailFilePath;
        this.mailTimeout = mailTimeout;
    }

    /// <summary>
    /// Создаёт экземпляр конфигурации, загружая
    /// значения из файла .env и переменных окружения
    /// </summary>
    /// <returns>
    /// Экземпляр <see cref="AppConfig"/> с заполненными свойствами
    /// </returns>
    public static AppConfig FromEnv()
    {
        Env.Load(envPath);

        // Конфигурация сервиса СУБД
        string dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
        string dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
        string dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
        string dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "doghub_db";
        string dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") 
            ?? throw new InvalidOperationException("DB_PASSWORD is not set");
        
        // Конфигурация почтового сервиса
        string mailUser = Environment.GetEnvironmentVariable("MAIL_USER")
            ?? throw new InvalidOperationException("MAIL_USER is not set");
        string mailPassword = Environment.GetEnvironmentVariable("MAIL_PASSWORD")
            ?? throw new InvalidOperationException("MAIL_PASSWORD is not set");
        string mailFilePath = Environment.GetEnvironmentVariable("MAIL_FILE_PATH") ?? "./Assets/Mail.html";
        string mailTimeout = Environment.GetEnvironmentVariable("MAIL_TIMEOUT") ?? "300";

        return new AppConfig
            (dbHost, dbPort, dbUser, dbName, dbPassword,
             mailUser, mailPassword, mailFilePath, mailTimeout);
    }

    /// <summary>
    /// Собирает строку подключения к базе данных PostgreSQL
    /// </summary>
    /// <returns>Строка подключения к базе данных.</returns>
    public string BuildConnectionString()
    {
        return
            $"Host={dbHost};Port={dbPort};" +
            $"Username={dbUser};Password={dbPassword};" +
            $"Database={dbName}";
    }

    /// <summary>
    /// Собирает конфигурацию для подключения к почтовому сервису
    /// </summary>
    /// <returns>Массив параметров настройки подключения</returns>
    public string[] BuildMailConfiguration()
    {
        return [mailUser, mailPassword, mailFilePath, mailTimeout];
    }
}
