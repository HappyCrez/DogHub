using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using Npgsql;
using System.Data;

/// <summary>
/// Класс поддерживает подключение к базе данных и выполняет
/// операции чтения/записи. Добавлены методы для возврата данных в JSON.
/// </summary>
class DataBaseModel
{
    /// <summary>
    /// Строка подключения к PostgreSQL
    /// </summary>
    private readonly string connectionString;

    /// <summary>
    /// Создаёт новое подключение к БД.
    /// </summary>
    private NpgsqlConnection CreateConnection()
    {
        return new NpgsqlConnection(connectionString);
    }

    private void UpdateSQL(string sql, params string[] sqlParams)
    {
        Console.WriteLine(string.Join("",sqlParams));
    }

    /// <summary>
    /// Создаёт модель БД на основе строки подключения.
    /// Фактическое подключение создаётся под каждую операцию.
    /// </summary>
    /// <param name="connectionString">Строка подключения к PostgreSQL</param>
    public DataBaseModel(string connectionString)
    {
        this.connectionString = connectionString;
    }

    /// <summary>
    /// Пробное подключение к БД
    /// </summary>
    public void Connect()
    {
        using var connection = CreateConnection();
        connection.Open();
        Console.WriteLine("Подключен к PostgreSQL");
    }

    /// <summary>
    /// Выполняет SQL-запрос и возвращает результат в виде json
    /// </summary>
    /// <param name="sql">Произвольный SQL-запрос</param>
    public string ExecuteSQL(string sql, params string[] sqlParams)
    {
        // Подставляем параметры в запрос
        UpdateSQL(sql, sqlParams);

        try
        {
            using var connection = CreateConnection();
            connection.Open();
            using var command = new NpgsqlCommand(sql, connection);
            if (sql.TrimStart().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                return ExecuteQuery(command);
            }
            else
            {
                return ExecuteNonQuery(command);
            }
        }
        catch (Exception ex)
        {
            return $"Ошибка выполнения запроса: {ex.Message}";
        }
    }

    /// <summary>
    /// Выполняет не-SELECT запрос (INSERT/UPDATE/DELETE)
    /// </summary>
    /// <returns>Возвращает количество затронутых строк</returns>
    private string ExecuteNonQuery(NpgsqlCommand command)
    {
        int affected = command.ExecuteNonQuery();
        return $"{{ result: \"Затронуто строк: {affected}\"}}";
    }

    /// <summary>
    /// Выполняет команду и конвертирует результат в JSON.
    /// Все строки превращаются в список словарей.
    /// </summary>
    /// <param name="command">SELECT-команда</param>
    /// <returns>JSON-строка</returns>
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

                // Имя поля берём из БД, но приводим к camelCase
                string columnName = reader.GetName(i);
                string jsonName = ToCamelCase(columnName);

                row[jsonName] = value;
            }

            rows.Add(row);
        }

        var options = new JsonSerializerOptions
        {
            WriteIndented = false
        };
        return JsonSerializer.Serialize(rows, options);
    }

    /// <summary>
    /// Преобразует строку в формат camelCase.
    /// Пример: "user_id" -> "userId", "FullName" -> "fullName".
    /// </summary>
    /// <param name="str">Строка для преобразования</param>
    /// <returns>JSON-строка</returns>
    private static string ToCamelCase(string str)
    {
        // snake_case -> camelCase
        if (str.Contains("_"))
        {
            var parts = str.Split('_', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0)
            {
                return str.ToLowerInvariant();
            }

            for (int i = 0; i < parts.Length; i++)
            {
                parts[i] = parts[i].ToLowerInvariant();
                if (i > 0 && parts[i].Length > 0)
                {
                    parts[i] = char.ToUpperInvariant(parts[i][0]) + parts[i][1..];
                }
            }
            return string.Join(string.Empty, parts);
        }

        // Просто делаем первую букву строчной, если была заглавная
        if (str.Length > 0 && char.IsUpper(str[0]))
        {
            return char.ToLowerInvariant(str[0]) + str[1..];
        }
        return str;
    }
}