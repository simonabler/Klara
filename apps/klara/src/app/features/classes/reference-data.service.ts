import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubjectDto, CreateSubjectDto, UpdateSubjectDto, SchoolLevelDto, CreateSchoolLevelDto, UpdateSchoolLevelDto } from '@app/domain';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/subjects';

  getAll(): Observable<SubjectDto[]> { return this.http.get<SubjectDto[]>(this.base); }
  create(dto: CreateSubjectDto): Observable<SubjectDto> { return this.http.post<SubjectDto>(this.base, dto); }
  update(id: string, dto: UpdateSubjectDto): Observable<SubjectDto> { return this.http.patch<SubjectDto>(`${this.base}/${id}`, dto); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class SchoolLevelService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/school-levels';

  getAll(): Observable<SchoolLevelDto[]> { return this.http.get<SchoolLevelDto[]>(this.base); }
  create(dto: CreateSchoolLevelDto): Observable<SchoolLevelDto> { return this.http.post<SchoolLevelDto>(this.base, dto); }
  update(id: string, dto: UpdateSchoolLevelDto): Observable<SchoolLevelDto> { return this.http.patch<SchoolLevelDto>(`${this.base}/${id}`, dto); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}
