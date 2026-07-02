# Kakera Library

人生で触れてきたコンテンツのカケラを集約する、セルフホスト型ライブラリ管理システム。

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
- 📱 Web・Android・iOS（React Native + Expo）
- 🐳 Docker Composeによるセルフホスト
- 🔐 JWT認証+TOTP（Google Authenticator）オプション
- 💾 自動バックアップ・エクスポート/インポート（JSON）

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22 + Echo v4 |
| Web | React 18 + TypeScript + Vite + TailwindCSS |
| Mobile | React Native + Expo SDK 51 |
| Database | PostgreSQL 16 |
| Auth | JWT（15m access / 7d refresh）+ TOTP |
| Metadata | Google Books API + TMDB API |
| Infra | Docker Compose |

---

## 始め方

### 必要な環境

- Docker Compose v2

### 1. クローン

```bash
git clone https://github.com/datsuka-qwerty/kakera-library.git
cd kakera-library
```

### 2. 環境変数の設定

リポジトリルートに `.env` ファイルを作成します。

```env
# 必須 — 生成コマンド: openssl rand -hex 32
JWT_SECRET=your-very-long-random-secret-here

# データベースパスワード（ローカル以外の環境では変更してください）
POSTGRES_PASSWORD=change-me

# 省略可能 — なくてもメタデータ検索は動作しますが、結果が制限されます
GOOGLE_BOOKS_API_KEY=
TMDB_API_KEY=

# Web UIのポート番号（デフォルト: 3000）
# WEB_PORT=3000

# リバースプロキシを使う場合はドメインを設定します
# CORS_ORIGIN=https://kakera.yourdomain.com
```

> **`.env` はバージョン管理に含めないでください。** `.gitignore` に登録済みです。

### 3. ビルドと起動

```bash
docker compose up -d --build
```

起動するサービスは以下の3つです。

| サービス | 役割 | 外部ポート |
|---------|------|-----------|
| `postgres` | PostgreSQLデータベース | なし（内部のみ） |
| `api` | Go REST API | なし（nginx経由） |
| `web` | nginx（React配信・APIプロキシ） | `WEB_PORT`（デフォルト **3000**） |

### 4. 初期セットアップ

ブラウザで **http://localhost:3000** を開きます。
初回アクセス時に管理者アカウントを作成するページが表示されます。
追加ユーザーは **設定 → ユーザー管理** から作成できます（管理者のみ）。

---

## 永続化データ

Docker Composeが自動的に作成するボリュームは以下の2つです。

| ボリューム | マウント先 | 内容 | 削除した場合の影響 |
|-----------|-----------|------|-----------------|
| `postgres_data` | `/var/lib/postgresql/data` | すべてのデータ（本・映画・ドラマ・ユーザー・設定） | **データが完全に失われます** |
| `backups` | `/backups` | バックアップ機能が作成するスナップショット（`.sql.gz`） | バックアップ履歴が失われます |

> `docker compose down` はボリュームを保持します。`docker compose down -v` は**削除します**。

バックアップをホスト上のディレクトリに保存する場合は、`docker-compose.yml` のボリューム設定を変更してください。

```yaml
volumes:
  - ./backups:/backups
```

---

## リバースプロキシ

各種リバースプロキシ（nginx、Caddy、Traefikなど）を経由して公開する場合は、すべてのトラフィックを `web` コンテナに転送します。
`/api/*` のAPI転送は `web` コンテナ内のnginxが自動的に処理します。

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

リバースプロキシを使う場合は `.env` に `CORS_ORIGIN=https://kakera.yourdomain.com` を設定してください。

---

## APIキー

**Google Books API**（書籍メタデータおよびISBN検索）:
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスして「Books API」を有効化する
2. APIキーを作成し、`.env` の `GOOGLE_BOOKS_API_KEY` に設定する

