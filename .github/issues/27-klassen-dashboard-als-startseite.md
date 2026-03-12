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
- **Klick auf eine Klasse** öffnet die Beurteilungsseite mit dieser Klasse vorausgewählt via Navigation-State
- **Historische Schuljahre** sind über einen dezenten Jahres-Selektor erreichbar
- Falls keine Klasse angelegt ist, greift die Empty-State-Logik: der Header mit
  Begrüßung bleibt gleich, darunter erscheinen die bestehenden Schnellzugriff-Kacheln
  (Schüler, Fächer, Klassen anlegen)

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

### Empty State (keine Klassen vorhanden)

```
┌─────────────────────────────────────────────────────┐
│  Guten Morgen, Maria.          ← Header bleibt      │
│  Schuljahr  2025/26                                 │
├─────────────────────────────────────────────────────┤
│  Noch keine Klassen für 2025/26.                    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Schüler  │  │  Fächer  │  │ Klassen  │          │
│  │ anlegen  │  │ anlegen  │  │ anlegen  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

### Klassen-Kachel – Inhalt

| Element | Quelle | Hinweis |
|---|---|---|
| Klassenname (z.B. `4A`) | `class.name` | Groß, prominent |
| Schulstufe (z.B. `3. Schulstufe`) | `class.schoolLevel` | Sekundär |
| Anzahl Schüler | `studentCount` vom Backend | Count-Query in `findAll()` |
| Offene Leistungsereignisse | `openAssessmentCount` vom Backend | Im Backend vorberechnet |

**„Offen"** bedeutet: Ein `AssessmentEvent` dieser Klasse hat weniger
`StudentResult`-Einträge als die Klasse Schüler hat.

### Klick auf Kachel

Navigation via **Router Navigation-State** (kein QueryParam):

```typescript
this.router.navigate(['/app/beurteilung'], {
  state: { classId: cls.id }
});
```

Die Beurteilungsseite liest beim Init:
```typescript
const nav = this.router.getCurrentNavigation();
const classId = nav?.extras?.state?.['classId'];
```

### Schuljahr-Selektor

- Zeigt nur Schuljahre an, für die tatsächlich Klassen existieren
- Zusätzlich immer das berechnete aktuelle Schuljahr (auch wenn leer)
- Einfache Prev/Next-Pfeile (`‹` / `›`), kein Dropdown
- Schuljahre werden aus den geladenen Klassen aggregiert – kein eigener Endpunkt

---

## Technische Entscheidungen

| Frage | Entscheidung |
|---|---|
| Schüleranzahl | Backend liefert `studentCount` als Count-Query direkt in `GET /api/classes` |
| Offene Leistungsereignisse | Backend berechnet `openAssessmentCount` vor |
| Navigation zur Beurteilungsseite | `router.navigate` mit Navigation-State (kein QueryParam) |

---

## Betroffene Dateien

### Backend

| Datei | Änderung |
|---|---|
| `class/class.service.ts` | `findAll()` erweitern: `studentCount` via Count-Query, `openAssessmentCount` aggregieren |
| `class/class.controller.ts` | Response-DTO um `studentCount` + `openAssessmentCount` erweitern |
| `libs/domain` | `ClassDto` um `studentCount?: number` und `openAssessmentCount?: number` ergänzen |

### Frontend

| Datei | Änderung |
|---|---|
| `features/home/home.component.ts` | Vollständig ersetzen durch Dashboard-Logik |
| `features/beurteilung/beurteilung.component.ts` | Navigation-State beim Init auslesen und Klasse vorauswählen |
| `core/class.service.ts` | Keine Änderung nötig (nutzt bestehenden `GET /api/classes`) |

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
- [ ] Klick auf Kachel navigiert zu `/app/beurteilung` via Navigation-State mit vorausgewählter Klasse
- [ ] Schuljahr-Selektor zeigt nur vorhandene Schuljahre + aktuelles Schuljahr
- [ ] Empty State: Begrüßungsheader bleibt, Schnellzugriff-Kacheln (Schüler/Fächer/Klassen) erscheinen
- [ ] Responsiv: auf Mobile stapeln Kacheln einspaltig

---

## Branch

`27-klassen-dashboard-als-startseite`
