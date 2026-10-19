# Metrics + Anomaly-Guard

Misst API-Aufrufe (pro Route und Tag), stellt sie unter `/api/_stats` bereit und
sperrt Clients mit auffälligem Traffic automatisch für eine eskalierende Dauer
(5 min → 30 min → 2 h → 24 h → 7 Tage).

## Aktivieren

Das Modul wird in `app.module.ts` nur geladen, wenn **beides** zutrifft:

- `METRICS_ENABLED=true`
- Postgres ist konfiguriert (`TYPEORM_HOST` oder `TYPEORM_URL`). Die Entities nutzen
  `jsonb`/`timestamptz`, daher läuft es nicht mit dem SQLite-Fallback.

Die Tabellen (`metric_meta`, `metric_route`, `metric_daily`, `security_block`) legt
die Migration `InitialSchema` an.

## Umgebungsvariablen

| Variable | Default | Bedeutung |
|---|---|---|
| `METRICS_ENABLED` | – | `true` aktiviert das Modul |
| `METRICS_TOKEN` | – | Token für `/api/_stats` (mind. 32 Zeichen). Ohne Token antworten die Endpunkte mit 404. |
| `ANOMALY_ALLOWLIST` | – | Zusätzlich ausgenommene IPs, kommagetrennt |
| `ANOMALY_BURST_PER_MIN` | 120 | Requests pro Minute und IP |
| `ANOMALY_SUSTAINED_PER_5MIN` | 300 | Requests pro 5 Minuten und IP |
| `ANOMALY_UNIQUE_ROUTES_PER_MIN` | 40 | Verschiedene Routen pro Minute und IP |
| `ANOMALY_ERROR_RATIO` | 0.6 | Fehleranteil (4xx/5xx) über 5 Minuten |
| `ANOMALY_MIN_ERR_SAMPLES` | 50 | Mindestanzahl Requests für die Fehlerquote |

Token erzeugen: `openssl rand -hex 32`

## Endpunkte

Alle erfordern den Header `X-Metrics-Token: <METRICS_TOKEN>`.

| Methode | Pfad | Funktion |
|---|---|---|
| GET | `/api/_stats` | Zähler, Latenzen pro Route, Tageswerte |
| POST | `/api/_stats/reset` | Zähler zurücksetzen |
| GET | `/api/_stats/security` | Aktive Sperren |
| POST | `/api/_stats/security/unban` | Sperre aufheben, Body `{ "ip": "203.0.113.7" }` |

```bash
curl -H "X-Metrics-Token: $METRICS_TOKEN" https://klara.abler.tirol/api/_stats
```

Die `_stats`-Routen selbst werden nicht gezählt.

## Client-IP und Ausnahmen

- Die IP kommt aus `req.ip`. Express wertet `X-Forwarded-For` wegen
  `trust proxy = 1` (main.ts) nur für den einen vorgeschalteten Proxy (Traefik) aus.
  Den Header-Anfang kann ein Client frei setzen und wird daher ignoriert.
  **Wird ein weiterer Proxy vorgeschaltet, muss `trust proxy` angepasst werden.**
- Loopback- und private Adressen werden weder gezählt noch gesperrt. Darüber läuft
  der SSR-Frontend-Container, der die Server-Requests *aller* Nutzer bündelt.
- Hinter einem NAT (z. B. Schulnetz) teilen sich viele Nutzer eine IP. Bei Bedarf
  die Schwellwerte erhöhen oder die IP in `ANOMALY_ALLOWLIST` aufnehmen.

## Routen ausnehmen

```ts
import { SkipMetrics } from './metrics/metrics.decorator';
import { SkipAnomalyGuard } from './metrics/anomaly.guard';

@SkipMetrics()        // nicht zählen
@SkipAnomalyGuard()   // nie sperren
@Get('healthz')
health() { … }
```

`/api/healthz` ist bereits ausgenommen.

## Grenzen

- Sperren und Raten-Fenster liegen im Speicher einer Instanz; nur Sperren werden
  in `security_block` persistiert. Für mehrere Backend-Instanzen müsste das z. B.
  auf Redis umziehen.
- Requests, die schon ein Guard abweist (z. B. 401 ohne Login), erreichen den
  Interceptor nicht und fließen nicht in die Fehlerquote ein.
