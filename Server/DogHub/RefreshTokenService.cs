using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DogHub;

public sealed class RefreshTokenService
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;
    private readonly AppConfig _config;

    public RefreshTokenService(DataBaseModel db, SQLCommandManager sql, AppConfig config)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _sql = sql ?? throw new ArgumentNullException(nameof(sql));
        _config = config ?? throw new ArgumentNullException(nameof(config));
    }

    public (string Token, DateTime ExpiresAt) IssueToken(
        int memberId,
        string? userAgent,
        string? ipAddress)
    {
        var plainToken = GenerateTokenString();
        var tokenHash = HashToken(plainToken);
        var expiresAt = DateTime.UtcNow.Add(_config.RefreshTokenLifetime);

        var insertSql = _sql.GetCommand("insert_refresh_token");
        var parameters = new Dictionary<string, object?>
        {
            ["member_id"] = memberId,
            ["token_hash"] = tokenHash,
            ["user_agent"] = userAgent,
            ["ip_address"] = ipAddress,
            ["expires_at"] = expiresAt
        };

        var json = _db.ExecuteSQL(insertSql, parameters);
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new InvalidOperationException("Не удалось сохранить refresh-токен");
        }

        return (plainToken, expiresAt);
    }

    public RefreshTokenRecord? GetActiveToken(string? plainToken)
    {
        if (string.IsNullOrWhiteSpace(plainToken))
            return null;

        var hash = HashToken(plainToken);
        var sql = _sql.GetCommand("get_refresh_token");
        var parameters = new Dictionary<string, object?>
        {
            ["token_hash"] = hash
        };

        var json = _db.ExecuteSQL(sql, parameters);
        if (string.IsNullOrWhiteSpace(json))
            return null;

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
            return null;

        return MapRecord(root[0]);
    }

    public void RevokeToken(int tokenId)
    {
        var sql = _sql.GetCommand("revoke_refresh_token");
        var parameters = new Dictionary<string, object?>
        {
            ["id"] = tokenId
        };

        _db.ExecuteSQL(sql, parameters);
    }

    public void RevokeTokensForMember(int memberId)
    {
        var sql = _sql.GetCommand("revoke_member_tokens");
        var parameters = new Dictionary<string, object?>
        {
            ["member_id"] = memberId
        };

        _db.ExecuteSQL(sql, parameters);
    }

    public static string HashToken(string token)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToHexString(hash);
    }

    private static string GenerateTokenString()
    {
        Span<byte> buffer = stackalloc byte[48];
        RandomNumberGenerator.Fill(buffer);
        var base64 = Convert.ToBase64String(buffer);
        return base64.Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static RefreshTokenRecord MapRecord(JsonElement row)
    {
        return new RefreshTokenRecord(
            row.GetProperty("id").GetInt32(),
            row.GetProperty("memberId").GetInt32(),
            row.GetProperty("tokenHash").GetString() ?? string.Empty,
            row.TryGetProperty("userAgent", out var agentProp) && agentProp.ValueKind != JsonValueKind.Null
                ? agentProp.GetString()
                : null,
            row.TryGetProperty("ipAddress", out var ipProp) && ipProp.ValueKind != JsonValueKind.Null
                ? ipProp.GetString()
                : null,
            row.GetProperty("createdAt").GetDateTime(),
            row.GetProperty("expiresAt").GetDateTime(),
            row.TryGetProperty("revokedAt", out var revokedProp) && revokedProp.ValueKind != JsonValueKind.Null
                ? revokedProp.GetDateTime()
                : null
        );
    }
}

public sealed record RefreshTokenRecord(
    int Id,
    int MemberId,
    string TokenHash,
    string? UserAgent,
    string? IpAddress,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? RevokedAt);

