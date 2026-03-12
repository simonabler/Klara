import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NoteDto, CreateNoteDto, UpdateNoteDto } from '@app/domain';
import { NoteType } from '@app/domain';

export interface NoteFilter {
  studentId?: string;
  subjectId?: string;
  type?: NoteType;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/notes';

  getAll(filter: NoteFilter = {}): Observable<NoteDto[]> {
    let params = new HttpParams();
    if (filter.studentId) params = params.set('studentId', filter.studentId);
    if (filter.subjectId) params = params.set('subjectId', filter.subjectId);
    if (filter.type)      params = params.set('type',      filter.type);
    if (filter.from)      params = params.set('from',      filter.from);
    if (filter.to)        params = params.set('to',        filter.to);
    return this.http.get<NoteDto[]>(this.base, { params });
  }

  create(dto: CreateNoteDto): Observable<NoteDto> {
    return this.http.post<NoteDto>(this.base, dto);
  }

  update(id: string, dto: UpdateNoteDto): Observable<NoteDto> {
    return this.http.patch<NoteDto>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
