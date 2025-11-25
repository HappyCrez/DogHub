using System;
using System.Net;
using System.Net.Mail;

/// <summary>
/// Используется для отправки уведомлений по e-mail
/// </summary>
public class MailService
{
    private readonly string userName;
    private readonly string password;
    private readonly int port = 587;

    private readonly int timeout;
    private DateTime lastNotificationTime;

    // Путь к файлу содержащему уведомляющее сообщение
    // В первой строке тема сообщения, дальше содержание
    private readonly string mailFilePath;
    
    
    private readonly string notificationSubject = "DogHub Notification";
    private string notificationBody = "Message"; // Заготовка сообщения в файле mailFilePath

    private string[] GetRecords()
    {
        return [];
    }

    /// <summary>
    /// Проверяет состояние БД в заданное время и отправляет уведомление
    /// </summary>
    private void Cron()
    {
        while (true)
        {
            Thread.Sleep(timeout * 1000);
            string[] records = GetRecords();
            string client = userName;
            SendEmail(client, notificationSubject, notificationBody);
            lastNotificationTime = DateTime.Now;
        }
    }

    /// <summary>
    /// Отправка email через Gmail SMTP
    /// </summary>
    private void SendEmail(string toEmail, string subject, string body)
    {
        try
        {
            var fromAddress = new MailAddress(userName, "DogHub Company");
            var toAddress = new MailAddress(toEmail);
            
            var smtp = new SmtpClient
            {
                Host = "smtp.gmail.com",
                Port = this.port,
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(userName, password),
                Timeout = 15000 // 15 секунд
            };
            
            // Создание сообщения
            using (var message = new MailMessage(fromAddress, toAddress)
            {
                Subject = subject,
                Body = body,
                IsBodyHtml = false
            })
            {
                smtp.Send(message);
            }
            Console.WriteLine($"Письмо отправлено на адрес '{toEmail}'");
        }
        catch (SmtpException smtpEx)
        {
            Console.WriteLine($"SMTP ошибка: {smtpEx.StatusCode} - {smtpEx.Message}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка отправки: {ex.Message}");
        }
    }

    public MailService(string[] configuration)
    {
        userName = configuration[0];
        password = configuration[1];
        mailFilePath = configuration[2];
        int.TryParse(configuration[3], out this.timeout);

        lastNotificationTime = DateTime.Now;

        // Формируем заготовку для сообщения
        // string notificationBody = File.ReadAllText(filename);

        // Отделяем проверку состояния БД в отдельный поток
        Thread cronThread = new Thread(Cron);
        cronThread.Start();
    }
}