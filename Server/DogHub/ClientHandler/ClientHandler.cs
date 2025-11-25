using System;
using System.Net;
using System.Text;
using System.Net.Sockets;
using System.Threading;

/// <summary>
/// Обработчик подключений клиентов
/// </summary>
class ClientHandler
{
    private DataBaseModel dbModel { get; set; }

    private int id;
    private ICloseConnection server { get; set; }
    public TcpClient Connection { get; set; }

    /// <summary>
    /// Конструктор класса
    /// </summary>
    /// <param name="id">Идентификатор клиента</param>
    /// <param name="dbModel">Объект работы с БД</param>
    /// <param name="server">Сервер которому принадлежит клиент</param>
    /// <param name="connection">Открытое TCP соединение</param>
    public ClientHandler(ICloseConnection server, int id, TcpClient connection, DataBaseModel dbModel)
    {
        this.id = id;
        this.dbModel = dbModel;
        this.server = server;
        this.Connection = connection;
    }

    /// <summary>
    /// Пересылает данные клиенту
    /// </summary>
    /// <param name="responseData">Данные для отправки</param>
    private void WriteResponse(string responseData)
    {
        try // tcp соединение может закрыться в одностроннем порядке 
        {
            byte[] bytes = Encoding.ASCII.GetBytes(responseData);
            Connection.GetStream().Write(bytes, 0, bytes.Length);
        }
        catch { }
    }

    /// <summary>
    /// Обработка подключения
    /// </summary>
    private void HandleRequest()
    {
        NetworkStream stream = Connection.GetStream();

        // Проверяем, есть ли данные для чтения
        if (!stream.CanRead || !stream.DataAvailable)
        {
            return;
        }

        // Читаем HTTP-запрос целиком
        byte[] buffer = new byte[8192];
        int bytesRead;
        StringBuilder requestBuilder = new StringBuilder();

        // Читаем до конца заголовков (пока не встретили \r\n\r\n)
        while ((bytesRead = stream.Read(buffer, 0, buffer.Length)) > 0)
        {
            string chunk = Encoding.UTF8.GetString(buffer, 0, bytesRead);
            requestBuilder.Append(chunk);

            if (chunk.Contains("\r\n\r\n") || !stream.DataAvailable)
            {
                break;
            }
        }
        string requestText = requestBuilder.ToString();

        if (string.IsNullOrWhiteSpace(requestText))
        {
            WriteResponse(HttpResponse.InvalidRequest);
            return;
        }

        string[] lines = requestText.Split(new[] { "\r\n" }, StringSplitOptions.None);
        if (lines.Length == 0)
        {
            WriteResponse(HttpResponse.InvalidRequest);
            return;
        }

        try
        {
            string result = dbModel.ExecuteSQL(HttpHandler.Instance.HandleRequest(requestText));
            if (result != string.Empty)
            {
                WriteResponse(HttpResponse.Instance.Create(200, "OK", "application/json", result));
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка создания sql ответа: {ex.Message}");
        }
        finally
        {
            WriteResponse(HttpResponse.InvalidRequest);
        }
    }

    /// <summary>
    /// Обработка одного клиента: читаем HTTP-запрос и отправляем ответ
    /// </summary>
    /// <param name="state">
    /// Ссылка на TcpClient объект принадлежащий подключению
    /// </param>
    public void Handle()
    {
        try
        {
            // Подготовка к сессии на WebSocket
            HandleRequest();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка при работе с клиентом: {ex.Message}");
            try
            {
                WriteResponse(HttpResponse.InternalError);
            }
            catch
            {
                // игнорируем ошибки при отправке 500
            }
        }
        finally
        {
            // Закрываем подключение
            server.CloseConnection(id);
        }
    }
};