**TMDB API**（映画・ドラマメタデータ）:
1. [themoviedb.org](https://www.themoviedb.org/) で無料アカウントを作成する
2. 設定 → API → APIキーを申請する
3. キーを `.env` の `TMDB_API_KEY` に設定する

> TMDBのクレジット表示は利用規約で必須です。Web UIは自動的にTMDBクレジットを表示します。

---

## モバイル

### Android

各 [GitHub Release](../../releases) にAPKが添付されています。`.apk` をダウンロードしてインストールしてください。

ソースからビルドする場合:

```bash
npm install
cd apps/mobile && npx expo run:android
```

### iOS

iOSのビルドにはEAS（Expo Application Services）が必要です。

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```

---

## バックアップと復元

バックアップは **設定 → バックアップ** から管理します（管理者のみ）。

- **自動バックアップ** — 間隔と保持スナップショット数の設定
- **手動バックアップ** — `Backup Now` ボタンで実行
- **復元** — スナップショットを選択して `Restore` から実行
- スナップショットは `backup_YYYYMMDD_HHMMSS.sql.gz` 形式で `backups` ボリュームに保存

**エクスポート/インポート（JSON）**:
すべてのユーザーが **設定 → データ** から自分のデータをエクスポートできます。
エクスポートしたデータは別のインスタンスにインポートできます。

---

## Contributing

翻訳の追加を特に歓迎します。

### 翻訳への参加

Webフロントエンドおよびモバイル版はどちらもi18nextを使用しています。
現在対応している言語: 🇯🇵 日本語（`ja`）· 🇺🇸 英語（`en`）

#### Web版への言語追加

**1. 英語ロケールファイルをコピーします**

```bash
cp apps/web/src/i18n/locales/en.json apps/web/src/i18n/locales/<lang>.json
# 例: cp apps/web/src/i18n/locales/en.json apps/web/src/i18n/locales/zh.json
```

**2. 値をすべて翻訳します** — キーは変更しないでください

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "books": "Books",
    ...
  }
}
```

`{{username}}`・`{{n}}` などのプレースホルダーはそのまま残してください。

**3. ロケールを登録します** — `apps/web/src/i18n/index.ts`

```ts
import zh from "./locales/zh.json";  // インポートを追加

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    zh: { translation: zh },  // ここに追加
  },
  ...
});
```

**4. 言語セレクタに追加します** — `apps/web/src/pages/SettingsPage.tsx`

```ts
const LANGUAGES = [
  { code: "ja", label: "日本語", sublabel: "Japanese" },
  { code: "en", label: "English", sublabel: "英語" },
  { code: "zh", label: "中文", sublabel: "Chinese" },  // ここに追加
];
```

#### モバイル版への言語追加

モバイルの翻訳はすべて `apps/mobile/lib/i18n.ts` の1ファイルに集約されています。
既存の `ja`・`en` オブジェクトと同じ構造で新しい言語オブジェクトを追加し、`i18n.init({ resources: { ... } })` に登録してください。

#### Tips

- 既存の翻訳のトーン（フレンドリーで簡潔）に合わせること
- 適切な訳語がない場合は英語のままでかまわない
- 対象言語の日付・数値の表記規則にしたがうこと

---

### Pull Request

#### 開始前に

- **バグ修正**: 原因が明確でない場合は、先にIssueを立てること
- **新機能**: 実装前にIssueで方針を議論すること
- **翻訳**: 事前のIssueは不要。そのままPull Requestを送ること

#### チェックリスト

- [ ] CIがすべてグリーンであること
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
- [ ] 変更が1つの目的に絞られていること
- [ ] 無関係なリファクタリングや整理が含まれていないこと
- [ ] コミットメッセージが以下のフォーマットにしたがっていること

#### コミットメッセージフォーマット

```
<type>(<scope>): <短い説明（英語）>

例:
feat(web): add series grouping view for books
fix(api): correct pagination off-by-one error
i18n(web): add Chinese (zh) translation
docs: update reverse proxy example
```

タイプ: `feat` · `fix` · `i18n` · `docs` · `refactor` · `test` · `chore`

#### 送り方

1. リポジトリをForkする
2. `main` からブランチを作成する: `git checkout -b feat/my-change`
3. 目的を絞ったコミットを作成する
4. `main` に向けてPull Requestを作成する
   - タイトルはコミットメッセージと同じフォーマットで記載すること
   - 説明には**何を**変更したか、**なぜ**変更したかを記載すること
   - 翻訳PRの場合は言語名・BCP 47コード・翻訳の完成度を記載すること

---

## ローカル開発

Dockerを使わない場合の開発環境セットアップです。

### 必要な環境

- Node.js 22+、Go 1.22+
- PostgreSQL 16（または `docker compose up postgres -d` でコンテナを起動）

### 起動

```bash
# Node.js依存パッケージをインストール
npm install

# APIの設定
cp apps/api/.env.example apps/api/.env
# apps/api/.env を編集して DATABASE_URL にローカルのPostgreSQL接続情報を設定

# APIを起動
cd apps/api && go run ./cmd/server/main.go

# Webフロントエンドを起動（別ターミナル）
cd apps/web && npm run dev

# モバイルを起動（Expo Go経由）
cd apps/mobile && npx expo start
```

---

## License

[MIT License](LICENSE)

TMDBメタデータ機能を使用する場合は、TMDBのクレジット表示が必要です。
This product uses the TMDB API but is not endorsed or certified by TMDB.
