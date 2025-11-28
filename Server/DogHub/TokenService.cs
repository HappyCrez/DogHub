using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace DogHub;

/// <summary>
/// Сервис для генерации JWT-токенов доступа.
/// Достаёт настройки из AppConfig и на основе данных участника (member)
/// собирает подписанный access-токен.
/// </summary>
public class TokenService
{
    private readonly AppConfig _config;

    public TokenService(AppConfig config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
    }

    /// <summary>
    /// Генерирует access-токен для участника (member).
    /// На вход получает JsonElement с данными пользователя (memberId, email, fullName, role),
    /// которые мы достаём из результата SQL-запроса.
    /// </summary>
    /// <param name="member">JsonElement с данными участника из БД</param>
    /// <returns>
    /// Кортеж:
    /// - Token: строка с JWT-токеном,
    /// - ExpiresAt: момент времени (UTC), когда токен перестанет быть валидным.
    /// </returns>
    public (string Token, DateTime ExpiresAt) GenerateAccessToken(JsonElement member)
    {
        // Достаём данные из JSON участника
        var memberId = member.TryGetProperty("memberId", out var idProp)
            ? idProp.GetRawText()
            : string.Empty;

        var email = member.TryGetProperty("email", out var emailProp)
            ? emailProp.GetString()
            : string.Empty;

        var fullName = member.TryGetProperty("fullName", out var fullNameProp)
            ? fullNameProp.GetString()
            : string.Empty;

        // Роль хранится в таблице member.role на русском: "Пользователь", "Тренер", "Админ"
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

        // Симметричный ключ для подписи токена
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config.JwtSecret));

        // Подпись HMAC-SHA256
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Момент истечения токена: сейчас (UTC) + время жизни из конфигурации
        var expires = DateTime.UtcNow.Add(_config.AccessTokenLifetime);

        var token = new JwtSecurityToken(
            issuer: _config.JwtIssuer,
            audience: _config.JwtAudience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires,
            signingCredentials: creds
        );
        
        // Превращаем объект JwtSecurityToken в обычную строку вида "xxxxx.yyyyy.zzzzz"
        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return (tokenString, expires);
    }
}
