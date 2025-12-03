using System;
using System.Net;
using System.Net.Mail;
using System.Text.Json;
using DogHub;

/// <summary>
/// Сервис для отправки уведомлений по gmail
/// </summary>
public class MailService
{
    private readonly string hostName;
    private readonly string hostPassword;
    private readonly int port = 587;
    private readonly int timeout;
    private DateTime lastNotification;
    
    // Формат уведомления писем
    private string notification;
    private string payment;
    private string welcome;

    // Флаг управления потоком
    private bool mailServiceRunning;

    private DataBaseModel database { get; set; }

    // Для форматирования даты
    private System.Globalization.CultureInfo rus = new System.Globalization.CultureInfo("ru-RU");

    /// <summary>
    /// Проверяет состояние БД в заданное время и отправляет уведомление
    /// </summary>
    private void Cron()
    {
        while (mailServiceRunning)
        {
            Thread.Sleep(100);
            if ((DateTime.Now-lastNotification).TotalSeconds >= timeout)
            {
                // Notificate(); // Нуждается в доработке
                lastNotification = DateTime.Now;
            }
        }
    }

    private void Notificate()
    {
        string records = database.ExecuteSQL(SQLCommandManager.Instance.GetCommand("notifications"));
        foreach (JsonElement client in JsonDocument.Parse(records).RootElement.EnumerateArray())
        {
            string userName = "Клиент";
            string email = string.Empty;
            if (client.TryGetProperty("fullName", out JsonElement nameElement))
            {
                userName = nameElement.GetString() ?? "Клиент";
            }
            if (client.TryGetProperty("email", out JsonElement emailElement))
            {
                email = emailElement.GetString() ?? string.Empty;
            }
            
            if (email == string.Empty) // Если почта не указана пропускаем клиента
            {
                continue;
            }
            int clientId = -1;
            if (client.TryGetProperty("id", out JsonElement idElement))
            {
                clientId = int.Parse(idElement.GetString() ?? "-1");
                if (clientId == -1)
                {   // Неверный идентификатор
                    continue;
                }
            }

            // НЕЗАКОНЧЕННО
            // Необходимо чтобы здесь мы получали все платежи клиента и искали среди них последний платеж за подписку
            // А затем сравнивали дату последнего платежа с текущей  
            string clientPayments = database.ExecuteSQL(SQLCommandManager.Instance.GetCommand(""));

            string today = DateTime.Now.ToString("dd MMMM yyyy", rus);
            SendEmail(email, "Ваша подписка на DogHub скоро закончится!", TextFormatter.ModifyStr(notification,[userName, today]));
        }
    }

