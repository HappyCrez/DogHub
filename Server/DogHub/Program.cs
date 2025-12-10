using System;
using System.Linq;
using System.Text;
using DogHub;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        var appConfig = AppConfig.Instance();
        var sqlCommandManager = SQLCommandManager.Instance;

        // Создание экземпляра базы данных
        var connectionString = appConfig.BuildConnectionString();
        var db = new DataBaseModel(connectionString);

        // Запуск почтового сервиса, если он активирован
        MailService? mailService = null;
        if (appConfig.MailService)
        {
            mailService = new MailService(db, sqlCommandManager);
        }
        else if (appConfig.LogLevel <= AppConfig.LogLevels.INFO)
        {
            Console.WriteLine("MailService is OFF");
        }

        // Регистрация зависимостей
        builder.Services.AddSingleton(appConfig);
        builder.Services.AddSingleton<IDataBaseModel>(db);
        builder.Services.AddSingleton(db);
        builder.Services.AddSingleton(sqlCommandManager);
        builder.Services.AddSingleton<AvatarStorage>();
        builder.Services.AddSingleton<DogPhotoStorage>();
        builder.Services.AddSingleton<TokenService>();
        builder.Services.AddSingleton<RefreshTokenService>();

        // Подключение контроллеров
        builder.Services.AddControllers();

        // Разрешение запросов с любых источников
        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy
                    .AllowAnyHeader()
                    .AllowAnyMethod();

                var origins = appConfig.CorsAllowedOrigins;
                if (origins.Count == 0)
                {
                    policy.AllowAnyOrigin();
                }
                else
                {
                    policy.WithOrigins(origins.ToArray())
                          .AllowCredentials();
                }
            });
        });

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
