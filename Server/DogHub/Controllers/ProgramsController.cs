using System;
using System.Text.Json;
using System.Collections.Generic;
using DogHub;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace DogHub.Controllers;

[ApiController]
[Route("programs")]
public class ProgramsController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    public ProgramsController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db;
        _sql = sql;
    }

    // Получение списка программ
    [HttpGet]
    [AllowAnonymous]
    public IActionResult GetPrograms()
    {
        try
        {
            string sql = _sql.GetCommand("programs");
            string json = _db.ExecuteSQL(sql);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetPrograms] {ex}");
            return StatusCode(500, new { error = "Ошибка при получении списка программ" });
        }
    }

    // Получение списка собак, подключённых к программе
    // GET /programs/{programId}/dogs и /program_dogs/{programId}
    [HttpGet("{programId:int}/dogs")]
    [HttpGet("/program_dogs/{programId:int}")]
    [AllowAnonymous]
    public IActionResult GetProgramDogs(int programId)
    {
        try
        {
            string sql = _sql.GetCommand("program_dogs");
            var parameters = new Dictionary<string, object?>
            {
                ["program_id"] = programId
            };

            string json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetProgramDogs] {ex}");
            return StatusCode(500, new { error = "Ошибка при получении собак программы" });
        }
    }

    // Создание новой программы
    [HttpPost]
    [Authorize(Roles = "Админ")]
    public IActionResult CreateProgram([FromBody] JsonElement body)
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
                $"INSERT INTO program ({string.Join(", ", columns)}) VALUES ({string.Join(", ", placeholders)});";

            // Выполнение запроса
            string json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CreateProgram] {ex}");
            return StatusCode(500, new { error = "Ошибка при создании программы" });
        }
    }

    // Обновление программы
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Админ")]
    public IActionResult UpdateProgram(int id, [FromBody] JsonElement body)
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
                $"UPDATE program SET {string.Join(", ", updates)} WHERE id = @id;";

            // Выполнение запроса
            string json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UpdateProgram] {ex}");
            return StatusCode(500, new { error = "Ошибка при обновлении программы" });
        }
    }

    // Удаление программы
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Админ")]
    public IActionResult DeleteProgram(int id)
    {
        try
        {
            var parameters = new Dictionary<string, object?> { ["id"] = id };

            // Формирование SQL-запроса
            var sql = "DELETE FROM program WHERE id = @id;";

            // Выполнение запроса
            string json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DeleteProgram] {ex}");
            return StatusCode(500, new { error = "Ошибка при удалении программы" });
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
                if (element.TryGetInt64(out var longValue)) return longValue;
                if (element.TryGetDecimal(out var decimalValue)) return decimalValue;
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
