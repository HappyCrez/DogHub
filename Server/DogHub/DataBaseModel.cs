using System;
using System.Collections.Generic;
using System.Text.Json;
using Npgsql;

namespace DogHub;

public class DataBaseModel
{
    // Строка подключения к базе данных
    private readonly string connectionString;

    public DataBaseModel(string connectionString)
    {
        this.connectionString = connectionString 
            ?? throw new ArgumentNullException(nameof(connectionString));
    }

    // Создаёт подключение к базе данных
    private NpgsqlConnection CreateConnection()
    {
        return new NpgsqlConnection(connectionString);
    }

    /// <summary>
    /// Старый метод для внутреннего использования
    /// В случае ошибки возвращает пустую строку
    /// </summary>
    public string ExecuteSQL(string sql, IDictionary<string, object?>? parameters = null)
    {
        try
        {
            using var connection = CreateConnection();
            connection.Open();
            using var command = new NpgsqlCommand(sql, connection);
            AddParameters(command, parameters);

            if (ShouldExecuteAsQuery(sql))
                return ExecuteQuery(command);
            else
                return ExecuteNonQuery(command);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DB error: {ex.Message}");
            return string.Empty;
        }
    }

    /// <summary>
    /// Новый метод для Web API
    /// Возвращает статус выполнения и JSON-результат
    /// </summary>
    public (bool Ok, string Json) ExecuteForApi(string sql, IDictionary<string, object?>? parameters = null)
    {
        try
        {
            using var connection = CreateConnection();
            connection.Open();
            using var command = new NpgsqlCommand(sql, connection);
            AddParameters(command, parameters);

            string json = ShouldExecuteAsQuery(sql)
                ? ExecuteQuery(command)
                : ExecuteNonQuery(command);

            return (true, json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DB API error: {ex.Message}");

            var errorObj = new
            {
                error = "Ошибка выполнения запроса к БД",
                detail = ex.Message
            };

            return (false, JsonSerializer.Serialize(errorObj));
        }
    }

    // Добавляет параметры в SQL-команду
    private static void AddParameters(NpgsqlCommand command, IDictionary<string, object?>? parameters)
    {
        if (parameters == null) return;

        foreach (var kv in parameters)
            command.Parameters.AddWithValue(kv.Key, kv.Value ?? DBNull.Value);
    }

    private static bool ShouldExecuteAsQuery(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            return false;
        }

        var trimmed = sql.TrimStart();
        if (trimmed.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return trimmed.Contains("RETURNING", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Выполняет INSERT, UPDATE или DELETE
    /// </summary>
    private string ExecuteNonQuery(NpgsqlCommand command)
    {
        int affected = command.ExecuteNonQuery();
        return $"{{\"result\":\"Затронуто строк: {affected}\"}}";
    }

    /// <summary>
    /// Выполняет SELECT и возвращает результат в формате JSON
    /// </summary>
    private string ExecuteQuery(NpgsqlCommand command)
    {
        using var reader = command.ExecuteReader();
        var rows = new List<Dictionary<string, object?>>();

        while (reader.Read())
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            for (int i = 0; i < reader.FieldCount; i++)
            {
                object? value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                string columnName = reader.GetName(i);
                string jsonName = ToCamelCase(columnName);
                row[jsonName] = value;
            }

            rows.Add(row);
        }

        var options = new JsonSerializerOptions { WriteIndented = false };
        return JsonSerializer.Serialize(rows, options);
    }

    /// <summary>
    /// Конвертирует имена колонок в camelCase
    /// </summary>
    private static string ToCamelCase(string str)
    {
        if (string.IsNullOrEmpty(str))
            return str;

        // Обработка snake_case
        if (str.Contains("_"))
        {
            var parts = str.Split('_', StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < parts.Length; i++)
            {
                parts[i] = parts[i].ToLowerInvariant();
                if (i > 0 && parts[i].Length > 0)
                    parts[i] = char.ToUpperInvariant(parts[i][0]) + parts[i][1..];
            }
            return string.Join(string.Empty, parts);
        }

        // Обработка PascalCase
        if (char.IsUpper(str[0]))
            return char.ToLowerInvariant(str[0]) + str[1..];

        return str;
    }
}
