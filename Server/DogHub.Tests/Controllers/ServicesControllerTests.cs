using System.Text.Json;
using DogHub.Controllers;
using DogHub.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace DogHub.Tests.Controllers;

public class ServicesControllerTests
{
    private readonly TestHost _host = new();

    [Fact]
    public void BookDogService_ReturnsForbid_WhenDogBelongsToAnotherUser()
    {
        _host.Database.Fallback = (sql, _) =>
        {
            if (sql.StartsWith("SELECT member_id FROM dog"))
            {
                return "[{\"memberId\":99}]";
            }

            return "[{\"name\":\"Grooming\",\"price\":100}]";
        };

        var controller = CreateController(
            _host.CreateControllerContext().WithUser(memberId: 5, role: "Пользователь"));

        var body = JsonSerializer.Deserialize<JsonElement>(
            @"{""dogId"":12,""serviceTypeId"":3,""requestedAt"":""2024-01-01T10:00:00""}");

        var result = controller.BookDogService(body);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public void CancelDogService_ReturnsConflict_WhenStatusIsDone()
    {
        _host.Database.Fallback = (sql, _) =>
        {
            if (sql.Contains("FROM dog_service ds"))
            {
                return """
                [
                  {
                    "dogId": 12,
                    "status": "DONE",
                    "memberId": 5
                  }
                ]
                """;
            }

            return "{\"result\":\"ok\"}";
        };

        var controller = CreateController(
            _host.CreateControllerContext().WithUser(memberId: 5, role: "Пользователь"));

        var result = controller.CancelDogService(55);

        result.Should().BeOfType<ConflictObjectResult>();
    }

    private ServicesController CreateController(ControllerContextBuilder builder)
    {
        return new ServicesController(_host.Database, _host.Sql)
        {
            ControllerContext = builder.Build()
        };
    }
}

