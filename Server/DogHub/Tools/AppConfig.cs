using System;
using System.IO;
using DotNetEnv;

namespace DogHub;

/// <summary>
/// Конфигурация приложения, загружаемая из файла .env
/// </summary>
public class AppConfig
{
    private static AppConfig? instance = null;

    public enum LogLevels
    {
        NOTHING = -1, // Режим "quite" без вывода
        INFO    = 0,  // Только основная информация
        DEBUG   = 1,  // Выводить все ошибки
    }

    // Состояние программы
    public readonly LogLevels LogLevel;

    // Параметры базы данных
    public readonly string DbHost;
    public readonly string DbPort;
    public readonly string DbUser;
    public readonly string DbName;
    public readonly string DbPassword;

    // Параметры почтового сервиса
    public readonly bool MailService;
    public readonly string MailHost;
    public readonly string MailPassword;
    public readonly string MailFilePath;
    public readonly string MailTimeout;

    /// <summary>
    /// Читает поле в файле конфигурации, если поле не найдено выбрасывает исключение
    /// </summary>
    /// <param name="field">Поле для чтения из файла</param>
    private string GetValueFromEnv(string field)
    {
        return Environment.GetEnvironmentVariable(field)
            ?? throw new InvalidOperationException($".env hasn't field {field}");
    }

    private AppConfig()
    {
        var envPath = FindEnvPath();
        Env.Load(envPath);

        this.LogLevel = (LogLevels)int.Parse(GetValueFromEnv("LOG_LEVEL"));

        this.DbHost = GetValueFromEnv("DB_HOST");
        this.DbPort = GetValueFromEnv("DB_PORT");
        this.DbUser = GetValueFromEnv("DB_USER");
        this.DbName = GetValueFromEnv("DB_NAME");
        this.DbPassword = GetValueFromEnv("DB_PASSWORD");

        // Если MailService отключён, остальные параметры заполняются "NONE"
        this.MailService = GetValueFromEnv("MAIL_SERVICE") == "ON";
        this.MailHost = this.MailService ? GetValueFromEnv("MAIL_HOST") : "NONE";
        this.MailTimeout = this.MailService ? GetValueFromEnv("MAIL_TIMEOUT") : "NONE";
        this.MailFilePath = this.MailService ? GetValueFromEnv("MAIL_FILEPATH") : "NONE";
        this.MailPassword = this.MailService ? GetValueFromEnv("MAIL_PASSWORD") : "NONE";
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
    /// Формирует строку подключения к PostgreSQL
    /// </summary>
    public string BuildConnectionString()
    {
        return
            $"Host={DbHost};Port={DbPort};" +
            $"Username={DbUser};Password={DbPassword};" +
            $"Database={DbName}";
    }

    /// <summary>
    /// Создает объект AppConfig или возвращает созданный ранее
    /// </summary>
    /// <returns>Ссылка на объект AppConfig</returns>
    public static AppConfig Instance()
    {
        if (instance == null)
        {
            instance = new AppConfig();
        }
        return instance;
    }
}