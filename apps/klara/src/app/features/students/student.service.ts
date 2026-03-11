import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentDto, CreateStudentDto, UpdateStudentDto } from '@app/domain';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/students';

  getAll(): Observable<StudentDto[]> {
    return this.http.get<StudentDto[]>(this.base);
  }

  getOne(id: string): Observable<StudentDto> {
    return this.http.get<StudentDto>(`${this.base}/${id}`);
  }

  create(dto: CreateStudentDto): Observable<StudentDto> {
    return this.http.post<StudentDto>(this.base, dto);
  }

  update(id: string, dto: UpdateStudentDto): Observable<StudentDto> {
    return this.http.patch<StudentDto>(`${this.base}/${id}`, dto);
  }

  uploadAvatar(id: string, file: File): Observable<StudentDto> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<StudentDto>(`${this.base}/${id}/avatar`, form);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
