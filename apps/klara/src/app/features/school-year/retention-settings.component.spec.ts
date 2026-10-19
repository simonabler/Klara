import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RetentionOverviewDto } from '@app/domain';
import { RetentionSettingsComponent } from './retention-settings.component';
import { SchoolYearService } from './school-year.service';
import { ToastService } from '../../shared/toast/toast.service';

const overview: RetentionOverviewDto = {
  retentionYears: 1,
  due: [{
    schoolYear: '2024/25', deletableFrom: '2026-09-01',
    classes: [{ id: 'c1', name: '3A', studentCount: 5 }],
    noteCount: 4, assessmentCount: 5, studentsToDelete: 1, studentsKept: 4,
  }],
};

describe('RetentionSettingsComponent', () => {
  let svc: { getRetention: jest.Mock; setRetention: jest.Mock; purge: jest.Mock };
  let toast: { show: jest.Mock };

  function create() {
    TestBed.configureTestingModule({
      imports: [RetentionSettingsComponent],
      providers: [
        { provide: SchoolYearService, useValue: svc },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(RetentionSettingsComponent);
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance };
  }

  beforeEach(() => {
    svc = {
      getRetention: jest.fn().mockReturnValue(of(overview)),
      setRetention: jest.fn().mockReturnValue(of({ retentionYears: 2 })),
      purge: jest.fn().mockReturnValue(of({
        schoolYear: '2024/25', deletedClasses: 1, deletedStudents: 1, deletedNotes: 4, deletedAssessments: 5, deletedTimetableEntries: 0,
      })),
    };
    toast = { show: jest.fn() };
  });

  it('zeigt Frist und fällige Schuljahre mit Datum im Format TT.MM.JJJJ', () => {
    const { fixture, cmp } = create();
    expect(cmp.retentionYears()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('fällig seit 01.09.2026');
    expect(fixture.nativeElement.textContent).toContain('4 bleiben');
  });

  it('löscht erst, wenn das Schuljahr exakt eingegeben wurde', () => {
    const { cmp } = create();
    const year = overview.due[0];
    cmp.startConfirm(year.schoolYear);
    cmp.confirmText.set('2024');
    cmp.purge(year);
    expect(svc.purge).not.toHaveBeenCalled();

    cmp.confirmText.set(' 2024/25 ');
    cmp.purge(year);
    expect(svc.purge).toHaveBeenCalledWith('2024/25');
    expect(toast.show).toHaveBeenCalledWith('success', 'Schuljahr 2024/25 gelöscht', expect.stringContaining('1 Schüler/innen'));
    expect(cmp.confirming()).toBeNull();
  });

  it('speichert eine neue Frist und lädt die Übersicht neu', () => {
    const { cmp } = create();
    cmp.changeRetention(2);
    expect(svc.setRetention).toHaveBeenCalledWith(2);
    expect(svc.getRetention).toHaveBeenCalledTimes(2);
  });

  it('setzt die Auswahl zurück, wenn Speichern fehlschlägt', () => {
    svc.setRetention.mockReturnValue(throwError(() => new Error('x')));
    const { cmp } = create();
    cmp.changeRetention(5);
    expect(cmp.retentionYears()).toBe(1);
    expect(toast.show).toHaveBeenCalledWith('error', 'Frist konnte nicht gespeichert werden');
  });
});
