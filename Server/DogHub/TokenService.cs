using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace DogHub;

public class TokenService
{
    private readonly AppConfig _config;

    public TokenService(AppConfig config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
    }

    /// <summary>
    /// Генерирует access-токен для участника (member)
    /// </summary>
    public (string Token, DateTime ExpiresAt) GenerateAccessToken(JsonElement member)
    {
        // достаём данные из JSON участника
        var memberId = member.TryGetProperty("memberId", out var idProp)
            ? idProp.GetRawText()
            : string.Empty;

        var email = member.TryGetProperty("email", out var emailProp)
            ? emailProp.GetString()
            : string.Empty;

        var fullName = member.TryGetProperty("fullName", out var fullNameProp)
            ? fullNameProp.GetString()
            : string.Empty;

        var role = member.TryGetProperty("role", out var roleProp)
            ? roleProp.GetString()
            : "Пользователь";

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, memberId),
            new Claim(JwtRegisteredClaimNames.Email, email ?? string.Empty),
            new Claim(ClaimTypes.Name, fullName ?? string.Empty),
            new Claim(ClaimTypes.Role, role ?? "Пользователь")
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config.JwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expires = DateTime.UtcNow.Add(_config.AccessTokenLifetime);

        var token = new JwtSecurityToken(
            issuer: _config.JwtIssuer,
            audience: _config.JwtAudience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires,
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return (tokenString, expires);
    }
}
