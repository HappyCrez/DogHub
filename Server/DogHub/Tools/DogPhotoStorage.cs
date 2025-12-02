using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.AspNetCore.Http;
using Renci.SshNet;
using Renci.SshNet.Common;

namespace DogHub;

/// <summary>
/// Сервис загрузки фотографий собак по SFTP.
/// </summary>
public class DogPhotoStorage
{
    private const long MaxPhotoSizeBytes = 5 * 1024 * 1024; // 5 MB

    private static readonly IReadOnlyDictionary<string, string> ContentTypeToExtension =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/jpg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
        };

    private readonly AppConfig _config;
    private readonly string _remoteDirNormalized;
    private readonly string _publicBaseUrl;

    public DogPhotoStorage(AppConfig config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _remoteDirNormalized = NormalizeRemoteDir(config.DogPhotoRemoteDir);
        _publicBaseUrl = config.DogPhotoPublicBaseUrl.TrimEnd('/');
    }

    public string Upload(int memberId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            throw new InvalidOperationException("Файл фотографии собаки не получен.");
        }

        if (file.Length > MaxPhotoSizeBytes)
        {
            throw new InvalidOperationException("Файл слишком большой. Максимум 5 МБ.");
        }

        var extension = ResolveExtension(file.ContentType, file.FileName);
        var fileName = $"dog-{memberId}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{extension}";
        var remotePath = $"{_remoteDirNormalized}{fileName}";

        using var stream = new MemoryStream();
        file.CopyTo(stream);
        stream.Position = 0;

        using var client = CreateClient();

        try
        {
            client.Connect();
            EnsureRemoteDirectory(client, _remoteDirNormalized);
            client.UploadFile(stream, remotePath, true);
        }
        catch (SshException ex)
        {
            throw new InvalidOperationException("Не удалось загрузить фото собаки на SFTP.", ex);
        }
        finally
        {
            if (client.IsConnected)
            {
                client.Disconnect();
            }
        }

        return $"{_publicBaseUrl}/{fileName}";
    }

    public void DeleteByUrl(string? photoUrl)
    {
        if (!TryGetFileNameFromUrl(photoUrl, out var fileName))
        {
            return;
        }

        var remotePath = $"{_remoteDirNormalized}{fileName}";
        using var client = CreateClient();
        try
        {
            client.Connect();
            if (client.Exists(remotePath))
            {
                client.DeleteFile(remotePath);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DogPhotoStorage] Не удалось удалить фото собаки: {ex.Message}");
        }
        finally
        {
            if (client.IsConnected)
            {
                client.Disconnect();
            }
        }
    }

    private SftpClient CreateClient()
    {
        return new SftpClient(
            _config.SshHost,
            _config.SshPort,
            _config.SshUser,
            _config.SshPassword);
    }

    private static string NormalizeRemoteDir(string dir)
    {
        if (string.IsNullOrWhiteSpace(dir))
        {
            throw new InvalidOperationException("Путь для фотографий собак не настроен.");
        }

        var normalized = dir.Replace('\\', '/');
        if (!normalized.EndsWith('/'))
        {
            normalized += "/";
        }

        return normalized;
    }

    private bool TryGetFileNameFromUrl(string? photoUrl, out string fileName)
    {
        fileName = string.Empty;
        if (string.IsNullOrWhiteSpace(photoUrl))
        {
            return false;
        }

        if (!photoUrl.StartsWith(_publicBaseUrl, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var relative = photoUrl[_publicBaseUrl.Length..].TrimStart('/');
        if (string.IsNullOrWhiteSpace(relative) ||
            relative.Contains('/') ||
            relative.Contains('\\'))
        {
            return false;
        }

        fileName = relative;
        return true;
    }

    private static string ResolveExtension(string? contentType, string originalFileName)
    {
        if (!string.IsNullOrWhiteSpace(contentType) &&
            ContentTypeToExtension.TryGetValue(contentType.Trim(), out var extFromType))
        {
            return extFromType;
        }

        var ext = Path.GetExtension(originalFileName);
        if (string.IsNullOrWhiteSpace(ext))
        {
            throw new InvalidOperationException("Не удалось определить тип файла.");
        }

        ext = ext.ToLowerInvariant();
        if (ext is ".jpg" or ".jpeg" or ".png" or ".webp")
        {
            return ext switch
            {
                ".jpeg" => ".jpg",
                _ => ext
            };
        }

        throw new InvalidOperationException("Поддерживаются только JPG, PNG и WEBP.");
    }

    private static void EnsureRemoteDirectory(SftpClient client, string remoteDir)
    {
        if (client.Exists(remoteDir))
        {
            return;
        }

        var parts = remoteDir.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        var currentPath = "/";

        foreach (var part in parts)
        {
            currentPath = currentPath.EndsWith("/")
                ? currentPath + part
                : currentPath + "/" + part;

            if (!client.Exists(currentPath))
            {
                client.CreateDirectory(currentPath);
            }
        }
    }
}

