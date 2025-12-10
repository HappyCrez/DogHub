using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using DogHub;
using FluentAssertions;
using Xunit;

namespace DogHub.Tests.Services;

public class TokenServiceTests
{
    private readonly AppConfig _config = AppConfig.Instance();

    [Fact]
    public void GenerateAccessToken_ProducesSignedTokenWithExpectedClaims()
    {
        var service = new TokenService(_config);
        using var doc = JsonDocument.Parse("""
        {
            "memberId": 12,
            "email": "user@example.com",
            "fullName": "Test User",
            "role": "Администратор"
        }
        """);
        var member = doc.RootElement.Clone();

        var (token, expiresAt) = service.GenerateAccessToken(member);

        token.Should().NotBeNullOrWhiteSpace();
        expiresAt.Should().BeCloseTo(
            DateTime.UtcNow.Add(_config.AccessTokenLifetime),
            TimeSpan.FromSeconds(5));

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        jwt.Claims.Should().ContainSingle(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == "12");
        jwt.Claims.Should().ContainSingle(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == "user@example.com");
        jwt.Claims.Should().ContainSingle(c => c.Type == ClaimTypes.Name && c.Value == "Test User");
        jwt.Claims.Should().ContainSingle(c => c.Type == ClaimTypes.Role && c.Value == "Администратор");
    }
}

