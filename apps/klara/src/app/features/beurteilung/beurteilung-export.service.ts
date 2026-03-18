import { Injectable } from '@angular/core';
import { BeurteilungTableDto } from '@app/domain';

@Injectable({ providedIn: 'root' })
export class BeurteilungExportService {

  /**
   * Exportiert die Tabellenansicht als Excel-Datei (.xlsx).
   * Verwendet SheetJS (xlsx) — wird dynamisch geladen.
   */
  async exportExcel(
    table: BeurteilungTableDto,
    className: string,
    subjectName: string,
    schoolYear: string,
  ): Promise<void> {
    const XLSX = await this.loadXLSX();

    const headers = [
      'Schüler/in',
      'Notizen',
      ...table.columns.map(c => `${c.title} (${c.date})`),
      ...(table.gradingEnabled ? ['Ø Note'] : []),
    ];

    const dataRows = table.rows.map(row => [
      `${row.lastName} ${row.firstName}`,
      row.noteCount,
      ...table.columns.map(col => {
        const cell = row.cells?.[col.id];
        return cell?.value ?? '';
      }),
      ...(table.gradingEnabled ? [row.gradeAverage ?? ''] : []),
    ]);

    const wsData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Spaltenbreiten
    ws['!cols'] = [
      { wch: 24 },
      { wch: 8 },
      ...table.columns.map(() => ({ wch: 12 })),
      ...(table.gradingEnabled ? [{ wch: 10 }] : []),
    ];

    // Header-Zeile fetten
    for (let c = 0; c < headers.length; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cellAddr]) {
        ws[cellAddr].s = { font: { bold: true } };
      }
    }

    const wb = XLSX.utils.book_new();
    const sheetName = [className, subjectName].filter(Boolean).join(' – ').slice(0, 31) || 'Beurteilung';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const filename = this.buildFilename(className, subjectName, schoolYear, 'xlsx');
    XLSX.writeFile(wb, filename);
  }

  /**
   * Exportiert die Tabellenansicht als PDF (Querformat).
   * Verwendet jsPDF + jspdf-autotable — werden dynamisch geladen.
   */
  async exportPDF(
    table: BeurteilungTableDto,
    className: string,
    subjectName: string,
    schoolYear: string,
  ): Promise<void> {
    const { jsPDF } = await this.loadJsPDF();
    const autoTable  = (await this.loadAutoTable()).default;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = [className, subjectName, schoolYear].filter(Boolean).join(' · ');
    doc.text(title || 'Beurteilung', 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Erstellt: ${new Date().toLocaleDateString('de-AT')}`, 14, 21);
    doc.setTextColor(0);

    // Tabelle
    const head = [[
      'Schüler/in',
      'Notizen',
      ...table.columns.map(c => `${c.title}\n${c.date}`),
      ...(table.gradingEnabled ? ['Ø'] : []),
    ]];

    const body = table.rows.map(row => [
      `${row.lastName} ${row.firstName}`,
      row.noteCount > 0 ? String(row.noteCount) : '',
      ...table.columns.map(col => {
        const cell = row.cells?.[col.id];
        return cell?.value != null ? String(cell.value) : '';
      }),
      ...(table.gradingEnabled ? [row.gradeAverage != null ? String(row.gradeAverage) : ''] : []),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 26,
      styles:     { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [46, 63, 92], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 247, 245] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 14, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // Seitenzahlen
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Seite ${i} / ${pageCount}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'right' },
      );
    }

    doc.save(this.buildFilename(className, subjectName, schoolYear, 'pdf'));
  }

  // ── Hilfsmethoden ──────────────────────────────────────────────────────────

  private buildFilename(cls: string, subj: string, year: string, ext: string): string {
    const parts = [cls, subj, year].filter(Boolean).join('_').replace(/[^a-zA-Z0-9_\-]/g, '-');
    const date  = new Date().toISOString().slice(0, 10);
    return `klara_beurteilung_${parts || 'export'}_${date}.${ext}`;
  }

  private async loadXLSX(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).XLSX) { resolve((window as any).XLSX); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload  = () => resolve((window as any).XLSX);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  private async loadJsPDF(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).jspdf) { resolve((window as any).jspdf); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload  = () => resolve((window as any).jspdf);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  private async loadAutoTable(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).jspdfAutoTable) { resolve({ default: (window as any).jspdfAutoTable }); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      s.onload  = () => resolve({ default: (doc: any, opts: any) => (doc as any).autoTable(opts) });
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
}
