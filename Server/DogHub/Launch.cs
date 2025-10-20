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

        string connection_config = "Host=localhost;Port=5432;Username=postgres;Password=lock;Database=company_db";
        DataBaseModel data_base = new DataBaseModel(connection_config);
    }

    static public int add(int a, int b)
    {
        return a + b;
    } 
}
