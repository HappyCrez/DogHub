using System;
using System.Text;
using DogHub;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

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
        builder.Services.AddSingleton(appConfig);
        builder.Services.AddSingleton(db);
        builder.Services.AddSingleton(SQLCommandManager.Instance);
        builder.Services.AddSingleton<TokenService>();

        // Подключение контроллеров
        builder.Services.AddControllers();

        // Разрешение запросов с любых источников
        builder.Services.AddCors(o =>
            o.AddDefaultPolicy(p =>
                p.AllowAnyOrigin()
                 .AllowAnyHeader()
                 .AllowAnyMethod()));

        // Настройка JWT-аутентификации
        var key = Encoding.UTF8.GetBytes(appConfig.JwtSecret);

        builder.Services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = appConfig.JwtIssuer,

                    ValidateAudience = true,
                    ValidAudience = appConfig.JwtAudience,

                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),

                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1) // небольшой допуск по времени
                };
            });

        builder.Services.AddAuthorization();

        // Запуск почтового сервиса
        var mailConfig = appConfig.BuildMailConfiguration();
        var mailService = new MailService(mailConfig, db);

        // Создание и настройка приложения
        var app = builder.Build();

        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}
