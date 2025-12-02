# API
path всегда содержит имя таблицы у которой мы что-либо запрашиваем
любой запрос может ответить двумя сообщениями:
1. Вернуть данные (get) или количество затронутых строк (post,delete,put)
2. Вернуть ошибку выполнения запроса

## Метод Get
Возвращает записи из таблицы
path указывает на команду которая будет прочитана из файла Assets/SQLCommands.json
path может быть дополнен аргументами

## Метод Put
Обновляет одну запись в таблице
Таблица указывается в path, например, "server.com/dog" - обновить запись в таблице "dog"
payload - содержит данные для обновления в формате json, например,
```json
{
    "bio":"new biography",
    "name":"new_dog_name"
}
```

## Метод Delete
Удаляет одну запись из таблицы
path указывает на таблицу и запись, например, "server.com/dog/1" - удалить запись с id = 1 из таблицы "dog"
payload - пуст

## Метод Post
Создает новую запись в таблице
path указывает на таблицу, в которой нужно создать запись, например, "server.com/dog" - создать запись в таблице "dog"
payload - данные для создания записи в формате json, например,
```json
{
    "name":"dog_name",
    "owner":"owner_id"
}
```

## Авторизация

### `POST /auth/login`
- **payload**: `{ "email": string, "passwordHash": string }`, где `passwordHash` — SHA‑256 от введённого пароля.
- **ответ**: `accessToken`, `accessTokenExpiresAt`, `user`. Дополнительно сервер выставляет HttpOnly‑cookie `doghub_refresh_token` с долгоживущим refresh‑токеном.

### `POST /auth/refresh`
- Используется для прозрачного продления сессии. Refresh‑токен читается из HttpOnly‑cookie, поэтому тело запроса пустое.
- **ответ**: такой же, как у логина (`accessToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `user`). Предыдущий refresh‑токен ревокируется и заменяется новым.

### `POST /auth/logout`
- Сбрасывает текущий refresh‑токен и удаляет cookie. Тело запроса пустое, успешный ответ — `204 No Content`.