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
    public readonly string PathToFonts;
    public readonly string ImageHost;

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

    // Параметры SFTP для загрузки аватаров
    public readonly string SshHost;
    public readonly int SshPort;
    public readonly string SshUser;
    public readonly string SshPassword;
    public readonly string AvatarRemoteDir;
    public readonly string AvatarPublicBaseUrl;
    public readonly string DogPhotoRemoteDir;
    public readonly string DogPhotoPublicBaseUrl;

    // Параметры JWT
    private readonly string jwtIssuer;
    private readonly string jwtAudience;
    private readonly string jwtSecret;
    private readonly int accessTokenLifetimeMinutes;

    public string JwtIssuer => jwtIssuer;
    public string JwtAudience => jwtAudience;
    public string JwtSecret => jwtSecret;
    public TimeSpan AccessTokenLifetime => TimeSpan.FromMinutes(accessTokenLifetimeMinutes);

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

        LogLevel = (LogLevels)int.Parse(GetValueFromEnv("LOG_LEVEL"));
        PathToFonts = GetValueFromEnv("PATH_TO_FONTS");
        ImageHost = GetValueFromEnv("IMAGE_HOST");

        DbHost = GetValueFromEnv("DB_HOST");
        DbPort = GetValueFromEnv("DB_PORT");
        DbUser = GetValueFromEnv("DB_USER");
        DbName = GetValueFromEnv("DB_NAME");
        DbPassword = GetValueFromEnv("DB_PASSWORD");

        // Если MailService отключён, остальные параметры заполняются "NONE"
        MailService  = GetValueFromEnv("MAIL_SERVICE") == "ON";
        MailHost     = MailService ? GetValueFromEnv("MAIL_HOST") : "NONE";
        MailTimeout  = MailService ? GetValueFromEnv("MAIL_TIMEOUT") : "NONE";
        MailFilePath = MailService ? GetValueFromEnv("MAIL_FILEPATH") : "NONE";
        MailPassword = MailService ? GetValueFromEnv("MAIL_PASSWORD") : "NONE";

        // SSH / SFTP
        SshHost = GetValueFromEnv("SSH_HOST");
        SshPort = int.TryParse(GetValueFromEnv("SSH_PORT"), out var sshPort)
            ? sshPort
            : 22;
        SshUser = GetValueFromEnv("SSH_USER");
        SshPassword = GetValueFromEnv("SSH_PASSWORD");
        AvatarRemoteDir = GetValueFromEnv("AVATAR_REMOTE_DIR");
        AvatarPublicBaseUrl = GetValueFromEnv("AVATAR_PUBLIC_BASE_URL").TrimEnd('/');
        DogPhotoRemoteDir = Environment.GetEnvironmentVariable("DOG_PHOTO_REMOTE_DIR")
            ?? "/home/lexcivis/Pictures/DogHub/Dogs";
        var dogPhotoPublicFromEnv = Environment.GetEnvironmentVariable("DOG_PHOTO_PUBLIC_BASE_URL");
        DogPhotoPublicBaseUrl = string.IsNullOrWhiteSpace(dogPhotoPublicFromEnv)
            ? $"{ImageHost.TrimEnd('/')}/Dogs"
            : dogPhotoPublicFromEnv.TrimEnd('/');

        // JWT
        jwtIssuer = GetValueFromEnv("JWT_ISSUER") ?? "DogHubApi";
        jwtAudience = GetValueFromEnv("JWT_AUDIENCE") ?? "DogHubClient";
        jwtSecret = GetValueFromEnv("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT_SECRET is not set");
        accessTokenLifetimeMinutes = int.TryParse(
            GetValueFromEnv("ACCESS_TOKEN_LIFETIME_MINUTES"),
            out var minutes)
            ? minutes : 30; 
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