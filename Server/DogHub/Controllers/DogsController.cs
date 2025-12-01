using System;
using System.Text.Json;
using System.Collections.Generic;
using DogHub;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace DogHub.Controllers;

[ApiController]
[Route("dogs")]
public class DogsController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    public DogsController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db;
        _sql = sql;
    }

    // Получение списка всех собак
    [HttpGet]
    [AllowAnonymous]
    public IActionResult GetDogs()
    {
        try
        {
            string sql = _sql.GetCommand("dogs");
            string json = _db.ExecuteSQL(sql);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetDogs] {ex}");
            return StatusCode(500, new { error = "Ошибка при получении списка собак" });
        }
    }

    // Получить отчет по id собаки
    [HttpGet("report/{id:int}")]
    [AllowAnonymous]
    public IActionResult GetReportDog(int id)
    {
        try
        {
            return File(new DogReport(id).GetBytes(), "application/pdf", $"dog_report_{id}.pdf");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetDogs] {ex}");
            return StatusCode(500, new { error = "Ошибка при формировании отчета о собаке" });
        }
    }

    // Получение списка чипированных собак
    [HttpGet("chiped")]
    [AllowAnonymous]
    public IActionResult GetChipedDogs()
    {
        try
        {
            string sql = _sql.GetCommand("chiped");
            string json = _db.ExecuteSQL(sql);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetChipedDogs] {ex}");
            return StatusCode(500, new { error = "Ошибка при получении списка чипированных собак" });
        }
    }

    // Создание новой собаки
    [HttpPost]
    [Authorize(Roles = "Админ")]
    public IActionResult CreateDog([FromBody] JsonElement body)
    {
        try
        {
            // Формирование списка колонок и параметров
            var columns = new List<string>();
            var placeholders = new List<string>();
            var parameters = new Dictionary<string, object?>();

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
                $"INSERT INTO dog ({string.Join(", ", columns)}) VALUES ({string.Join(", ", placeholders)});";

            // Выполнение запроса
            var json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CreateDog] {ex}");
            return StatusCode(500, new { error = "Ошибка при создании собаки" });
        }
    }

    // Обновление собаки
    //
    // Админ:
    //   - может редактировать любые поля кроме id
    // Пользователь/Тренер:
    //   - могут редактировать ТОЛЬКО свои собаки (по member_id)
    //   - и только поля photo, bio, tags
    [HttpPut("{id:int}")]
    [Authorize]
    public IActionResult UpdateDog(int id, [FromBody] JsonElement body)
    {
        try
        {
            var isAdmin = User.IsInRole("Админ");

            // Если не админ — проверяем, что собака принадлежит текущему пользователю
            if (!isAdmin)
            {
                var currentUserIdStr =
                    User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
                    User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrWhiteSpace(currentUserIdStr) ||
                    !int.TryParse(currentUserIdStr, out var currentUserId))
                {
                    // что-то не так с токеном
                    return Forbid();
                }

                // узнаём владельца собаки
                var ownerSql = "SELECT member_id FROM dog WHERE id = @id;";
                var ownerParams = new Dictionary<string, object?> { ["id"] = id };
                var ownerJson = _db.ExecuteSQL(ownerSql, ownerParams);

                if (string.IsNullOrWhiteSpace(ownerJson))
                {
                    return NotFound(new { error = "Собака не найдена" });
                }

                using var ownerDoc = JsonDocument.Parse(ownerJson);
                var root = ownerDoc.RootElement;

                if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
                {
                    return NotFound(new { error = "Собака не найдена" });
                }

                var ownerElement = root[0];

                if (!ownerElement.TryGetProperty("member_id", out var memberIdProp) ||
                    memberIdProp.ValueKind != JsonValueKind.Number ||
                    !memberIdProp.TryGetInt32(out var ownerId))
                {
                    return StatusCode(500, new { error = "Не удалось определить владельца собаки" });
                }

                if (ownerId != currentUserId)
                {
                    // Пользователь/тренер пытается трогать чужую собаку
                    return Forbid();
                }
            }

            var updates = new List<string>();
            var parameters = new Dictionary<string, object?>();

            if (isAdmin)
            {
                // Админ может менять любые поля (кроме id, чтобы не ломать PK)
                foreach (var prop in body.EnumerateObject())
                {
                    var column = prop.Name;

                    if (string.Equals(column, "id", StringComparison.OrdinalIgnoreCase))
                        continue;

                    updates.Add($"{column} = @{column}");
                    parameters[column] = ConvertJsonValue(prop.Value);
                }

                if (updates.Count == 0)
                {
                    return BadRequest(new { error = "Нет полей для обновления" });
                }
            }
            else
            {
                // Пользователь/Тренер — только photo, bio, tags
                var allowedColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "photo",
                    "bio",
                    "tags"
                };

                foreach (var prop in body.EnumerateObject())
                {
                    var column = prop.Name;

                    if (!allowedColumns.Contains(column))
                        continue;

                    updates.Add($"{column} = @{column}");
                    parameters[column] = ConvertJsonValue(prop.Value);
                }

                if (updates.Count == 0)
                {
                    return BadRequest(new
                    {
                        error = "Нет допустимых полей для обновления. Можно менять только photo, bio и tags."
                    });
                }
            }

            parameters["id"] = id;
            var sql = $"UPDATE dog SET {string.Join(", ", updates)} WHERE id = @id;";

            var json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UpdateDog] {ex}");
            return StatusCode(500, new { error = "Ошибка при обновлении данных собаки" });
        }
    }

    // Удаление собаки
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Админ")]
    public IActionResult DeleteDog(int id)
    {
        try
        {
            // Подготовка параметров для удаления
            var parameters = new Dictionary<string, object?> { ["id"] = id };

            // Формирование SQL-запроса
            var sql = "DELETE FROM dog WHERE id = @id;";

            // Выполнение запроса
            var json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DeleteDog] {ex}");
            return StatusCode(500, new { error = "Ошибка при удалении собаки" });
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
}