    /// <summary>
    /// Отправка email через Gmail SMTP
    /// </summary>
    /// <param name="toEmail">Адрес кому отправить сообщение</param>
    /// <param name="subject">Тема сообщения</param>
    /// <param name="body">Текст сообщения в формате html</param>
    private void SendEmail(string toEmail, string subject, string body)
    {
        if (AppConfig.Instance().LogLevel <= AppConfig.LogLevels.DEBUG)
        {
            Console.WriteLine($"Отправляем сообщение {toEmail}");
        }
        try
        {
            var fromAddress = new MailAddress(hostName, "DogHub Company");
            var toAddress = new MailAddress(toEmail);
            
            var smtp = new SmtpClient
            {
                Host = "smtp.gmail.com",
                Port = this.port,
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(hostName, hostPassword),
                Timeout = 10000 // 10 секунд
            };
            
            // Создание сообщения
            using (var message = new MailMessage(fromAddress, toAddress)
            {
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            })
            {
                smtp.Send(message);
            }
        }
        catch (SmtpException smtpEx)
        {
            if (AppConfig.Instance().LogLevel <= AppConfig.LogLevels.DEBUG)
            {
                Console.WriteLine($"SMTP ошибка: {smtpEx.StatusCode} - {smtpEx.Message}");
            }
        }
        catch (Exception ex)
        {
            if (AppConfig.Instance().LogLevel <= AppConfig.LogLevels.DEBUG)
            {
                Console.WriteLine($"Ошибка отправки: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Останавливает работу сервиса путем смены состояния переменной
    /// </summary>
    public void MailServiceStop()
    {
        mailServiceRunning = false;
    }

    /// <summary>
    /// Принимает id платежа и формирует сообщение для отправки уведомления клиенту
    /// Выбрасывает исключение если совершить операцию не удалось
    /// </summary>
    /// <param name="paymentId">id платежа в БД</param>
    public void PaymentNotification(int paymentId)
    {
        // Получаем данные платежа
        var paymentParams = new Dictionary<string, object?> { ["id"] = paymentId };
        string paymentData = database.ExecuteSQL(SQLCommandManager.Instance.GetCommand("payment"), paymentParams);

        JsonElement info = JsonDocument.Parse(paymentData).RootElement[0];
        string email = string.Empty;
        if (info.TryGetProperty("ownerEmail", out JsonElement emailElement))
        {
            email = emailElement.GetString() ??
                throw new InvalidOperationException("Invalid response from server");
        }
        string userName = string.Empty;
        if (info.TryGetProperty("ownerName", out JsonElement nameElement))
        {
            userName = nameElement.GetString() ?? "Уважаемый пользователь";
        }
        double sum = 0;
        if (info.TryGetProperty("price", out JsonElement sumElement))
        {
            sum = sumElement.GetDouble();
        }
        string today = DateTime.Now.ToString("dd MMMM yyyy", rus);
        SendEmail(email, "Информация о платеже", TextFormatter.ModifyStr(payment,[userName, today, sum.ToString()]));
    }

    /// <summary>
    /// Принимает id нового участника и отправляет ему приветственное сообщение
    /// </summary>
    /// <param name="memberId">id пользователя в БД</param>
    public void WelcomeNotification(int memberId)
    {
        // Получаем данные платежа
        var memberParams = new Dictionary<string, object?> { ["id"] = memberId };
        string memberData = database.ExecuteSQL(SQLCommandManager.Instance.GetCommand("member"), memberParams);

        JsonElement info = JsonDocument.Parse(memberData).RootElement[0];
        string email = string.Empty;
        if (info.TryGetProperty("email", out JsonElement emailElement))
        {
            email = emailElement.GetString() ??
                throw new InvalidOperationException("Invalid response from server");
        }
        string userName = string.Empty;
        if (info.TryGetProperty("full_name", out JsonElement nameElement))
        {
            userName = nameElement.GetString() ?? "Уважаемый пользователь";
        }
        SendEmail(email, "Добро пожаловать", TextFormatter.ModifyStr(welcome,[userName, userName]));
    }

    /// <summary>
    /// Конфигурирует почтовый сервис
    /// </summary>
    /// <param name="database">
    /// Модель базы данных для подключение к физической БД
    /// </param>
    public MailService(DataBaseModel database)
    {
        this.hostName = AppConfig.Instance().MailHost;
        this.hostPassword = AppConfig.Instance().MailPassword;
        this.timeout = int.Parse(AppConfig.Instance().MailTimeout);

        // Читаем формат уведомления подготовленный в файле
        notification = File.ReadAllText($"{AppConfig.Instance().MailFilePath}/MailNotification.html");
        payment = File.ReadAllText($"{AppConfig.Instance().MailFilePath}/MailPayment.html");
        welcome = File.ReadAllText($"{AppConfig.Instance().MailFilePath}/MailWelcome.html");

        // БД для исполнения запросов
        this.database = database;

        // Отделяем проверку состояния БД в отдельный поток
        mailServiceRunning = true; // Флаг завершения работы потока
        lastNotification = DateTime.Now;
        Thread cronThread = new Thread(Cron);
        cronThread.Start();
    }
}