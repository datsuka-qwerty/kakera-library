# Kakera Library

A self-hosted library management system to collect and track the content you've experienced in life.

Books, movies, and TV dramas — ratings, notes, and sharing — all in one place.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## Features

- 📚 Book management — series, ownership status, reading status, ISBN barcode scan
- 🎬 Movie management — viewing format, series grouping, TMDB integration
- 📺 TV drama management — seasons and viewing progress
- ⭐ 5-star ratings, tags, and notes
- 👥 Multi-user support with dashboard sharing and one-way rating visibility
- 📊 Dashboard with monthly statistics and status distribution charts
- 📱 Web + Android + iOS via React Native + Expo
- 🐳 Self-hosted via Docker Compose
- 🔐 JWT authentication with optional TOTP via Google Authenticator
- 💾 Automatic backups and JSON export/import

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22 + Echo v4 |
| Web | React 18 + TypeScript + Vite + TailwindCSS |
| Mobile | React Native + Expo SDK 51 |
| Database | PostgreSQL 16 |
| Auth | JWT + TOTP — 15m access token / 7d refresh token |
| Metadata | Google Books API + TMDB API |
| Infra | Docker Compose |

---

## Getting Started

### Prerequisites

- Docker Compose v2

### 1. Clone

```bash
git clone https://github.com/datsuka-qwerty/kakera-library.git
cd kakera-library
```

### 2. Configure Environment Variables

Create a `.env` file in the repository root:

```env
# Required — generate with: openssl rand -hex 32
JWT_SECRET=your-very-long-random-secret-here

# Database password — change this for non-local deployments
POSTGRES_PASSWORD=change-me

# Optional — the app works without these, but metadata search will be limited
GOOGLE_BOOKS_API_KEY=
TMDB_API_KEY=

# Web UI port, default: 3000
# WEB_PORT=3000

# Set your domain when using a reverse proxy
# CORS_ORIGIN=https://kakera.yourdomain.com
```

> **Do not commit `.env` to version control.** It is already listed in `.gitignore`.

### 3. Build and Start

```bash
docker compose up -d --build
```

Three services will start:

| Service | Role | External Port |
|---------|------|--------------|
| `postgres` | PostgreSQL database | None — internal only |
| `api` | Go REST API | None — proxied via nginx |
| `web` | nginx: React frontend + API proxy | `WEB_PORT`, default **3000** |

### 4. Initial Setup

Open **http://localhost:3000** in your browser.
On first access you will be prompted to create an administrator account.
Additional users can be created from **Settings → User Management** — admin only.

---

## Persistent Data

Docker Compose automatically creates two volumes:

| Volume | Mount | Contents | If removed |
|--------|-------|----------|-----------|
| `postgres_data` | `/var/lib/postgresql/data` | All data: books, movies, dramas, users, settings | **All data is permanently lost** |
| `backups` | `/backups` | Snapshots created by the backup feature — `.sql.gz` | Backup history is lost |

> `docker compose down` preserves volumes. `docker compose down -v` **deletes them**.

To save backups to a host directory, update the volume config in `docker-compose.yml`:

```yaml
volumes:
  - ./backups:/backups
```

---

## Reverse Proxy

To expose the app through a reverse proxy such as nginx, Caddy, or Traefik,
forward all traffic to the `web` container.
API routing for `/api/*` is handled automatically by the nginx inside the container.

```nginx
server {
    listen 443 ssl;
    server_name kakera.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

When using a reverse proxy, also set `CORS_ORIGIN=https://kakera.yourdomain.com` in `.env`.

---

## API Keys

Both keys are optional. The app runs without them, but metadata search results will be limited.

### Google Books API

Used for book metadata lookup and ISBN barcode search.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and sign in
2. Create a new project or select an existing one
3. Go to **APIs & Services → Library**, search for **Books API**, and click **Enable**
4. Go to **APIs & Services → Credentials → + Create Credentials → API key**
5. **Recommended:** Under **API restrictions**, select **Restrict key** and choose **Books API**
6. Copy the key and set it in `.env`:

```env
GOOGLE_BOOKS_API_KEY=AIza...
```

### TMDB API

Used for movie and TV drama metadata, posters, and cast information.

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to your account **Settings → API**
3. Under **Request an API Key**, click **Create** and choose **Developer**
4. Complete the application form — use your repository URL as the application URL
5. Copy the **API Key** labeled **v3 auth** — not the v4 Read Access Token
6. Set it in `.env`:

```env
TMDB_API_KEY=...
```

