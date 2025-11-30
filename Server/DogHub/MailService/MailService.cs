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
    private bool MailDebug = true; // TODO::REMOVE

    private readonly string hostName;
    private readonly string hostPassword;
    private readonly int port = 587;
    private readonly int timeout;
    
    private readonly string notificationSubject = "DogHub Notification";
    private string notificationBody; // Формат уведомления

    private DataBaseModel database { get; set; }

    // Для форматирования даты
    private System.Globalization.CultureInfo rus = new System.Globalization.CultureInfo("ru-RU");

    /// <summary>
    /// Проверяет состояние БД в заданное время и отправляет уведомление
    /// </summary>
    private void Cron()
    {
        while (true)
        {
            Thread.Sleep(timeout * 1000);
            string records = database.ExecuteSQL(SQLCommandManager.Instance.GetCommand("notifications"));
            foreach (JsonElement client in JsonDocument.Parse(records).RootElement.EnumerateArray())
            {
                string name = "Клиент";
                string email = string.Empty;
                if (client.TryGetProperty("fullName", out JsonElement nameElement))
                {
                    name = nameElement.GetString() ?? "Клиент";
                }
                if (client.TryGetProperty("email", out JsonElement emailElement))
                {
                    email = emailElement.GetString() ?? string.Empty;
                }
                
                if (email == string.Empty) // Если почта не указана пропускаем клиента
                {
                    continue;
                }

                //TODO::В РЕЛИЗ ДОБАВИТЬ ПАРАМЕТРЫ СУММЫ И ДАТА ПОСЛЕДНЕГО ПЛАТЕЖА ДЛЯ ЭТОГО НУЖНО ПОМЕНЯТЬ ЗАПРОС "notifications"
                string today = DateTime.Now.ToString("dd MMMM yyyy", rus);
                SendEmail(email, notificationSubject, TextFormatter.ModifyStr(notificationBody,[name, today]));
            }
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
        if (MailDebug) // В режиме debug все сообщения отправляются hostEmail
        {
            toEmail = hostName;
        }
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
        this.notificationBody = File.ReadAllText(AppConfig.Instance().MailFilePath);

        // БД для исполнения запросов
        this.database = database;

        // Отделяем проверку состояния БД в отдельный поток
        Thread cronThread = new Thread(Cron);
        cronThread.Start();
    }
}