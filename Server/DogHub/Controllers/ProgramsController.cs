using System;
using System.Linq;
using System.Text.Json;
using System.Collections.Generic;
using DogHub;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace DogHub.Controllers;

[ApiController]
[Route("programs")]
public class ProgramsController : ControllerBase
{
    private readonly IDataBaseModel _db;
    private readonly ISqlCommandManager _sql;
    private static readonly HashSet<string> ProgramColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "title",
        "type",
        "price",
        "description"
    };

    public ProgramsController(IDataBaseModel db, ISqlCommandManager sql)
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
    [Authorize(Roles = "Администратор")]
    public IActionResult CreateProgram([FromBody] JsonElement body)
    {
        try
        {
            var columns = new List<string>();
            var placeholders = new List<string>();
            var parameters = new Dictionary<string, object?>();

            foreach (var prop in body.EnumerateObject())
            {
                var column = prop.Name;
                if (!ProgramColumns.Contains(column))
                    continue;

                columns.Add(column);
                placeholders.Add(BuildProgramPlaceholder(column));
                parameters[column] = ConvertJsonValue(prop.Value);
            }

            if (columns.Count == 0)
                return BadRequest("Пустое тело запроса");

            var quotedColumns = columns.Select(QuoteIdentifier);
            var sql =
                $"INSERT INTO program ({string.Join(", ", quotedColumns)}) VALUES ({string.Join(", ", placeholders)});";

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
    [Authorize(Roles = "Администратор")]
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
                if (!ProgramColumns.Contains(column))
                    continue;

                updates.Add($"{QuoteIdentifier(column)} = {BuildProgramPlaceholder(column)}");
                parameters[column] = ConvertJsonValue(prop.Value);
            }

            if (updates.Count == 0)
                return BadRequest("Нет полей для обновления");

            parameters["id"] = id;
            var sql =
                $"UPDATE program SET {string.Join(", ", updates)} WHERE id = @id;";

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
    [Authorize(Roles = "Администратор")]
    public IActionResult DeleteProgram(int id)
    {
        if (HasProgramRegistrations(id))
        {
            return Conflict(new
            {
                error = "Нельзя удалить программу: есть записанные собаки."
            });
        }

        try
        {
            var parameters = new Dictionary<string, object?> { ["id"] = id };

            var sql = "DELETE FROM program WHERE id = @id;";

            string json = _db.ExecuteSQL(sql, parameters);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DeleteProgram] {ex}");
            return StatusCode(500, new { error = "Ошибка при удалении программы" });
        }
    }

    private bool HasProgramRegistrations(int programId)
    {
        var sql = @"
            SELECT COUNT(*) AS reg_count
            FROM program_registration
            WHERE program_id = @program_id;";
        var parameters = new Dictionary<string, object?>
        {
            ["program_id"] = programId
        };

        var json = _db.ExecuteSQL(sql, parameters);
        if (string.IsNullOrWhiteSpace(json))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
                return false;

            var first = root[0];
            if (first.TryGetProperty("regCount", out var countProp) &&
                countProp.ValueKind == JsonValueKind.Number &&
                countProp.TryGetInt32(out var count))
            {
                return count > 0;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[HasProgramRegistrations] {ex}");
        }

        return false;
    }

    private static string QuoteIdentifier(string column) =>
        $"\"{column.Replace("\"", "\"\"")}\"";

    private static string BuildProgramPlaceholder(string column)
    {
        var placeholder = "@" + column;
        return column.Equals("type", StringComparison.OrdinalIgnoreCase)
            ? placeholder + "::program_type"
            : placeholder;
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

    // Запись пользователя на тренинг (event_registration: member_id != NULL, dog_id = NULL)
    // POST /programs/{trainingId}/members
    [HttpPost("{trainingId:int}/members")]
    [Authorize]
    public IActionResult RegisterMemberForTraining(int trainingId, [FromBody] JsonElement body)
    {
        try
        {
            var isAdmin = User.IsInRole("Администратор");

            // Администратор может записать любого пользователя, передав memberId в теле запроса.
            // Обычный пользователь записывает только себя.
            int? explicitMemberId = null;
            if (isAdmin &&
                body.ValueKind == JsonValueKind.Object &&
                body.TryGetProperty("memberId", out var memberProp) &&
                memberProp.ValueKind == JsonValueKind.Number &&
                memberProp.TryGetInt32(out var mid))
            {
                explicitMemberId = mid;
            }

            var currentUserId = GetCurrentUserId();
            if (currentUserId is null && explicitMemberId is null)
                return Forbid();

            var memberId = explicitMemberId ?? currentUserId!.Value;

            // 1) проверяем, что пользователь существует
            var userSql = "SELECT id FROM member WHERE id = @id;";
            var userParams = new Dictionary<string, object?> { ["id"] = memberId };
            var userJson = _db.ExecuteSQL(userSql, userParams);
            if (string.IsNullOrWhiteSpace(userJson))
                return NotFound(new { error = "Пользователь не найден" });

            // 2) проверяем, что тренинг существует (таблица event)
            var eventSql = "SELECT id FROM event WHERE id = @id;";
            var eventParams = new Dictionary<string, object?> { ["id"] = trainingId };
            var eventJson = _db.ExecuteSQL(eventSql, eventParams);
            if (string.IsNullOrWhiteSpace(eventJson))
                return NotFound(new { error = "Тренинг не найден" });

            // 3) проверяем, не записан ли уже (member_id != NULL, dog_id IS NULL)
            var checkSql = @"
                SELECT 1
                FROM event_registration
                WHERE event_id = @event_id
                AND member_id = @member_id
                AND dog_id IS NULL;";
            var checkParams = new Dictionary<string, object?>
            {
                ["event_id"]  = trainingId,
                ["member_id"] = memberId
            };
            var checkJson = _db.ExecuteSQL(checkSql, checkParams);
            if (!string.IsNullOrWhiteSpace(checkJson))
            {
                using var checkDoc = JsonDocument.Parse(checkJson);
                if (checkDoc.RootElement.ValueKind == JsonValueKind.Array &&
                    checkDoc.RootElement.GetArrayLength() > 0)
                {
                    return Conflict(new { error = "Вы уже записаны на этот тренинг" });
                }
            }

            // 4) создаём запись в event_registration
            var insertSql = @"
                INSERT INTO event_registration (event_id, member_id, dog_id, registered_at)
                VALUES (@event_id, @member_id, NULL, NOW());";
            var insertParams = new Dictionary<string, object?>
            {
                ["event_id"]  = trainingId,
                ["member_id"] = memberId
            };

            var json = _db.ExecuteSQL(insertSql, insertParams);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RegisterMemberForTraining] {ex}");
            return StatusCode(500, new { error = "Ошибка при записи на тренинг" });
        }
    }

    // Удаление записи на тренинг
    // Обычный пользователь может снять только себя.
    // Администратор может снять любого, указав memberId в пути.
    // DELETE /programs/{trainingId}/members/{memberId?}
    [HttpDelete("{trainingId:int}/members/{memberId:int?}")]
    [Authorize]
    public IActionResult UnregisterMemberFromTraining(int trainingId, int? memberId)
    {
        try
        {
            var isAdmin = User.IsInRole("Администратор");
            var currentUserId = GetCurrentUserId();

            if (!isAdmin)
            {
                if (currentUserId is null)
                    return Forbid();

                memberId = currentUserId;
            }
            else
            {
                if (memberId is null && currentUserId is null)
                    return BadRequest(new { error = "Нужно указать memberId или быть авторизованным" });

                memberId ??= currentUserId;
            }

            var deleteSql = @"
                DELETE FROM event_registration
                WHERE event_id = @event_id
                AND member_id = @member_id
                AND dog_id IS NULL;";
            var deleteParams = new Dictionary<string, object?>
            {
                ["event_id"]  = trainingId,
                ["member_id"] = memberId
            };

            var json = _db.ExecuteSQL(deleteSql, deleteParams);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UnregisterMemberFromTraining] {ex}");
            return StatusCode(500, new { error = "Ошибка при удалении записи на тренинг" });
        }
    }

    // POST /programs/{programId}/dogs
    // Тело: { "dogId": 123 }
    [HttpPost("{programId:int}/dogs")]
    [Authorize]
    public IActionResult RegisterDogForProgram(int programId, [FromBody] JsonElement body)
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

            // 1) если не Администратор — проверяем, что собака принадлежит текущему пользователю
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

            // 2) проверяем, что программа существует
            var progSql = "SELECT id FROM program WHERE id = @id;";
            var progParams = new Dictionary<string, object?> { ["id"] = programId };
            var progJson = _db.ExecuteSQL(progSql, progParams);
            using (var progDoc = string.IsNullOrWhiteSpace(progJson) ? null : JsonDocument.Parse(progJson))
            {
                if (progDoc == null ||
                    progDoc.RootElement.ValueKind != JsonValueKind.Array ||
                    progDoc.RootElement.GetArrayLength() == 0)
                {
                    return NotFound(new { error = "Программа не найдена" });
                }
            }

            // 3) проверяем, не записана ли уже собака на эту программу
            var checkSql = @"
                SELECT 1
                FROM program_registration
                WHERE program_id = @program_id AND dog_id = @dog_id;";
            var checkParams = new Dictionary<string, object?>
            {
                ["program_id"] = programId,
                ["dog_id"]     = dogId
            };
            var checkJson = _db.ExecuteSQL(checkSql, checkParams);
            if (!string.IsNullOrWhiteSpace(checkJson))
            {
                using var checkDoc = JsonDocument.Parse(checkJson);
                if (checkDoc.RootElement.ValueKind == JsonValueKind.Array &&
                    checkDoc.RootElement.GetArrayLength() > 0)
                {
                    return Conflict(new { error = "Собака уже записана на эту программу" });
                }
            }

            // 4) создаём запись
            var insertSql = @"
                INSERT INTO program_registration (program_id, dog_id, registered_at)
                VALUES (@program_id, @dog_id, NOW());";
            var insertParams = new Dictionary<string, object?>
            {
                ["program_id"] = programId,
                ["dog_id"]     = dogId
            };

            var json = _db.ExecuteSQL(insertSql, insertParams);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RegisterDogForProgram] {ex}");
            return StatusCode(500, new { error = "Ошибка при записи собаки на программу" });
        }
    }

    // DELETE /programs/{programId}/dogs/{dogId}
    [HttpDelete("{programId:int}/dogs/{dogId:int}")]
    [Authorize]
    public IActionResult UnregisterDogFromProgram(int programId, int dogId)
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
                DELETE FROM program_registration
                WHERE program_id = @program_id AND dog_id = @dog_id;";
            var deleteParams = new Dictionary<string, object?>
            {
                ["program_id"] = programId,
                ["dog_id"]     = dogId
            };

            var json = _db.ExecuteSQL(deleteSql, deleteParams);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UnregisterDogFromProgram] {ex}");
            return StatusCode(500, new { error = "Ошибка при снятии собаки с программы" });
        }
    }



}
