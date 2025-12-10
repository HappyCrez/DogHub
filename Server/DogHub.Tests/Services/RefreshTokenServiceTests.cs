using System;
using DogHub;
using DogHub.Tests.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DogHub.Tests.Services;

public class RefreshTokenServiceTests
{
    private readonly TestHost _host = new();

    [Fact]
    public void HashToken_ReturnsDeterministicUppercaseValue()
    {
        const string source = "sample-token";

        var hash1 = RefreshTokenService.HashToken(source);
        var hash2 = RefreshTokenService.HashToken(source);

        hash1.Should().Be(hash2);
        hash1.Should().MatchRegex("^[A-F0-9]{64}$");
    }

    [Fact]
    public void IssueToken_PersistsHashAndReturnsPlainText()
    {
        const string insertSql = "INSERT_REFRESH";
        _host.Sql.Register("insert_refresh_token", insertSql);
        _host.Database.QueueResult(insertSql, "{\"result\":\"ok\"}");

        var (token, expiresAt) = _host.RefreshTokenService.IssueToken(7, "agent", "127.0.0.1");

        token.Should().NotBeNullOrWhiteSpace();
        expiresAt.Should().BeAfter(DateTime.UtcNow);

        var lastCall = _host.Database.LastCall;
        lastCall.Should().NotBeNull();
        lastCall!.Sql.Should().Be(insertSql);
        lastCall.Parameters.Should().ContainKey("token_hash");
        lastCall.Parameters!["token_hash"]
            .Should()
            .Be(RefreshTokenService.HashToken(token));
    }

    [Fact]
    public void GetActiveToken_ReturnsNull_WhenDatabaseIsEmpty()
    {
        const string selectSql = "GET_REFRESH";
        _host.Sql.Register("get_refresh_token", selectSql);
        _host.Database.QueueResult(selectSql, JsonFixture.Load("empty_array.json"));

        var record = _host.RefreshTokenService.GetActiveToken("any");

        record.Should().BeNull();
    }

    [Fact]
    public void GetActiveToken_ReturnsRecord_WhenDatabaseContainsRow()
    {
        const string selectSql = "GET_REFRESH";
        _host.Sql.Register("get_refresh_token", selectSql);
        _host.Database.QueueResult(selectSql, JsonFixture.Load("refresh_token_record.json"));

        var record = _host.RefreshTokenService.GetActiveToken("plain");

        record.Should().NotBeNull();
        record!.MemberId.Should().Be(7);
        record.TokenHash.Should().Be("ABC123");

        var lastCall = _host.Database.LastCall;
        lastCall.Should().NotBeNull();
        lastCall!.Sql.Should().Be(selectSql);
        lastCall.Parameters.Should().ContainKey("token_hash");
    }
}

