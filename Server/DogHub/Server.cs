using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

/// <summary>
/// HTTP-сервер DogHub.
/// Передает подключения на обработку ClientHandler
/// </summary>
class Server
{
    private const int Port = 5055;
    private static int clientId = 0;
    private Dictionary<int, ClientHandler> client = new Dictionary<int, ClientHandler>();

    public DataBaseModel dbModel { get; set; }
    public SQLCommandManager sqlCM { get; set; }


    public Server(DataBaseModel dbModel, SQLCommandManager sqlCM)
    {
        this.dbModel = dbModel;
        this.sqlCM = sqlCM;

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
                TcpClient tcpClient = listener.AcceptTcpClient();
                Console.WriteLine($"Подключен клиент: {tcpClient.Client.RemoteEndPoint}");

                // сохраняем пару уникальный id клиента и ссылку на обрабатывающий подключение объект
                clientId++;
                client.Add(clientId, new ClientHandler(dbModel, sqlCM));

                // Для каждого клиента запускаем отдельный поток обработки.
                Thread clientThread = new Thread(client[clientId].Handle);
                clientThread.Start(tcpClient);
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
}