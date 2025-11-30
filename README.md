# Информационная система "DogHub"
Проект разрабатывается в рамках курса "Разработка и реализация проектов" в АлтГТУ им. И.И.Ползунова.

## Структура проекта
1. Docs/ - сопроводительная документация проекта
2. Assets/ - ресурсы
    1. SQL/ - необходимые данные для БД
        1. "doghub_db.sql" - последовательность sql команд для создания БД
        2. "test_data.sql" - тестовые данные для заполнения БД 
    2. ".env.example" - пример конфигурации проекта
    3. "SQLCommands.json" - маппинг запросов к БД 
3. Server/ - сервер СУБД на платформе ".Net"
    1. Server/DogHub/ - исходный код сервера
    2. Server/Test/ - автоматизированные тесты
4. Client/ - клиентский сервер
5. Docker/ - файлы для сборки проекта в контейнерах docker
    1. certs - сертификаты ssl
    2. Client/ - Docker конфигурация для контейнера клиента
    3. Server/ - Docker конфигурация для контейнера сервера

## Зависимости ИС
1. ".Net" версии >= 9.0
    1. Пакет "Npgsql"
    2. Пакет "DotNetEnv"
2. ReactTS
3. Vite


## Backend сервер ИС
Сервер ".Net" работает в паре с СУБД "PostgreSQL". В ней должна быть развернута БД описанная SQL скриптом в "Assets/SQL/doghub_db.sql".
Первичные данные для тестирования работы программы располагаются в "Assets/SQL/test_data.sql".

### Сборка сервера:
``` bash
psql -U postgres -c "DROP DATABASE doghub_db" ||
psql -U postgres -c "CREATE DATABASE doghub_db" &&
psql -U postgres -d doghub_db -f "Assets/SQL/doghub_db.sql" &&
psql -U postgres -d doghub_db -f "Assets/SQL/test_data.sql" &&

dotnet build &&
dotnet test  &&
dotnet run --project Server/Doghub 
```

### Особенности реализации
1. Сервер читает конфигурацию записанную в "Assets/.env"
2. После ответа, соединение с клиентом разрывается

## Клиент
?Здесь будет описание как работать с клиентской частью программы?

### Сборка
``` bash
cd client   &&
npm install &&
npm run dev 
```

### Особенности реализации
?Особенности?

# Авторы
1. Sh1chi
2. Tychaaa
3. LexCivis