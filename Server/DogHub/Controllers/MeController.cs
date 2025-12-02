using System;
using System.Text.Json;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DogHub;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace DogHub.Controllers;

[ApiController]
[Route("me")]
[Authorize] // любой залогиненный: Пользователь / Тренер / Администратор
public class MeController : ControllerBase
{
    private readonly DataBaseModel _db;

    public MeController(DataBaseModel db)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
    }

    // GET /me — получить свои данные по токену
    [HttpGet]
    public IActionResult GetMe()
    {
        try
        {
            // Берём memberId из токена (claim "sub")
            var memberIdStr =
                User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(memberIdStr) ||
                !int.TryParse(memberIdStr, out var memberId))
            {
                return Forbid();
            }

            var sql =
                "SELECT id AS member_id, full_name, phone, email, city, avatar_url, " +
                "bio AS owner_bio, join_date, membership_end_date, role " +
                "FROM member WHERE id = @id;";

            var parameters = new Dictionary<string, object?>
            {
                ["id"] = memberId
            };

            var json = _db.ExecuteSQL(sql, parameters);

            if (string.IsNullOrWhiteSpace(json))
            {
                return NotFound(new { error = "Пользователь не найден" });
            }

            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetMe] {ex}");
            return StatusCode(500, new { error = "Ошибка при получении данных профиля" });
        }
    }

    // PUT /me — обновить свои данные:
    // fullName, phone, email, city, avatarUrl, ownerBio/bio
    [HttpPut]
    public IActionResult UpdateMe([FromBody] JsonElement body)
    {
        try
        {
            // Берём memberId из токена
            var memberIdStr =
                User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(memberIdStr) ||
                !int.TryParse(memberIdStr, out var memberId))
            {
                return Forbid();
            }

            // Какие поля можно менять с клиента и в какие колонки БД они мапятся
            var allowedMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["fullName"]  = "full_name",
                ["phone"]     = "phone",
                ["email"]     = "email",
                ["city"]      = "city",
                ["avatarUrl"] = "avatar_url",
                ["ownerBio"]  = "bio",
                ["bio"]       = "bio"
            };

            var updates = new List<string>();
            var parameters = new Dictionary<string, object?>();

            foreach (var prop in body.EnumerateObject())
            {
                var jsonName = prop.Name;

                if (!allowedMap.TryGetValue(jsonName, out var column))
                {
                    // Игнорируем всё, что менять нельзя (role, joinDate, password_hash и т.п.)
                    continue;
                }

                updates.Add($"{column} = @{column}");
                parameters[column] = ConvertJsonValue(prop.Value);
            }

            if (updates.Count == 0)
            {
                return BadRequest(new
                {
                    error = "Нет допустимых полей для обновления. Можно менять только fullName, phone, email, city, avatarUrl, ownerBio."
                });
            }

            parameters["id"] = memberId;

            var sql =
                $"UPDATE member SET {string.Join(", ", updates)} WHERE id = @id;";

            var json = _db.ExecuteSQL(sql, parameters);

            if (string.IsNullOrWhiteSpace(json))
            {
                return StatusCode(500, new { error = "Ошибка при обновлении профиля" });
            }

            // После обновления — вернуть свежие данные
            var selectSql =
                "SELECT id AS member_id, full_name, phone, email, city, avatar_url, " +
                "bio AS owner_bio, join_date, membership_end_date, role " +
                "FROM member WHERE id = @id;";

            var resultJson = _db.ExecuteSQL(selectSql, new Dictionary<string, object?> { ["id"] = memberId });

            if (string.IsNullOrWhiteSpace(resultJson))
            {
                return StatusCode(500, new { error = "Профиль обновлён, но не удалось получить свежие данные" });
            }

            return Content(resultJson, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UpdateMe] {ex}");
            return StatusCode(500, new { error = "Ошибка при обновлении профиля" });
        }
    }

    private static object? ConvertJsonValue(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.String:
                return element.GetString();

            case JsonValueKind.Number:
                if (element.TryGetInt64(out var longValue))
                    return longValue;
                if (element.TryGetDecimal(out var decimalValue))
                    return decimalValue;
                return element.GetDouble();

            case JsonValueKind.True:
                return true;
            case JsonValueKind.False:
                return false;
            case JsonValueKind.Null:
                return null;
            default:
                return element.GetRawText();
        }
    }
}
