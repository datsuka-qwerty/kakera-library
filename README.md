# Kakera Library

人生で触れてきたコンテンツのカケラを集約する、セルフホスト型ライブラリ管理アプリ。

本・映画・ドラマの記録、評価、共有をひとつの場所で管理できます。

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## Features

- 📚 蔵書管理（本・シリーズ・所有状態・読書ステータス）
- 🎬 映画管理（視聴媒体・シリーズ管理）
- 📺 ドラマ管理（シーズン・視聴進捗）
- ⭐ 5段階評価・タグ・メモ
- 👥 マルチユーザー・評価共有機能
- 📊 ダッシュボード・統計
- 📱 Web & Android / iOS（React Native）
- 🐳 Docker Compose によるセルフホスト

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go + Echo |
| Web | React + TypeScript + Vite |
| Mobile | React Native + Expo |
| Shared | TypeScript (types & API client) |
| Database | PostgreSQL |
| Auth | JWT + TOTP (Google Authenticator) |
| Metadata | Google Books API + TMDB API |

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/kakera-library.git
cd kakera-library
cp .env.example .env
# Edit .env with your settings
docker compose up -d
```

Web UI: http://localhost:3000

## Development

```bash
# Install JS dependencies
npm install

# Start backend (Go)
cd apps/api && go run ./cmd/server

# Start web frontend
npm run dev:web

# Start mobile (Expo)
npm run dev:mobile
```

## License

MIT License — see [LICENSE](LICENSE)

TMDB attribution required when using TMDB metadata features.
