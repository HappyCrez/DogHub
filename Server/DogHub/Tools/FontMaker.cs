using iText.Kernel.Font;
using iText.IO.Font;

static class FontMaker
{
    // Список шрифтов
    private static string[] cyrillicFonts =
    {
        "arial.ttf", "Arial.ttf",
        "times.ttf", "Times.ttf", 
        "tahoma.ttf", "Tahoma.ttf",
        "verdana.ttf", "Verdana.ttf",
        "DejaVuSans.ttf",
        "LiberationSans-Regular.ttf"
    };

    private static string FindFontWithCyrillic(string fontsFolder)
    {
        try
        {
            foreach (var fontFile in cyrillicFonts)
            {
                string fontPath = Path.Combine(fontsFolder, fontFile);
                if (File.Exists(fontPath))
                    return fontPath;
                    
                // Также проверяем поддиректории
                if (Directory.Exists(fontsFolder))
                {
                    var allFonts = Directory.GetFiles(fontsFolder, "*" + fontFile, SearchOption.AllDirectories);
                    if (allFonts.Length > 0)
                    {
                        return allFonts[0];
                    }
                }
            }
        }
        catch
        {
            // Игнорируем ошибки поиска шрифтов
        }
        return string.Empty;
    }

    private static PdfFont CreateFallbackFont()
    {
        try
        {
            // Пытаемся использовать стандартный шрифт с правильной кодировкой
            return PdfFontFactory.CreateFont("Helvetica", PdfEncodings.IDENTITY_H);
        }
        catch
        {
            // Последний резервный вариант
            return PdfFontFactory.CreateFont();
        }
    }

    public static PdfFont CreateFont()
    {
        // Инициализация шрифтов с поддержкой кириллицы
        PdfFont font;
        try
        {
            // Способ 1: Используем системные шрифты
            string fontsFolder = "/usr/share/fonts"; // для Linux
            if (OperatingSystem.IsWindows())
                fontsFolder = @"C:\Windows\Fonts";
            else if (OperatingSystem.IsMacOS())
                fontsFolder = "/Library/Fonts";
            
            // Попробуем найти Arial или аналогичный шрифт с поддержкой кириллицы
            string fontPath = FindFontWithCyrillic(fontsFolder);
            
            if (!string.IsNullOrEmpty(fontPath))
            {
                font = PdfFontFactory.CreateFont(fontPath, PdfEncodings.IDENTITY_H);
            }
            else
            {
                font = CreateFallbackFont();
            }
        }
        catch
        {
            font = CreateFallbackFont();
        }
        return font;
    }
};