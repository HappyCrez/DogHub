using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

/// <summary>
/// Простой HTTP-сервер для DogHub.
/// Слушает порт 5055 и отдаёт JSON-API для фронтенда.
/// </summary>
class Server
{
    private const int Port = 5055;

    public DataBaseModel dbModel { get; set; }
    public SQLCommandManager sqlCM { get; set; }

    private readonly TcpListener listener;
    private bool isRunning;

    public Server(DataBaseModel dbModel, SQLCommandManager sqlCM)
    {
        if (dbModel == null) throw new ArgumentNullException("dbModel");
        if (sqlCM == null) throw new ArgumentNullException("sqlCM");

        this.dbModel = dbModel;
        this.sqlCM = sqlCM;

        listener = new TcpListener(IPAddress.Any, Port);
        listener.Start();
        isRunning = true;

        Console.WriteLine("HTTP сервер запущен на http://localhost:" + Port + "/api");

        // Запускаем отдельный поток, который принимает подключения
        Thread thread = new Thread(ListenLoop);
        thread.IsBackground = true;
        thread.Start();
    }

    /// <summary>
    /// Основной цикл ожидания клиентов.
    /// </summary>
    private void ListenLoop()
    {
        try
        {
            while (isRunning)
            {
                TcpClient client = listener.AcceptTcpClient();
                Console.WriteLine("Клиент подключен: " + client.Client.RemoteEndPoint);

                // Обработку клиента отдаём в пул потоков
                ThreadPool.QueueUserWorkItem(HandleClient, client);
            }
        }
        catch (SocketException ex)
        {
            Console.WriteLine("Ошибка сокета: " + ex.Message);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Ошибка сервера: " + ex.Message);
        }
        finally
        {
            listener.Stop();
        }
    }

    /// <summary>
    /// Обработка одного клиента: читаем HTTP-запрос и отправляем ответ.
    /// </summary>
    private void HandleClient(object state)
    {
        TcpClient client = state as TcpClient;
        if (client == null)
        {
            return;
        }

        NetworkStream stream = null;

        try
        {
            stream = client.GetStream();

            // Чтение HTTP-запроса
            byte[] buffer = new byte[8192];
            int bytesRead;
            StringBuilder requestBuilder = new StringBuilder();

            do
            {
                bytesRead = stream.Read(buffer, 0, buffer.Length);
                if (bytesRead <= 0) break;

                requestBuilder.Append(Encoding.UTF8.GetString(buffer, 0, bytesRead));
            }
            while (stream.DataAvailable);

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

            // Парсим путь
            Uri uri = new Uri("http://localhost" + rawUrl);
            string path = uri.AbsolutePath;

            string body;
            string contentType = "application/json; charset=utf-8";

            // Роутинг API
            if (path == "/")
            {
                // Простейший ping-эндпоинт
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
            Console.WriteLine("Ошибка при работе с клиентом: " + ex.Message);
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
                Console.WriteLine("Клиент " + client.Client.RemoteEndPoint + " отключен.");
                if (stream != null)
                {
                    stream.Close();
                }
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
        headers.AppendLine("HTTP/1.1 " + statusCode + " " + reasonPhrase);
        headers.AppendLine("Date: " + DateTime.UtcNow.ToString("R"));
        headers.AppendLine("Content-Type: " + contentType);
        headers.AppendLine("Content-Length: " + bodyBytes.Length);
        headers.AppendLine("Connection: close");
        headers.AppendLine("Access-Control-Allow-Origin: *");
        headers.AppendLine();

        byte[] headerBytes = Encoding.ASCII.GetBytes(headers.ToString());

        stream.Write(headerBytes, 0, headerBytes.Length);
        stream.Write(bodyBytes, 0, bodyBytes.Length);
    }
}