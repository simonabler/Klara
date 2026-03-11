# Klara

Ein schlankes, intuitives Dokumentationstool für Lehrkräfte zur strukturierten Erfassung von Schülern, Beobachtungen und Leistungen.

> **Kein Schulverwaltungssystem** – sondern ein digitaler Notizblock mit Struktur.

---

## Inhalt

- [Produktidee](#produktidee)
- [Stack](#stack)
- [Projektstruktur](#projektstruktur)
- [Lokale Entwicklung](#lokale-entwicklung)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Verfügbare Skripte](#verfügbare-skripte)
- [Architekturprinzipien](#architekturprinzipien)

---

## Produktidee

Klara hilft Lehrkräften dabei, schnell und ohne Aufwand folgendes zu dokumentieren:

- **Schülerprofile** – Name, Bild, Geburtsdatum, Elterninformationen
- **Pädagogische Notizen** – Mitarbeit und Verhalten, fachbezogen und chronologisch
- **Leistungsdokumentation** – Schularbeiten, Überprüfungen, Ergebnisse je Schüler
- **Beurteilungsgrundlagen** – übersichtlich abrufbar, ohne automatische Notenlogik

---

## Stack

| Bereich | Technologie |
|---|---|
| Monorepo | [Nx](https://nx.dev) |
| Frontend | [Angular 20](https://angular.dev) mit SSR |
| Backend | [NestJS 11](https://nestjs.com) |
| Datenbank | [PostgreSQL 17](https://www.postgresql.org) |
| ORM | [TypeORM](https://typeorm.io) |
| Containerisierung | Docker / Docker Compose |

---

## Projektstruktur

```
/
├── apps/
│   ├── klara/          # Angular Frontend (SSR)
│   └── server/         # NestJS Backend
├── libs/
│   └── domain/         # Shared Library: DTOs, Interfaces, Enums
│                       # Import via @app/domain
├── dockerfiles/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── conf/
│   └── postgres/
│       └── .env.template
├── docker-compose.yml      # Produktion (mit Traefik)
├── docker-compose.dev.yml  # Lokale Entwicklung
└── .env.example
```

### Shared Library `@app/domain`

Die Library `libs/domain` ist die einzige Quelle der Wahrheit für alle geteilten Typen zwischen Frontend und Backend.

```typescript
import { NoteType, AssessmentEventType } from '@app/domain';
```

Sie enthält DTOs, TypeScript-Interfaces und Enums. Beide Apps importieren ausschließlich aus `@app/domain` – keine doppelten Typdefinitionen.

---

## Lokale Entwicklung

### Voraussetzungen

- [Docker](https://www.docker.com) und Docker Compose
- [Node.js 20+](https://nodejs.org) und npm (für Entwicklung ohne Docker)

### Mit Docker starten

```bash
# 1. Umgebungsvariablen vorbereiten
cp .env.example .env
cp conf/postgres/.env.template conf/postgres/.env
# Werte in beiden Dateien anpassen

# 2. Alle Services starten
docker compose -f docker-compose.dev.yml up --build

# Frontend:  http://localhost
# Backend:   http://localhost/api
# Swagger:   http://localhost/api/docs
# DB:        localhost:5432
```

### Ohne Docker (Entwicklungsmodus)

```bash
npm install

# Backend starten
npx nx serve server

# Frontend starten (separates Terminal)
npx nx serve klara
```

Der Angular Dev-Server proxied `/api` automatisch auf `http://localhost:3000` (siehe `apps/klara/proxy.conf.json`).

---

## Umgebungsvariablen

Kopiere `.env.example` nach `.env` und passe die Werte an:

```env
# Datenbank
TYPEORM_HOST=db
TYPEORM_PORT=5432
TYPEORM_DATABASE=klara
TYPEORM_USERNAME=user
TYPEORM_PASSWORD=dein-passwort
TYPEORM_SYNC=true

# App
NODE_ENV=production
PORT=3000

# Auth (ab Issue 2)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost/api/auth/google/callback
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=8h
```

Für die Datenbank zusätzlich `conf/postgres/.env` aus dem Template befüllen.

---

## Verfügbare Skripte

```bash
# Bauen
npx nx build server      # NestJS Backend bauen
npx nx build klara       # Angular Frontend bauen

# Tests
npx nx test server       # Backend Unit Tests
npx nx test domain       # Shared Library Tests
npx nx test klara        # Frontend Unit Tests

# Linting
npx nx lint server
npx nx lint klara
npx nx lint domain
```

---

## Architekturprinzipien

**Shared DTOs als Vertragsgarantie**
Alle API-Typen leben in `libs/domain`. Eine Änderung dort bricht sofort Tests in Frontend und Backend – kein stiller Drift zwischen den Schichten.

**MVP-first**
Jede Funktion muss einer Lehrkraft im Alltag direkt helfen. Was das nicht tut, kommt nicht in den MVP.

**Einfachheit vor Vollständigkeit**
Klara ist kein Schulverwaltungssystem. Es ist ein fokussiertes Werkzeug, das Lehrkräfte ohne Einführung sofort verstehen und verwenden können.

---

## API

Das Backend ist unter `/api` erreichbar. Die Swagger-Dokumentation ist verfügbar unter:

```
http://localhost/api/docs      # lokal via Docker
http://localhost:3000/api/docs # lokal ohne Docker
```

Health-Check: `GET /api/healthz` → `{ "status": "ok" }`

---

## Lizenz

MIT – siehe [LICENSE.md](LICENSE.md)
