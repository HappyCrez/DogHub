using System;
using System.Text.Json;
using System.Collections.Generic;
using DogHub;
using Microsoft.AspNetCore.Mvc;

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

    // Получение списка чипированных собак
    [HttpGet("chiped")]
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

    // Обновление данных собаки
    [HttpPut("{id:int}")]
    public IActionResult UpdateDog(int id, [FromBody] JsonElement body)
    {
        try
        {
            // Формирование списка обновляемых колонок
            var updates = new List<string>();
            var parameters = new Dictionary<string, object?>();

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

            // Добавление id для WHERE
            parameters["id"] = id;

            // Формирование SQL-запроса
            var sql = $"UPDATE dog SET {string.Join(", ", updates)} WHERE id = @id;";

            // Выполнение запроса
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
