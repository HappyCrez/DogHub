# Клиент DogHub

Фронтенд DogHub построен на Vite, React 19 и TypeScript. В репозитории лежит само SPA, dev‑сервер, ESLint‑конфигурация и автотесты на Vitest + Testing Library.

## Быстрый старт

```bash
cd client
npm install
npm run dev
```

## Автотесты

Vitest настроен в `vitest.config.ts`, окружение jsdom и хелперы из `src/test/setup.ts`. Основные сценарии:

```bash
# полный прогон (то же, что в CI)
npm run test

# режим наблюдения
npm run test -- --watch

# запуск конкретного файла/маски
npm run test -- src/pages/__tests__/Events.test.tsx
```

Покрытие включает:

- smoke/интеграционные тесты страниц (главная, собаки, события, кабинет)
- CRUD‑компоненты: админские формы, модалки профиля/собаки, карточки
- хуки (`useAdminAccess`, `useCurrentMember`) и утилиту `groupUsers`

Все вспомогательные утилиты и фикстуры находятся в `src/test/` (кастомный `renderWithProviders`, подстановки для ResizeObserver/matchMedia, фабрики данных и т.д.).

## Линтинг

```bash
npm run lint
```

Конфигурация уже содержит рекомендуемые правила React 19, при необходимости можно расширять её своими плагинами.