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
    
    private readonly PdfFont font;
    
    private DogReport()
    {
        font = FontMaker.CreateFont();
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
            .SetFont(font)
            .SetFontSize(18)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMarginBottom(20);
        
        document.Add(titleParagraph);
    }

    private void AddDogInfo(Document document, int dogId)
    {
        var sectionTitle = new Paragraph("Информация о собаке")
            .SetFont(font)
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
            .SetFont(font)
            .SetFontSize(12)
            .SetMarginBottom(15);
        
        document.Add(infoParagraph);
    }

    private void AddFooter(Document document)
    {
        var footer = new Paragraph($"Отчет сгенерирован: {DateTime.Now:dd.MM.yyyy HH:mm}")
            .SetFont(font)
            .SetFontSize(10)
            .SetTextAlignment(TextAlignment.RIGHT)
            .SetMarginTop(20);
        
        document.Add(footer);
    }

    private void AddTableRow(Table table, string label, string value)
    {
        table.AddCell(new Cell().Add(new Paragraph(label).SetFont(font).SetFontSize(12)).SetPadding(5));
        table.AddCell(new Cell().Add(new Paragraph(value).SetFont(font).SetFontSize(12)).SetPadding(5));
    }
}