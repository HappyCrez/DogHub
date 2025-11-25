using System;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;
using System.IO;

/// <summary>
/// Обрабатывает delete http запрос
/// </summary>
/// <remarks>
/// Как работает API сервера указано в Docs/ServerAPI.md
/// </remarks>
public class HttpHandler
{
    // Объект будет создан при попытке его получения
    // (ленивая инициализация)
    private static readonly Lazy<HttpHandler> instance = 
        new Lazy<HttpHandler>(() => new HttpHandler());

    /// <summary>
    /// Ограничиваем доступ к конструктору класса
    /// </summary>
    private HttpHandler() 
    { }

    /// <summary>
    /// Создает sql запрос, обновляющий данные в таблице
    /// </summary>
    /// <param name="path">
    /// Путь по которому обращается клиент (указывает таблицу для обновления)
    /// Обязан содержать индекс записи, которую хочет обновить клиент
    /// </param>
    /// <param name="payload">
    /// Строка формата json в которой хранятся данные
    /// для обновления записи в таблице
    /// </param>
    /// <returns>Возвращает sql запрос типа update</returns>
    private string HttpPut(string path, string payload)
    {
        string[] pathParts = path.Trim('/').Split('/');
        string table = pathParts[0];
        if (int.TryParse(pathParts[1], out int id) == false)
        {
            return string.Empty;
        }
        var jsonDoc = JsonDocument.Parse(payload);
        var root = jsonDoc.RootElement;
        
        var updates = new List<string>();
        
        foreach (var property in root.EnumerateObject())
        {
            string value = FormatValueForSql(property.Value);
            updates.Add($"{property.Name} = {value}");
        }
        return $"UPDATE {table} SET {string.Join(", ", updates)} WHERE id = {id};";
    }

    /// <summary>
    /// Создает sql запрос, добавляющий данные в таблицу
    /// </summary>
    /// <param name="path">
    /// Путь по которому обращается клиент (указывает таблицу для создания записи)
    /// </param>
    /// <param name="payload">
    /// Строка формата json в которой хранятся данные
    /// для создания записи в таблице
    /// </param>
    /// <returns>Возвращает sql запрос типа insert</returns>
    private string HttpPost(string path, string payload)
    {
        try
        {
            var jsonDoc = JsonDocument.Parse(payload);
            var root = jsonDoc.RootElement;
            
            string table = path.Trim('/');
            
            var columns = new List<string>();
            var values = new List<string>();
            
            foreach (var property in root.EnumerateObject())
            {
                columns.Add(property.Name);
                values.Add(FormatValueForSql(property.Value));
            }
            return $"INSERT INTO {table} ({string.Join(", ", columns)}) VALUES ({string.Join(", ", values)});";
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }

    /// <summary>
    /// Создает sql запрос выборки данных, все select запросы прописаны в SQLCommands
    /// </summary>
    /// <param name="path">
    /// Путь по которому обращается клиент (указывает имя команды и параметры)
    /// </param>
    /// <returns>Возвращает sql запрос типа select</returns>
    private string HttpGet(string path)
    {
        string[] pathParts = path.Trim('/').Split('/');
        return SQLCommandManager.Instance.GetCommand(pathParts[0], pathParts[1..]);
    }

    /// <summary>
    /// Создает sql запрос удаления данных
    /// </summary>
    /// <param name="path">
    /// Путь по которому обращается клиент (указывает таблицу для удаления данных)
    /// Обязательно содержит один id для удаление конкретного номера записи
    /// </param>
    /// <returns>Возвращает sql запрос типа delete</returns>
    private string HttpDelete(string path)
    {
        string table = path.Trim('/');
        string[] pathParts = table.Split('/');
        
        if (pathParts.Length != 2)
        {
            return string.Empty;
        }
        
        table = pathParts[0];
        
        if (int.TryParse(pathParts[1], out int id))
        {
            return $"DELETE FROM {table} WHERE id = {id};";
        }
        return string.Empty;
    }

    /// <summary>
    /// Форматирует JSON значение для SQL запроса
    /// </summary>
    private string FormatValueForSql(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.String:
                string? strValue = element.GetString();
                // Экранируем одинарные кавычки для SQL
                return $"'{strValue?.Replace("'", "''")}'";
                
            case JsonValueKind.Number:
                if (element.TryGetInt32(out int intValue))
                {
                    return intValue.ToString();
                }
                else if (element.TryGetDecimal(out decimal decimalValue))
                {
                    return decimalValue.ToString(System.Globalization.CultureInfo.InvariantCulture);
                }
                else
                {
                    return element.GetDouble().ToString(System.Globalization.CultureInfo.InvariantCulture);
                }
            case JsonValueKind.Array:
                var arrayValues = element.EnumerateArray()
                    .Select(item => FormatValueForSql(item))
                    .ToArray();
                return $"ARRAY[{string.Join(",", arrayValues)}]";
            case JsonValueKind.True:  return "TRUE";
            case JsonValueKind.False: return "FALSE";
            case JsonValueKind.Null:  return "NULL";
            default: throw new ArgumentException($"Unsupported JSON value type: {element.ValueKind}");
        }
    }

    /// <summary>
    /// Извлекает payload из HTTP запроса
    /// </summary>
    /// <param name="requestText">Строка http запроса</param>
    private string ExtractPayload(string requestText)
    {
        string[] lines = requestText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
        
        // Ищем пустую строку, которая разделяет заголовки и тело
        int emptyLineIndex = -1;
        for (int i = 0; i < lines.Length; i++)
        {
            if (string.IsNullOrEmpty(lines[i]))
            {
                emptyLineIndex = i;
                break;
            }
        }
        
        if (emptyLineIndex == -1 || emptyLineIndex >= lines.Length - 1)
        {
            return ""; // Нет payload
        }
        
        // Собираем все строки после пустой строки
        return string.Join("\n", lines.Skip(emptyLineIndex + 1)).Trim();
    }

    /// <summary>
    /// Возвращает объект класса
    /// </summary>
    public static HttpHandler Instance 
    {
        get { return instance.Value; }
    }

    /// <summary>
    /// Обрабатывает запрос и формирует соответствующую sql команду
    /// Если запрос был некорректен, выбрасывает ошибку
    /// </summary>
    /// <param name="requestText">Строка http запроса</param>
    /// <returns>Возвращает sql команду</returns>
    public string HandleRequest(string requestText)
    {
        // Первая строка: METHOD PATH HTTP/1.1
        string[] firstLineParts = requestText.Split(new[] { '\n', ' ' }, StringSplitOptions.RemoveEmptyEntries);
        string method = firstLineParts[0];
        string path = firstLineParts[1];
        string payload = ExtractPayload(requestText);
        switch (method)
        {
            case "GET": return HttpGet(path);
            case "PUT": return HttpPut(path, payload);
            case "POST": return HttpPost(path, payload);
            case "DELETE": return HttpDelete(path);
        }
        throw new ArgumentException($"Incorrect http request");
    }
}