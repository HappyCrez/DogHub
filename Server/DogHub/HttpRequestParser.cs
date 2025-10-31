using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Парсит HTTP GET запрос и извлекает параметры из URL
/// </summary>
public class HttpRequestParser
{
    /// <summary>
    /// Парсит HTTP GET запрос и извлекает параметры из URL
    /// </summary>
    /// <param name="httpRequest">Полный текст HTTP запроса</param>
    /// <returns>Словарь с параметрами</returns>
    public static Dictionary<string, string> ParseGetRequest(string httpRequest)
    {
        var parameters = new Dictionary<string, string>();
        
        try
        {
            // Разделяем запрос на строки
            var lines = httpRequest.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            
            if (lines.Length == 0) return parameters;
            
            // Первая строка - request line
            var requestLine = lines[0];
            
            // Ищем query string в URL
            var queryStartIndex = requestLine.IndexOf('?');
            if (queryStartIndex == -1) return parameters;
            
            var queryEndIndex = requestLine.IndexOf(' ', queryStartIndex);
            if (queryEndIndex == -1) queryEndIndex = requestLine.Length;
            
            var queryString = requestLine.Substring(queryStartIndex + 1, queryEndIndex - queryStartIndex - 1);
            
            // Парсим параметры query string
            parameters = ParseQueryString(queryString);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка при парсинге HTTP запроса: {ex.Message}");
        }
        
        return parameters;
    }
    
    /// <summary>
    /// Парсит query string и возвращает параметры
    /// </summary>
    private static Dictionary<string, string> ParseQueryString(string queryString)
    {
        var parameters = new Dictionary<string, string>();
        
        var pairs = queryString.Split('&');
        foreach (var pair in pairs)
        {
            var keyValue = pair.Split('=');
            if (keyValue.Length == 2)
            {
                var key = Uri.UnescapeDataString(keyValue[0]);
                var value = Uri.UnescapeDataString(keyValue[1]);
                parameters[key] = value;
            }
            else if (keyValue.Length == 1)
            {
                var key = Uri.UnescapeDataString(keyValue[0]);
                parameters[key] = string.Empty;
            }
        }
        
        return parameters;
    }
    
    /// <summary>
    /// Извлекает конкретный параметр из HTTP запроса
    /// </summary>
    public static string GetParameter(string httpRequest, string parameterName)
    {
        var parameters = ParseGetRequest(httpRequest);
        return parameters.ContainsKey(parameterName) ? parameters[parameterName] : null;
    }
}