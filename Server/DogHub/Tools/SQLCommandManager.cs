using System.IO;
using System.Text.Json;
using System.Text;

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
    /// Проходит по строке sql и ищет вхождение символа $$,
    /// заменяя его на следующий переданный параметр 
    /// </summary>
    /// <param name="sql">Строка sql запроса</param>
    /// <param name="sqlParams">Параметры для модификации sql запроса</param>
    /// <returns>Возвращает модифицированный sql запрос</returns>
    private string UpdateSQL(string sql, params string[] sqlParams)
    {
        if (sqlParams == null || sqlParams.Length == 0)
        {
            return sql;
        }

        var result = new StringBuilder();
        int paramIndex = 0;
        
        for (int i = 0; i < sql.Length; i++)
        {
            if (i < sql.Length - 1 && sql[i] == '$' && sql[i + 1] == '$')
            {
                if (paramIndex < sqlParams.Length)
                {
                    result.Append(sqlParams[paramIndex]);
                    paramIndex++;
                    i++; // Пропускаем следующий символ '$'
                }
                else
                {
                    // Если параметры закончились, оставляем "$$"
                    result.Append("$$");
                    i++; // Пропускаем следующий символ '$'
                }
            }
            else
            {
                result.Append(sql[i]);
            }
        }
        return result.ToString();
    }
    
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
        return UpdateSQL(sqlCommand, sqlParams);
    }
}