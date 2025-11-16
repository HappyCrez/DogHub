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
    /// Создаёт модель БД на основе строки подключения.
    /// Фактическое подключение создаётся под каждую операцию.
    /// </summary>
    /// <param name="connectionString">Строка подключения к PostgreSQL</param>
    public DataBaseModel(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new ArgumentException("Строка подключения не может быть пустой.", nameof(connectionString));

        this.connectionString = connectionString;
    }

    /// <summary>
    /// Создаёт новое подключение к БД.
    /// </summary>
    private NpgsqlConnection CreateConnection()
    {
        return new NpgsqlConnection(connectionString);
    }

    /// <summary>
    /// Пробное подключение к БД (health-check).
    /// Можно вызывать один раз при старте приложения.
    /// </summary>
    public void Connect()
    {
        using var connection = CreateConnection();
        connection.Open();
        Console.WriteLine("Подключен к PostgreSQL");
    }

    // ==========================
    // Старый API: ExecuteSQL
    // ==========================

    /// <summary>
    /// Выполняет SQL-запрос и возвращает результат в виде текстовой строки.
    /// Если запрос начинается с SELECT – возвращается табличка "колонки | данные".
    /// Для остальных запросов возвращается количество затронутых строк.
    /// Используется, например, в Launch.cs для отладки.
    /// </summary>
    /// <param name="sql">Произвольный SQL-запрос</param>
    public string ExecuteSQL(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
            return "Пустой SQL-запрос.";

        try
        {
            using var connection = CreateConnection();
            connection.Open();

            using var command = new NpgsqlCommand(sql, connection);

            if (sql.TrimStart().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
            {
                return ExecuteQueryAsText(command);
            }
            else
            {
                return ExecuteNonQueryAsText(command);
            }
        }
        catch (Exception ex)
        {
            return $"Ошибка выполнения запроса: {ex.Message}";
        }
    }

    /// <summary>
    /// Выполняет SELECT и возвращает данные в виде текстовой таблицы.
    /// </summary>
    private string ExecuteQueryAsText(NpgsqlCommand command)
    {
        using var reader = command.ExecuteReader();

        if (!reader.HasRows)
            return "Нет данных.";

        var sb = new StringBuilder();

        // Заголовки колонок
        for (int i = 0; i < reader.FieldCount; i++)
        {
            if (i > 0) sb.Append(" | ");
            sb.Append(reader.GetName(i));
        }
        sb.AppendLine();

        // Данные
        while (reader.Read())
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                if (i > 0) sb.Append(" | ");
                sb.Append(reader.IsDBNull(i) ? "NULL" : reader.GetValue(i)?.ToString());
            }
            sb.AppendLine();
        }

        return sb.ToString();
    }

    /// <summary>
    /// Выполняет не-SELECT запрос (INSERT/UPDATE/DELETE) и
    /// возвращает количество затронутых строк.
    /// </summary>
    private string ExecuteNonQueryAsText(NpgsqlCommand command)
    {
        int affected = command.ExecuteNonQuery();
        return $"Затронуто строк: {affected}";
    }

    // ==========================
    // Новый API для JSON
    // ==========================

    /// <summary>
    /// Выполняет SELECT-запрос и возвращает результат в формате JSON (массив объектов).
    /// Используется сервером для API /api/users, /api/events и т.п.
    /// </summary>
    /// <param name="sql">SELECT-запрос</param>
    /// <returns>JSON-строка</returns>
    public string ExecuteSelectToJson(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
            throw new ArgumentException("SQL-запрос не может быть пустым.", nameof(sql));

        using var connection = CreateConnection();
        connection.Open();

        using var command = new NpgsqlCommand(sql, connection);
        return ExecuteReaderToJson(command);
    }

    /// <summary>
    /// Выполняет команду и конвертирует результат в JSON.
    /// Все строки превращаются в список словарей.
    /// </summary>
    private string ExecuteReaderToJson(NpgsqlCommand command)
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

    // ==========================
    // Вспомогательные методы
    // ==========================

    /// <summary>
    /// Преобразует имя поля БД в формат camelCase.
    /// Пример: "user_id" -> "userId", "FullName" -> "fullName".
    /// </summary>
    private static string ToCamelCase(string name)
    {
        if (string.IsNullOrEmpty(name))
            return name;

        // snake_case -> camelCase
        if (name.Contains("_"))
        {
            var parts = name.Split('_', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0)
                return name.ToLowerInvariant();

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
        if (char.IsUpper(name[0]))
        {
            return char.ToLowerInvariant(name[0]) + name[1..];
        }

        return name;
    }
}