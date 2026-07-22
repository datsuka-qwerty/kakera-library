# CLAUDE.md — Kakera Library Codebase Guide

## Repository Structure

```
kakera-library/
├── apps/
│   ├── api/          # Go + Echo REST API
│   ├── web/          # React + TypeScript + Vite frontend
│   └── mobile/       # React Native + Expo mobile app
├── packages/
│   └── shared/       # Shared TypeScript type definitions
├── docker-compose.yml
└── .env.example
```

## Monorepo

npm workspaces. Install all deps from root: `npm install`

## apps/api (Go)

- **Entry**: `cmd/server/main.go`
- **Routes**: `internal/server/server.go`
- **Services**: `internal/service/` — one file per domain (book, movie, drama, auth, user, backup, dashboard, metadata, sharing)
- **Middleware**: `internal/middleware/auth.go` — JWT Bearer extraction, `AdminOnly()`
- **DB**: `internal/db/` — pgxpool connection, migration runner (reads `db/migrations/*.sql` in order)
- **Migrations**: `db/migrations/001_initial_schema.sql`

Run: `go run ./cmd/server/main.go` from `apps/api/`

## apps/web (React)

- **Pages**: `src/pages/` — DashboardPage, BooksPage, MoviesPage, DramasPage, SettingsPage
- **API clients**: `src/lib/api/` — axios-based, one file per domain
- **State**: Zustand store in `src/store/authStore.ts` (localStorage)
- **i18n**: `src/i18n/` — `ja.json`, `en.json`; add new languages by dropping a new JSON file and updating the language switcher in `Layout.tsx`
- **Styles**: TailwindCSS + global utility classes in `src/index.css` (`.input`, `.btn-primary`, etc.)
- **Theme**: light = ivory (`#F5F0E8` bg), dark = dark gray; toggled via `localStorage` key `theme`

Run: `npm run dev` from `apps/web/`

## apps/mobile (React Native + Expo)

- **Screens**: `app/(tabs)/` — index, books, movies, dramas, animes
  - Extra screens: `login.tsx`, `barcode.tsx`, `settings.tsx`
- **Tab order**: books → movies → index（default）→ dramas → animes
- **Auth guard**: `app/_layout.tsx` — redirects unauthenticated users to `/login`
- **State**: Zustand + AsyncStorage in `store/authStore.ts`
- **API client**: `lib/apiClient.ts` — reads `serverUrl` from store, JWT refresh interceptor
- **UI components**: `components/ui/` — StarRating, StatusBadge, CoverImage

Build for Android: `npx expo run:android`
Build for iOS (EAS): `npx eas build --platform ios`

## packages/shared

TypeScript type definitions only. Run `npm run build` to emit to `dist/`.

## Environment Variables

Copy `.env.example` to `.env` in `apps/api/`. Key variables:
- `DATABASE_URL` — PostgreSQL DSN
- `JWT_SECRET` — at least 32 random characters
- `GOOGLE_BOOKS_API_KEY` — for book metadata search
- `TMDB_API_KEY` — for movie/drama metadata (TMDB attribution required in UI)
- `CORS_ORIGIN` — URL browsers use to reach the web frontend (e.g. `https://kakera.yourdomain.com`)

## Git / Commits

- Commit messages in English
- GPG signing is required on this machine.
- If signing fails after a Windows restart, run the preset-passphrase script in `%APPDATA%\gnupg\`.
- Use PowerShell with `& "C:\Program Files\Git\bin\git.exe"` for git operations

## Adding a New Language (i18n)

1. Copy `apps/web/src/i18n/en.json` to `apps/web/src/i18n/<lang>.json`
2. Translate all values (keep keys unchanged)
3. Register the new locale in `apps/web/src/i18n/index.ts`
4. Add the language option to the switcher in `apps/web/src/components/Layout.tsx`

See [CONTRIBUTING.md](CONTRIBUTING.md) for the translation contribution guide.

## API Conventions

- All endpoints under `/api/v1/`
- JWT Bearer token required (except `/auth/login`, `/auth/refresh`)
- Pagination: `?page=1&perPage=20&search=&status=`
- Error responses: `{ "error": "message" }`

## Docker

```bash
docker compose up -d
```

Services: `postgres`, `api` (port 3000), `web` (nginx, port 80).
Backup files are stored in `./backups/` on the host (bind mount).
