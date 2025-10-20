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
    private const int PORT = 5055;
    
    /// <summary>
    /// Открывает сервер и запускает бесконечный цикл по прослушиванию порта
    /// </summary>
    public Server()
    {
        TcpListener? listener = null;
        try
        {
            listener = new TcpListener(IPAddress.Any, PORT);
            listener.Start();
            Console.WriteLine($"Эхо-сервер запущен на порту {PORT}...");
            
            while (true)
            {
                TcpClient client = listener.AcceptTcpClient();
                Console.WriteLine($"Подключен клиент: {client.Client.RemoteEndPoint}");
                
                Thread client_thread = new Thread(() => HandleClient(client));
                client_thread.Start(client);
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
        
        try
        {
            stream = client.GetStream();
            byte[] buffer = new byte[1024];
            int bytes_read;
            
            while ((bytes_read = stream.Read(buffer, 0, buffer.Length)) > 0)
            {
                // Simple Echo
                stream.Write(buffer, 0, bytes_read);
                string data = Encoding.UTF8.GetString(buffer, 0, bytes_read);
                Console.WriteLine($"Получено от {client.Client.RemoteEndPoint}: {data}");
            }
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