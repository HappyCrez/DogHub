using DogHub;
using DogHub.Tests.Infrastructure.Fakes;

namespace DogHub.Tests.Infrastructure;

public sealed class TestHost
{
    public FakeDatabase Database { get; } = new();
    public FakeSqlCommandManager Sql { get; } = new();
    public AppConfig Config { get; } = AppConfig.Instance();
    public TokenService TokenService { get; }
    public RefreshTokenService RefreshTokenService { get; }

    public TestHost()
    {
        TokenService = new TokenService(Config);
        RefreshTokenService = new RefreshTokenService(Database, Sql, Config);
    }

    public ControllerContextBuilder CreateControllerContext() => new();
}

