import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClassDto } from '@app/domain';
import { RolloverComponent, buildRolloverRows } from './rollover.component';
import { ClassService } from '../classes/class.service';
import { SchoolYearService } from './school-year.service';
import { ToastService } from '../../shared/toast/toast.service';

const cls = (id: string, name: string, schoolYear: string, schoolLevel?: number): ClassDto =>
  ({ id, name, schoolYear, schoolLevel, studentIds: [], studentCount: 20, openAssessmentCount: 0 });

const classes = [
  cls('a', '3A', '2025/26', 3),
  cls('b', '4B', '2025/26', 4),
  cls('c', '10C', '2025/26'),
  cls('x', '5B', '2026/27', 5),   // gibt es im Zieljahr schon
  cls('old', '2A', '2024/25', 2),
];

describe('buildRolloverRows', () => {
  it('schlägt Namen und Schulstufe fürs Folgejahr vor, sortiert natürlich', () => {
    const rows = buildRolloverRows(classes, '2025/26', new Set(['5b']));
    expect(rows.map(r => [r.source.name, r.name, r.schoolLevel])).toEqual([
      ['3A', '4A', 4],
      ['4B', '5B', 5],
      ['10C', '11C', null],
    ]);
  });

  it('wählt Klassen, die es im Zieljahr schon gibt, nicht vor', () => {
    const rows = buildRolloverRows(classes, '2025/26', new Set(['5b']));
    expect(rows.find(r => r.source.id === 'b')).toMatchObject({ exists: true, include: false });
    expect(rows.find(r => r.source.id === 'a')).toMatchObject({ exists: false, include: true });
  });
});

describe('RolloverComponent', () => {
  let rollover: jest.Mock;
  let navigate: jest.Mock;
  let toast: { show: jest.Mock };

  function create(von = '2025/26') {
    TestBed.configureTestingModule({
      imports: [RolloverComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ von }) } } },
        { provide: ClassService, useValue: { getAll: () => of(classes) } },
        { provide: SchoolYearService, useValue: { rollover } },
        { provide: ToastService, useValue: toast },
      ],
    });
    const router = TestBed.inject(Router);
    navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true) as unknown as jest.Mock;
    const fixture = TestBed.createComponent(RolloverComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    rollover = jest.fn().mockReturnValue(of({ created: [{ id: 'n1' }, { id: 'n2' }] }));
    toast = { show: jest.fn() };
  });

  it('übernimmt das Ausgangsjahr aus der URL und berechnet das Zieljahr', () => {
    const cmp = create();
    expect(cmp.fromYear()).toBe('2025/26');
    expect(cmp.toYear()).toBe('2026/27');
    expect(cmp.rows()).toHaveLength(3);
  });

  it('sendet nur ausgewählte Klassen mit bereinigten Namen', () => {
    const cmp = create();
    cmp.update(0, { name: '  4A  ' });
    cmp.submit();
    expect(rollover).toHaveBeenCalledWith({
      fromSchoolYear: '2025/26',
      toSchoolYear: '2026/27',
      classes: [
        { sourceClassId: 'a', name: '4A', schoolLevel: 4 },
        { sourceClassId: 'c', name: '11C' },
      ],
    });
    expect(navigate).toHaveBeenCalledWith(['/app']);
    expect(toast.show).toHaveBeenCalledWith('success', '2 Klassen nach 2026/27 übernommen');
  });

  it('sperrt das Absenden bei doppelten, leeren oder vergebenen Namen', () => {
    const cmp = create();
    expect(cmp.canSubmit()).toBe(true);
    cmp.update(2, { name: '4a' });
    expect(cmp.canSubmit()).toBe(false);          // doppelt
    cmp.update(2, { name: ' ' });
    expect(cmp.canSubmit()).toBe(false);          // leer
    cmp.update(2, { name: '5B' });
    expect(cmp.canSubmit()).toBe(false);          // im Zieljahr vergeben
    cmp.update(2, { name: '11C' });
    expect(cmp.canSubmit()).toBe(true);
  });

  it('sperrt das Absenden, wenn nichts ausgewählt ist', () => {
    const cmp = create();
    cmp.update(0, { include: false });
    cmp.update(2, { include: false });
    expect(cmp.canSubmit()).toBe(false);
  });

  it('zeigt die Fehlermeldung des Servers', () => {
    rollover.mockReturnValue(throwError(() => ({ error: { message: 'Im Schuljahr 2026/27 gibt es bereits: 4A' } })));
    const cmp = create();
    cmp.submit();
    expect(toast.show).toHaveBeenCalledWith('error', 'Übernahme fehlgeschlagen', 'Im Schuljahr 2026/27 gibt es bereits: 4A');
    expect(cmp.saving()).toBe(false);
  });

  it('akzeptiert die Schulstufe nur zwischen 1 und 13', () => {
    const cmp = create();
    expect(cmp.toLevel('4')).toBe(4);
    expect(cmp.toLevel('0')).toBeNull();
    expect(cmp.toLevel('14')).toBeNull();
    expect(cmp.toLevel('')).toBeNull();
  });
});
