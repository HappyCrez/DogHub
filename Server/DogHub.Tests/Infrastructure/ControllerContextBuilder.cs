using System.Collections.Generic;
using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DogHub.Tests.Infrastructure;

public sealed class ControllerContextBuilder
{
    private readonly DefaultHttpContext _httpContext = new();

    public ControllerContextBuilder WithUser(
        int memberId,
        string role = "Пользователь",
        string? email = null,
        string? fullName = null)
    {
        var identity = new ClaimsIdentity("TestAuth");
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, memberId.ToString()));
        identity.AddClaim(new Claim(ClaimTypes.Role, role));
        if (!string.IsNullOrWhiteSpace(email))
        {
            identity.AddClaim(new Claim(ClaimTypes.Email, email));
        }
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            identity.AddClaim(new Claim(ClaimTypes.Name, fullName));
        }

        _httpContext.User = new ClaimsPrincipal(identity);
        return this;
    }

    public ControllerContextBuilder WithUserAgent(string userAgent)
    {
        _httpContext.Request.Headers["User-Agent"] = userAgent;
        return this;
    }

    public ControllerContextBuilder WithRemoteIp(string ip)
    {
        _httpContext.Connection.RemoteIpAddress = IPAddress.Parse(ip);
        return this;
    }

    public ControllerContextBuilder WithCookies(IDictionary<string, string> cookies)
    {
        _httpContext.Request.Cookies =
            new DictionaryCookieCollection(new Dictionary<string, string>(cookies));
        return this;
    }

    public ControllerContext Build() => new() { HttpContext = _httpContext };

    public DefaultHttpContext HttpContext => _httpContext;
}

