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

using DogHub;

public class DogReport
{
    // Класс модели для десериализации JSON
    private class DogResume
    {
        public int Id { get; set; }
        public string DogName   { get; set; } = string.Empty;
        public string Breed     { get; set; } = string.Empty;
        public string Sex       { get; set; } = string.Empty;
        public DateTime? BirthDate  { get; set; }
        public string? ChipNumber   { get; set; }
        public string? Photo        { get; set; }
        public string? DogBio       { get; set; }
        public List<string>? Tags   { get; set; }
        public string OwnerName     { get; set; } = string.Empty;
        public string OwnerPhone    { get; set; } = string.Empty;
        public string OwnerEmail    { get; set; } = string.Empty;
        public int ProgramCount     { get; set; }
        public int ServiceCount     { get; set; }
        public int EventCount       { get; set; }
    }

    private byte[] reportBytes = [];
    private readonly PdfFont font;
    private readonly PdfFont boldFont;
    private List<DogResume> dogList;
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
                // Если несколько собак - добавляем общий заголовок
                if (dogList.Count > 1)
                {
                    AddReportHeader(document, $"Профили собак ({dogList.Count})");
                }
                
                // Для каждой собаки добавляем раздел
                for (int i = 0; i < dogList.Count; ++i)
                {
                    AddDogResume(document, dogList[i], i + 1);
                    
                    // Добавляем разрыв страницы, если это не последняя собака
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

    private void AddReportHeader(Document document, string title)
    {
        var header = new Paragraph(title)
            .SetFont(boldFont)
            .SetFontSize(20)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMarginBottom(30);
        
        document.Add(header);
    }

    private void AddDogResume(Document document, DogResume dog, int dogNumber)
    {
        // Шапка резюме с фото и основной информацией
        AddResumeHeader(document, dog, dogNumber);
        
        // Контактная информация владельца
        AddContactSection(document, dog);
        
        // Статистика активности
        AddActivityStatsSection(document, dog);
        
        // Теги и особенности
        AddTagsSection(document, dog);
        
        // Биография
        AddBioSection(document, dog);
        
        // Футер с датой создания
        AddResumeFooter(document);
    }

    private void AddResumeHeader(Document document, DogResume dog, int dogNumber)
    {
        // Контейнер для шапки резюме
        var headerContainer = new Div()
            .SetMarginBottom(30);
        
        // Номер собаки в отчете (если несколько)
        if (dogList.Count > 1)
        {
            var dogNumberText = new Paragraph($"Профиль #{dogNumber}")
                .SetFont(font)
                .SetFontSize(12)
                .SetFontColor(new DeviceRgb(100, 100, 100))
                .SetMarginBottom(5);
            headerContainer.Add(dogNumberText);
        }
        
        // Основная информация в таблице (фото + текст)
        var headerTable = new Table(new float[] { 1, 2 }, false)
            .SetWidth(UnitValue.CreatePercentValue(100))
            .SetMarginBottom(20);
        
        // Ячейка с фото
        var photoCell = new Cell()
            .SetBorder(Border.NO_BORDER)
            .SetVerticalAlignment(VerticalAlignment.MIDDLE)
            .SetPaddingRight(20);
        
        // Получаем фото как IBlockElement (Div)
        var photoElement = GetDogPhotoElement(dog.Photo);
        photoCell.Add(photoElement);
        
        // Ячейка с текстовой информацией
        var infoCell = new Cell()
            .SetBorder(Border.NO_BORDER)
            .SetVerticalAlignment(VerticalAlignment.MIDDLE);
        
        // Имя собаки
        var nameParagraph = new Paragraph(dog.DogName)
            .SetFont(boldFont)
            .SetFontSize(28)
            .SetMarginBottom(5);
        
        // Порода и пол
        var breedSexParagraph = new Paragraph($"{dog.Breed} • {GetSexDisplayName(dog.Sex)}")
            .SetFont(font)
            .SetFontSize(16)
            .SetFontColor(new DeviceRgb(100, 100, 100))
            .SetMarginBottom(10);
        
        // Возраст и дата рождения
        string ageInfo = "";
        if (dog.BirthDate.HasValue)
        {
            ageInfo = $"{CalculateAge(dog.BirthDate.Value)} • Родился: {dog.BirthDate.Value:dd.MM.yyyy}";
        }
        else
        {
            ageInfo = "Дата рождения не указана";
        }
        
        var ageParagraph = new Paragraph(ageInfo)
            .SetFont(font)
            .SetFontSize(14)
            .SetMarginBottom(5);
        
        infoCell.Add(nameParagraph);
        infoCell.Add(breedSexParagraph);
        infoCell.Add(ageParagraph);
        
        headerTable.AddCell(photoCell);
        headerTable.AddCell(infoCell);
        headerContainer.Add(headerTable);
        
        // Разделительная линия
        AddSectionSeparator(document);
        
        document.Add(headerContainer);
    }

    private Div GetDogPhotoElement(string? filename)
    {
        var photoContainer = new Div()
            .SetWidth(200)
            .SetHeight(200)
            .SetHorizontalAlignment(HorizontalAlignment.CENTER);
        
        if (!string.IsNullOrEmpty(filename))
        {
            try
            {
                var image = LoadImageFromUrl(filename);
                if (image != null)
                {
                    // Настраиваем размер фото с сохранением пропорций
                    image.SetMaxWidth(200);
                    image.SetMaxHeight(200);
                    image.SetHorizontalAlignment(HorizontalAlignment.CENTER);
                    image.SetAutoScale(true);
                    
                    // Добавляем обводку и скругленные углы через контейнер
                    var imageContainer = new Div().Add(image);
                    
                    photoContainer.Add(imageContainer);
                }
            }
            catch
            { /* Если не удалось загрузить фото, показываем пустой блок */ }
            return photoContainer;
        }
        
        // Заглушка для фото
        var placeholder = new Div()
            .SetWidth(160)
            .SetHeight(160)
            .SetBackgroundColor(new DeviceRgb(240, 240, 240))
            .SetBorder(new SolidBorder(new DeviceRgb(200, 200, 200), 1))
            .SetBorderRadius(new BorderRadius(10))
            .SetHorizontalAlignment(HorizontalAlignment.CENTER)
            .SetVerticalAlignment(VerticalAlignment.MIDDLE);
        
        var placeholderText = new Paragraph("Фото\nпитомца")
            .SetFont(font)
            .SetFontSize(12)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetFontColor(new DeviceRgb(150, 150, 150));
        
        placeholder.Add(placeholderText);
        photoContainer.Add(placeholder);
        
        return photoContainer;
    }

    private void AddContactSection(Document document, DogResume dog)
    {
        var sectionTitle = new Paragraph("Контактная информация владельца")
            .SetFont(boldFont)
            .SetFontSize(18)
            .SetMarginBottom(15);
        
        document.Add(sectionTitle);
        
        // Таблица с контактной информацией
        var contactTable = new Table(2, false)
            .SetWidth(UnitValue.CreatePercentValue(100))
            .SetMarginBottom(25);
        
        // Владелец
        AddContactRow(contactTable, "👤 Владелец", dog.OwnerName);
        
        // Телефон
        if (!string.IsNullOrEmpty(dog.OwnerPhone))
        {
            AddContactRow(contactTable, "📱 Телефон", dog.OwnerPhone);
        }
        
        // Email
        if (!string.IsNullOrEmpty(dog.OwnerEmail))
        {
            AddContactRow(contactTable, "📧 Email", dog.OwnerEmail);
        }
        
        // Номер чипа
        if (!string.IsNullOrEmpty(dog.ChipNumber))
        {
            AddContactRow(contactTable, "🔖 Номер чипа", dog.ChipNumber);
        }
        
        document.Add(contactTable);
    }

    private void AddContactRow(Table table, string label, string value)
    {
        var labelCell = new Cell()
            .Add(new Paragraph(label)
                .SetFont(boldFont)
                .SetFontSize(12))
            .SetPadding(8)
            .SetWidth(UnitValue.CreatePercentValue(30))
            .SetBorder(Border.NO_BORDER)
            .SetBackgroundColor(new DeviceRgb(250, 250, 250));
        
        var valueCell = new Cell()
            .Add(new Paragraph(value)
                .SetFont(font)
                .SetFontSize(12))
            .SetPadding(8)
            .SetWidth(UnitValue.CreatePercentValue(70))
            .SetBorder(Border.NO_BORDER);
        
        table.AddCell(labelCell);
        table.AddCell(valueCell);
    }

    private void AddActivityStatsSection(Document document, DogResume dog)
    {
        var sectionTitle = new Paragraph("Активность в питомнике")
            .SetFont(boldFont)
            .SetFontSize(18)
            .SetMarginBottom(15);
        
        document.Add(sectionTitle);
        
        // Контейнер для статистики
        var statsContainer = new Div()
            .SetMarginBottom(25);
        
        // Таблица с 3 колонками для статистики
        var statsTable = new Table(3, false)
            .SetWidth(UnitValue.CreatePercentValue(100));
        
        // Программы
        AddStatCard(statsTable, "📚 Программы", dog.ProgramCount.ToString(), 
            new DeviceRgb(74, 144, 226));
        
        // Услуги
        AddStatCard(statsTable, "⚕️ Услуги", dog.ServiceCount.ToString(), 
            new DeviceRgb(46, 204, 113));
        
        // Мероприятия
        AddStatCard(statsTable, "🎉 Мероприятия", dog.EventCount.ToString(), 
            new DeviceRgb(155, 89, 182));
        
        statsContainer.Add(statsTable);
        
        // Описание активности
        var activityDescription = GetActivityDescription(dog);
        if (!string.IsNullOrEmpty(activityDescription))
        {
            var descriptionParagraph = new Paragraph(activityDescription)
                .SetFont(font)
                .SetFontSize(12)
                .SetFontColor(new DeviceRgb(100, 100, 100))
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginTop(10);
            
            statsContainer.Add(descriptionParagraph);
        }
        
        document.Add(statsContainer);
    }

    private void AddStatCard(Table table, string title, string value, DeviceRgb color)
    {
        var cell = new Cell()
            .SetBorder(Border.NO_BORDER)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetPadding(15);
        
        // Заголовок карточки
        var titleParagraph = new Paragraph(title)
            .SetFont(font)
            .SetFontSize(12)
            .SetFontColor(new DeviceRgb(100, 100, 100))
            .SetMarginBottom(5);
        
        // Значение
        var valueParagraph = new Paragraph(value)
            .SetFont(boldFont)
            .SetFontSize(28)
            .SetFontColor(color);
        
        cell.Add(titleParagraph);
        cell.Add(valueParagraph);
        table.AddCell(cell);
    }

    private string GetActivityDescription(DogResume dog)
    {
        int totalActivities = dog.ProgramCount + dog.ServiceCount + dog.EventCount;
        
        if (totalActivities == 0)
            return "Собака пока не принимала участия в активностях питомника";
        
        var descriptions = new List<string>();
        
        if (dog.ProgramCount > 0)
            descriptions.Add($"{dog.ProgramCount} программа(м)");
        
        if (dog.ServiceCount > 0)
            descriptions.Add($"{dog.ServiceCount} услуг(а)");
        
        if (dog.EventCount > 0)
            descriptions.Add($"{dog.EventCount} мероприятие(ий)");
        
        return $"Принял(а) участие в: {string.Join(", ", descriptions)}";
    }

    private void AddTagsSection(Document document, DogResume dog)
    {
        if (dog.Tags == null || dog.Tags.Count == 0)
            return;
            
        var sectionTitle = new Paragraph("Характер и особенности")
            .SetFont(boldFont)
            .SetFontSize(18)
            .SetMarginBottom(15);
        
        document.Add(sectionTitle);
        
        var tagsContainer = new Div()
            .SetMarginBottom(25);
        
        foreach (var tag in dog.Tags)
        {
            var tagElement = new Paragraph(tag)
                .SetFont(font)
                .SetFontSize(11)
                .SetBackgroundColor(new DeviceRgb(230, 240, 255))
                .SetBorder(new SolidBorder(new DeviceRgb(200, 220, 255), 1))
                .SetBorderRadius(new BorderRadius(15))
                .SetPaddingLeft(12)
                .SetPaddingRight(12)
                .SetPaddingTop(6)
                .SetPaddingBottom(6)
                .SetMargin(3)
                .SetTextAlignment(TextAlignment.CENTER);
            
            tagsContainer.Add(tagElement);
        }
        
        document.Add(tagsContainer);
    }

    private void AddBioSection(Document document, DogResume dog)
    {
        if (string.IsNullOrEmpty(dog.DogBio))
            return;
            
        var sectionTitle = new Paragraph("О питомце")
            .SetFont(boldFont)
            .SetFontSize(18)
            .SetMarginBottom(15);
        
        document.Add(sectionTitle);
        
        var bioContainer = new Div()
            .SetBackgroundColor(new DeviceRgb(250, 250, 250))
            .SetBorder(new SolidBorder(new DeviceRgb(220, 220, 220), 1))
            .SetBorderRadius(new BorderRadius(8))
            .SetPadding(20)
            .SetMarginBottom(25);
        
        var bioText = new Paragraph(dog.DogBio)
            .SetFont(font)
            .SetFontSize(13)
            .SetTextAlignment(TextAlignment.JUSTIFIED);
        
        bioContainer.Add(bioText);
        document.Add(bioContainer);
    }

    private void AddResumeFooter(Document document)
    {
        var footerContainer = new Div()
            .SetMarginTop(30);
        
        var dateParagraph = new Paragraph($"Отчет сформирован: {DateTime.Now:dd.MM.yyyy, HH:mm}")
            .SetFont(font)
            .SetFontSize(10)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetFontColor(new DeviceRgb(150, 150, 150));
        
        footerContainer.Add(dateParagraph);
        document.Add(footerContainer);
    }

    private void AddSectionSeparator(Document document)
    {
        var separator = new Div()
            .SetHeight(1)
            .SetBackgroundColor(new DeviceRgb(220, 220, 220))
            .SetMarginTop(15)
            .SetMarginBottom(20);
        
        document.Add(separator);
    }

    private string GetSexDisplayName(string sex)
    {
        return sex?.ToUpper() switch
        {
            "M" => "♂ Мальчик",
            "F" => "♀ Девочка",
            _ => sex ?? "Не указан"
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

    private Image? LoadImageFromUrl(string filename)
    {
        try
        {
            string pathToFile = $"{AppConfig.Instance().ImageHost}/Dogs/{filename.Trim()}";
            using var response = httpClient.GetAsync(pathToFile).Result;
            Console.WriteLine(pathToFile);
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

    public DogReport(string dogData)
    {
        try
        {
            httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);
            
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter() }
            };
            
            // Десериализуем список собак
            dogList = JsonSerializer.Deserialize<List<DogResume>>(dogData, options) 
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