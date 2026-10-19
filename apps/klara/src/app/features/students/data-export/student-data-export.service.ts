import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StudentDataExportDto } from '@app/domain';
import { buildSections, exportFilename, formatDate, infoLines } from './student-data-export';

/**
 * Datenauskunft (DSGVO Art. 15) für eine Schülerin / einen Schüler:
 * als lesbares PDF oder als JSON zur Weiterverarbeitung.
 */
@Injectable({ providedIn: 'root' })
export class StudentDataExportService {
  private readonly http = inject(HttpClient);

  load(studentId: string): Promise<StudentDataExportDto> {
    return firstValueFrom(this.http.get<StudentDataExportDto>(`/api/students/${studentId}/export`));
  }

  downloadJson(data: StudentDataExportDto): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.saveBlob(blob, exportFilename(data, 'json'));
  }

  async downloadPdf(data: StudentDataExportDto): Promise<void> {
    const { jsPDF } = await loadScript('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('jspdfAutoTable', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14;
    const width = doc.internal.pageSize.getWidth() - 2 * margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Auskunft über gespeicherte Daten', margin, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${data.student.firstName} ${data.student.lastName} · gemäß Art. 15 DSGVO`, margin, 25);
    doc.setTextColor(110);
    doc.text(
      `Stand: ${formatDate(data.exportedAt)} · Verantwortliche Lehrkraft: ${data.responsible.displayName} (${data.responsible.email})`,
      margin, 31, { maxWidth: width },
    );
    doc.setTextColor(0);

    let y = 39;
    for (const section of buildSections(data)) {
      y = this.ensureSpace(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(section.title, margin, y);
      doc.setFont('helvetica', 'normal');

      if (section.rows.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(110);
        doc.text(section.empty ?? '–', margin, y + 6);
        doc.setTextColor(0);
        y += 14;
        continue;
      }

      (doc as any).autoTable({
        head: [section.head],
        body: section.rows,
        startY: y + 3,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.5, cellPadding: 1.8, overflow: 'linebreak' },
        headStyles: { fillColor: [46, 63, 92], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 247, 245] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    y = this.ensureSpace(doc, y, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Hinweise', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y += 6;
    for (const line of infoLines(data)) {
      const wrapped = doc.splitTextToSize(line, width);
      y = this.ensureSpace(doc, y, wrapped.length * 4.5);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.5 + 1.5;
    }

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Seite ${i} / ${pages}`, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    doc.save(exportFilename(data, 'pdf'));
  }

  /** Neue Seite beginnen, wenn weniger als `needed` mm Platz bleibt */
  private ensureSpace(doc: any, y: number, needed: number): number {
    if (y + needed <= doc.internal.pageSize.getHeight() - 16) return y;
    doc.addPage();
    return 18;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Lädt ein Skript einmalig vom CDN und liefert das globale Objekt */
function loadScript(globalName: string, src: string): Promise<any> {
  const existing = (window as any)[globalName];
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve((window as any)[globalName]);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
