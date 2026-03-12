# Klassen-Dashboard als Startseite (`/app`)

## Zusammenfassung

Die heutige Home-Seite (`/app`) wird durch ein Klassen-Dashboard ersetzt.
Statt des generischen Icon-Grids sieht eine Lehrkraft nach dem Login sofort
ihre Klassen des laufenden Schuljahres – als Kacheln, direkt einsatzbereit.

---

## Motivation

Die aktuelle Home-Seite bietet keinen inhaltlichen Mehrwert: Das Icon-Grid
dupliziert die Sidebar-Navigation. Eine Lehrkraft, die sich einloggt, will
sofort wissen: *„Welche Klassen unterrichte ich gerade?"* – nicht ein
Navigationsmenü als Kacheln sehen.

Das `schoolYear`-Feld ist bereits an der `Class`-Entity vorhanden.
Das laufende Schuljahr lässt sich deterministisch berechnen – ohne
Konfigurationsaufwand.

---

## Ziel

- **`/app` zeigt ein Klassen-Dashboard** mit den Klassen des aktuellen Schuljahres
- **Schuljahr wird automatisch vorausgewählt** (kein manueller Schritt nötig)
- **Klick auf eine Klasse** öffnet die Beurteilungsseite mit dieser Klasse vorausgewählt
- **Historische Schuljahre** sind über einen dezenten Jahres-Selektor erreichbar

---

## Schuljahr-Logik (Frontend, kein Backend-Aufwand)

Das aktuelle Schuljahr wird rein im Frontend berechnet:

```typescript
function currentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-basiert
  // Ab September beginnt das neue Schuljahr
  const startYear = month >= 9 ? year : year - 1;
  const endYear = (startYear + 1).toString().slice(-2);
  return `${startYear}/${endYear}`; // z.B. "2025/26"
}
```

| Datum | Berechnetes Schuljahr |
|---|---|
| März 2026 | `2025/26` |
| Oktober 2026 | `2026/27` |
| August 2026 | `2025/26` |

---

## UI-Konzept

### Seitenaufbau `/app`

```
┌─────────────────────────────────────────────────────┐
│  Guten Morgen, Maria.                               │
│  Schuljahr  [← 2024/25]  2025/26  [2026/27 →]      │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  4A      │  │  4B      │  │  3A      │          │
│  │  3. Stufe│  │  3. Stufe│  │  2. Stufe│          │
│  │  24 Schü.│  │  22 Schü.│  │  19 Schü.│          │
│  │  2 offen │  │  –       │  │  1 offen │          │
│  └──────────┘  └──────────┘  └──────────┘          │
├─────────────────────────────────────────────────────┤
│  [Neue Klasse anlegen]                              │
└─────────────────────────────────────────────────────┘
```

### Klassen-Kachel – Inhalt

Jede Kachel zeigt:

| Element | Quelle | Hinweis |
|---|---|---|
| Klassenname (z.B. `4A`) | `class.name` | Groß, prominent |
| Schulstufe (z.B. `3. Schulstufe`) | `class.schoolLevel` | Sekundär |
| Anzahl Schüler | `class.students.length` | Via `GET /api/classes` mit `students` |
| Offene Leistungsereignisse | `GET /api/assessments` gefiltert | Ereignisse ohne vollständige Ergebnisse |

**„Offen"** bedeutet: Ein `AssessmentEvent` dieser Klasse hat weniger
`StudentResult`-Einträge als die Klasse Schüler hat.

### Klick auf Kachel

```
Kachel „4A" → /app/beurteilung?classId=<uuid>
```

Die Beurteilungsseite liest den `classId`-QueryParam und wählt die Klasse
automatisch vor. Die bestehende Beurteilungsseite bleibt unverändert –
sie bekommt nur Unterstützung für einen initialen QueryParam.

### Schuljahr-Selektor

- Zeigt nur Schuljahre an, für die tatsächlich Klassen existieren
- Zusätzlich immer das berechnete aktuelle Schuljahr (auch wenn leer)
- Einfache Prev/Next-Pfeile, kein Dropdown
- Kein eigener API-Endpunkt nötig – Schuljahre werden aus den geladenen
  Klassen aggregiert

### Empty State

Wenn keine Klassen für das gewählte Schuljahr vorhanden:

```
„Noch keine Klassen für 2025/26.
 [Erste Klasse anlegen]"
```

---

## Betroffene Dateien

### Frontend

| Datei | Änderung |
|---|---|
| `features/home/home.component.ts` | Vollständig ersetzen durch Dashboard-Logik |
| `features/beurteilung/beurteilung.component.ts` | `classId` QueryParam auslesen und vorauswählen |
| `core/class.service.ts` | `getClasses()` muss `students` mitzählen (oder eigener Endpunkt) |

### Backend

| Datei | Änderung |
|---|---|
| `class/class.service.ts` | `findAll()` – Schüleranzahl als `studentCount` mitliefern |
| `class/class.controller.ts` | Optional: `?withCounts=true` Query-Parameter |
| `assessment/assessment.service.ts` | Optional: offene Ereignisse pro Klasse aggregieren |

---

## Offene Entscheidungen

- [ ] **Schüleranzahl**: Direkt in `GET /api/classes` mitliefern (via `loadEagerRelations`
  oder separater Count-Query) – oder separater Endpunkt `GET /api/classes/:id/stats`?
- [ ] **Offene Leistungsereignisse**: Im Frontend aus `GET /api/assessments?classId=X`
  berechnen, oder im Backend als `openCount` vorberechnen?
- [ ] **QueryParam vs. Signal**: Beurteilungsseite bekommt `classId` via QueryParam –
  oder besser via Navigation-State (`router.navigate(..., { state: { classId } })`)?

---

## Abgrenzung / Nicht-Ziele

- Kein neues Dashboard-Widget-System, keine Statistiken
- Keine Änderung an der Sidebar-Navigation
- Keine neue Klassen-Detailseite (bleibt späteres Issue)
- Die bestehende Klassen-Verwaltung (`/app/classes`) bleibt unverändert

---

## Akzeptanzkriterien

- [ ] `/app` zeigt nach Login sofort die Klassen des aktuellen Schuljahres
- [ ] Schuljahr wird automatisch korrekt berechnet (Sep–Aug-Logik)
- [ ] Kacheln zeigen: Klassenname, Schulstufe, Schüleranzahl, offene Leistungsereignisse
- [ ] Klick auf Kachel öffnet `/app/beurteilung` mit vorausgewählter Klasse
- [ ] Schuljahr-Selektor zeigt nur vorhandene + aktuelles Schuljahr
- [ ] Empty State bei learem Schuljahr mit CTA „Erste Klasse anlegen"
- [ ] Responsiv: auf Mobile stapeln Kacheln einspaltig

---

## Branch-Vorschlag

`26-klassen-dashboard-home`
