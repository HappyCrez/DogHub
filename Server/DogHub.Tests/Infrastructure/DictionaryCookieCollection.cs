using System.Collections;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace DogHub.Tests.Infrastructure;

internal sealed class DictionaryCookieCollection : IRequestCookieCollection
{
    private readonly IDictionary<string, string> _cookies;

    public DictionaryCookieCollection(IDictionary<string, string> cookies)
    {
        _cookies = cookies;
    }

    public string this[string key] => _cookies[key];

    public int Count => _cookies.Count;

    public ICollection<string> Keys => _cookies.Keys;

    public bool ContainsKey(string key) => _cookies.ContainsKey(key);

    public IEnumerator<KeyValuePair<string, string>> GetEnumerator() => _cookies.GetEnumerator();

    public bool TryGetValue(string key, out string value)
    {
        if (_cookies.TryGetValue(key, out var actual))
        {
            value = actual;
            return true;
        }

        value = string.Empty;
        return false;
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

