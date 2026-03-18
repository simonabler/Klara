import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AssessmentTypeDto,
  CreateAssessmentTypeDto,
  UpdateAssessmentTypeDto,
} from '@app/domain';

@Injectable({ providedIn: 'root' })
export class AssessmentTypeService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/assessment-types';

  getAll(): Observable<AssessmentTypeDto[]> {
    return this.http.get<AssessmentTypeDto[]>(this.base);
  }

  create(dto: CreateAssessmentTypeDto): Observable<AssessmentTypeDto> {
    return this.http.post<AssessmentTypeDto>(this.base, dto);
  }

  update(id: string, dto: UpdateAssessmentTypeDto): Observable<AssessmentTypeDto> {
    return this.http.patch<AssessmentTypeDto>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
