using DogHub;

namespace Test;

[TestClass]
public sealed class TestHandler
{
    // Все команды для Get читаются из файла SQLCommands.json
    [TestMethod]
    public void Test_HttpGet()
    {
        string sqlResult;
        string getRequest_01 =  "GET /members HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_01);
        string expected_01 = "SELECT u.id AS member_id, u.full_name, u.phone, u.email, u.city, u.avatar_url, u.bio AS owner_bio, u.join_date, u.membership_end_date, u.role, d.id   AS dog_id, d.name AS dog_name, d.breed, d.sex, d.birth_date, d.chip_number, d.photo AS dog_photo, d.tags  AS dog_tags, d.bio AS dog_bio FROM member u LEFT JOIN dog d ON u.id = d.member_id WHERE u.role = 'Пользователь' ORDER BY u.full_name, d.name;";
        Assert.IsTrue(sqlResult == expected_01);

        string getRequest_02 =  "GET /events HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_02);
        string expected_02 = "SELECT id, title, category, start_at, end_at, venue, price, description FROM event WHERE category <> 'Образование' OR category IS NULL ORDER BY start_at;";
        Assert.IsTrue(sqlResult == expected_02);

        string getRequest_03 =  "GET /event/1 HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_03);
        string expected_03 = "SELECT id, title, category, start_at, end_at, venue, price, description FROM event WHERE id=1;";
        Assert.IsTrue(sqlResult == expected_03);

        string getRequest_04 =  "GET /programs HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_04);
        string expected_04 = "SELECT p.id, p.title, p.type, p.price, p.description, COUNT(pr.dog_id) AS registered_dogs_count FROM program p LEFT JOIN program_registration pr ON p.id = pr.program_id GROUP BY p.id, p.title, p.type, p.price, p.description ORDER BY p.type, p.title;";
        Assert.IsTrue(sqlResult == expected_04);

        string getRequest_05 =  "GET /people_events HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_05);
        string expected_05 = "SELECT id, title, category, start_at, end_at, venue, price, description FROM event WHERE category = 'Образование' ORDER BY start_at DESC;";
        Assert.IsTrue(sqlResult == expected_05);

        string getRequest_06 =  "GET /chiped HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_06);
        string expected_06 = "SELECT d.id AS dog_id, d.name AS dog_name, d.breed, d.sex, d.birth_date, d.chip_number, d.photo, d.tags, d.bio, u.full_name AS owner_name, u.phone AS owner_phone, u.email AS owner_email FROM dog d JOIN member u ON d.member_id = u.id WHERE d.chip_number IS NOT NULL ORDER BY u.full_name, d.name;";
        Assert.IsTrue(sqlResult == expected_06);

        string getRequest_07 =  "GET /dogs HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_07);
        string expected_07 = "SELECT d.id AS dog_id, d.name AS dog_name, d.breed, d.sex, d.birth_date, d.chip_number, d.photo, d.tags, d.bio, u.full_name AS owner_name, u.phone AS owner_phone, u.email AS owner_email FROM dog d JOIN member u ON d.member_id = u.id ORDER BY u.full_name, d.name;";
        Assert.IsTrue(sqlResult == expected_07);

        string getRequest_08 =  "GET /event_dogs/1 HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_08);
        string expected_08 = "SELECT d.id AS dog_id, d.name AS dog_name, d.breed, d.sex, d.birth_date, d.chip_number, d.photo, o.full_name  AS owner_full_name, o.city AS owner_city, d.tags, d.bio FROM event_registration er JOIN dog d ON d.id = er.dog_id JOIN member o ON o.id = d.member_id WHERE er.event_id = 1;";
        Assert.IsTrue(sqlResult == expected_08);
        
        string getRequest_09 =  "GET /program_dogs/1 HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_09);
        string expected_09 = "SELECT d.id AS dog_id, d.name AS dog_name, d.breed, d.sex, d.birth_date, d.chip_number, d.photo, m.full_name AS owner_full_name, m.city AS owner_city, d.tags, d.bio FROM program_registration pr JOIN dog d ON d.id = pr.dog_id JOIN member m ON m.id = d.member_id WHERE pr.program_id = 1;";
        Assert.IsTrue(sqlResult == expected_09);

        string getRequest_10 =  "GET /event_members/1 HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(getRequest_10);
        string expected_10 = "SELECT DISTINCT m.id AS member_id, m.full_name, m.phone, m.email, m.city, m.avatar_url, m.bio, m.join_date, m.membership_end_date, m.role FROM event_registration er JOIN member m ON er.member_id = m.id WHERE er.event_id = 1;";
        Assert.IsTrue(sqlResult == expected_10);
    }

