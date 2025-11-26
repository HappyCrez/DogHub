namespace DogHub;

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

/// <summary>
/// Загружает SQL-команды из файла SQLCommands.json и предоставляет доступ к ним по имени
/// </summary>
public class SQLCommandManager
{
    private readonly JsonElement jsonData;
    private readonly string sourcePath;

    // Ленивая инициализация синглтона
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
            Console.WriteLine($"Ошибка чтения SQLCommands.json: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Выполняет поиск файла SQLCommands.json, поднимаясь вверх от рабочей директории
    /// </summary>
    private static string FindSqlCommandsPath()
    {
        var currentDir = Directory.GetCurrentDirectory();

        while (!string.IsNullOrEmpty(currentDir))
        {
            // Проверка пути Assets/SQLCommands.json
            var candidate = Path.Combine(currentDir, "Assets", "SQLCommands.json");
            if (File.Exists(candidate))
                return candidate;

            // Переход к родительской директории
            var parent = Directory.GetParent(currentDir);
            if (parent == null)
                break;

            currentDir = parent.FullName;
        }

        throw new FileNotFoundException(
            "Файл SQLCommands.json не найден. Помести его в папку Assets в корне проекта");
    }

    /// <summary>
    /// Возвращает SQL-команду по имени
    /// </summary>
    public string GetCommand(string commandName)
    {
        if (!jsonData.TryGetProperty(commandName, out var property))
            throw new KeyNotFoundException($"Команда '{commandName}' отсутствует в {sourcePath}");

        return property.GetString() ?? string.Empty;
    }
}
