using DogHub;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        DotNetEnv.Env.Load("./Assets/.env");
        var appConfig = AppConfig.FromEnv();
        var connectionString = appConfig.BuildConnectionString();

        builder.Services.AddSingleton(new DataBaseModel(connectionString));
        builder.Services.AddSingleton(SQLCommandManager.Instance);

        builder.Services.AddControllers();
        builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

        var app = builder.Build();

        app.UseCors();
        app.MapControllers();
        app.Run();
    }
}
