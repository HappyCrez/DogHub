using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using iText.IO.Font;
using System.Globalization;
using System.Reflection;

public sealed class DogReport
{
    private static readonly Lazy<DogReport> _instance = 
        new Lazy<DogReport>(() => new DogReport());
    
    public static DogReport Instance => _instance.Value;
    
    private readonly PdfFont _normalFont;
    private readonly PdfFont _boldFont;
    private readonly PdfFont _boldLargeFont;
    
    private DogReport()
    {
        // Инициализация шрифтов с поддержкой кириллицы
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
                _normalFont = PdfFontFactory.CreateFont(fontPath, PdfEncodings.IDENTITY_H);
                _boldFont = PdfFontFactory.CreateFont(fontPath, PdfEncodings.IDENTITY_H);
                _boldLargeFont = PdfFontFactory.CreateFont(fontPath, PdfEncodings.IDENTITY_H);
            }
            else
            {
                // Способ 2: Используем встроенный шрифт (если есть) или создаем базовый
                _normalFont = CreateFallbackFont();
                _boldFont = CreateFallbackFont();
                _boldLargeFont = CreateFallbackFont();
            }
        }
        catch (Exception ex)
        {
            // Способ 3: Создаем самый простой шрифт
            _normalFont = CreateFallbackFont();
            _boldFont = CreateFallbackFont();
            _boldLargeFont = CreateFallbackFont();
        }
    }

    private string FindFontWithCyrillic(string fontsFolder)
    {
        try
        {
            // Список шрифтов
            string[] cyrillicFonts = {
                "arial.ttf", "Arial.ttf",
                "times.ttf", "Times.ttf", 
                "tahoma.ttf", "Tahoma.ttf",
                "verdana.ttf", "Verdana.ttf",
                "DejaVuSans.ttf",
                "LiberationSans-Regular.ttf"
            };
            
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
                        return allFonts[0];
                }
            }
        }
        catch
        {
            // Игнорируем ошибки поиска шрифтов
        }
        
        return null;
    }

    private PdfFont CreateFallbackFont()
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

    public byte[] CreateReport(int dogId)
    {
        using (var ms = new MemoryStream())
        {
            var writerProperties = new WriterProperties();
            var writer = new PdfWriter(ms, writerProperties);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf);
            
            try
            {
                // Генерируем отчет с русским текстом
                AddTitle(document, "Отчет о собаке");
                AddDogInfo(document, dogId);
                AddFooter(document);
            }
            finally
            {
                document.Close();
            }
            
            return ms.ToArray();
        }
    }

    private void AddTitle(Document document, string title)
    {
        var titleParagraph = new Paragraph(title)
            .SetFont(_boldLargeFont)
            .SetFontSize(18)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMarginBottom(20);
        
        document.Add(titleParagraph);
    }

    private void AddDogInfo(Document document, int dogId)
    {
        var sectionTitle = new Paragraph("Информация о собаке")
            .SetFont(_boldFont)
            .SetFontSize(14)
            .SetMarginBottom(10);
        
        document.Add(sectionTitle);
        
        // Таблица с информацией
        var table = new Table(2, false)
            .SetWidth(UnitValue.CreatePercentValue(100))
            .SetMarginBottom(15);
        
        AddTableRow(table, "ID собаки:", dogId.ToString());
        AddTableRow(table, "Дата формирования:", DateTime.Now.ToString("dd.MM.yyyy HH:mm"));
        AddTableRow(table, "Статус:", "Отчет успешно сгенерирован");
        AddTableRow(table, "Кличка:", "Тестовая собака");
        AddTableRow(table, "Порода:", "Лабрадор");
        AddTableRow(table, "Возраст:", "3 года");
        
        document.Add(table);
        
        // Дополнительная информация
        var infoParagraph = new Paragraph("Это тестовый отчет на русском языке")
            .SetFont(_normalFont)
            .SetFontSize(12)
            .SetMarginBottom(15);
        
        document.Add(infoParagraph);
    }

    private void AddFooter(Document document)
    {
        var footer = new Paragraph($"Отчет сгенерирован: {DateTime.Now:dd.MM.yyyy HH:mm}")
            .SetFont(_normalFont)
            .SetFontSize(10)
            .SetTextAlignment(TextAlignment.RIGHT)
            .SetMarginTop(20);
        
        document.Add(footer);
    }

    private void AddTableRow(Table table, string label, string value)
    {
        table.AddCell(new Cell().Add(new Paragraph(label).SetFont(_boldFont).SetFontSize(12)).SetPadding(5));
        table.AddCell(new Cell().Add(new Paragraph(value).SetFont(_normalFont).SetFontSize(12)).SetPadding(5));
    }
}