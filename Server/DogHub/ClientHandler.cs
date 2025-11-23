using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

class ClientHandler
{
    private DateTime lastAcivityTime;

    private DataBaseModel dbModel { get; set; }
    private SQLCommandManager sqlCM { get; set; }

    public ClientHandler(DataBaseModel dbModel, SQLCommandManager sqlCM)
    {
        this.dbModel = dbModel;
        this.sqlCM = sqlCM;
    }

    /// <summary>
    /// Формирует и отправляет HTTP-ответ.
    /// </summary>
    private void WriteResponse(NetworkStream stream, int statusCode, string reasonPhrase, string contentType, string body)
    {
        if (body == null)
        {
            body = string.Empty;
        }

        byte[] bodyBytes = Encoding.UTF8.GetBytes(body);

        StringBuilder headers = new StringBuilder();
        headers.AppendLine($"HTTP/1.1 {statusCode} {reasonPhrase}");
        headers.AppendLine("Date: " + DateTime.UtcNow.ToString("R"));
        headers.AppendLine("Content-Type: " + contentType);
        headers.AppendLine("Content-Length: " + bodyBytes.Length);
        headers.AppendLine("Connection: keep-alive");
        headers.AppendLine("Access-Control-Allow-Origin: *");
        headers.AppendLine();

        byte[] headerBytes = Encoding.ASCII.GetBytes(headers.ToString());

        stream.Write(headerBytes, 0, headerBytes.Length);
        stream.Write(bodyBytes, 0, bodyBytes.Length);
    }


    private void HandleRequest(NetworkStream stream)
    {
        try
        {
            // Проверяем, есть ли данные для чтения
            if (!stream.CanRead || !stream.DataAvailable)
            {
                return;
            }
            lastAcivityTime = DateTime.Now;

            // Читаем HTTP-запрос целиком (простая реализация для GET).
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
                WriteResponse(stream, 400, "Bad Request", "text/plain; charset=utf-8", "Empty request");
                return;
            }

            string[] lines = requestText.Split(new[] { "\r\n" }, StringSplitOptions.None);
            if (lines.Length == 0)
            {
                WriteResponse(stream, 400, "Bad Request", "text/plain; charset=utf-8", "Invalid request");
                return;
            }

            // Первая строка: METHOD PATH HTTP/1.1
            string[] requestLineParts = lines[0].Split(' ');
            if (requestLineParts.Length < 2)
            {
                WriteResponse(stream, 400, "Bad Request", "text/plain; charset=utf-8", "Cannot parse request line");
                return;
            }

            string method = requestLineParts[0];
            if (!string.Equals(method, "GET", StringComparison.OrdinalIgnoreCase))
            {
                WriteResponse(stream, 405, "Method Not Allowed", "text/plain; charset=utf-8", "Only GET is supported");
                return;
            }

            string[] uri = requestLineParts[1].Split('/').Skip(1).ToArray();
            if (uri.Length < 2)
            {
                WriteResponse(stream, 200, "OK",
                    "text/plain; charset=utf-8",
                    "DogHub API is running. Use /api/users, /api/events, /api/programs, /api/people-events, /api/dogs, /api/chiped");
            }
            else
            {
                string sqlCommand = sqlCM.GetCommand(uri[1]);
                if (sqlCommand == String.Empty)
                {
                    WriteResponse(stream, 404, "Not Found",
                        "text/plain; charset=utf-8",
                        "Endpoint not found");
                }
                else
                {
                    WriteResponse(stream, 200, "OK",
                        "application/json; charset=utf-8",
                        dbModel.ExecuteSQL(sqlCommand, uri[2..]));
                }
            }
        }
        catch
        {
            throw;
        }
    }

    /// <summary>
    /// Обработка одного клиента: читаем HTTP-запрос и отправляем ответ.
    /// </summary>
    /// <param name="state">TcpClient</param>
    public void Handle(object? state)
    {
        TcpClient? client = state as TcpClient;
        if (client == null)
        {
            return;
        }

        NetworkStream? stream = null;

        try
        {
            int inactivityTimeout = 300;   // 6 минут неактивности
            lastAcivityTime = DateTime.Now;
            
            client.ReceiveTimeout = 5000;  // 5 секунд на ожидание получения следующего пакета данных 
            client.SendTimeout = 5000;     // 5 секунд на подтверждение TCP отправки данных

            stream = client.GetStream();
            while (client.Connected)
            {
                if ((DateTime.Now - lastAcivityTime).TotalSeconds > inactivityTimeout)
                {
                    break;
                }

                HandleRequest(stream);
                if (!stream.DataAvailable)
                {
                    if (client.Client.Poll(1000, SelectMode.SelectRead) && client.Available == 0)
                    {
                        break;
                    }
                    Thread.Sleep(200);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка при работе с клиентом: {ex.Message}");
            if (stream != null)
            {
                try
                {
                    WriteResponse(stream, 500, "Internal Server Error", "text/plain; charset=utf-8", "Server error");
                }
                catch
                {
                    // игнорируем ошибки при отправке 500
                }
            }
        }
        finally
        {
            try
            {
                Console.WriteLine($"Клиент {client.Client.RemoteEndPoint} отключен.");
                stream?.Close();
                client.Close();
            }
            catch
            {
                // игнорируем
            }
        }
    }
};