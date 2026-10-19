import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoteType, RepeatType, TimetableEntryDto } from '@app/domain';
import { LessonNotePanelComponent } from './lesson-note-panel.component';
import { ClassService } from '../classes/class.service';
import { NoteService } from '../notes/note.service';
import { ToastService } from '../../shared/toast/toast.service';

const entry = {
  id: 'tt1', classId: 'c1', className: '3A', subjectId: 'sub1', subjectName: 'Deutsch',
  dayOfWeek: 2, period: 3, room: 'R 12', repeatType: RepeatType.WEEKLY, schoolYear: '2026/27',
} as TimetableEntryDto;

describe('LessonNotePanelComponent', () => {
  let classSvc: { getOne: jest.Mock };
  let noteSvc: { create: jest.Mock };
  let toast: { show: jest.Mock };

  function create(e: TimetableEntryDto = entry) {
    const fixture = TestBed.createComponent(LessonNotePanelComponent);
    const cmp = fixture.componentInstance;
    cmp.entry = e;
    cmp.date = new Date(2026, 9, 6);
    cmp.ngOnChanges({ entry: new SimpleChange(null, e, true), date: new SimpleChange(null, cmp.date, true) });
    fixture.detectChanges();
    return { fixture, cmp };
  }

  beforeEach(() => {
    classSvc = {
      getOne: jest.fn().mockReturnValue(of({
        id: 'c1', name: '3A', studentIds: [], studentCount: 3, openAssessmentCount: 0,
        students: [
          { id: 's2', firstName: 'Ben', lastName: 'Zach' },
          { id: 's1', firstName: 'Anna', lastName: 'Berger' },
          { id: 's3', firstName: 'Clara', lastName: 'Berger' },
        ],
      })),
    };
    noteSvc = { create: jest.fn().mockReturnValue(of({})) };
    toast = { show: jest.fn() };

    TestBed.configureTestingModule({
      imports: [LessonNotePanelComponent],
      providers: [
        provideRouter([]),
        { provide: ClassService, useValue: classSvc },
        { provide: NoteService, useValue: noteSvc },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  it('lädt die Klasse der Stunde und sortiert nach Nachname, Vorname', () => {
    const { cmp } = create();
    expect(classSvc.getOne).toHaveBeenCalledWith('c1');
    expect(cmp.students().map(s => s.id)).toEqual(['s1', 's3', 's2']);
  });

  it('zeigt Tag, Datum, Stunde und Raum im Untertitel', () => {
    const { cmp } = create();
    expect(cmp.lessonLabel()).toBe('Dienstag · 06.10.2026 · 3. Stunde · 9:40 · R 12');
  });

  it('kann erst speichern, wenn jemand ausgewählt und Text eingegeben ist', () => {
    const { cmp } = create();
    expect(cmp.canSave()).toBe(false);
    cmp.toggle('s1');
    expect(cmp.canSave()).toBe(false);
    cmp.content.set('   ');
    expect(cmp.canSave()).toBe(false);
    cmp.content.set('Gute Mitarbeit');
    expect(cmp.canSave()).toBe(true);
  });

  it('legt pro ausgewählter Person eine Notiz mit Klasse und Fach der Stunde an', () => {
    const { cmp } = create();
    cmp.toggle('s1');
    cmp.toggle('s2');
    cmp.type.set(NoteType.BEHAVIOUR);
    cmp.content.set('  Hat geholfen  ');
    cmp.save();

    expect(noteSvc.create).toHaveBeenCalledTimes(2);
    expect(noteSvc.create).toHaveBeenCalledWith({
      content: 'Hat geholfen', type: NoteType.BEHAVIOUR, studentId: 's1', classId: 'c1', subjectId: 'sub1',
    });
    expect(noteSvc.create).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's2' }));
    expect(toast.show).toHaveBeenCalledWith('success', '2 Notizen gespeichert');
  });

  it('leert nach dem Speichern Auswahl und Text und merkt sich den Eintrag', () => {
    const { cmp } = create();
    cmp.toggle('s1');
    cmp.content.set('Gute Mitarbeit');
    cmp.save();

    expect(cmp.selected().size).toBe(0);
    expect(cmp.content()).toBe('');
    expect(cmp.saved()).toEqual([{ names: 'Anna Berger', type: NoteType.PARTICIPATION, content: 'Gute Mitarbeit' }]);
  });

  it('behält Auswahl und Text, wenn das Speichern fehlschlägt', () => {
    noteSvc.create.mockReturnValue(throwError(() => new Error('offline')));
    const { cmp } = create();
    cmp.toggle('s1');
    cmp.content.set('Gute Mitarbeit');
    cmp.save();

    expect(cmp.selected().has('s1')).toBe(true);
    expect(cmp.content()).toBe('Gute Mitarbeit');
    expect(cmp.saving()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('error', expect.any(String), expect.any(String));
  });

  it('wählt alle bzw. keine aus', () => {
    const { cmp } = create();
    cmp.toggleAll();
    expect(cmp.allSelected()).toBe(true);
    cmp.toggleAll();
    expect(cmp.selected().size).toBe(0);
  });

  it('setzt bei einer anderen Stunde Auswahl und Verlauf zurück', () => {
    const { cmp } = create();
    cmp.toggle('s1');
    cmp.content.set('Text');
    const other = { ...entry, id: 'tt2', classId: 'c2' } as TimetableEntryDto;
    cmp.entry = other;
    cmp.ngOnChanges({ entry: new SimpleChange(entry, other, false) });

    expect(cmp.selected().size).toBe(0);
    expect(cmp.content()).toBe('');
    expect(classSvc.getOne).toHaveBeenLastCalledWith('c2');
  });

  it('meldet „Stunde bearbeiten“ an den Stundenplan', () => {
    const { fixture, cmp } = create();
    const spy = jest.fn();
    cmp.editEntry.subscribe(spy);
    const btn = [...fixture.nativeElement.querySelectorAll('button')]
      .find((b: HTMLButtonElement) => b.textContent?.includes('Stunde bearbeiten')) as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalled();
  });
});
