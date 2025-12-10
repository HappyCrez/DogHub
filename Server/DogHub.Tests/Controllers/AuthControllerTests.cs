using System.Text.Json;
using DogHub.Controllers;
using DogHub.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace DogHub.Tests.Controllers;

public class AuthControllerTests
{
    private readonly TestHost _host = new();

    [Fact]
    public void Login_ReturnsTokensAndSetsCookie_WhenCredentialsAreValid()
    {
        const string selectSql = "SELECT_MEMBER_BY_EMAIL";
        const string insertSql = "INSERT_REFRESH";
        _host.Sql.Register("get_member_by_email", selectSql);
        _host.Sql.Register("insert_refresh_token", insertSql);

        const string clientPasswordHash = "client-hash";
        var storedHash = BCrypt.Net.BCrypt.HashPassword(clientPasswordHash);
        var memberJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                memberId = 5,
                email = "user@example.com",
                fullName = "Test User",
                role = "Пользователь",
                passwordHash = storedHash
            }
        });

        _host.Database.QueueResult(selectSql, memberJson);
        _host.Database.QueueResult(insertSql, @"{""result"":""ok""}");

        var controller = CreateController(_host.CreateControllerContext().WithUserAgent("unit-test-agent"));
        var payload = JsonSerializer.Deserialize<JsonElement>(
            @"{""email"":""user@example.com"",""passwordHash"":""client-hash""}");

        var response = controller.Login(payload);

        var ok = response.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().NotBeNull();
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        doc.RootElement.GetProperty("accessToken").GetString().Should().NotBeNullOrWhiteSpace();
        doc.RootElement.GetProperty("user").GetProperty("email").GetString().Should().Be("user@example.com");

        controller.Response.Headers["Set-Cookie"].ToString()
            .Should()
            .Contain("doghub_refresh_token");
    }

    [Fact]
    public void Register_ReturnsConflict_WhenEmailIsTaken()
    {
        const string selectSql = "SELECT_MEMBER_BY_EMAIL";
        _host.Sql.Register("get_member_by_email", selectSql);
        _host.Database.QueueResult(selectSql, JsonFixture.Load("refresh_token_record.json"));

        var controller = CreateController(_host.CreateControllerContext());
        var payload = JsonSerializer.Deserialize<JsonElement>(
            @"{""fullName"":""Test"",""email"":""user@example.com"",""passwordHash"":""secret""}");

        var result = controller.Register(payload);

        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public void Refresh_ReturnsUnauthorized_WhenCookieMissing()
    {
        var controller = CreateController(_host.CreateControllerContext());

        var response = controller.Refresh();

        response.Should().BeOfType<UnauthorizedObjectResult>();
    }

    private AuthController CreateController(ControllerContextBuilder builder)
    {
        return new AuthController(
            _host.Database,
            _host.Sql,
            _host.TokenService,
            _host.RefreshTokenService,
            _host.Config)
        {
            ControllerContext = builder.Build()
        };
    }
}

