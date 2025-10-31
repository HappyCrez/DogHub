namespace DogHub;

public class Launch
{
    // Сечас конфиг задается в виде строки
    private const string connectionConfig = "Host=localhost;Port=5432;Username=postgres;Password=lock;Database=doghub_db";
    private const string pathToSQLCommands = "./Assets/SQLCommands.json";
    
    /// <summary>
    /// Точка входа в программу
    /// </summary>
    /// <param name="args">В качестве параметров принимает адрес файла конфигурации</param>
    static public void Main(string [] args)
    {
        // TODO::Чтение и парсинг файла конфигурации
        // Например для передачи порта открытия сервера, имени БД для подключения
        // логина и пароля пользователя БД и тд. 

        DataBaseModel dataBase = new DataBaseModel(connectionConfig);

        SQLCommandManager manager = new SQLCommandManager(pathToSQLCommands);
        Console.WriteLine(dataBase.ExecuteSQL(manager.GetCommand(SQLCommandManager.GetUsers)));
        Console.WriteLine(dataBase.ExecuteSQL(manager.GetCommand(SQLCommandManager.GetEvents)));
        Console.WriteLine(dataBase.ExecuteSQL(manager.GetCommand(SQLCommandManager.GetPrograms)));
        Console.WriteLine(dataBase.ExecuteSQL(manager.GetCommand(SQLCommandManager.GetPeopleEvents)));
        Console.WriteLine(dataBase.ExecuteSQL(manager.GetCommand(SQLCommandManager.GetChiped)));

        Server server = new Server(dataBase, manager);
    }

    static public int Add(int a, int b)
    {
        return a + b;
    } 
}