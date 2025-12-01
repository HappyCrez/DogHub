using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using iText.IO.Font;
using iText.Kernel.Colors;
using iText.Layout.Borders;
using iText.IO.Image;
using iText.Kernel.Geom;

using System.Globalization;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Net.Http;
using System.Net;

public class DogReport
{
    // Класс модели таблицы собак
    private class Dog
    {
        public int Id { get; set; }
        public int MemberId { get; set; } = -1;
        public string Name { get; set; } = string.Empty;
        public string Breed { get; set; } = string.Empty;
        public SexEnum Sex { get; set; } = SexEnum.M;
        public DateTime? BirthDate { get; set; }
        public string? ChipNumber { get; set; }
        public string? Photo { get; set; }
        public string? Bio { get; set; }
        public List<string>? Tags { get; set; }
    }

    public enum SexEnum
    {
        M,
        F
    }

    private byte[] reportBytes = [];
    private readonly PdfFont font;
    private readonly PdfFont boldFont;
    private List<Dog> dogList;
    private readonly HttpClient httpClient;

    private byte[] CreateReport()
    {
        using (var ms = new MemoryStream())
        {
            var writer = new PdfWriter(ms);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf);
            
            try
            {
                // Для каждой собаки добавляем раздел
                for (int i = 0; i < dogList.Count; ++i)
                {
                    AddDogSection(document, dogList[i]);
                    
                    if (i != dogList.Count - 1)
                    {
                        document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                    }
                }
            }
            finally
            {
                document.Close();
            }
            return ms.ToArray();
        }
    }

    private void AddDogSection(Document document, Dog dog)
    {
        // Добавляем фото и заголовок
        AddPhotoAndHeader(document, dog);
        
        // Раздел "Основная информация"
        AddBasicInfoSection(document, dog);
        
        // Раздел "Теги и особенности"
        AddTagsSection(document, dog);
        
        // Раздел "Биография"
        AddBioSection(document, dog);
        
        // Футер
        AddReportFooter(document);
    }

    private void AddPhotoAndHeader(Document document, Dog dog)
    {
        // Создаем таблицу для размещения фото и текста рядом
        var headerTable = new Table(2, false)
            .SetWidth(UnitValue.CreatePercentValue(100))
            .SetMarginBottom(20);
        
        // Ячейка с фото (30% ширины)
        var photoCell = new Cell()
            .SetWidth(UnitValue.CreatePercentValue(30))
            .SetBorder(Border.NO_BORDER)
            .SetVerticalAlignment(VerticalAlignment.MIDDLE);
        
        // Добавляем фото, если оно есть
        if (!string.IsNullOrEmpty(dog.Photo))
        {
            try
            {
                var image = LoadImageFromUrl(dog.Photo);
                if (image != null)
                {
                    // Настраиваем размер изображения
                    image.SetMaxWidth(150);
                    image.SetMaxHeight(150);
                    image.SetHorizontalAlignment(HorizontalAlignment.CENTER);
                    image.SetAutoScale(true);
                    
                    var imageContainer = new Div().Add(image);
                    photoCell.Add(imageContainer);
                }
                else
                {
                    // Заглушка, если фото не загрузилось
                    photoCell.Add(CreatePhotoPlaceholder());
                }
            }
            catch
            {
                // В случае ошибки добавляем заглушку
                photoCell.Add(CreatePhotoPlaceholder());
            }
        }
        else
        {
            // Заглушка, если фото нет
            photoCell.Add(CreatePhotoPlaceholder());
        }
        
        // Ячейка с текстовой информацией (70% ширины)
        var infoCell = new Cell()
            .SetWidth(UnitValue.CreatePercentValue(70))
            .SetBorder(Border.NO_BORDER)
            .SetVerticalAlignment(VerticalAlignment.MIDDLE)
            .SetPaddingLeft(20);
        
        // Имя собаки как основной заголовок
        var nameParagraph = new Paragraph(dog.Name)
            .SetFont(boldFont)
            .SetFontSize(24)
            .SetMarginBottom(5);
        
        // Порода и пол как подзаголовок
        var breedParagraph = new Paragraph($"{dog.Breed} • {GetSexDisplayName(dog.Sex)}")
            .SetFont(font)
            .SetFontSize(16)
            .SetFontColor(ColorConstants.GRAY)
            .SetMarginBottom(15);
        
        // ID собаки под заголовком
        var idParagraph = new Paragraph($"ID: {dog.Id}")
            .SetFont(font)
            .SetFontSize(12)
            .SetFontColor(ColorConstants.DARK_GRAY);
        
        infoCell.Add(nameParagraph);
        infoCell.Add(breedParagraph);
        infoCell.Add(idParagraph);
        
        // Добавляем ячейки в таблицу
        headerTable.AddCell(photoCell);
        headerTable.AddCell(infoCell);
        
        document.Add(headerTable);
        
        // Разделительная линия
        AddSeparatorLine(document);
    }

    private Image? LoadImageFromUrl(string imageUrl)
    {
        try
        {
            // Загружаем изображение через HttpClient
            using var response = httpClient.GetAsync(imageUrl).Result;
            if (response.IsSuccessStatusCode)
            {
                using var stream = response.Content.ReadAsStreamAsync().Result;
                using var ms = new MemoryStream();
                stream.CopyTo(ms);
                return new Image(ImageDataFactory.Create(ms.ToArray()));
            }
            return null;
        }
        catch
        {
            return null;
        }
    }

    private Div CreatePhotoPlaceholder()
    {
        // Создаем стилизованную заглушку для фото
        var placeholder = new Div()
            .SetWidth(150)
            .SetHeight(150)
            .SetBackgroundColor(new DeviceRgb(240, 240, 240))
            .SetBorder(new SolidBorder(1))
            .SetHorizontalAlignment(HorizontalAlignment.CENTER)
            .SetVerticalAlignment(VerticalAlignment.MIDDLE);
        
        var text = new Paragraph("Фото\nотсутствует")
            .SetFont(font)
            .SetFontSize(11)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetFontColor(ColorConstants.GRAY);
        
        placeholder.Add(text);
        return placeholder;
    }

    private void AddBasicInfoSection(Document document, Dog dog)
    {
        var sectionTitle = new Paragraph("Основная информация")
            .SetFont(boldFont)
            .SetFontSize(18)
            .SetMarginBottom(15);
        
        document.Add(sectionTitle);
        
        // Таблица для основной информации
        var infoTable = new Table(2, false)
            .SetWidth(UnitValue.CreatePercentValue(100))
            .SetMarginBottom(20);
        
        // ID владельца
        AddInfoRow(infoTable, "ID владельца", dog.MemberId.ToString());
        
        // Дата рождения
        string birthDateText = dog.BirthDate.HasValue 
            ? $"{dog.BirthDate.Value:dd.MM.yyyy} ({CalculateAge(dog.BirthDate.Value)})"
            : "Не указана";
        AddInfoRow(infoTable, "Дата рождения", birthDateText);
        
        // Номер чипа
        AddInfoRow(infoTable, "Номер чипа", dog.ChipNumber ?? "Не чипирована");
        
        document.Add(infoTable);
    }

    private void AddInfoRow(Table table, string label, string value)
    {
        // Ячейка с меткой
        var labelCell = new Cell()
            .Add(new Paragraph($"{label}:")
                .SetFont(boldFont)
                .SetFontSize(12))
            .SetPadding(5)
            .SetWidth(UnitValue.CreatePercentValue(30))
            .SetBorder(Border.NO_BORDER)
            .SetBackgroundColor(new DeviceRgb(245, 245, 245));
        
        // Ячейка со значением
        var valueCell = new Cell()
            .Add(new Paragraph(value)
                .SetFont(font)
                .SetFontSize(12))
            .SetPadding(5)
            .SetWidth(UnitValue.CreatePercentValue(70))
            .SetBorder(Border.NO_BORDER);
        
        table.AddCell(labelCell);
        table.AddCell(valueCell);
    }

    private void AddTagsSection(Document document, Dog dog)
    {
        if (dog.Tags == null || dog.Tags.Count == 0)
            return;
            
        var sectionTitle = new Paragraph("Теги и особенности")
            .SetFont(boldFont)
            .SetFontSize(18)
            .SetMarginBottom(15);
        
        document.Add(sectionTitle);
        
        // Создаем контейнер для тегов
        var tagsContainer = new Div()
            .SetMarginBottom(20);
        
        foreach (var tag in dog.Tags)
        {
            // Создаем стилизованный элемент для каждого тега
            var tagElement = new Paragraph(tag)
                .SetFont(font)
                .SetFontSize(11)
                .SetBackgroundColor(new DeviceRgb(230, 240, 255))
                .SetBorder(new SolidBorder(new DeviceRgb(200, 220, 255), 1))
                .SetBorderRadius(new BorderRadius(5))
                .SetPadding(8)
                .SetMargin(3)
                .SetTextAlignment(TextAlignment.CENTER);
            
            tagsContainer.Add(tagElement);
        }
        
        document.Add(tagsContainer);
    }

    private void AddBioSection(Document document, Dog dog)
    {
        if (string.IsNullOrEmpty(dog.Bio))
            return;
            
        var sectionTitle = new Paragraph("Биография")
            .SetFont(boldFont)
            .SetFontSize(18)
            .SetMarginBottom(15);
        
        document.Add(sectionTitle);
        
        // Блок с биографией
        var bioBlock = new Div()
            .SetBackgroundColor(new DeviceRgb(250, 250, 250))
            .SetBorder(new SolidBorder(new DeviceRgb(220, 220, 220), 1))
            .SetBorderRadius(new BorderRadius(5))
            .SetPadding(20)
            .SetMarginBottom(20);
        
        var bioText = new Paragraph(dog.Bio)
            .SetFont(font)
            .SetFontSize(12)
            .SetTextAlignment(TextAlignment.JUSTIFIED);
        
        bioBlock.Add(bioText);
        document.Add(bioBlock);
    }

    private void AddSeparatorLine(Document document)
    {
        // Создаем линию с помощью таблицы
        var lineTable = new Table(1, false)
            .SetWidth(UnitValue.CreatePercentValue(100))
            .SetHorizontalAlignment(HorizontalAlignment.CENTER)
            .SetMarginTop(10)
            .SetMarginBottom(20);
        
        var lineCell = new Cell()
            .SetHeight(1)
            .SetBackgroundColor(new DeviceRgb(220, 220, 220))
            .SetBorder(Border.NO_BORDER);
        
        lineTable.AddCell(lineCell);
        document.Add(lineTable);
    }

    private string GetSexDisplayName(SexEnum sex)
    {
        return sex switch
        {
            SexEnum.M => "Мужской",
            SexEnum.F => "Женский",
            _ => sex.ToString()
        };
    }

    private string CalculateAge(DateTime birthDate)
    {
        var today = DateTime.Today;
        int years = today.Year - birthDate.Year;
        int months = today.Month - birthDate.Month;
        
        if (today.Day < birthDate.Day)
        {
            months--;
        }
        
        if (months < 0)
        {
            years--;
            months += 12;
        }
        
        if (years == 0)
        {
            return months == 1 ? "1 месяц" : $"{months} месяцев";
        }
        else if (years == 1)
        {
            return months == 0 ? "1 год" : $"1 год, {months} мес.";
        }
        else if (years >= 2 && years <= 4)
        {
            return months == 0 ? $"{years} года" : $"{years} года, {months} мес.";
        }
        else
        {
            return months == 0 ? $"{years} лет" : $"{years} лет, {months} мес.";
        }
    }

    private void AddReportFooter(Document document)
    {
        var footer = new Paragraph($"Отчет сформирован {DateTime.Now:dd.MM.yyyy} в {DateTime.Now:HH:mm}")
            .SetFont(font)
            .SetFontSize(10)
            .SetTextAlignment(TextAlignment.RIGHT)
            .SetMarginTop(30)
            .SetFontColor(ColorConstants.GRAY);
        
        document.Add(footer);
    }

    public DogReport(string dogData)
    {
        try
        {
            // Создаем HttpClient для загрузки изображений
            httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);
            
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter() }
            };
            
            // Десериализуем список собак
            dogList = JsonSerializer.Deserialize<List<Dog>>(dogData, options) 
                ?? throw new InvalidOperationException("Некорректные данные о собаках");
            
            if (dogList.Count == 0)
            {
                throw new InvalidOperationException("Отчет не может быть сформирован: список собак пуст");
            }
            
            // Создаем шрифты
            font = FontManager.Instance().CreateFont();
            boldFont = FontManager.Instance().CreateBoldFont();
            
            // Создаем отчет
            reportBytes = CreateReport();            
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Ошибка формирования отчета: {ex.Message}");
        }
        finally
        {
            httpClient?.Dispose();
        }
    }

    public byte[] GetBytes()
    {
        return reportBytes;
    }
}