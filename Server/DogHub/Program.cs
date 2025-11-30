using DogHub;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Создание экземпляра базы данных
        var connectionString = AppConfig.Instance().BuildConnectionString();
        var db = new DataBaseModel(connectionString);

        // Запуск почтового сервиса, если он активирован
        if (AppConfig.Instance().MailService)
        {
            new MailService(db);
        }
        else if (AppConfig.Instance().LogLevel <= AppConfig.LogLevels.INFO)
        {
            Console.WriteLine("MailService is OFF");
        }

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

        // Создание и настройка приложения
        var app = builder.Build();

        app.UseCors();
        app.MapControllers();

        app.Run();
    }
}
