using System.Text.Json;
using System.Collections.Generic;
using DogHub;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

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

    private int? GetCurrentUserId()
    {
        var sub =
            User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return int.TryParse(sub, out var id) ? id : (int?)null;
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
    [Authorize(Roles = "Администратор")]
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
    [Authorize(Roles = "Администратор")]
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
    [Authorize(Roles = "Администратор")]
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

    // POST /events/{eventId}/dogs
    // Тело: { "dogId": 123 }
    [HttpPost("{eventId:int}/dogs")]
    [Authorize]
    public IActionResult RegisterDogForEvent(int eventId, [FromBody] JsonElement body)
    {
        try
        {
            if (!body.TryGetProperty("dogId", out var dogIdProp) ||
                dogIdProp.ValueKind != JsonValueKind.Number ||
                !dogIdProp.TryGetInt32(out var dogId))
            {
                return BadRequest(new { error = "Нужно передать целочисленный dogId" });
            }

            var isAdmin = User.IsInRole("Администратор");

            // 1) Проверяем, что собака существует и принадлежит текущему пользователю (если не Администратор)
            if (!isAdmin)
            {
                var currentUserId = GetCurrentUserId();
                if (currentUserId is null)
                    return Forbid();

                var ownerSql = "SELECT member_id FROM dog WHERE id = @id;";
                var ownerParams = new Dictionary<string, object?> { ["id"] = dogId };
                var ownerJson = _db.ExecuteSQL(ownerSql, ownerParams);

                if (string.IsNullOrWhiteSpace(ownerJson))
                    return NotFound(new { error = "Собака не найдена" });

                using var ownerDoc = JsonDocument.Parse(ownerJson);
                var root = ownerDoc.RootElement;
                if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
                    return NotFound(new { error = "Собака не найдена" });

                var ownerElement = root[0];
                if (!ownerElement.TryGetProperty("memberId", out var memberIdProp) ||
                    memberIdProp.ValueKind != JsonValueKind.Number ||
                    !memberIdProp.TryGetInt32(out var ownerId))
                {
                    return StatusCode(500, new { error = "Не удалось определить владельца собаки" });
                }

                if (ownerId != currentUserId.Value)
                    return Forbid();
            }

            // 2) Проверяем, не записана ли уже собака на это событие
            var checkSql = @"
                SELECT 1
                FROM event_registration
                WHERE event_id = @event_id AND dog_id = @dog_id AND member_id IS NULL;";
            var checkParams = new Dictionary<string, object?>
            {
                ["event_id"] = eventId,
                ["dog_id"]   = dogId
            };
            var checkJson = _db.ExecuteSQL(checkSql, checkParams);
            if (!string.IsNullOrWhiteSpace(checkJson))
            {
                using var checkDoc = JsonDocument.Parse(checkJson);
                if (checkDoc.RootElement.ValueKind == JsonValueKind.Array &&
                    checkDoc.RootElement.GetArrayLength() > 0)
                {
                    return Conflict(new { error = "Собака уже записана на это событие" });
                }
            }

            // 3) Создаём запись
            var insertSql = @"
                INSERT INTO event_registration (event_id, member_id, dog_id, registered_at)
                VALUES (@event_id, NULL, @dog_id, NOW());";
            var insertParams = new Dictionary<string, object?>
            {
                ["event_id"] = eventId,
                ["dog_id"]   = dogId
            };

            var resultJson = _db.ExecuteSQL(insertSql, insertParams);
            return Content(resultJson, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RegisterDogForEvent] {ex}");
            return StatusCode(500, new { error = "Ошибка при записи собаки на событие" });
        }
    }

    [HttpDelete("{eventId:int}/dogs/{dogId:int}")]
    [Authorize]
    public IActionResult UnregisterDogFromEvent(int eventId, int dogId)
    {
        try
        {
            var isAdmin = User.IsInRole("Администратор");

            if (!isAdmin)
            {
                var currentUserId = GetCurrentUserId();
                if (currentUserId is null)
                    return Forbid();

                var ownerSql = "SELECT member_id FROM dog WHERE id = @id;";
                var ownerParams = new Dictionary<string, object?> { ["id"] = dogId };
                var ownerJson = _db.ExecuteSQL(ownerSql, ownerParams);

                if (string.IsNullOrWhiteSpace(ownerJson))
                    return NotFound(new { error = "Собака не найдена" });

                using var ownerDoc = JsonDocument.Parse(ownerJson);
                var root = ownerDoc.RootElement;
                if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
                    return NotFound(new { error = "Собака не найдена" });

                var ownerElement = root[0];
                if (!ownerElement.TryGetProperty("memberId", out var memberIdProp) ||
                    memberIdProp.ValueKind != JsonValueKind.Number ||
                    !memberIdProp.TryGetInt32(out var ownerId))
                {
                    return StatusCode(500, new { error = "Не удалось определить владельца собаки" });
                }

                if (ownerId != currentUserId.Value)
                    return Forbid();
            }

            var deleteSql = @"
                DELETE FROM event_registration
                WHERE event_id = @event_id AND dog_id = @dog_id AND member_id IS NULL;";
            var deleteParams = new Dictionary<string, object?>
            {
                ["event_id"] = eventId,
                ["dog_id"]   = dogId
            };

            var json = _db.ExecuteSQL(deleteSql, deleteParams);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UnregisterDogFromEvent] {ex}");
            return StatusCode(500, new { error = "Ошибка при снятии собаки с события" });
        }
    }


}
