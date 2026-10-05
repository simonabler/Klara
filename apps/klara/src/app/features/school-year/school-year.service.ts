import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PurgeResultDto,
  RetentionOverviewDto,
  RolloverRequestDto,
  RolloverResultDto,
} from '@app/domain';

@Injectable({ providedIn: 'root' })
export class SchoolYearService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/school-year';

  rollover(dto: RolloverRequestDto): Observable<RolloverResultDto> {
    return this.http.post<RolloverResultDto>(`${this.base}/rollover`, dto);
  }

  getRetention(): Observable<RetentionOverviewDto> {
    return this.http.get<RetentionOverviewDto>(`${this.base}/retention`);
  }

  setRetention(retentionYears: number | null): Observable<{ retentionYears: number | null }> {
    return this.http.put<{ retentionYears: number | null }>(`${this.base}/retention`, { retentionYears });
  }

  purge(schoolYear: string): Observable<PurgeResultDto> {
    return this.http.post<PurgeResultDto>(`${this.base}/retention/purge`, { schoolYear });
  }
}
