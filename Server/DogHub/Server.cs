using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

/// <summary>
/// Сервер прослушивает порт 5055 на подключения и выводит эхо в консоль
/// </summary>
class Server
{
    private const int Port = 5055;
    
    public DataBaseModel dbModel { get; set; }
    public SQLCommandManager sqlCM { get; set; }
    
    /// <summary>
    /// Открывает сервер и запускает бесконечный цикл по прослушиванию порта
    /// </summary>
    public Server(DataBaseModel dbModel, SQLCommandManager sqlCM)
    {
        this.dbModel = dbModel;
        this.sqlCM = sqlCM;

        TcpListener? listener = null;
        try
        {
            listener = new TcpListener(IPAddress.Any, Port);
            listener.Start();
            Console.WriteLine($"Эхо-сервер запущен на порту {Port}...");
            
            while (true)
            {
                TcpClient client = listener.AcceptTcpClient();
                Console.WriteLine($"Подключен клиент: {client.Client.RemoteEndPoint}");
                
                Thread clientThread = new Thread(() => HandleClient(client));
                clientThread.Start();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка: {ex.Message}");
        }
        finally
        {
            listener?.Stop();
        }
    }
    
    /// <summary>
    /// Метод обработки подключений клиентов
    /// </summary>
    /// <param name="obj">Параметр для передачи данных в поток</param>
    private void HandleClient(object obj)
    {
        TcpClient client = (TcpClient)obj;
        NetworkStream? stream = null;
        
        // TODO::Выделить блок обработки клиента в отдельный класс
        // TODO::Зациклить подключение пока клиент не разорвет его или
        // не ответит на ping-pong запрос по таймауту
        try
        {
            stream = client.GetStream();
            byte[] buffer = new byte[1024];
            int bytesRead;

            // Читаем весь запрос
            StringBuilder requestBuilder = new StringBuilder();
            while ((bytesRead = stream.Read(buffer, 0, buffer.Length)) > 0)
            {
                string chunk = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                requestBuilder.Append(chunk);
                
                // Проверяем, закончился ли запрос (пустая строка после заголовков)
                if (chunk.Contains("\r\n\r\n"))
                {
                    break;
                }
            }

            string httpRequest = requestBuilder.ToString();
            Console.WriteLine($"Получен запрос: {httpRequest}");
            
            // Парсим запрос
            string requestedData = HttpRequestParser.GetParameter(httpRequest, "data");
            string response;
            if (!string.IsNullOrEmpty(requestedData))
            {
                response = $"Запрошены данные: {requestedData}\r\n";
                response += dbModel.ExecuteSQL(sqlCM.GetCommand(requestedData));
            }
            else
            {
                response = "Параметр 'data' не указан в запросе\r\n";
            }

            // Формируем HTTP ответ
            string httpResponse = $"HTTP/1.1 200 OK\r\n" +
                                $"Content-Type: text/plain; charset=utf-8\r\n" +
                                $"Content-Length: {Encoding.UTF8.GetByteCount(response)}\r\n" +
                                $"Connection: close\r\n" +
                                $"\r\n" +
                                $"{response}\r\n\r\n";
            
            byte[] responseBytes = Encoding.UTF8.GetBytes(httpResponse);
            stream.Write(responseBytes, 0, responseBytes.Length);

        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка при работе с клиентом: {ex.Message}");
        }
        finally
        {
            if (client != null)
            {
                Console.WriteLine($"Клиент {client.Client.RemoteEndPoint} отключен.");
                client.Close();
            }
            stream?.Close();
        }
    }
}