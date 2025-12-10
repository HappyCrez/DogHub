using System;
using System.Text.Json;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Linq;
using System.Text.Json.Serialization;
using DogHub;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace DogHub.Controllers;

[ApiController]
[Route("me")]
[Authorize] // любой залогиненный: Пользователь / Тренер / Администратор
public class MeController : ControllerBase
{
    private readonly IDataBaseModel _db;
    private readonly AvatarStorage _avatarStorage;
    private readonly DogPhotoStorage _dogPhotoStorage;

    public MeController(IDataBaseModel db, AvatarStorage avatarStorage, DogPhotoStorage dogPhotoStorage)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _avatarStorage = avatarStorage ?? throw new ArgumentNullException(nameof(avatarStorage));
        _dogPhotoStorage = dogPhotoStorage ?? throw new ArgumentNullException(nameof(dogPhotoStorage));
    }

    // GET /me — получить свои данные по токену
    [HttpGet]
    public IActionResult GetMe()
    {
        try
        {
            // Берём memberId из токена (claim "sub")
            var memberId = GetMemberId();
            if (memberId == null)
            {
                return Forbid();
            }

            var sql =
                "SELECT id AS member_id, full_name, phone, email, city, avatar_url, " +
                "bio AS owner_bio, join_date, membership_end_date, role " +
                "FROM member WHERE id = @id;";

            var parameters = new Dictionary<string, object?>
            {
                ["id"] = memberId.Value
            };

            var json = _db.ExecuteSQL(sql, parameters);

            if (string.IsNullOrWhiteSpace(json))
            {
                return NotFound(new { error = "Пользователь не найден" });
            }

            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetMe] {ex}");
            return StatusCode(500, new { error = "Ошибка при получении данных профиля" });
        }
    }

    [HttpPost("avatar")]
    [Consumes("multipart/form-data")]
    public IActionResult UploadAvatar([FromForm] IFormFile? avatar)
    {
        try
        {
            var memberId = GetMemberId();
            if (memberId == null)
            {
                return Forbid();
            }

            var previousAvatarUrl = GetCurrentAvatarUrl(memberId.Value);

            if (avatar == null)
            {
                return BadRequest(new { error = "Файл не найден в запросе." });
            }

            string avatarUrl;
            try
            {
                avatarUrl = _avatarStorage.Upload(memberId.Value, avatar);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }

            var parameters = new Dictionary<string, object?>
            {
                ["id"] = memberId.Value,
                ["avatar_url"] = avatarUrl
            };

            var updateSql = "UPDATE member SET avatar_url = @avatar_url WHERE id = @id;";
            var result = _db.ExecuteSQL(updateSql, parameters);

            if (string.IsNullOrWhiteSpace(result))
            {
                return StatusCode(500, new { error = "Не удалось сохранить ссылку на аватар." });
            }

            TryDeleteOldAvatar(previousAvatarUrl, avatarUrl);

            return Ok(new { avatarUrl });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UploadAvatar] {ex}");
            return StatusCode(500, new { error = "Ошибка при загрузке аватара." });
        }
    }

    private int? GetMemberId()
    {
        var memberIdStr =
            User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(memberIdStr) ||
            !int.TryParse(memberIdStr, out var memberId))
        {
            return null;
        }

        return memberId;
    }

    [HttpPost("dogs/photo")]
    [Consumes("multipart/form-data")]
    public IActionResult UploadDogPhoto([FromForm] IFormFile? photo)
    {
        try
        {
            var memberId = GetMemberId();
            if (memberId == null)
            {
                return Forbid();
            }

            if (photo == null)
            {
                return BadRequest(new { error = "Файл не найден в запросе." });
            }

            string photoUrl;
            try
            {
                photoUrl = _dogPhotoStorage.Upload(memberId.Value, photo);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }

            return Ok(new { photoUrl });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UploadDogPhoto] {ex}");
            return StatusCode(500, new { error = "Ошибка при загрузке фотографии собаки." });
        }
    }

    [HttpPost("dogs")]
    public IActionResult CreateDog([FromBody] CreateDogRequest request)
    {
        try
        {
            var memberId = GetMemberId();
            if (memberId == null)
            {
                return Forbid();
            }

            if (request == null)
            {
                return BadRequest(new { error = "Тело запроса не может быть пустым." });
            }

            var name = request.Name?.Trim();
            var breed = request.Breed?.Trim();
            var sex = request.Sex?.Trim().ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { error = "Поле name обязательно." });
            }

            if (string.IsNullOrWhiteSpace(breed))
            {
                return BadRequest(new { error = "Поле breed обязательно." });
            }

            if (sex is not ("M" or "F"))
            {
                return BadRequest(new { error = "Поле sex должно быть 'M' или 'F'." });
            }

            DateTime? birthDate = null;
            if (!string.IsNullOrWhiteSpace(request.BirthDate))
            {
                if (DateTime.TryParse(request.BirthDate, out var parsedBirth))
                {
                    birthDate = parsedBirth.Date;
                }
                else
                {
                    return BadRequest(new { error = "Поле birthDate имеет неверный формат." });
                }
            }

            var chipNumber = string.IsNullOrWhiteSpace(request.ChipNumber)
                ? null
                : request.ChipNumber.Trim();

            var bio = string.IsNullOrWhiteSpace(request.Bio)
                ? null
                : request.Bio.Trim();

            var photoUrl = string.IsNullOrWhiteSpace(request.Photo)
                ? null
                : request.Photo.Trim();

            string[]? tags = request.Tags?
                .Select(tag => tag?.Trim())
                .Where(tag => !string.IsNullOrWhiteSpace(tag))
                .Select(tag => tag!)
                .ToArray();

            if (tags is { Length: 0 })
            {
                tags = null;
            }

            var parameters = new Dictionary<string, object?>
            {
                ["member_id"] = memberId.Value,
                ["name"] = name,
                ["breed"] = breed,
                ["sex"] = sex,
                ["birth_date"] = birthDate,
                ["chip_number"] = chipNumber,
                ["photo"] = photoUrl,
                ["bio"] = bio,
                ["tags"] = tags
            };

            const string sql = @"
