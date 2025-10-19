/// <summary>
/// Класс поддерживает подключение к базе данных и производит операции по 
/// записи и чтению из БД
/// </summary>
class DataBaseModel
{
    /// simple DB imitation
    string[] data_base = new string[10]; 
    int data_base_id = 0;

    /// <summary>
    /// При создании класса происходит подключение к БД
    /// </summary>
    public DataBaseModel()
    {
        // TODO::Подключение к БД
    }

    /// <summary>
    /// Проводит валидацию данных и записывает их в БД
    /// </summary>
    /// <param name="data">Строка в формате json, данные для записи</param>
    /// <returns>true если запись осуществлена, иначе false</returns>
    public bool writeData(string data)
    {
        // TODO::Запись в БД
        data_base[data_base_id] = data;
        return true;
    }

    /// <summary>
    /// Читает и возвращает данные из БД
    /// </summary>
    /// <param name="request">Строка в формате json, { "table_name": id } </param>
    /// <returns>Возвращает строку в формате json с найденными данными или пустую строку</returns>
    public string readData(string request)
    {
        string response = "";
        // TODO::Read logick
        return response;
    }
}