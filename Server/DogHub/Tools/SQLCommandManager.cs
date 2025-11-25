using System.IO;
using System.Text.Json;

/// <summary>
/// Читает sql команды из файла и отдает их по запросу 
/// </summary>
class SQLCommandManager
{
    // Путь к файлу с командами выборки данных
    private const string pathToSQLCommands = "./Assets/SQLCommands.json";
    
    // Загруженный json
    private JsonElement jsonData;

    private static readonly Lazy<SQLCommandManager> instance = 
        new Lazy<SQLCommandManager>(() => new SQLCommandManager(pathToSQLCommands));
    
    /// <summary>
    /// Инициализирует менеджера комманд по json файлу с набором комманд
    /// </summary>
    /// <param name="filename">путь к json файлу с набором sql команд</param>
    private SQLCommandManager(string filename)
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
    /// Возвращает объект класса
    /// </summary>
    public static SQLCommandManager Instance 
    {
        get { return instance.Value; }
    }
    
    /// <summary>
    /// Ищет в json файле маппинг по соответствующему имени команды
    /// </summary>
    /// <param name="commandName">Имя команды в файле json</param>
    /// <returns>
    /// Возвращает строку соответствующего sql запроса,
    /// если такой запрос не был мапирован, то возвращает пустую строку
    /// </returns>
    public string GetCommand(string commandName, params string[] sqlParams)
    {
        string sqlCommand = string.Empty;
        if (jsonData.TryGetProperty(commandName, out JsonElement property))
        {
            sqlCommand = property.GetString() ?? string.Empty;
        }
        return TextFormatter.ModifyStr(sqlCommand, sqlParams);
    }
}