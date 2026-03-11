import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClassDto, CreateClassDto, UpdateClassDto } from '@app/domain';

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/classes';

  getAll(): Observable<ClassDto[]> { return this.http.get<ClassDto[]>(this.base); }
  getOne(id: string): Observable<ClassDto> { return this.http.get<ClassDto>(`${this.base}/${id}`); }
  create(dto: CreateClassDto): Observable<ClassDto> { return this.http.post<ClassDto>(this.base, dto); }
  update(id: string, dto: UpdateClassDto): Observable<ClassDto> { return this.http.patch<ClassDto>(`${this.base}/${id}`, dto); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}
