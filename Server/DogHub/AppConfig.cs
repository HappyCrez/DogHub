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

    public string DbHost { get; }
    public string DbPort { get; }
    public string DbUser { get; }
    public string DbName { get; }
    public string DbPassword { get; }

    /// <summary>
    /// Инициирует поля доступные только для чтения
    /// </summary>
    /// <param name="dbHost">Адрес подключения к БД</param>
    /// <param name="dbPort">Порт подключения к БД</param>
    /// <param name="dbUser">Имя пользователя для подключения</param>
    /// <param name="dbName">Имя БД для подключения</param>
    /// <param name="dbPassword">Пароль пользователя БД</param>
    private AppConfig(string dbHost, string dbPort, string dbUser, string dbName, string dbPassword)
    {
        DbHost = dbHost;
        DbPort = dbPort;
        DbUser = dbUser;
        DbName = dbName;
        DbPassword = dbPassword;
    }

    /// <summary>
    /// Создаёт экземпляр конфигурации, загружая
    /// значения из файла .env и переменных окружения.
    /// </summary>
    /// <returns>
    /// Экземпляр <see cref="AppConfig"/> с заполненными
    /// свойствами.
    /// </returns>
    public static AppConfig FromEnv()
    {
        Env.Load(envPath);

        string dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
        string dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
        string dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
        string dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "doghub_db";
        string dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") 
            ?? throw new InvalidOperationException("DB_PASSWORD is not set");

        return new AppConfig(dbHost, dbPort, dbUser, dbName, dbPassword);
    }

    /// <summary>
    /// Собирает строку подключения к базе данных
    /// PostgreSQL.
    /// </summary>
    /// <returns>Строка подключения к базе данных.</returns>
    public string BuildConnectionString()
    {
        return
            $"Host={DbHost};Port={DbPort};" +
            $"Username={DbUser};Password={DbPassword};" +
            $"Database={DbName}";
    }
}