    [TestMethod]
    public void Test_HttpPost()
    {
        string sqlResult;
        string postRequest_01 = "POST /dog HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "Content-Length: 245\r\n" +
                                "\r\n" +
                                "{\r\n" +
                                "\"member_id\": 1,\r\n" +
                                "\"name\": \"Барон\",\r\n" +
                                "\"breed\": \"Немецкая овчарка\",\r\n" +
                                "\"sex\": \"M\",\r\n" +
                                "\"birth_date\": \"2021-03-10\",\r\n" +
                                "\"chip_number\": \"CHIP123456\",\r\n" +
                                "\"photo\": \"baron.jpg\",\r\n" +
                                "\"bio\": \"Охранная собака с хорошей родословной\",\r\n" +
                                "\"tags\": [\"охранный\", \"дрессированный\", \"активный\"]\r\n" +
                                "}";
        sqlResult = HttpHandler.Instance.HandleRequest(postRequest_01);
        string expected_01 = "INSERT INTO dog (member_id, name, breed, sex, birth_date, chip_number, photo, bio, tags) VALUES (1, 'Барон', 'Немецкая овчарка', 'M', '2021-03-10', 'CHIP123456', 'baron.jpg', 'Охранная собака с хорошей родословной', ARRAY['охранный','дрессированный','активный']);";
        Assert.IsTrue(sqlResult == expected_01);

        string postRequest_02 = "POST /member HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "Content-Length: 185\r\n" +
                                "\r\n" +
                                "{\r\n" +
                                "\"full_name\": \"Иванов Иван Иванович\",\r\n" +
                                "\"phone\": \"+79161234567\",\r\n" +
                                "\"email\": \"ivanov@example.com\",\r\n" +
                                "\"city\": \"Москва\",\r\n" +
                                "\"role\": \"client\"\r\n" +
                                "}";
        sqlResult = HttpHandler.Instance.HandleRequest(postRequest_02);
        string expected_02 = "INSERT INTO member (full_name, phone, email, city, role) VALUES ('Иванов Иван Иванович', '+79161234567', 'ivanov@example.com', 'Москва', 'client');";
        Assert.IsTrue(sqlResult == expected_02);
    }

    [TestMethod]
    public void Test_HttpPut()
    {
        string sqlResult;
        string putRequest_01 = "PUT /dog/1 HTTP/1.1\r\n" +
                               "Host: localhost:5055\r\n" +
                               "Content-Type: application/json\r\n" +
                               "Content-Length: 98\r\n" +
                               "\r\n" +
                               "{\r\n" +
                               "\"name\": \"Бадди Обновленный\",\r\n" +
                               "\"bio\": \"Новая биография собаки\",\r\n" +
                               "\"tags\": [\"обновленный\", \"дружелюбный\"]\r\n" +
                               "}";
        sqlResult = HttpHandler.Instance.HandleRequest(putRequest_01);
        string expected_01 = "UPDATE dog SET name = 'Бадди Обновленный', bio = 'Новая биография собаки', tags = ARRAY['обновленный','дружелюбный'] WHERE id = 1;";
        Assert.IsTrue(sqlResult == expected_01);

        string putRequest_02 =  "PUT /dog_service/5 HTTP/1.1\r\n" +
                                "Host: localhost:5055\r\n" +
                                "Content-Type: application/json\r\n" +
                                "Content-Length: 89\r\n" +
                                "\r\n" +
                                "{\r\n" +
                                "\"status\": \"DONE\",\r\n" +
                                "\"performed_at\": \"2024-01-15T14:30:00Z\",\r\n" +
                                "\"price\": 2500.00\r\n" +
                                "}";
        sqlResult = HttpHandler.Instance.HandleRequest(putRequest_02);
        string expected_02 = "UPDATE dog_service SET status = 'DONE', performed_at = '2024-01-15T14:30:00Z', price = 2500.00 WHERE id = 5;";
        Assert.IsTrue(sqlResult == expected_02);
    }

    [TestMethod]
    public void Test_HttpDelete()
    {
        string sqlResult;
        string deleteRequest_01 =   "DELETE /dog/3 HTTP/1.1\r\n" +
                                    "Host: localhost:5055\r\n" +
                                    "Content-Type: application/json\r\n" +
                                    "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(deleteRequest_01);
        string expected_01 = "DELETE FROM dog WHERE id = 3;";
        Assert.IsTrue(sqlResult == expected_01);

        string deleteRequest_02 =   "DELETE /program_registration/8 HTTP/1.1\r\n" +
                                    "Host: localhost:5055\r\n" +
                                    "Content-Type: application/json\r\n" +
                                    "\r\n";
        sqlResult = HttpHandler.Instance.HandleRequest(deleteRequest_02);
        string expected_02 = "DELETE FROM program_registration WHERE id = 8;";
        Assert.IsTrue(sqlResult == expected_02);
    }
}