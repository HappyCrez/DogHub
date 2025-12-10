using System.Collections.Generic;

namespace DogHub;

public interface IDataBaseModel
{
    string ExecuteSQL(string sql, IDictionary<string, object?>? parameters = null);

    (bool Ok, string Json) ExecuteForApi(string sql, IDictionary<string, object?>? parameters = null);
}

