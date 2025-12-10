using System;
using System.Collections.Generic;
using DogHub;

namespace DogHub.Tests.Infrastructure.Fakes;

public sealed class FakeSqlCommandManager : ISqlCommandManager
{
    private readonly Dictionary<string, string> _commands = new(StringComparer.OrdinalIgnoreCase);

    public string GetCommand(string commandName)
    {
        if (_commands.TryGetValue(commandName, out var sql))
        {
            return sql;
        }

        throw new KeyNotFoundException($"SQL command '{commandName}' was not registered in FakeSqlCommandManager.");
    }

    public void Register(string name, string sql) => _commands[name] = sql;
}

