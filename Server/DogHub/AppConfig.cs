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

    public string DbHost { get; init; } = "localhost";
    public string DbPort { get; init; } = "5432";
    public string DbUser { get; init; } = "postgres";
    public string DbPassword { get; init; } = "";
    public string DbName { get; init; } = "doghub_db";

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

        return new AppConfig
        {
            DbHost = Environment.GetEnvironmentVariable("DB_HOST")
                ?? "localhost",
            DbPort = Environment.GetEnvironmentVariable("DB_PORT")
                ?? "5432",
            DbUser = Environment.GetEnvironmentVariable("DB_USER")
                ?? "postgres",
            DbPassword = Environment
                .GetEnvironmentVariable("DB_PASSWORD")
                ?? throw new InvalidOperationException(
                    "DB_PASSWORD is not set"),
            DbName = Environment.GetEnvironmentVariable("DB_NAME")
                ?? "doghub_db"
        };
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
