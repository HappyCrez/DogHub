namespace DogHub;

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

/// <summary>
/// Читает sql-команды из файла SQLCommands.json и отдаёт их по имени.
/// Загружается один раз при старте приложения.
/// </summary>
public class SQLCommandManager
{
    private readonly JsonElement jsonData;
    private readonly string sourcePath;

    // Ленивая синглтон-инициализация
    private static readonly Lazy<SQLCommandManager> lazy =
        new(() => new SQLCommandManager(FindSqlCommandsPath()));

    public static SQLCommandManager Instance => lazy.Value;

    private SQLCommandManager(string filePath)
    {
        sourcePath = filePath;

        try
        {
            var jsonText = File.ReadAllText(filePath);
            using var doc = JsonDocument.Parse(jsonText);
            jsonData = doc.RootElement.Clone();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"SQLCommandManager can't handle json: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Ищет файл Assets/SQLCommands.json, поднимаясь от текущей директории вверх.
    /// Работает и если приложение стартует из bin/Debug, и из Server/DogHub, и из корня репо.
    /// </summary>
    private static string FindSqlCommandsPath()
    {
        var currentDir = Directory.GetCurrentDirectory();

        while (!string.IsNullOrEmpty(currentDir))
        {
            var candidate = Path.Combine(currentDir, "Assets", "SQLCommands.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            var parent = Directory.GetParent(currentDir);
            if (parent == null)
            {
                break;
            }

            currentDir = parent.FullName;
        }

        throw new FileNotFoundException(
            "Не удалось найти файл Assets/SQLCommands.json. " +
            "Убедись, что он лежит в папке Assets в корне репозитория DogHub.");
    }

    public string GetCommand(string commandName)
    {
        if (!jsonData.TryGetProperty(commandName, out var property))
        {
            throw new KeyNotFoundException(
                $"SQL command '{commandName}' not found in {sourcePath}");
        }

        return property.GetString() ?? string.Empty;
    }
}
