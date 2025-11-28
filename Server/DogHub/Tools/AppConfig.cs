using System;
using System.IO;
using DotNetEnv;

namespace DogHub;

/// <summary>
/// Конфигурация приложения, загружаемая из файла .env
/// </summary>
public class AppConfig
{
    // Параметры базы данных
    private readonly string dbHost;
    private readonly string dbPort;
    private readonly string dbUser;
    private readonly string dbName;
    private readonly string dbPassword;

    // Параметры почтового сервиса
    private readonly string mailUser;
    private readonly string mailPassword;
    private readonly string mailFilePath;
    private readonly string mailTimeout;

    // Параметры JWT
    private readonly string jwtIssuer;
    private readonly string jwtAudience;
    private readonly string jwtSecret;
    private readonly int accessTokenLifetimeMinutes;

    public string JwtIssuer => jwtIssuer;
    public string JwtAudience => jwtAudience;
    public string JwtSecret => jwtSecret;
    public TimeSpan AccessTokenLifetime => TimeSpan.FromMinutes(accessTokenLifetimeMinutes);

    private AppConfig(
        string dbHost,
        string dbPort,
        string dbUser,
        string dbName,
        string dbPassword,
        string mailUser,
        string mailPassword,
        string mailFilePath,
        string mailTimeout,
        string jwtIssuer,
        string jwtAudience,
        string jwtSecret,
        int accessTokenLifetimeMinutes)
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

        this.jwtIssuer = jwtIssuer;
        this.jwtAudience = jwtAudience;
        this.jwtSecret = jwtSecret;
        this.accessTokenLifetimeMinutes = accessTokenLifetimeMinutes;
    }

    /// <summary>
    /// Ищет файл .env в текущей директории и родительских папках
    /// </summary>
    private static string FindEnvPath()
    {
        var currentDir = Directory.GetCurrentDirectory();

        while (!string.IsNullOrEmpty(currentDir))
        {
            var rootEnv = Path.Combine(currentDir, ".env");
            if (File.Exists(rootEnv))
                return rootEnv;

            var assetsEnv = Path.Combine(currentDir, "Assets", ".env");
            if (File.Exists(assetsEnv))
                return assetsEnv;

            var parent = Directory.GetParent(currentDir);
            if (parent == null)
                break;

            currentDir = parent.FullName;
        }

        throw new InvalidOperationException("Файл .env не найден");
    }

    /// <summary>
    /// Загружает переменные среды из файла .env и создаёт объект конфигурации
    /// </summary>
    public static AppConfig FromEnv()
    {
        var envPath = FindEnvPath();
        Env.Load(envPath);

        // Чтение параметров базы данных
        string dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
        string dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
        string dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
        string dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "doghub_db";
        string dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD")
            ?? throw new InvalidOperationException("DB_PASSWORD is not set");

        // Чтение параметров почтового сервиса
        string mailUser = Environment.GetEnvironmentVariable("MAIL_USER")
            ?? throw new InvalidOperationException("MAIL_USER is not set");
        string mailPassword = Environment.GetEnvironmentVariable("MAIL_PASSWORD")
            ?? throw new InvalidOperationException("MAIL_PASSWORD is not set");

        // Чтение пути к HTML-шаблону письма
        string mailFilePathRaw = Environment.GetEnvironmentVariable("MAIL_FILE_PATH")
            ?? "MailNotification.html";

        // Чтение таймаута
        string mailTimeout = Environment.GetEnvironmentVariable("MAIL_TIMEOUT") ?? "300";

        // JWT
        string jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "DogHubApi";
        string jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "DogHubClient";
        string jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT_SECRET is not set");
        int accessTokenLifetimeMinutes = int.TryParse(
            Environment.GetEnvironmentVariable("ACCESS_TOKEN_LIFETIME_MINUTES"),
            out var minutes)
            ? minutes
            : 30;

        // Директория, из которой загружен файл .env
        var envDir = Path.GetDirectoryName(envPath)
                     ?? throw new InvalidOperationException("Не удалось определить директорию .env");

        // Формирование абсолютного пути
        string mailFilePath = Path.IsPathRooted(mailFilePathRaw)
            ? mailFilePathRaw
            : Path.GetFullPath(Path.Combine(envDir, mailFilePathRaw));

        return new AppConfig(
            dbHost, dbPort, dbUser, dbName, dbPassword,
            mailUser, mailPassword, mailFilePath, mailTimeout,
            jwtIssuer, jwtAudience, jwtSecret, accessTokenLifetimeMinutes);
    }

    /// <summary>
    /// Формирует строку подключения к PostgreSQL
    /// </summary>
    public string BuildConnectionString()
    {
        return
            $"Host={dbHost};Port={dbPort};" +
            $"Username={dbUser};Password={dbPassword};" +
            $"Database={dbName}";
    }

    /// <summary>
    /// Формирует конфигурацию для почтового сервиса
    /// </summary>
    public string[] BuildMailConfiguration()
    {
        return new[] { mailUser, mailPassword, mailFilePath, mailTimeout };
    }
}
