namespace DogHub;

public class Launch
{
    /// <summary>
    /// Точка входа в программу
    /// </summary>
    /// <param name="args">В качестве параметров принимает адрес файла конфигурации</param>
    static public void Main(string [] args)
    {
        // TODO::Чтение и парсинг файла конфигурации
        // Например для передачи порта открытия сервера, имени БД для подключения
        // логина и пароля пользователя БД и тд. 

        // Сейчас server забирает весь поток на себя
        // Там стоит while true
        // Нужно распараллеливать работу
        // М.б. внутри одного потока -> программно
        // Server server = new Server();

        // login&password будет отличаться, нужно писать конфигуратор 
        string connectionConfig = "Host=localhost;Port=5432;Username=postgres;Password=lock;Database=doghub_db";
        DataBaseModel dataBase = new DataBaseModel(connectionConfig);
        Console.WriteLine(dataBase.ExecuteSQL("select * from users"));
    }

    static public int Add(int a, int b)
    {
        return a + b;
    } 
}
