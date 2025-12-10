using System.Text.Json;
using DogHub.Controllers;
using DogHub.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace DogHub.Tests.Controllers;

public class ProgramsControllerTests
{
    private readonly TestHost _host = new();

    [Fact]
    public void RegisterMemberForTraining_ReturnsConflict_WhenUserAlreadyRegistered()
    {
        _host.Database.Fallback = (sql, _) =>
        {
            if (sql.StartsWith("SELECT id FROM member"))
                return "[{\"id\":5}]";
            if (sql.StartsWith("SELECT id FROM event"))
                return "[{\"id\":9}]";
            if (sql.Contains("FROM event_registration"))
                return "[{\"exists\":1}]";
            return string.Empty;
        };

        var controller = CreateController(
            _host.CreateControllerContext().WithUser(memberId: 5, role: "Пользователь"));
        var body = JsonDocument.Parse("{}").RootElement.Clone();

        var result = controller.RegisterMemberForTraining(9, body);

        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public void RegisterDogForProgram_ReturnsConflict_WhenDogAlreadyAssigned()
    {
        _host.Database.Fallback = (sql, parameters) =>
        {
            if (sql.StartsWith("SELECT member_id FROM dog"))
                return "[{\"memberId\":5}]";
            if (sql.StartsWith("SELECT id FROM program"))
                return "[{\"id\":2}]";
            if (sql.Contains("FROM program_registration"))
                return "[{\"exists\":1}]";
            return string.Empty;
        };

        var controller = CreateController(
            _host.CreateControllerContext().WithUser(memberId: 5, role: "Пользователь"));
        var body = JsonSerializer.Deserialize<JsonElement>(@"{""dogId"":12}");

        var result = controller.RegisterDogForProgram(2, body);

        result.Should().BeOfType<ConflictObjectResult>();
    }

    private ProgramsController CreateController(ControllerContextBuilder builder)
    {
        return new ProgramsController(_host.Database, _host.Sql)
        {
            ControllerContext = builder.Build()
        };
    }
}

