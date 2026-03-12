import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AssessmentEventDto,
  CreateAssessmentEventDto,
  UpdateAssessmentEventDto,
  UpsertStudentResultDto,
  StudentResultDto,
} from '@app/domain';

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/assessments';

  getAll(classId?: string, subjectId?: string): Observable<AssessmentEventDto[]> {
    let params = new HttpParams();
    if (classId)   params = params.set('classId',   classId);
    if (subjectId) params = params.set('subjectId', subjectId);
    return this.http.get<AssessmentEventDto[]>(this.base, { params });
  }

  getOne(id: string): Observable<AssessmentEventDto> {
    return this.http.get<AssessmentEventDto>(`${this.base}/${id}`);
  }

  create(dto: CreateAssessmentEventDto): Observable<AssessmentEventDto> {
    return this.http.post<AssessmentEventDto>(this.base, dto);
  }

  update(id: string, dto: UpdateAssessmentEventDto): Observable<AssessmentEventDto> {
    return this.http.patch<AssessmentEventDto>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  assignStudents(eventId: string, studentIds: string[]): Observable<AssessmentEventDto> {
    return this.http.put<AssessmentEventDto>(`${this.base}/${eventId}/students`, { studentIds });
  }

  upsertResult(eventId: string, dto: UpsertStudentResultDto): Observable<StudentResultDto> {
    return this.http.put<StudentResultDto>(`${this.base}/${eventId}/results/${dto.studentId}`, dto);
  }

  bulkUpsertResults(eventId: string, results: UpsertStudentResultDto[]): Observable<AssessmentEventDto> {
    return this.http.put<AssessmentEventDto>(`${this.base}/${eventId}/results`, { results });
  }

  getResultsForStudent(studentId: string): Observable<StudentResultDto[]> {
    return this.http.get<StudentResultDto[]>(`${this.base}/student/${studentId}/results`);
  }
}
