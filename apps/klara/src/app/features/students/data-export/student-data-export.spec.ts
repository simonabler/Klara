import { StudentDataExportDto } from '@app/domain';
import { buildSections, exportFilename, formatDate, infoLines, resultValue } from './student-data-export';

const data: StudentDataExportDto = {
  exportVersion: '1.0',
  exportedAt: '2026-10-05T12:00:00.000Z',
  responsible: { displayName: 'Frau Lehrerin', email: 'l@schule.at' },
  retentionYears: 2,
  student: {
    firstName: 'Zoë', lastName: 'Müller-Öz', dateOfBirth: '2012-03-04', gender: 'w', email: null, phone: '+43 1',
    hasProfilePhoto: true, createdAt: '2025-09-10T08:00:00.000Z', updatedAt: '2026-01-02T08:00:00.000Z',
  },
  parents: [{ firstName: 'Max', lastName: 'Müller', email: 'max@example.at', phone: null }],
  classes: [{ name: '4A', schoolYear: '2026/27', schoolLevel: 4 }],
  results: [
    { date: '2026-09-20', title: 'SA 1', assessmentType: 'Schularbeit', subject: 'Deutsch', class: '4A',
      grade: 2, points: null, value: null, comment: 'sauber', recordedAt: '2026-09-20T10:00:00.000Z' },
    { date: '2026-10-01', title: 'Test', assessmentType: 'Punktetest', subject: null, class: null,
      grade: null, points: 37.5, value: null, comment: null, recordedAt: '2026-10-01T10:00:00.000Z' },
  ],
  notes: [],
};

describe('student-data-export', () => {
  it('formatiert Datumswerte als TT.MM.JJJJ', () => {
    expect(formatDate('2012-03-04')).toBe('04.03.2012');
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
  });

  it('zeigt Ergebnisse so, wie sie erfasst wurden', () => {
    expect(resultValue(data.results[0])).toBe('Note 2');
    expect(resultValue(data.results[1])).toBe('37,5 Punkte');
    expect(resultValue({ ...data.results[1], points: null, value: '+' })).toBe('+');
  });

  it('erzeugt einen Dateinamen ohne Umlaute und Sonderzeichen', () => {
    expect(exportFilename(data, 'pdf')).toBe('Datenauskunft_Muller-Oz_Zoe_2026-10-05.pdf');
    expect(exportFilename(data, 'json')).toMatch(/\.json$/);
  });

  it('enthält alle Abschnitte in fester Reihenfolge', () => {
    expect(buildSections(data).map(s => s.title)).toEqual(['Stammdaten', 'Erziehungsberechtigte', 'Klassen', 'Leistungen', 'Notizen']);
  });

  it('übersetzt Geschlecht und markiert fehlende Werte', () => {
    const stamm = buildSections(data)[0].rows;
    expect(stamm).toContainEqual(['Geschlecht', 'weiblich']);
    expect(stamm).toContainEqual(['E-Mail', '–']);
    expect(stamm).toContainEqual(['Geburtsdatum', '04.03.2012']);
    expect(stamm).toContainEqual(['Profilbild', 'gespeichert']);
  });

  it('listet Leistungen mit Datum, Art und Ergebnis', () => {
    const rows = buildSections(data)[3].rows;
    expect(rows[0]).toEqual(['20.09.2026', 'SA 1', 'Schularbeit', 'Deutsch', 'Note 2', 'sauber']);
    expect(rows[1]).toEqual(['01.10.2026', 'Test', 'Punktetest', '–', '37,5 Punkte', '']);
  });

  it('hat für leere Abschnitte einen Hinweistext', () => {
    const notes = buildSections(data)[4];
    expect(notes.rows).toEqual([]);
    expect(notes.empty).toBe('Keine Notizen gespeichert.');
  });

  it('nennt Zweck, Herkunft, Speicherdauer und Rechte', () => {
    const text = infoLines(data).join(' ');
    expect(text).toContain('Zweck');
    expect(text).toContain('Frau Lehrerin');
    expect(text).toContain('2 Jahre nach dessen Ende');
    expect(text).toContain('Art. 17');
    expect(text).toContain('Datenschutzbehörde');
    expect(infoLines({ ...data, retentionYears: null }).join(' ')).toContain('keine Aufbewahrungsfrist');
  });
});
