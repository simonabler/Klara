import { StudentDataExportDto } from '@app/domain';

/** Ein Abschnitt der Auskunft: Überschrift + Tabelle (oder Fließtext ohne Spalten) */
export interface ExportSection {
  title: string;
  head: string[];
  rows: string[][];
  /** Text, wenn es keine Einträge gibt */
  empty?: string;
}

const NOTE_TYPES: Record<string, string> = {
  PARTICIPATION: 'Mitarbeit',
  BEHAVIOUR: 'Verhalten',
  GENERAL: 'Allgemein',
};

const GENDERS: Record<string, string> = { m: 'männlich', w: 'weiblich', d: 'divers' };

/** 'YYYY-MM-DD' oder ISO-Zeitstempel → 'TT.MM.JJJJ' (Zeitstempel in lokaler Zeit) */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('.');
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return [d.getDate(), d.getMonth() + 1].map(n => String(n).padStart(2, '0')).join('.') + '.' + d.getFullYear();
}

/** Wert eines Ergebnisses so, wie er erfasst wurde: Note, Punkte oder +/~/− bzw. Bestanden */
export function resultValue(r: StudentDataExportDto['results'][number]): string {
  if (r.grade != null) return `Note ${r.grade}`;
  if (r.points != null) return `${String(r.points).replace('.', ',')} Punkte`;
  return r.value ?? '';
}

/** Dateiname ohne Sonderzeichen, z. B. Datenauskunft_Muster_Anna_2026-10-05 */
export function exportFilename(data: StudentDataExportDto, ext: 'pdf' | 'json'): string {
  const clean = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const date = data.exportedAt.slice(0, 10);
  return `Datenauskunft_${clean(data.student.lastName)}_${clean(data.student.firstName)}_${date}.${ext}`;
}

/** Hinweise nach Art. 15 DSGVO (Zweck, Herkunft, Speicherdauer, Rechte) */
export function infoLines(data: StudentDataExportDto): string[] {
  const retention = data.retentionYears
    ? `Die Daten eines Schuljahres werden ${data.retentionYears} ${data.retentionYears === 1 ? 'Jahr' : 'Jahre'} nach dessen Ende (31.08.) zur Löschung vorgesehen.`
    : 'Es ist derzeit keine Aufbewahrungsfrist eingestellt.';
  return [
    'Zweck: pädagogische Dokumentation und Grundlage der Leistungsbeurteilung durch die Lehrkraft.',
    `Herkunft: erfasst von ${data.responsible.displayName || 'der Lehrkraft'} in Klara.`,
    `Speicherdauer: ${retention}`,
    'Rechte: Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), '
      + 'Widerspruch (Art. 21) sowie Beschwerde bei der Datenschutzbehörde (www.dsb.gv.at).',
    'Rechtsgrundlage und Empfänger: siehe Datenschutzinformation der Schule.',
  ];
}

/** Inhalt der Auskunft in der Reihenfolge des PDFs */
export function buildSections(data: StudentDataExportDto): ExportSection[] {
  const s = data.student;
  const or = (v: string | null | undefined) => v || '–';

  return [
    {
      title: 'Stammdaten',
      head: ['Feld', 'Wert'],
      rows: [
        ['Vorname', s.firstName],
        ['Nachname', s.lastName],
        ['Geburtsdatum', or(formatDate(s.dateOfBirth))],
        ['Geschlecht', or(s.gender ? GENDERS[s.gender] ?? s.gender : null)],
        ['E-Mail', or(s.email)],
        ['Telefon', or(s.phone)],
        ['Profilbild', s.hasProfilePhoto ? 'gespeichert' : 'keines'],
        ['Angelegt am', formatDate(s.createdAt)],
        ['Zuletzt geändert', formatDate(s.updatedAt)],
      ],
    },
    {
      title: 'Erziehungsberechtigte',
      head: ['Name', 'E-Mail', 'Telefon'],
      rows: data.parents.map(p => [`${p.firstName} ${p.lastName}`, or(p.email), or(p.phone)]),
      empty: 'Keine Erziehungsberechtigten gespeichert.',
    },
    {
      title: 'Klassen',
      head: ['Klasse', 'Schuljahr', 'Schulstufe'],
      rows: data.classes.map(c => [c.name, or(c.schoolYear), c.schoolLevel ? `${c.schoolLevel}.` : '–']),
      empty: 'Keiner Klasse zugeordnet.',
    },
    {
      title: 'Leistungen',
      head: ['Datum', 'Leistung', 'Art', 'Fach', 'Ergebnis', 'Kommentar'],
      rows: data.results.map(r => [formatDate(r.date), r.title, r.assessmentType, or(r.subject), resultValue(r), r.comment ?? '']),
      empty: 'Keine Leistungen gespeichert.',
    },
    {
      title: 'Notizen',
      head: ['Datum', 'Art', 'Fach', 'Notiz'],
      rows: data.notes.map(n => [formatDate(n.createdAt), NOTE_TYPES[n.type] ?? n.type, or(n.subject), n.content]),
      empty: 'Keine Notizen gespeichert.',
    },
  ];
}
