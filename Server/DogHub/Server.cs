using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

class Server
{
    private const int Port = 5055;
    
    public Server()
    {
        TcpListener listener = null;
        try
        {
            listener = new TcpListener(IPAddress.Any, Port);
            listener.Start();
            Console.WriteLine($"Эхо-сервер запущен на порту {Port}...");
            
            while (true)
            {
                TcpClient client = listener.AcceptTcpClient();
                Console.WriteLine($"Подключен клиент: {client.Client.RemoteEndPoint}");
                
                // Запускаем обработку клиента в отдельном потоке
                Thread clientThread = new Thread(HandleClient);
                clientThread.Start(client);
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
    
    private void HandleClient(object obj)
    {
        TcpClient client = (TcpClient)obj;
        NetworkStream stream = null;
        
        try
        {
            stream = client.GetStream();
            byte[] buffer = new byte[1024];
            int bytesRead;
            
            while ((bytesRead = stream.Read(buffer, 0, buffer.Length)) > 0)
            {
                // Отправляем полученные данные обратно клиенту
                stream.Write(buffer, 0, bytesRead);
                string data = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                Console.WriteLine($"Получено от {client.Client.RemoteEndPoint}: {data}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка при работе с клиентом {client.Client.RemoteEndPoint}: {ex.Message}");
        }
        finally
        {
            stream?.Close();
            client?.Close();
            Console.WriteLine($"Клиент {client.Client.RemoteEndPoint} отключен.");
        }
    }
}