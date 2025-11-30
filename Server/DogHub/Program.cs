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

        // Создание экземпляра базы данных
        var connectionString = AppConfig.Instance().BuildConnectionString();
        var db = new DataBaseModel(connectionString);

        // Запуск почтового сервиса, если он активирован
        MailService? mailService = null;
        if (AppConfig.Instance().MailService)
        {
            mailService = new MailService(db);
        }
        else if (AppConfig.Instance().LogLevel <= AppConfig.LogLevels.INFO)
        {
            Console.WriteLine("MailService is OFF");
        }

        // Регистрация зависимостей
        builder.Services.AddSingleton(AppConfig.Instance());
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
        var key = Encoding.UTF8.GetBytes(AppConfig.Instance().JwtSecret);

        builder.Services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = AppConfig.Instance().JwtIssuer,

                    ValidateAudience = true,
                    ValidAudience = AppConfig.Instance().JwtAudience,

                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),

                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1) // небольшой допуск по времени
                };
            });

        builder.Services.AddAuthorization();

        // Создание и настройка приложения
        var app = builder.Build();

        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();

        // После заквершения app, завершаем работу MailService
        if (mailService != null)
        {
            mailService.MailServiceStop();
        }
    }
}
