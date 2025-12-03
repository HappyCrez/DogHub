using System;
using System.Collections.Generic;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using DogHub;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DogHub.Controllers;

[ApiController]
[Route("services")]
public class ServicesController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    private static readonly IReadOnlyDictionary<string, string> StatusLabels =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["REQUESTED"] = "Заявка отправлена",
            ["SCHEDULED"] = "Назначено",
            ["DONE"] = "Выполнено",
            ["CANCELED"] = "Отменено",
        };

    public ServicesController(DataBaseModel db, SQLCommandManager sql)
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

    [HttpGet("types")]
    [AllowAnonymous]
    public IActionResult GetServiceTypes()
    {
        try
        {
            string sql = _sql.GetCommand("service_types");
            string json = _db.ExecuteSQL(sql);
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetServiceTypes] {ex}");
            return StatusCode(500, new { error = "Не удалось получить список услуг" });
        }
    }

    [HttpGet("my")]
    [Authorize]
    public IActionResult GetMyServices()
    {
        try
        {
            var isAdmin = User.IsInRole("Администратор");
            var currentUserId = GetCurrentUserId();

            if (!isAdmin && currentUserId is null)
                return Forbid();

            string sql = _sql.GetCommand("dog_services_by_member");
            var parameters = new Dictionary<string, object?>
            {
                ["member_id"] = isAdmin ? null : currentUserId
            };

            string json = _db.ExecuteSQL(sql, parameters);
            var services = ParseJsonArrayOrEmpty(json);

            return Ok(new
            {
                services,
                statusLabels = StatusLabels
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetMyServices] {ex}");
            return StatusCode(500, new { error = "Не удалось получить историю услуг" });
        }
    }

    [HttpPost("book")]
    [Authorize]
    public IActionResult BookDogService([FromBody] JsonElement body)
    {
        try
        {
            if (!TryReadInt(body, "dogId", out var dogId))
                return BadRequest(new { error = "Укажите dogId (целое число)" });

            if (!TryReadInt(body, "serviceTypeId", out var serviceTypeId))
                return BadRequest(new { error = "Укажите serviceTypeId (целое число)" });

            if (!body.TryGetProperty("requestedAt", out var requestedAtProp) ||
                requestedAtProp.ValueKind != JsonValueKind.String ||
                !DateTime.TryParse(
                    requestedAtProp.GetString(),
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeLocal,
                    out var requestedAt))
            {
                return BadRequest(new { error = "Укажите корректную дату requestedAt" });
            }

            var isAdmin = User.IsInRole("Администратор");
            var currentUserId = GetCurrentUserId();
            if (!isAdmin && currentUserId is null)
                return Forbid();

            var ownerId = GetDogOwnerId(dogId);
            if (ownerId is null)
                return NotFound(new { error = "Собака не найдена" });
            if (!isAdmin && ownerId != currentUserId)
                return Forbid();

            var serviceInfo = GetServiceTypeInfo(serviceTypeId);
            if (serviceInfo is null)
                return NotFound(new { error = "Услуга не найдена" });

            var parameters = new Dictionary<string, object?>
            {
                ["dog_id"] = dogId,
                ["service_type_id"] = serviceTypeId,
                ["requested_at"] = requestedAt,
                ["price"] = serviceInfo.Price,
                ["status"] = "REQUESTED",
                ["service_name"] = serviceInfo.Name
            };

            const string insertSql = @"
                INSERT INTO dog_service
                    (dog_id, service_type_id, requested_at, performed_at, price, status, service_name)
                VALUES
                    (@dog_id, @service_type_id, @requested_at, NULL, @price, @status::service_status, @service_name)
                RETURNING id, dog_id, service_type_id, status, requested_at;";

            string json = _db.ExecuteSQL(insertSql, parameters);
            if (string.IsNullOrWhiteSpace(json))
            {
                Console.WriteLine("[BookDogService] Вставка заявки не вернула результат");
                return StatusCode(500, new { error = "Не удалось сохранить заявку" });
            }
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[BookDogService] {ex}");
            return StatusCode(500, new { error = "Не удалось создать заявку" });
        }
    }

    private int? GetDogOwnerId(int dogId)
    {
        const string sql = "SELECT member_id FROM dog WHERE id = @id;";
        var parameters = new Dictionary<string, object?> { ["id"] = dogId };
        var json = _db.ExecuteSQL(sql, parameters);

        if (string.IsNullOrWhiteSpace(json))
            return null;

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
            return null;

        var row = root[0];
        return row.TryGetProperty("memberId", out var memberProp) &&
               memberProp.ValueKind == JsonValueKind.Number &&
               memberProp.TryGetInt32(out var ownerId)
            ? ownerId
            : (int?)null;
    }

    private ServiceTypeInfo? GetServiceTypeInfo(int serviceTypeId)
    {
        const string sql = "SELECT name, price FROM service_type WHERE id = @id;";
        var parameters = new Dictionary<string, object?> { ["id"] = serviceTypeId };
        var json = _db.ExecuteSQL(sql, parameters);

        if (string.IsNullOrWhiteSpace(json))
            return null;

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
            return null;

        var row = root[0];
        if (!row.TryGetProperty("name", out var nameProp) ||
            nameProp.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        decimal? price = null;
        if (row.TryGetProperty("price", out var priceProp) &&
            priceProp.ValueKind == JsonValueKind.Number &&
            priceProp.TryGetDecimal(out var value))
        {
            price = value;
        }

        return new ServiceTypeInfo(nameProp.GetString() ?? string.Empty, price);
    }

    [HttpDelete("{serviceId:int}")]
    [Authorize]
    public IActionResult CancelDogService(int serviceId)
    {
        try
        {
            var isAdmin = User.IsInRole("Администратор");
            var currentUserId = GetCurrentUserId();
            if (!isAdmin && currentUserId is null)
                return Forbid();

            const string lookupSql = @"
                SELECT ds.dog_id, ds.status, d.member_id
                FROM dog_service ds
                JOIN dog d ON d.id = ds.dog_id
                WHERE ds.id = @id;";

            var lookupJson = _db.ExecuteSQL(lookupSql, new Dictionary<string, object?> { ["id"] = serviceId });
            if (string.IsNullOrWhiteSpace(lookupJson))
                return NotFound(new { error = "Заявка не найдена" });

            using var doc = JsonDocument.Parse(lookupJson);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
                return NotFound(new { error = "Заявка не найдена" });

            var row = root[0];
            if (!row.TryGetProperty("memberId", out var memberProp) ||
                memberProp.ValueKind != JsonValueKind.Number ||
                !memberProp.TryGetInt32(out var ownerId))
            {
                return StatusCode(500, new { error = "Не удалось определить владельца заявки" });
            }

            if (!isAdmin && ownerId != currentUserId)
                return Forbid();

            if (!row.TryGetProperty("status", out var statusProp) ||
                statusProp.ValueKind != JsonValueKind.String)
            {
                return StatusCode(500, new { error = "Не удалось определить статус заявки" });
            }

            var statusValue = statusProp.GetString() ?? string.Empty;
            var normalizedStatus = statusValue.ToUpperInvariant();

            if (normalizedStatus == "DONE")
            {
                return Conflict(new { error = "Нельзя отменить выполненную услугу" });
            }

            if (normalizedStatus == "CANCELED")
            {
                return Conflict(new { error = "Заявка уже отменена" });
            }

            const string cancelSql = @"
                UPDATE dog_service
                SET status = 'CANCELED'::service_status, performed_at = NULL
                WHERE id = @id
                RETURNING id, dog_id, service_type_id, status, requested_at;";

            var cancelJson = _db.ExecuteSQL(cancelSql, new Dictionary<string, object?> { ["id"] = serviceId });
            if (string.IsNullOrWhiteSpace(cancelJson))
            {
                Console.WriteLine("[CancelDogService] Обновление не вернуло результат");
                return StatusCode(500, new { error = "Не удалось отменить заявку" });
            }

            return Content(cancelJson, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CancelDogService] {ex}");
            return StatusCode(500, new { error = "Ошибка при отмене заявки" });
        }
    }

    private static JsonElement ParseJsonArrayOrEmpty(string? json)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json);
        return doc.RootElement.Clone();
    }

    private static bool TryReadInt(JsonElement body, string propertyName, out int value)
    {
        value = default;
        if (!body.TryGetProperty(propertyName, out var prop) || prop.ValueKind != JsonValueKind.Number)
            return false;

        return prop.TryGetInt32(out value);
    }

    private sealed record ServiceTypeInfo(string Name, decimal? Price);
}