INSERT INTO dog (member_id, name, breed, sex, birth_date, chip_number, photo, bio, tags)
VALUES (@member_id, @name, @breed, CAST(@sex AS sex_enum), @birth_date, @chip_number, @photo, @bio, @tags)
RETURNING id, member_id, name, breed, sex, birth_date, chip_number, photo, bio, tags;";

            var json = _db.ExecuteSQL(sql, parameters);

            if (string.IsNullOrWhiteSpace(json))
            {
                return StatusCode(500, new { error = "Не удалось создать собаку." });
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
            {
                return StatusCode(500, new { error = "Создание собаки прошло успешно, но данные не найдены." });
            }

            var firstDog = root[0];
            return Content(firstDog.GetRawText(), "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CreateDog] {ex}");
            return StatusCode(500, new { error = "Ошибка при создании собаки." });
        }
    }

    // PUT /me — обновить свои данные:
    // fullName, phone, email, city, avatarUrl, ownerBio/bio
    [HttpPut]
    public IActionResult UpdateMe([FromBody] JsonElement body)
    {
        try
        {
            // Берём memberId из токена
            var memberId = GetMemberId();
            if (memberId == null)
            {
                return Forbid();
            }

            // Какие поля можно менять с клиента и в какие колонки БД они мапятся
            var allowedMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["fullName"]  = "full_name",
                ["phone"]     = "phone",
                ["email"]     = "email",
                ["city"]      = "city",
                ["avatarUrl"] = "avatar_url",
                ["ownerBio"]  = "bio",
                ["bio"]       = "bio"
            };

            var updates = new List<string>();
            var parameters = new Dictionary<string, object?>();

            foreach (var prop in body.EnumerateObject())
            {
                var jsonName = prop.Name;

                if (!allowedMap.TryGetValue(jsonName, out var column))
                {
                    // Игнорируем всё, что менять нельзя (role, joinDate, password_hash и т.п.)
                    continue;
                }

                updates.Add($"{column} = @{column}");
                parameters[column] = ConvertJsonValue(prop.Value);
            }

            if (updates.Count == 0)
            {
                return BadRequest(new
                {
                    error = "Нет допустимых полей для обновления. Можно менять только fullName, phone, email, city, avatarUrl, ownerBio."
                });
            }

            parameters["id"] = memberId.Value;

            var sql =
                $"UPDATE member SET {string.Join(", ", updates)} WHERE id = @id;";

            var json = _db.ExecuteSQL(sql, parameters);

            if (string.IsNullOrWhiteSpace(json))
            {
                return StatusCode(500, new { error = "Ошибка при обновлении профиля" });
            }

            // После обновления — вернуть свежие данные
            var selectSql =
                "SELECT id AS member_id, full_name, phone, email, city, avatar_url, " +
                "bio AS owner_bio, join_date, membership_end_date, role " +
                "FROM member WHERE id = @id;";

            var resultJson = _db.ExecuteSQL(selectSql, new Dictionary<string, object?> { ["id"] = memberId.Value });

            if (string.IsNullOrWhiteSpace(resultJson))
            {
                return StatusCode(500, new { error = "Профиль обновлён, но не удалось получить свежие данные" });
            }

            return Content(resultJson, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UpdateMe] {ex}");
            return StatusCode(500, new { error = "Ошибка при обновлении профиля" });
        }
    }

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

    private string? GetCurrentAvatarUrl(int memberId)
    {
        var sql = "SELECT avatar_url FROM member WHERE id = @id;";
        var parameters = new Dictionary<string, object?> { ["id"] = memberId };
        var json = _db.ExecuteSQL(sql, parameters);

        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            foreach (var element in doc.RootElement.EnumerateArray())
            {
                if (element.TryGetProperty("avatarUrl", out var avatarProp))
                {
                    return avatarProp.ValueKind == JsonValueKind.Null
                        ? null
                        : avatarProp.GetString();
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GetCurrentAvatarUrl] {ex}");
        }

        return null;
    }

    private void TryDeleteOldAvatar(string? previousAvatarUrl, string newAvatarUrl)
    {
        if (string.IsNullOrWhiteSpace(previousAvatarUrl) ||
            string.Equals(previousAvatarUrl, newAvatarUrl, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        try
        {
            _avatarStorage.DeleteByUrl(previousAvatarUrl);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UploadAvatar] Не удалось удалить старый аватар: {ex}");
        }
    }

    public class CreateDogRequest
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("breed")]
        public string? Breed { get; set; }

        [JsonPropertyName("sex")]
        public string? Sex { get; set; }

        [JsonPropertyName("birthDate")]
        public string? BirthDate { get; set; }

        [JsonPropertyName("chipNumber")]
        public string? ChipNumber { get; set; }

        [JsonPropertyName("photo")]
        public string? Photo { get; set; }

        [JsonPropertyName("bio")]
        public string? Bio { get; set; }

        [JsonPropertyName("tags")]
        public string[]? Tags { get; set; }
    }
}
