using System.Text;

public class TextFormatter
{
    /// <summary>
    /// Проходит по строке str и ищет вхождение символа $$,
    /// заменяя его на следующий переданный параметр 
    /// </summary>
    /// <param name="str">Строка str для модификации</param>
    /// <param name="strParams">Параметры для подставновки в строку</param>
    /// <returns>Новая строка с параметрами</returns>
    public static string ModifyStr(string str, params string[] strParams)
    {
        if (strParams == null || strParams.Length == 0)
        {
            return str;
        }

        var result = new StringBuilder();
        int paramIndex = 0;
        
        for (int i = 0; i < str.Length; ++i)
        {
            if (i < str.Length - 1 && str[i] == '$' && str[i + 1] == '$')
            {
                if (paramIndex < strParams.Length)
                {
                    result.Append(strParams[paramIndex]);
                    paramIndex++;
                    ++i; // Пропускаем следующий символ '$'
                }
                else
                {
                    // Если параметры закончились, оставляем "$$"
                    result.Append("$$");
                    ++i; // Пропускаем следующий символ '$'
                }
            }
            else
            {
                result.Append(str[i]);
            }
        }
        return result.ToString();
    }
}