using iText.Kernel.Font;
using iText.IO.Font;
using System.Reflection;
using DogHub;

public class FontManager
{
    private static FontManager? instance = null;

    private FontManager()
    { }

    private PdfFont LoadFont(string pathToFont)
    {
        try
        {
            return PdfFontFactory.CreateFont(pathToFont, PdfEncodings.IDENTITY_H);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Ошибка загрузки шрифта {pathToFont}: {ex.Message}");
        }
    }
    
    public PdfFont CreateFont()
    {
        return LoadFont($"{AppConfig.Instance().PathToFonts}OpenSans-Regular.ttf");
    }

    public PdfFont CreateBoldFont()
    {
        return LoadFont($"{AppConfig.Instance().PathToFonts}OpenSans-Bold.ttf");
    }

    public static FontManager Instance()
    {
        if (instance == null)
        {
            instance = new FontManager();
        }
        return instance;
    }
}