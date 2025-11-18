using System.IO;
using System.Text.Json;

/// <summary>
/// Читает sql команды из файла и отдает их по запросу 
/// </summary>
class SQLCommandManager
{
    private JsonElement jsonData;
    
    // TODO::РЕАЛИЗОВАТЬ 6-ой запрос, он требует дополнительных данных для запроса

    /// <summary>
    /// Инициализирует менеджера комманд по json файлу с набором комманд
    /// </summary>
    /// <param name="filename">путь к json файлу с набором sql команд</param>
    /// <remarks>
    /// TODO::Если json указан неверно или не может быть обработан, тогда нужна логика как это будет разрешаться
    /// </remarks>
    public SQLCommandManager(string filename)
    {
        try
        {
            string fileContent = File.ReadAllText(filename);
            JsonDocument doc = JsonDocument.Parse(fileContent);
            jsonData = doc.RootElement;
        }
        catch (IOException ex)
        {
            Console.WriteLine($"SQLCommandManager can't handle json: ${ex.Message}");
            throw; // Передаем исключение на уровень выше
        }
    }

    public string GetCommand(string commandName)
    {
        try
        {
            return jsonData.GetProperty(commandName).GetString() ?? string.Empty;
        }
        catch (Exception)
        {
            return string.Empty;
        }
    }
}