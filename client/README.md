# DogHub client

Frontend for the DogHub platform is built with Vite, React 19 and TypeScript. This package contains the SPA itself, development tooling (Vite dev server, ESLint) and the automated test suite powered by Vitest + Testing Library.

## Getting started

```bash
cd client
npm install
npm run dev
```

## Running the automated tests

Vitest is configured in `vitest.config.ts` with jsdom, React Testing Library helpers (`src/test/setup.ts`) and coverage reporters. Typical commands:

```bash
# run the entire suite once (used in CI)
npm run test

# interactive watch mode during development
npm run test -- --watch

# focus on a single file or pattern
npm run test -- src/pages/__tests__/Events.test.tsx
```

The suite covers:

- smoke and integration tests for the main pages (home, dogs, events, account)
- CRUD-oriented components such as the admin forms, profile/dog modals and cards
- hooks (`useAdminAccess`, `useCurrentMember`) and shared utils (`groupUsers`)

All helpers live in `src/test/` (custom render with Router/Auth providers, fixtures, global stubs for ResizeObserver, matchMedia, etc.).

## Linting

ESLint is available via:

```bash
npm run lint
```

The config already ships with the React 19 recommended ruleset. Feel free to extend it if you need stricter checks.
