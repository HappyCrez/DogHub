using System;
using System.Collections.Generic;
using System.Text.Json;
using DogHub;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using BCryptNet = BCrypt.Net.BCrypt;

namespace DogHub.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;
    private readonly TokenService _tokenService;
    private readonly RefreshTokenService _refreshTokenService;
    private readonly AppConfig _config;
    private const string RefreshCookieName = "doghub_refresh_token";

    public AuthController(
        DataBaseModel db,
        SQLCommandManager sql,
        TokenService tokenService,
        RefreshTokenService refreshTokenService,
        AppConfig config)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _sql = sql ?? throw new ArgumentNullException(nameof(sql));
        _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
        _refreshTokenService = refreshTokenService ?? throw new ArgumentNullException(nameof(refreshTokenService));
        _config = config ?? throw new ArgumentNullException(nameof(config));
    }

    // POST /auth/register
    [HttpPost("register")]
    public IActionResult Register([FromBody] JsonElement body)
    {
        try
        {
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

            // Проверка уникальности email
            var checkSql = _sql.GetCommand("get_member_by_email");
            var checkParams = new Dictionary<string, object?>
            {
                ["email"] = email
            };

            var existingJson = _db.ExecuteSQL(checkSql, checkParams);

            if (!string.IsNullOrWhiteSpace(existingJson))
            {
                using var existingDoc = JsonDocument.Parse(existingJson);
                var root = existingDoc.RootElement;
                if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                {
                    return Conflict(new { error = "Пользователь с таким email уже существует" });
                }
            }

            // Серверный хэш поверх клиентского (bcrypt со своей солью)
            var serverHash = BCryptNet.HashPassword(clientPasswordHash);

            // Вставка участника
            var insertSql = _sql.GetCommand("insert_member_for_auth");
            var insertParams = new Dictionary<string, object?>
            {
                ["full_name"]     = fullName,
                ["phone"]         = phone,
                ["email"]         = email,
                ["city"]          = city,
                ["password_hash"] = serverHash
            };

            var insertResult = _db.ExecuteSQL(insertSql, insertParams);

            if (string.IsNullOrWhiteSpace(insertResult))
            {
                return StatusCode(500, new { error = "Не удалось создать пользователя" });
            }

            // Читаем пользователя по email
            var userJson = _db.ExecuteSQL(checkSql, checkParams);

            if (string.IsNullOrWhiteSpace(userJson))
            {
                return StatusCode(500, new { error = "Пользователь создан, но не найден при чтении" });
            }

            using var userDoc = JsonDocument.Parse(userJson);
            var userRoot = userDoc.RootElement;

            if (userRoot.ValueKind != JsonValueKind.Array || userRoot.GetArrayLength() == 0)
            {
                return StatusCode(500, new { error = "Пользователь создан, но не найден при чтении" });
            }

            var userElement = userRoot[0];

            try
            {
                if (MailService.Instance != null &&
                    userElement.TryGetProperty("memberId", out var memberIdProp) &&
                    memberIdProp.ValueKind == JsonValueKind.Number &&
                    memberIdProp.TryGetInt32(out var memberId))
                {
                    MailService.Instance.WelcomeNotification(memberId);
                }
            }
            catch (Exception mailEx)
            {
                // Не ломаем регистрацию из-за почты
                Console.WriteLine($"[Register] mail error: {mailEx}");
            }


            // Формируем обычный словарь без passwordHash
            var userDict = BuildUserDictionary(userElement);

            return Ok(new { user = userDict });
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

            var sql = _sql.GetCommand("get_member_by_email");
            var parameters = new Dictionary<string, object?>
            {
                ["email"] = email
            };

            var json = _db.ExecuteSQL(sql, parameters);

            if (string.IsNullOrWhiteSpace(json))
            {
                return Unauthorized(new { error = "Неверный email или пароль" });
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

            if (string.IsNullOrEmpty(storedHash) ||
                !BCryptNet.Verify(clientPasswordHash, storedHash))
            {
                return Unauthorized(new { error = "Неверный email или пароль" });
            }

            var userDict = BuildUserDictionary(userElement);

            if (!userElement.TryGetProperty("memberId", out var memberIdProp) ||
                memberIdProp.ValueKind != JsonValueKind.Number)
            {
                return StatusCode(500, new { error = "У пользователя отсутствует идентификатор" });
            }

            var memberId = memberIdProp.GetInt32();
            var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(userElement);
            var (refreshToken, refreshExpiresAt) = _refreshTokenService.IssueToken(
                memberId,
                GetUserAgent(),
                GetRemoteIp());

            WriteRefreshCookie(refreshToken, refreshExpiresAt);

            return Ok(new
            {
                accessToken,
                accessTokenExpiresAt = expiresAt,
                refreshTokenExpiresAt = refreshExpiresAt,
                user = userDict
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Login] {ex}");
            return StatusCode(500, new { error = "Ошибка при входе" });
        }
    }

    // POST /auth/refresh
    [HttpPost("refresh")]
    public IActionResult Refresh()
    {
        try
        {
            if (!Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) ||
                string.IsNullOrWhiteSpace(rawToken))
            {
                return Unauthorized(new { error = "Refresh-токен отсутствует" });
            }

            var tokenRecord = _refreshTokenService.GetActiveToken(rawToken);
            if (tokenRecord == null)
            {
                ClearRefreshCookie();
                return Unauthorized(new { error = "Сессия истекла. Войдите заново." });
            }

            var userAgent = GetUserAgent();
            if (!string.IsNullOrEmpty(tokenRecord.UserAgent) &&
                !string.IsNullOrEmpty(userAgent) &&
                !string.Equals(tokenRecord.UserAgent, userAgent, StringComparison.Ordinal))
            {
                _refreshTokenService.RevokeToken(tokenRecord.Id);
                ClearRefreshCookie();
                return Unauthorized(new { error = "Обнаружено изменение устройства. Требуется повторный вход." });
            }

            var sql = _sql.GetCommand("get_member_by_id");
            var parameters = new Dictionary<string, object?>
            {
                ["member_id"] = tokenRecord.MemberId
            };

            var json = _db.ExecuteSQL(sql, parameters);
            if (string.IsNullOrWhiteSpace(json))
            {
                _refreshTokenService.RevokeToken(tokenRecord.Id);
                ClearRefreshCookie();
                return Unauthorized(new { error = "Пользователь не найден" });
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
            {
                _refreshTokenService.RevokeToken(tokenRecord.Id);
                ClearRefreshCookie();
                return Unauthorized(new { error = "Пользователь не найден" });
            }

            var userElement = root[0];
            var userDict = BuildUserDictionary(userElement);

            var (accessToken, accessExpiresAt) = _tokenService.GenerateAccessToken(userElement);
            var (newRefreshToken, newRefreshExpiresAt) = _refreshTokenService.IssueToken(
                tokenRecord.MemberId,
                userAgent,
                GetRemoteIp());

            _refreshTokenService.RevokeToken(tokenRecord.Id);
            WriteRefreshCookie(newRefreshToken, newRefreshExpiresAt);

            return Ok(new
            {
                accessToken,
                accessTokenExpiresAt = accessExpiresAt,
                refreshTokenExpiresAt = newRefreshExpiresAt,
                user = userDict
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Refresh] {ex}");
            return StatusCode(500, new { error = "Ошибка при обновлении сессии" });
        }
    }

    // POST /auth/logout
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        try
        {
            if (Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) &&
                !string.IsNullOrWhiteSpace(rawToken))
            {
                var tokenRecord = _refreshTokenService.GetActiveToken(rawToken);
                if (tokenRecord != null)
                {
                    _refreshTokenService.RevokeToken(tokenRecord.Id);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Logout] {ex}");
        }
        finally
        {
            ClearRefreshCookie();
        }

        return NoContent();
    }

    private static Dictionary<string, object?> BuildUserDictionary(JsonElement userElement)
    {
        var result = new Dictionary<string, object?>();

        foreach (var prop in userElement.EnumerateObject())
        {
            if (prop.NameEquals("passwordHash"))
                continue;

            result[prop.Name] = ConvertJsonValue(prop.Value);
        }

        return result;
    }

    private static object? ConvertJsonValue(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.TryGetInt64(out var l) ? l : value.GetDouble(),
            JsonValueKind.True   => true,
            JsonValueKind.False  => false,
            JsonValueKind.Null   => null,
            _ => value.GetRawText()
        };
    }

    private void WriteRefreshCookie(string refreshToken, DateTime expiresAt)
    {
        var options = CreateRefreshCookieOptions(expiresAt);
        Response.Cookies.Append(RefreshCookieName, refreshToken, options);
    }

    private void ClearRefreshCookie()
    {
        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = _config.RefreshCookieSecure,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        };

        if (!string.IsNullOrWhiteSpace(_config.RefreshCookieDomain))
        {
            options.Domain = _config.RefreshCookieDomain;
        }

        Response.Cookies.Delete(RefreshCookieName, options);
    }

    private CookieOptions CreateRefreshCookieOptions(DateTime expiresAt)
    {
        var utcExpires = DateTime.SpecifyKind(expiresAt, DateTimeKind.Utc);
        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = _config.RefreshCookieSecure,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = new DateTimeOffset(utcExpires)
        };

        if (!string.IsNullOrWhiteSpace(_config.RefreshCookieDomain))
        {
            options.Domain = _config.RefreshCookieDomain;
        }

        return options;
    }

    private string? GetUserAgent()
    {
        if (Request.Headers.TryGetValue("User-Agent", out var values))
            return values.ToString();

        return null;
    }

    private string? GetRemoteIp()
    {
        return HttpContext?.Connection?.RemoteIpAddress?.ToString();
    }
}
