# Kakera Library

人生で触れてきたコンテンツのカケラを集約する、セルフホスト型ライブラリ管理アプリ。

本・映画・ドラマの記録、評価、共有をひとつの場所で管理できます。

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## Features

- 📚 蔵書管理（本・シリーズ・所有状態・読書ステータス・ISBNバーコードスキャン）
- 🎬 映画管理（視聴媒体・シリーズ管理・TMDB連携）
- 📺 ドラマ管理（シーズン・視聴進捗）
- ⭐ 5段階評価・タグ・メモ
- 👥 マルチユーザー・ダッシュボード共有・評価共有（一方向）
- 📊 ダッシュボード・月別統計・ステータス分布
- 📱 Web & Android / iOS（React Native + Expo）
- 🐳 Docker Compose によるセルフホスト
- 🔐 JWT認証 + TOTP（Google Authenticator）オプション
- 💾 自動バックアップ・エクスポート/インポート（JSON）

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22 + Echo v4 |
| Web | React 18 + TypeScript + Vite + TailwindCSS |
| Mobile | React Native + Expo（EAS Build for iOS） |
| Shared | TypeScript type definitions |
| Database | PostgreSQL 15 |
| Auth | JWT（15m access / 7d refresh）+ TOTP |
| Metadata | Google Books API + TMDB API |
| Infra | Docker Compose |

---

## Setup Guide

### Prerequisites

- Docker & Docker Compose v2
- （Development only）Node.js 20+, Go 1.22+

### 1. Clone and Configure

```bash
git clone https://github.com/datsuka-qwerty/kakera-library.git
cd kakera-library
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
# Database (used by Docker Compose — must match docker-compose.yml)
DATABASE_URL=postgres://kakera:kakera@postgres:5432/kakera?sslmode=disable

# JWT secret: generate with: openssl rand -hex 32
JWT_SECRET=your-very-long-random-secret-here

# External APIs (optional — metadata search won't work without these)
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
TMDB_API_KEY=your-tmdb-api-key

# CORS: URL that browsers use to reach the web frontend
# If behind a reverse proxy: CORS_ORIGIN=https://kakera.yourdomain.com
# Local access: CORS_ORIGIN=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Backup directory (inside the api container, mounted to ./backups/ on host)
BACKUP_DIR=/backups
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts:
- `postgres` — PostgreSQL database（port 5432, not exposed externally by default）
- `api` — Go REST API（port 3000）
- `web` — React frontend served by nginx（port 80）

Web UI: **http://localhost:80**  
API: **http://localhost:3000**

The first user to register via the API becomes the admin. You can create users through **Settings → User Management**（admin only）.

### 3. リバースプロキシ設定

VPN/LAN環境でリバースプロキシ（nginx、Caddy、TSDProxyなど）の背後で運用する場合：

**nginx example:**
```nginx
server {
    listen 443 ssl;
    server_name kakera.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

リバースプロキシ使用時は `.env` に `CORS_ORIGIN=https://kakera.yourdomain.com` を設定してください。

### 4. API Keys

**Google Books API**（for book metadata and ISBN lookup）:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Books API"
3. Create an API key and set `GOOGLE_BOOKS_API_KEY`

**TMDB API**（for movie/drama metadata）:
1. Create a free account at [themoviedb.org](https://www.themoviedb.org/)
2. Go to Settings → API → Request an API Key
3. Set `TMDB_API_KEY`

> TMDB attribution is required by their terms of service. The web frontend displays the TMDB credit logo automatically.

### 5. Mobile App（Android）

```bash
# Install dependencies
npm install

# Run on connected Android device / emulator
cd apps/mobile && npx expo run:android
```

**iOS（EAS Build — no Mac required）:**
```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```

---

## Development

```bash
# Install all JS dependencies (monorepo root)
npm install

# Start backend
cd apps/api && go run ./cmd/server/main.go

# Start web frontend
cd apps/web && npm run dev

# Start mobile (Expo Go)
cd apps/mobile && npx expo start
```

### Running Typechecks

```bash
cd apps/web && npm run typecheck
cd apps/mobile && npm run typecheck
cd packages/shared && npm run build
cd apps/api && go vet ./...
```

---

## バックアップ & リストア

バックアップは **Settings → バックアップ** から管理できます（admin only）。

- 自動バックアップ: 間隔と最大保存数を設定可能
- 手動バックアップ: 「今すぐバックアップ」をクリック
- リストア: バックアップファイルを選択して「リストア」をクリック
- ファイルはホストマシンの `./backups/` に保存される

### Export / Import（JSON）

全ユーザーが **Settings → データ → JSONでエクスポート** から自分のデータをエクスポートできます。  
インポートは以前にエクスポートしたファイルから復元するために使用します。

---

## i18n / 翻訳の追加

翻訳ガイドの詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

対応言語: 🇯🇵 日本語、🇺🇸 英語

---

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

---

## License

MIT License — see [LICENSE](LICENSE)

TMDB attribution is required when using TMDB metadata features.  
This product uses the TMDB API but is not endorsed or certified by TMDB.
