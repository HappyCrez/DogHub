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

    public AuthController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _sql = sql ?? throw new ArgumentNullException(nameof(sql));
    }

    // POST /auth/register
    [HttpPost("register")]
    public IActionResult Register([FromBody] JsonElement body)
    {
        try
        {
            // читаем обязательные поля
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

            // 1. проверка, что такого email ещё нет
            var checkSql = _sql.GetCommand("get_member_by_email");
            var checkParams = new Dictionary<string, object?>
            {
                ["email"] = email
            };

            var existingJson = _db.ExecuteSQL(checkSql, checkParams);

            if (!string.IsNullOrWhiteSpace(existingJson))
            {
                using var doc = JsonDocument.Parse(existingJson);
                var root = doc.RootElement;
                if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                {
                    return Conflict(new { error = "Пользователь с таким email уже существует" });
                }
            }

            // 2. серверный хэш поверх клиентского (bcrypt со своей солью)
            var serverHash = BCryptNet.HashPassword(clientPasswordHash);

            // 3. создаём участника
            var insertSql = _sql.GetCommand("insert_member_for_auth");
            var insertParams = new Dictionary<string, object?>
            {
                ["full_name"]      = fullName,
                ["phone"]          = phone,
                ["email"]          = email,
                ["city"]           = city,
                ["password_hash"]  = serverHash
            };

            var insertedJson = _db.ExecuteSQL(insertSql, insertParams);

            if (string.IsNullOrWhiteSpace(insertedJson))
                return StatusCode(500, new { error = "Не удалось создать пользователя" });

            using var insertedDoc = JsonDocument.Parse(insertedJson);
            var rootInserted = insertedDoc.RootElement;

            if (rootInserted.ValueKind != JsonValueKind.Array || rootInserted.GetArrayLength() == 0)
                return StatusCode(500, new { error = "Не удалось создать пользователя" });

            var user = rootInserted[0]; // там уже нет password_hash в RETURNING

            return Ok(new { user });
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

            // ищем участника по email
            var sql = _sql.GetCommand("get_member_by_email");
            var parameters = new Dictionary<string, object?>
            {
                ["email"] = email
            };

            var json = _db.ExecuteSQL(sql, parameters);

            if (string.IsNullOrWhiteSpace(json))
            {
                // ошибка БД
                return StatusCode(500, new { error = "Ошибка при обращении к базе данных" });
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

            // проверяем bcrypt’ом
            if (string.IsNullOrEmpty(storedHash) ||
                !BCryptNet.Verify(clientPasswordHash, storedHash))
            {
                return Unauthorized(new { error = "Неверный email или пароль" });
            }

            // собираем объект пользователя без passwordHash
            var result = new Dictionary<string, object?>();

            foreach (var prop in userElement.EnumerateObject())
            {
                if (prop.NameEquals("passwordHash"))
                    continue;

                // аккуратно приводим значения
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

            // пока без JWT, просто возвращаем user
            return Ok(new { user = result });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Login] {ex}");
            return StatusCode(500, new { error = "Ошибка при входе" });
        }
    }
}
