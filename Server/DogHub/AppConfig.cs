using System;
using System.IO;
using DotNetEnv;

namespace DogHub;

/// <summary>
/// Представляет конфигурацию приложения,
/// загружаемую из файла .env.
/// </summary>
public class AppConfig
{
    public string DbHost { get; }
    public string DbPort { get; }
    public string DbUser { get; }
    public string DbName { get; }
    public string DbPassword { get; }

    /// <summary>
    /// Приватный конструктор, заполняющий свойства конфига.
    /// </summary>
    private AppConfig(string dbHost, string dbPort, string dbUser, string dbName, string dbPassword)
    {
        DbHost = dbHost;
        DbPort = dbPort;
        DbUser = dbUser;
        DbName = dbName;
        DbPassword = dbPassword;
    }

    /// <summary>
    /// Ищет файл Assets/.env, поднимаясь от текущей директории вверх.
    /// Работает и если приложение стартует из bin/Debug, и из корня репо.
    /// </summary>
    private static string FindEnvPath()
    {
        var currentDir = Directory.GetCurrentDirectory();

        while (!string.IsNullOrEmpty(currentDir))
        {
            var candidate = Path.Combine(currentDir, "Assets", ".env");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            var parent = Directory.GetParent(currentDir);
            if (parent == null)
            {
                break;
            }

            currentDir = parent.FullName;
        }

        throw new InvalidOperationException(
            "Не удалось найти файл конфигурации Assets/.env. " +
            "Убедись, что он существует в корне репозитория DogHub.");
    }

    /// <summary>
    /// Создаёт экземпляр конфигурации, загружая
    /// значения из файла .env и переменных окружения.
    /// </summary>
    public static AppConfig FromEnv()
    {
        var envPath = FindEnvPath();
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
    /// Собирает строку подключения к базе данных PostgreSQL.
    /// </summary>
    public string BuildConnectionString()
    {
        return
            $"Host={DbHost};Port={DbPort};" +
            $"Username={DbUser};Password={DbPassword};" +
            $"Database={DbName}";
    }
}
