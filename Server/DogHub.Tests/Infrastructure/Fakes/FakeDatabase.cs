using System;
using System.Collections.Generic;
using System.Linq;
using DogHub;

namespace DogHub.Tests.Infrastructure.Fakes;

public sealed class FakeDatabase : IDataBaseModel
{
    private readonly Dictionary<string, Queue<string>> _responses = new();

    public IList<DbCall> Calls { get; } = new List<DbCall>();

    public Func<string, IDictionary<string, object?>?, string>? Fallback { get; set; }

    public Func<string, IDictionary<string, object?>?, (bool Ok, string Json)>? ApiFallback { get; set; }

    public DbCall? LastCall => Calls.LastOrDefault();

    public void QueueResult(string sql, params string[] jsonValues)
    {
        if (!_responses.TryGetValue(sql, out var queue))
        {
            queue = new Queue<string>();
            _responses[sql] = queue;
        }

        foreach (var value in jsonValues)
        {
            queue.Enqueue(value);
        }
    }

    public string ExecuteSQL(string sql, IDictionary<string, object?>? parameters = null)
    {
        Calls.Add(new DbCall(sql, Clone(parameters)));

        if (_responses.TryGetValue(sql, out var queue) && queue.Count > 0)
        {
            return queue.Dequeue();
        }

        if (Fallback != null)
        {
            return Fallback(sql, parameters);
        }

        return string.Empty;
    }

    public (bool Ok, string Json) ExecuteForApi(string sql, IDictionary<string, object?>? parameters = null)
    {
        if (ApiFallback != null)
        {
            return ApiFallback(sql, Clone(parameters));
        }

        var json = ExecuteSQL(sql, parameters);
        return (!string.IsNullOrWhiteSpace(json), json);
    }

    private static IDictionary<string, object?>? Clone(IDictionary<string, object?>? parameters)
    {
        if (parameters == null)
        {
            return null;
        }

        return parameters.ToDictionary(pair => pair.Key, pair => pair.Value);
    }

    public sealed record DbCall(string Sql, IDictionary<string, object?>? Parameters);
}

