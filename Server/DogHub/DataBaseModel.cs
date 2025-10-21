using System;
using Npgsql;
using System.Data;

/// <summary>
/// Класс поддерживает подключение к базе данных и производит операции по 
/// записи и чтению из БД
/// </summary>
class DataBaseModel
{
    private readonly NpgsqlConnection connection;

    /// <summary>
    /// Выполняет SELECT запрос и возвращает данные в виде строки
    /// </summary>
    private string ExecuteQuery(NpgsqlCommand command)
    {
        using var reader = command.ExecuteReader();
        var result = new System.Text.StringBuilder();

        // Читаем названия колонок
        for (int i = 0; i < reader.FieldCount; i++)
        {
            result.Append(reader.GetName(i));
            if (i < reader.FieldCount - 1)
                result.Append(" | ");
        }
        result.AppendLine();

        // Читаем данные
        while (reader.Read())
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                result.Append(reader[i]?.ToString() ?? "NULL");
                if (i < reader.FieldCount - 1)
                {
                    result.Append(" | ");
                }
            }
            result.AppendLine();
        }
        return result.Length > 0 ? result.ToString() : "Запрос выполнен, данные отсутствуют";
    }

    /// <summary>
    /// Выполняет INSERT, UPDATE, DELETE запросы
    /// </summary>
    private string ExecuteNonQuery(NpgsqlCommand command)
    {
        int rowsAffected = command.ExecuteNonQuery();
        return $"Запрос выполнен. Затронуто строк: {rowsAffected}";
    }

    /// <summary>
    /// При создании класса происходит подключение к БД
    /// </summary>
    public DataBaseModel(string connectionConfig)
    {
        // TODO::Ассинхронное подключение к БД
        connection = new NpgsqlConnection(connectionConfig);
        Connect();
    }

     /// <summary>
    /// Синхронное подключение к БД
    /// </summary>
    public void Connect()
    {
        try
        {
            connection.Open();
            Console.WriteLine("Подключен к PostgreSQL");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка подключения: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Передает sql запрос на выполнение БД
    /// </summary>
    /// <param name="sql">Строка на языке sql</param>
    /// <returns>Возвращает ответ от БД</returns>
    public string ExecuteSQL(string sql)
    {
        if (connection.State != ConnectionState.Open)
        {
            throw new InvalidOperationException("Подключение к БД не установлено");
        }

        try
        {
            using var command = new NpgsqlCommand(sql, connection);
            
            // Определяем тип запроса
            if (sql.Trim().ToUpper().StartsWith("SELECT"))
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
}