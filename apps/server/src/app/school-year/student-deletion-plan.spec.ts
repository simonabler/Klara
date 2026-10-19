import { planStudentDeletion } from './student-deletion-plan';

describe('planStudentDeletion', () => {
  const classes = [
    { id: 'c-alt-a', schoolYear: '2024/25', students: [{ id: 'anna' }, { id: 'ben' }] },
    { id: 'c-alt-b', schoolYear: '2024/25', students: [{ id: 'clara' }, { id: 'ben' }] },
    { id: 'c-neu',   schoolYear: '2025/26', students: [{ id: 'ben' }, { id: 'david' }] },
    { id: 'c-ohne',  schoolYear: null,      students: [{ id: 'clara' }] },
  ];

  it('löscht nur, wer ausschließlich in Klassen dieses Schuljahres ist', () => {
    const { toDelete, kept } = planStudentDeletion('2024/25', classes);
    expect([...toDelete].sort()).toEqual(['anna']);
    // Ben ist auch im neuen Schuljahr, Clara in einer Klasse ohne Schuljahr
    expect([...kept].sort()).toEqual(['ben', 'clara']);
  });

  it('betrifft Schüler/innen anderer Schuljahre nicht', () => {
    const { toDelete } = planStudentDeletion('2024/25', classes);
    expect(toDelete.has('david')).toBe(false);
  });

  it('liefert leere Mengen für ein Schuljahr ohne Klassen', () => {
    const { toDelete, kept } = planStudentDeletion('2019/20', classes);
    expect(toDelete.size + kept.size).toBe(0);
  });
});
