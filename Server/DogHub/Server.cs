using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

/// <summary>
/// HTTP-сервер DogHub.
/// Слушает порт 5055 и отдаёт JSON-API для фронтенда.
/// Старый текстовый API через параметр ?data=... удалён.
/// </summary>
class Server
{
    private const int Port = 5055;

    public DataBaseModel dbModel { get; set; }
    public SQLCommandManager sqlCM { get; set; }

    public Server(DataBaseModel dbModel, SQLCommandManager sqlCM)
    {
        this.dbModel = dbModel ?? throw new ArgumentNullException(nameof(dbModel));
        this.sqlCM = sqlCM ?? throw new ArgumentNullException(nameof(sqlCM));

        TcpListener? listener = null;
        try
        {
            listener = new TcpListener(IPAddress.Any, Port);
            listener.Start();
            Console.WriteLine($"HTTP сервер запущен на http://localhost:{Port}/api");

            // Бесконечный цикл ожидания клиентов.
            // Приложение будет жить, пока работает этот цикл.
            while (true)
            {
                TcpClient client = listener.AcceptTcpClient();
                Console.WriteLine($"Подключен клиент: {client.Client.RemoteEndPoint}");

                // Для каждого клиента запускаем отдельный поток обработки.
                Thread clientThread = new Thread(HandleClient);
                clientThread.Start(client);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка сервера: {ex.Message}");
        }
        finally
        {
            listener?.Stop();
        }
    }

    /// <summary>
    /// Обработка одного клиента: читаем HTTP-запрос и отправляем ответ.
    /// </summary>
    /// <param name="state">TcpClient</param>
    private void HandleClient(object? state)
    {
        TcpClient? client = state as TcpClient;
        if (client == null)
            return;

        NetworkStream? stream = null;

        try
        {
            stream = client.GetStream();

            // Читаем HTTP-запрос целиком (простая реализация для GET).
            byte[] buffer = new byte[8192];
            int bytesRead;
            StringBuilder requestBuilder = new StringBuilder();

            // Читаем до конца заголовков (пока не встретили \r\n\r\n)
            while ((bytesRead = stream.Read(buffer, 0, buffer.Length)) > 0)
            {
                string chunk = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                requestBuilder.Append(chunk);

                if (chunk.Contains("\r\n\r\n"))
                {
                    break;
                }

                if (!stream.DataAvailable)
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

            Console.WriteLine("===== HTTP REQUEST =====");
            Console.WriteLine(requestText);
            Console.WriteLine("========================");

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
            string rawUrl = requestLineParts[1];

            if (!string.Equals(method, "GET", StringComparison.OrdinalIgnoreCase))
            {
                WriteResponse(stream, 405, "Method Not Allowed", "text/plain; charset=utf-8", "Only GET is supported");
                return;
            }

            // Работаем только с путями, без старого параметра data
            Uri uri = new Uri("http://localhost" + rawUrl);
            string path = uri.AbsolutePath;

            string body;
            string contentType = "application/json; charset=utf-8";

            // Роутинг API
            if (path == "/")
            {
                // Простой ping-эндпоинт
                contentType = "text/plain; charset=utf-8";
                body = "DogHub API is running. Use /api/users, /api/events, /api/programs, /api/people-trainings, /api/chipped-dogs";
            }
            else if (path == "/api/users")
            {
                body = dbModel.ExecuteSelectToJson(sqlCM.GetCommand(SQLCommandManager.GetUsers));
            }
            else if (path == "/api/events")
            {
                body = dbModel.ExecuteSelectToJson(sqlCM.GetCommand(SQLCommandManager.GetEvents));
            }
            else if (path == "/api/programs")
            {
                body = dbModel.ExecuteSelectToJson(sqlCM.GetCommand(SQLCommandManager.GetPrograms));
            }
            else if (path == "/api/people-trainings")
            {
                body = dbModel.ExecuteSelectToJson(sqlCM.GetCommand(SQLCommandManager.GetPeopleEvents));
            }
            else if (path == "/api/chipped-dogs")
            {
                body = dbModel.ExecuteSelectToJson(sqlCM.GetCommand(SQLCommandManager.GetChiped));
            }
            else
            {
                WriteResponse(stream, 404, "Not Found", "text/plain; charset=utf-8", "Endpoint not found");
                return;
            }

            WriteResponse(stream, 200, "OK", contentType, body);
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

    /// <summary>
    /// Формирует и отправляет HTTP-ответ.
    /// </summary>
    private void WriteResponse(NetworkStream stream, int statusCode, string reasonPhrase, string contentType, string body)
    {
        if (body == null) body = string.Empty;

        byte[] bodyBytes = Encoding.UTF8.GetBytes(body);

        StringBuilder headers = new StringBuilder();
        headers.AppendLine($"HTTP/1.1 {statusCode} {reasonPhrase}");
        headers.AppendLine("Date: " + DateTime.UtcNow.ToString("R"));
        headers.AppendLine("Content-Type: " + contentType);
        headers.AppendLine("Content-Length: " + bodyBytes.Length);
        headers.AppendLine("Connection: close");
        headers.AppendLine("Access-Control-Allow-Origin: *"); // CORS для фронта
        headers.AppendLine();

        byte[] headerBytes = Encoding.ASCII.GetBytes(headers.ToString());

        stream.Write(headerBytes, 0, headerBytes.Length);
        stream.Write(bodyBytes, 0, bodyBytes.Length);
    }
}