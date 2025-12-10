using System;
using System.IO;

namespace DogHub.Tests.Infrastructure;

public static class JsonFixture
{
    private static readonly string FixtureRoot =
        Path.Combine(AppContext.BaseDirectory, "Fixtures");

    public static string Load(string fileName)
    {
        var path = Path.Combine(FixtureRoot, fileName);
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Fixture '{fileName}' was not found at '{path}'.");
        }

        return File.ReadAllText(path);
    }
}

