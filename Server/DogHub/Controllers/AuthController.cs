using System;
using System.Collections.Generic;
using System.Text.Json;
using DogHub;
using Microsoft.AspNetCore.Mvc;
using BCryptNet = BCrypt.Net.BCrypt;

namespace DogHub.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;
    private readonly TokenService _tokenService;

    public AuthController(DataBaseModel db, SQLCommandManager sql, TokenService tokenService)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _sql = sql ?? throw new ArgumentNullException(nameof(sql));
        _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
    }

    // POST /auth/register
    [HttpPost("register")]
    public IActionResult Register([FromBody] JsonElement body)
    {
        try
        {
            if (!body.TryGetProperty("fullName", out var fullNameProp) ||
                !body.TryGetProperty("email", out var emailProp) ||
                !body.TryGetProperty("passwordHash", out var passProp))
            {
                return BadRequest(new { error = "Нужно передать fullName, email и passwordHash" });
            }

            var fullName = fullNameProp.GetString();
            var email = emailProp.GetString();
            var clientPasswordHash = passProp.GetString();

            var phone = body.TryGetProperty("phone", out var phoneProp) ? phoneProp.GetString() : null;
            var city  = body.TryGetProperty("city", out var cityProp) ? cityProp.GetString() : null;

            if (string.IsNullOrWhiteSpace(fullName) ||
                string.IsNullOrWhiteSpace(email) ||
                string.IsNullOrWhiteSpace(clientPasswordHash))
            {
                return BadRequest(new { error = "fullName, email и passwordHash не могут быть пустыми" });
            }

            // 1. проверка уникальности email
            var checkSql = _sql.GetCommand("get_member_by_email");
            var checkParams = new Dictionary<string, object?>
            {
                ["email"] = email
            };

            var existingJson = _db.ExecuteSQL(checkSql, checkParams);

            if (!string.IsNullOrWhiteSpace(existingJson))
            {
                using var existingDoc = JsonDocument.Parse(existingJson);
                var root = existingDoc.RootElement;
                if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                {
                    return Conflict(new { error = "Пользователь с таким email уже существует" });
                }
            }

            // 2. серверный хэш поверх клиентского (bcrypt со своей солью)
            var serverHash = BCryptNet.HashPassword(clientPasswordHash);

            // 3. вставка участника (без RETURNING)
            var insertSql = _sql.GetCommand("insert_member_for_auth");
            var insertParams = new Dictionary<string, object?>
            {
                ["full_name"]     = fullName,
                ["phone"]         = phone,
                ["email"]         = email,
                ["city"]          = city,
                ["password_hash"] = serverHash
            };

            var insertResult = _db.ExecuteSQL(insertSql, insertParams);

            if (string.IsNullOrWhiteSpace(insertResult))
            {
                return StatusCode(500, new { error = "Не удалось создать пользователя" });
            }

            // 4. читаем пользователя по email
            var userJson = _db.ExecuteSQL(checkSql, checkParams);

            if (string.IsNullOrWhiteSpace(userJson))
            {
                return StatusCode(500, new { error = "Пользователь создан, но не найден при чтении" });
            }

            using var userDoc = JsonDocument.Parse(userJson);
            var userRoot = userDoc.RootElement;

            if (userRoot.ValueKind != JsonValueKind.Array || userRoot.GetArrayLength() == 0)
            {
                return StatusCode(500, new { error = "Пользователь создан, но не найден при чтении" });
            }

            var userElement = userRoot[0];

            // формируем обычный словарь без passwordHash
            var userDict = new Dictionary<string, object?>();

            foreach (var prop in userElement.EnumerateObject())
            {
                if (prop.NameEquals("passwordHash"))
                    continue;

                object? value = prop.Value.ValueKind switch
                {
                    JsonValueKind.String => prop.Value.GetString(),
                    JsonValueKind.Number => prop.Value.TryGetInt64(out var l) ? l : prop.Value.GetDouble(),
                    JsonValueKind.True   => true,
                    JsonValueKind.False  => false,
                    JsonValueKind.Null   => null,
                    _ => prop.Value.GetRawText()
                };

                userDict[prop.Name] = value;
            }

            return Ok(new { user = userDict });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Register] {ex}");
            return StatusCode(500, new { error = "Ошибка при регистрации пользователя" });
        }
    }


    // POST /auth/login
    [HttpPost("login")]
    public IActionResult Login([FromBody] JsonElement body)
    {
        try
        {
            if (!body.TryGetProperty("email", out var emailProp) ||
                !body.TryGetProperty("passwordHash", out var passProp))
            {
                return BadRequest(new { error = "Нужно передать email и passwordHash" });
            }

            var email = emailProp.GetString();
            var clientPasswordHash = passProp.GetString();

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(clientPasswordHash))
            {
                return BadRequest(new { error = "email и passwordHash не могут быть пустыми" });
            }

            var sql = _sql.GetCommand("get_member_by_email");
            var parameters = new Dictionary<string, object?>
            {
                ["email"] = email
            };

            var json = _db.ExecuteSQL(sql, parameters);

            if (string.IsNullOrWhiteSpace(json))
            {
                return Unauthorized(new { error = "Неверный email или пароль" });
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
            {
                return Unauthorized(new { error = "Неверный email или пароль" });
            }

            var userElement = root[0];

            if (!userElement.TryGetProperty("passwordHash", out var storedPassProp) ||
                storedPassProp.ValueKind != JsonValueKind.String)
            {
                return StatusCode(500, new { error = "У пользователя не найден пароль" });
            }

            var storedHash = storedPassProp.GetString();

            if (string.IsNullOrEmpty(storedHash) ||
                !BCryptNet.Verify(clientPasswordHash, storedHash))
            {
                return Unauthorized(new { error = "Неверный email или пароль" });
            }

            // собрать user без passwordHash
            var result = new Dictionary<string, object?>();

            foreach (var prop in userElement.EnumerateObject())
            {
                if (prop.NameEquals("passwordHash"))
                    continue;

                object? value = prop.Value.ValueKind switch
                {
                    JsonValueKind.String => prop.Value.GetString(),
                    JsonValueKind.Number => prop.Value.TryGetInt64(out var l) ? l : prop.Value.GetDouble(),
                    JsonValueKind.True   => true,
                    JsonValueKind.False  => false,
                    JsonValueKind.Null   => null,
                    _ => prop.Value.GetRawText()
                };

                result[prop.Name] = value;
            }

            var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(userElement);

            return Ok(new
            {
                accessToken,
                accessTokenExpiresAt = expiresAt,
                user = result
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Login] {ex}");
            return StatusCode(500, new { error = "Ошибка при входе" });
        }
    }
}
