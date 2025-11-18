using System.IO;
using System.Text.Json;

/// <summary>
/// Читает sql команды из файла и отдает их по запросу 
/// </summary>
class SQLCommandManager
{
    private JsonElement jsonData;
    
    /// <summary>
    /// Инициализирует менеджера комманд по json файлу с набором комманд
    /// </summary>
    /// <param name="filename">путь к json файлу с набором sql команд</param>
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
    
    /// <summary>
    /// Ищет в json файле маппинг по соответствующему имени команды
    /// </summary>
    /// <param name="commandName">Имя команды в файле json</param>
    /// <returns>
    /// Возвращает строку соответствующего sql запроса,
    /// если такой запрос не был мапирован, то возвращает пустую строку
    /// </returns>
    public string GetCommand(string commandName)
    {
        if (jsonData.TryGetProperty(commandName, out JsonElement property))
        {
            return property.GetString() ?? string.Empty;
        }
        return string.Empty;
    }
}