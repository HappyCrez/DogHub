using System;
using System.Text;

/// <summary>
/// Обрабатывает delete http запрос
/// </summary>
public class HttpResponse
{
    // Объект будет создан при попытке его получения
    // (ленивая инициализация)
    private static readonly Lazy<HttpResponse> instance = 
        new Lazy<HttpResponse>(() => new HttpResponse());
    
    // Виды ошибок сервера
    public static string InvalidRequest =
        instance.Value.Create(400,
            "Bad Request",
            "text/plain",
            "Invalid request");
    public static string InternalError = 
        instance.Value.Create(500,
            "Internal Server Error",
            "text/plain",
            "Server error");
 
    /// <summary>
    /// Ограничиваем доступ к конструктору класса
    /// </summary>
    private HttpResponse() 
    { }

    /// <summary>
    /// Возвращает объект класса
    /// </summary>
    public static HttpResponse Instance 
    {
        get { return instance.Value; }
    }

    /// <summary>
    /// Формирует и отправляет HTTP-ответ
    /// </summary>
    /// <param name="stream">Открытое TCP соединение</param>
    /// <param name="statusCode">Код обработки</param>
    /// <param name="reasonPhrase">Сообщение</param>
    /// <param name="contentType">Вид контента (строка, json, и тд)</param>
    /// <param name="body">Полезная нагрузка</param>
    /// <returns>Возвращает созданный ответ</returns>
    public string Create(int statusCode, string reasonPhrase, string contentType, string body)
    {
        byte[] bodyBytes = Encoding.UTF8.GetBytes(body);

        StringBuilder response = new StringBuilder();
        response.Append($"HTTP/1.1 {statusCode} {reasonPhrase}\r\n");
        response.Append($"Date: {DateTime.UtcNow.ToString("R")}\r\n");
        response.Append($"Content-Type: {contentType}; charset=utf-8\r\n"); // добавить ;
        response.Append($"Content-Length: {bodyBytes.Length}\r\n");
        response.Append("Connection: close\r\n");
        response.Append("Access-Control-Allow-Origin: *\r\n");
        response.Append("\r\n"); // разделитель заголовков и тела
        response.Append(body);
        return response.ToString();
    }
}