> **TMDB attribution is required by their Terms of Use.**
> The web UI automatically displays TMDB credit on all movie and drama pages.

---

## Mobile

### Android

APK files are attached to each [GitHub Release](../../releases).
Download and install the `.apk` directly on your device.

To build from source:

```bash
npm install
cd apps/mobile && npx expo run:android
```

### iOS

Building for iOS requires EAS — Expo Application Services.

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```

---

## Backup & Restore

Manage backups from **Settings → Backup** — admin only.

- **Automatic backup** — configure interval and number of snapshots to retain
- **Manual backup** — run immediately with the `Backup Now` button
- **Restore** — select a snapshot and click `Restore`
- Snapshots are stored as `backup_YYYYMMDD_HHMMSS.sql.gz` in the `backups` volume

**Export / Import via JSON:**
Any user can export their data from **Settings → Data**.
Exported data can be imported into another instance.

---

## Contributing

Translation contributions are especially welcome.

### Adding a Translation

Both the web frontend and mobile app use i18next for internationalization.
Currently supported: 🇯🇵 Japanese — `ja` · 🇺🇸 English — `en`

#### Web

**1. Copy the English locale file**

```bash
cp apps/web/src/i18n/locales/en.json apps/web/src/i18n/locales/<lang>.json
# Example: cp apps/web/src/i18n/locales/en.json apps/web/src/i18n/locales/zh.json
```

**2. Translate all values** — do not change the keys

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "books": "Books",
    ...
  }
}
```

Keep placeholders such as `{{username}}` and `{{n}}` unchanged.

**3. Register the locale** — `apps/web/src/i18n/index.ts`

```ts
import zh from "./locales/zh.json";  // add import

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    zh: { translation: zh },  // add here
  },
  ...
});
```

**4. Add to the language selector** — `apps/web/src/lib/languages.ts`

```ts
export const LANGUAGES = [
  { code: "ja", label: "日本語", sublabel: "Japanese" },
  { code: "en", label: "English", sublabel: "English" },
  { code: "zh", label: "中文", sublabel: "Chinese" },  // add here
];
```

#### Mobile

All mobile translations live in a single file: `apps/mobile/lib/i18n.ts`.
Add a new language object with the same key structure as the existing `ja` or `en` translations,
then register it in `i18n.init({ resources: { ... } })`.

#### Tips

- Match the tone of existing translations — friendly and concise
- If no natural translation exists, the English term is acceptable
- Follow the date and number formatting conventions of the target locale

---

### Pull Requests

#### Before You Start

- **Bug fixes**: If the cause is unclear, open an Issue first
- **New features**: Discuss the approach in an Issue before implementing
- **Translations**: No prior Issue needed — open a Pull Request directly

#### Checklist

- [ ] CI is fully green
  ```bash
  # Web
  cd apps/web && npm run typecheck
  # Mobile
  cd apps/mobile && npm run typecheck
  # Shared types
  cd packages/shared && npm run build
  # API
  cd apps/api && go build ./... && go vet ./...
  ```
- [ ] Changes are focused on a single purpose
- [ ] No unrelated refactoring or cleanup included
- [ ] Commit messages follow the format below

#### Commit Message Format

```
<type>(<scope>): <short description in English>

Examples:
feat(web): add series grouping view for books
fix(api): correct pagination off-by-one error
i18n(web): add Chinese (zh) translation
docs: update reverse proxy example
```

Types: `feat` · `fix` · `i18n` · `docs` · `refactor` · `test` · `chore`

#### How to Submit

1. Fork the repository
2. Create a branch from `main`: `git checkout -b feat/my-change`
3. Make focused commits
4. Open a Pull Request targeting `main`
   - Use the commit message format for the PR title
   - Describe **what** was changed and **why** in the PR body
   - For translation PRs, include the language name, BCP 47 code, and completion percentage

---

## Local Development

For development without Docker.

### Prerequisites

- Node.js 22+ and Go 1.22+
- PostgreSQL 16, or start a container: `docker compose up postgres -d`

### Start

```bash
# Install Node.js dependencies
npm install

# Configure the API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL to your local PostgreSQL connection string

# Start the API
cd apps/api && go run ./cmd/server/main.go

# Start the web frontend — separate terminal
cd apps/web && npm run dev

# Start the mobile app via Expo Go — separate terminal
cd apps/mobile && npx expo start
```

---

## License

[MIT License](LICENSE)

If you use the TMDB metadata feature, TMDB attribution is required.
This product uses the TMDB API but is not endorsed or certified by TMDB.
