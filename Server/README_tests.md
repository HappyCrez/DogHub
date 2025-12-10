# Гайд по тестам бэкенда

## Требования
- .NET 9.0 SDK
- Файлы `.env` и `Assets/SQLCommands.json` (используются `AppConfig` и `SQLCommandManager`)

## Структура проекта
- `Server/DogHub.Tests` — xUnit‑проект с инфраструктурой:
  - `Infrastructure/Fakes/FakeDatabase.cs` и `FakeSqlCommandManager.cs` — фейковые реализации БД и менеджера SQL-команд;
  - `Infrastructure/TestHost.cs` — быстрый способ собрать контроллеры/сервисы с фейками;
  - `Infrastructure/ControllerContextBuilder.cs` — подготовка `DefaultHttpContext` (клеймы, куки, заголовки);
  - `Infrastructure/JsonFixture.cs` + `Fixtures/*.json` — готовые JSON-ответы для повторного использования.
- Тесты разбиты по папкам `Controllers/` и `Services/`.

## Запуск тестов
```bash
cd Server
dotnet test ..\DogHub.sln
```
Команда прогоняет тестовый проект `Server/DogHub.Tests` и основной `DogHub`.

## Как добавлять новые тесты
1. **Выберите область** (`Controllers` или `Services`) и создайте файл `*Tests.cs`.
2. Используйте `var host = new TestHost();`, чтобы получить доступ к `FakeDatabase`, `FakeSqlCommandManager`, `TokenService` и другим зависимостям.
3. Все обращения к `ISqlCommandManager` нужно регистрировать:
   ```csharp
   host.Sql.Register("get_member_by_email", "SELECT ...");
   host.Database.QueueResult("SELECT ...", "[{ \"memberId\": 1 }]");
   ```
4. Для «инлайн»-SQL можно задать делегат:
   ```csharp
   host.Database.Fallback = (sql, parameters) => "...";
   ```
   Функция получает текст запроса и параметры, а на выходе должна вернуть JSON.
5. Если нужен повторяемый ответ, положите файл в `Server/DogHub.Tests/Fixtures` и загрузите через `JsonFixture.Load("file.json")`.

## Устранение проблем
- **Отсутствует окружение** — тесты используют `AppConfig.Instance()`, поэтому убедитесь, что `.env` доступен (в репозитории есть копия `Assets/.env`).
- **Не найдена SQL-команда** — каждая строка, которую запрашивает `ISqlCommandManager.GetCommand`, должна быть зарегистрирована во фейке (`host.Sql.Register(...)`).

Инфраструктура позволяет тестировать контроллеры целиком (HTTP-контекст, куки, роли) без подключения к реальной базе данных.

