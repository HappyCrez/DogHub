using System.Text.Json;
using DogHub.Controllers;
using DogHub.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace DogHub.Tests.Controllers;

public class DogsControllerTests
{
    private readonly TestHost _host = new();

    [Fact]
    public void UpdateDog_ReturnsForbid_WhenUserIsNotOwner()
    {
        _host.Database.Fallback = (sql, _) =>
        {
            if (sql.StartsWith("SELECT member_id FROM dog"))
            {
                return "[{\"member_id\":2}]";
            }

            return string.Empty;
        };

        var controller = CreateController(
            _host.CreateControllerContext().WithUser(memberId: 5, role: "Пользователь"));
        var body = JsonSerializer.Deserialize<JsonElement>(
            @"{""photo"":""https://example.com/photo.jpg""}");

        var result = controller.UpdateDog(10, body);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public void UpdateDog_AllowsAdminToModifyAnyField()
    {
        _host.Database.Fallback = (sql, _) =>
        {
            if (sql.StartsWith("UPDATE dog SET"))
            {
                return "{\"result\":\"ok\"}";
            }

            return "[{\"member_id\":5}]";
        };

        var controller = CreateController(
            _host.CreateControllerContext().WithUser(memberId: 1, role: "Администратор"));
        var body = JsonSerializer.Deserialize<JsonElement>(
            @"{""name"":""Rex"",""bio"":""Champion dog""}");

        var result = controller.UpdateDog(3, body);

        result.Should().BeOfType<ContentResult>()
              .Which.Content.Should().Contain("result");
    }

    private DogsController CreateController(ControllerContextBuilder builder)
    {
        return new DogsController(_host.Database, _host.Sql)
        {
            ControllerContext = builder.Build()
        };
    }
}

