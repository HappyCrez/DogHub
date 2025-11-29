using System.Text.Json;
using System.Collections.Generic;
using DogHub;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace DogHub.Controllers;

[ApiController]
[Route("events")]
public class EventsController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    public EventsController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db;
        _sql = sql;
    }

    // GET /events
    [HttpGet]
    [AllowAnonymous]
    public IActionResult GetEvents()
    {
        string sqlText = _sql.GetCommand("events");
        string json = _db.ExecuteSQL(sqlText);
        return Content(json, "application/json");
    }

    // GET /events/{id}
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public IActionResult GetEvent(int id)
    {
        string sqlText = _sql.GetCommand("event");
        var parameters = new Dictionary<string, object?>
        {
            ["id"] = id
        };
        string json = _db.ExecuteSQL(sqlText, parameters);
        return Content(json, "application/json");
    }

    // GET /events/{eventId}/dogs  и /event_dogs/{eventId}
    [HttpGet("{eventId:int}/dogs")]
    [HttpGet("/event_dogs/{eventId:int}")]
    [AllowAnonymous]
    public IActionResult GetEventDogs(int eventId)
    {
        string sqlText = _sql.GetCommand("event_dogs");
        var parameters = new Dictionary<string, object?>
        {
            ["event_id"] = eventId
        };
        string json = _db.ExecuteSQL(sqlText, parameters);
        return Content(json, "application/json");
    }

    // GET /events/{eventId}/members  и /event_members/{eventId}
    [HttpGet("{eventId:int}/members")]
    [HttpGet("/event_members/{eventId:int}")]
    [AllowAnonymous]
    public IActionResult GetEventMembers(int eventId)
    {
        string sqlText = _sql.GetCommand("event_members");
        var parameters = new Dictionary<string, object?>
        {
            ["event_id"] = eventId
        };
        string json = _db.ExecuteSQL(sqlText, parameters);
        return Content(json, "application/json");
    }

    // GET /events/education  и /people_events
    [HttpGet("education")]
    [HttpGet("/people_events")]
    [AllowAnonymous]
    public IActionResult GetEducationEvents()
    {
        string sqlText = _sql.GetCommand("people_events");
        string json = _db.ExecuteSQL(sqlText);
        return Content(json, "application/json");
    }

    // POST /events
    [HttpPost]
    [Authorize(Roles = "Админ")]
    public IActionResult CreateEvent([FromBody] JsonElement body)
    {
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
            return BadRequest("Пустое тело запроса.");

        var sql = $"INSERT INTO event ({string.Join(", ", columns)}) " +
                  $"VALUES ({string.Join(", ", placeholders)});";

        var json = _db.ExecuteSQL(sql, parameters);
        return Content(json, "application/json");
    }

    // PUT /events/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Админ")]
    public IActionResult UpdateEvent(int id, [FromBody] JsonElement body)
    {
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
            return BadRequest("Нет полей для обновления.");

        parameters["id"] = id;
        var sql = $"UPDATE event SET {string.Join(", ", updates)} WHERE id = @id;";

        var json = _db.ExecuteSQL(sql, parameters);
        return Content(json, "application/json");
    }

    // DELETE /events/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Админ")]
    public IActionResult DeleteEvent(int id)
    {
        var parameters = new Dictionary<string, object?>
        {
            ["id"] = id
        };

        var sql = "DELETE FROM event WHERE id = @id;";
        var json = _db.ExecuteSQL(sql, parameters);
        return Content(json, "application/json");
    }

    private static object? ConvertJsonValue(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.String:
                return element.GetString();
            case JsonValueKind.Number:
                if (element.TryGetInt64(out var l)) return l;
                if (element.TryGetDecimal(out var d)) return d;
                return element.GetDouble();
            case JsonValueKind.True:  return true;
            case JsonValueKind.False: return false;
            case JsonValueKind.Null:  return null;
            default:
                return element.GetRawText();
        }
    }
}
