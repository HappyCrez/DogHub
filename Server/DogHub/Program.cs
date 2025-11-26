using DogHub;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Загрузка конфигурации из файла .env
        var appConfig = AppConfig.FromEnv();

        // Создание экземпляра базы данных
        var connectionString = appConfig.BuildConnectionString();
        var db = new DataBaseModel(connectionString);

        // Регистрация зависимостей
        builder.Services.AddSingleton(db);
        builder.Services.AddSingleton(SQLCommandManager.Instance);

        // Подключение контроллеров
        builder.Services.AddControllers();

        // Разрешение запросов с любых источников
        builder.Services.AddCors(o =>
            o.AddDefaultPolicy(p =>
                p.AllowAnyOrigin()
                 .AllowAnyHeader()
                 .AllowAnyMethod()));

        // Запуск почтового сервиса
        var mailConfig = appConfig.BuildMailConfiguration();
        var mailService = new MailService(mailConfig, db);

        // Создание и настройка приложения
        var app = builder.Build();

        app.UseCors();
        app.MapControllers();

        app.Run();
    }
}
