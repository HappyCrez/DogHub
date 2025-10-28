using System.IO;
using System.Text.Json;

/// <summary>
/// Читает sql команды из файла и отдает их по запросу 
/// </summary>
class SQLCommandManager
{
    private JsonElement jsonData;

    public static readonly string GetUsers = "get_users";
    public static readonly string GetApplications = "get_applications";

    /// <summary>
    /// Инициализирует менеджера комманд по json файлу с набором комманд
    /// </summary>
    /// <param name="filename">путь к json файлу с набором sql команд</param>
    /// <remarks>
    /// TODO::Если json указан неверно или не может быть обработан, тогда нужна логика как это будет разрешаться
    /// + изначально проверить что все комманды записанные в публичных полях доступны, иначе может быть ситуация
    /// когда сервер будет крашиться в runtime
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
        return jsonData.GetProperty(commandName).GetString() ?? string.Empty;
    }
}