# Contributing to Kakera Library

Thank you for your interest in contributing! This document covers how to contribute translations, bug fixes, and new features.

## Table of Contents

- [Development Setup](#development-setup)
- [Translation Guide](#translation-guide)
- [Code Contributions](#code-contributions)
- [Pull Request Guidelines](#pull-request-guidelines)

---

## Development Setup

### Prerequisites

- Node.js 20+
- Go 1.22+
- Docker + Docker Compose
- (Android) Android Studio or physical device

### Getting Started

```bash
git clone https://github.com/datsuka-qwerty/kakera-library.git
cd kakera-library

# Install all Node.js dependencies
npm install

# Copy and configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values

# Start services
docker compose up -d

# Start API (separate terminal)
cd apps/api && go run ./cmd/server/main.go

# Start web frontend (separate terminal)
cd apps/web && npm run dev
```

---

## Translation Guide

Kakera Library uses [i18next](https://www.i18next.com/) for internationalization. Web translations live in `apps/web/src/i18n/`.

### Adding a New Language

**1. Create the translation file**

```bash
cp apps/web/src/i18n/en.json apps/web/src/i18n/<lang>.json
# Example: cp apps/web/src/i18n/en.json apps/web/src/i18n/zh.json
```

**2. Translate all values**

Open the new file and translate every value. **Do not change the keys.**

```json
{
  "nav": {
    "dashboard": "Dashboard",   ← translate this
    "books": "Books",           ← translate this
    ...
  }
}
```

**3. Register the locale**

Edit `apps/web/src/i18n/index.ts`:

```ts
import zh from "./zh.json";

const resources = {
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },   // add this line
};
```

**4. Add to the language switcher**

Edit `apps/web/src/components/Layout.tsx` and add your language to the switcher options.

**5. Submit a pull request**

See [Pull Request Guidelines](#pull-request-guidelines).

### Translation Tips

- Keep placeholders like `{{username}}` and `{{count}}` unchanged
- Match the tone of existing translations (friendly, concise)
- If a term has no natural translation, the English term is acceptable
- For date/number formats, follow the locale's conventions

### Currently Supported Languages

| Code | Language | Status |
|------|----------|--------|
| `en` | English | ✅ Complete |
| `ja` | Japanese | ✅ Complete |

---

## Code Contributions

### Bug Reports

Please open a GitHub Issue with:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, browser/device, Docker version)

### Feature Requests

Open a GitHub Issue describing the feature and your use case before starting implementation, so we can discuss the approach.

### Coding Guidelines

- **API (Go)**: Follow standard Go idioms. Run `go vet ./...` before submitting.
- **Web/Mobile (TypeScript)**: Run `npm run typecheck` before submitting.
- No comments unless the *why* is non-obvious.
- Do not add features beyond what the issue/PR describes.

---

## Pull Request Guidelines

1. Fork the repository and create a branch from `main`
2. Make your changes with clear, focused commits
3. Ensure CI passes (`go build`, `go vet`, `tsc --noEmit`)
4. Open a pull request with:
   - A clear title describing the change
   - A description of what was changed and why
   - For translations: the target language and completion status

### Commit Message Format

```
<type>(<scope>): <short description>

Examples:
feat(web): add series grouping view
fix(api): correct pagination off-by-one
i18n(zh): add Chinese translation
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `i18n`, `chore`

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
