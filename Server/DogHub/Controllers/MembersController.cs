using System;
using System.Text.Json;
using System.Collections.Generic;
using DogHub;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace DogHub.Controllers;

[ApiController]
[Route("members")]
public class MembersController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    public MembersController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db;
        _sql = sql;
    }

    // Получение списка участников
    [HttpGet]
    public IActionResult GetMembers()
    {
        try
        {
            string sql = _sql.GetCommand("members");
            string json = _db.ExecuteSQL(sql);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetMembers] {ex}");
            return StatusCode(500, new { error = "Ошибка при получении списка участников" });
        }
    }

    // Создание нового участника
    [HttpPost]
    public IActionResult CreateMember([FromBody] JsonElement body)
    {
        try
        {
            var columns = new List<string>();
            var placeholders = new List<string>();
            var parameters = new Dictionary<string, object?>();

            // Формирование колонок и параметров
            foreach (var prop in body.EnumerateObject())
            {
                var column = prop.Name;
                columns.Add(column);
                placeholders.Add("@" + column);
                parameters[column] = ConvertJsonValue(prop.Value);
            }

            if (columns.Count == 0)
                return BadRequest("Пустое тело запроса");

            // Формирование SQL-запроса
            var sql =
                $"INSERT INTO member ({string.Join(", ", columns)}) VALUES ({string.Join(", ", placeholders)});";

            // Выполнение запроса
            var json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CreateMember] {ex}");
            return StatusCode(500, new { error = "Ошибка при создании участника" });
        }
    }

    // Обновление участника
    [HttpPut("{id:int}")]
    public IActionResult UpdateMember(int id, [FromBody] JsonElement body)
    {
        try
        {
            var updates = new List<string>();
            var parameters = new Dictionary<string, object?>();

            // Формирование списка обновляемых колонок
            foreach (var prop in body.EnumerateObject())
            {
                if (prop.Name.Equals("id", StringComparison.OrdinalIgnoreCase))
                    continue;

                var column = prop.Name;
                updates.Add($"{column} = @{column}");
                parameters[column] = ConvertJsonValue(prop.Value);
            }

            if (updates.Count == 0)
                return BadRequest("Нет полей для обновления");

            // Добавление ID
            parameters["id"] = id;

            // Формирование SQL-запроса
            var sql =
                $"UPDATE member SET {string.Join(", ", updates)} WHERE id = @id;";

            // Выполнение запроса
            var json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UpdateMember] {ex}");
            return StatusCode(500, new { error = "Ошибка при обновлении участника" });
        }
    }

    // Удаление участника
    [HttpDelete("{id:int}")]
    public IActionResult DeleteMember(int id)
    {
        try
        {
            var parameters = new Dictionary<string, object?> { ["id"] = id };

            // Формирование SQL-запроса
            var sql = "DELETE FROM member WHERE id = @id;";

            // Выполнение запроса
            var json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DeleteMember] {ex}");
            return StatusCode(500, new { error = "Ошибка при удалении участника" });
        }
    }

    // Преобразование JSON-значения в объект C#
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

    // Смена роли участника (Пользователь / Тренер / Админ)
    [HttpPost("{id:int}/role")]
    [Authorize(Roles = "Админ")]
    public IActionResult ChangeMemberRole(int id, [FromBody] JsonElement body)
    {
        try
        {
            if (!body.TryGetProperty("role", out var roleProp) ||
                roleProp.ValueKind != JsonValueKind.String)
            {
                return BadRequest(new { error = "Нужно передать поле role" });
            }

            var role = roleProp.GetString()?.Trim();

            if (string.IsNullOrWhiteSpace(role))
            {
                return BadRequest(new { error = "role не может быть пустой" });
            }

            var parameters = new Dictionary<string, object?>
            {
                ["id"] = id,
                ["role"] = role
            };

            // Обновляем роль
            var updateSql = "UPDATE member SET role = @role WHERE id = @id;";
            var updateJson = _db.ExecuteSQL(updateSql, parameters);

            if (string.IsNullOrWhiteSpace(updateJson))
            {
                return StatusCode(500, new { error = "Ошибка при обновлении роли" });
            }

            if (updateJson.Contains("Затронуто строк: 0", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(new { error = "Участник с таким id не найден" });
            }

            // Читаем обновлённого участника
            var selectSql =
                "SELECT id AS member_id, full_name, phone, email, city, avatar_url, bio AS owner_bio, " +
                "join_date, membership_end_date, role " +
                "FROM member WHERE id = @id;";

            var memberJson = _db.ExecuteSQL(selectSql, new Dictionary<string, object?> { ["id"] = id });

            if (string.IsNullOrWhiteSpace(memberJson))
            {
                return StatusCode(500, new { error = "Роль обновлена, но данные участника не найдены" });
            }

            return Content(memberJson, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ChangeMemberRole] {ex}");
            return StatusCode(500, new { error = "Ошибка при смене роли участника" });
        }
    }
}
