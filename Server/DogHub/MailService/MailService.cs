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
    private readonly bool DEBUG = true; //TODO::REMOVE

    private readonly string userName;
    private readonly string password;
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
            bool isFirstSend = true; //TODO::REMOVE
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

                if (DEBUG) //TODO::REMOVE
                {
                    Console.WriteLine($"Получатель {name}, {email}");
                    email = userName; // При отладке отправляем все сообщения себе
                    if (isFirstSend == false) // Если не первая отправка то продолжаем цикл -> не спамим себе в почту
                    {
                        continue;
                    }
                    isFirstSend = false;
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
            Console.WriteLine($"SMTP ошибка: {smtpEx.StatusCode} - {smtpEx.Message}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка отправки: {ex.Message}");
        }
    }

    /// <summary>
    /// Конфигурирует почтовый сервис
    /// </summary>
    /// <param name="configuration">
    /// Массив конфигурации должен содержать поля в строго указанном порядке:
    /// 1. Почтовый адрес отправителя
    /// 2. Пароль от приложения почтового адреса (не от самой почты)
    /// 3. Путь к файлу в котором хранится сообщение для отправки
    /// 4. Время ожидания между чтениями базы данных
    /// </param>
    /// <param name="database">
    /// Модель базы данных для подключение к физической БД
    /// </param>
    public MailService(string[] configuration, DataBaseModel database)
    {
        userName = configuration[0];
        password = configuration[1];

        // Читаем формат уведомления подготовленный в файле
        notificationBody = File.ReadAllText(configuration[2]);

        // Выставляем время ожидания между отправками
        int.TryParse(configuration[3], out this.timeout);

        this.database = database;

        // Отделяем проверку состояния БД в отдельный поток
        Thread cronThread = new Thread(Cron);
        cronThread.Start();
    }
}