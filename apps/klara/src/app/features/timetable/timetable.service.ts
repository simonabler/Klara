import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TimetableEntryDto,
  CreateTimetableEntryDto,
  UpdateTimetableEntryDto,
} from '@app/domain';

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/timetable';

  getAll(schoolYear: string): Observable<TimetableEntryDto[]> {
    const params = new HttpParams().set('schoolYear', schoolYear);
    return this.http.get<TimetableEntryDto[]>(this.base, { params });
  }

  create(dto: CreateTimetableEntryDto): Observable<TimetableEntryDto> {
    return this.http.post<TimetableEntryDto>(this.base, dto);
  }

  update(id: string, dto: UpdateTimetableEntryDto): Observable<TimetableEntryDto> {
    return this.http.put<TimetableEntryDto>(`${this.base}/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
