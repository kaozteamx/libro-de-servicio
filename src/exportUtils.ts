import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { PeriodFolder } from './types';

export const exportToPDF = (categoryName: string, periods: PeriodFolder[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(`Libro de Servicio - ${categoryName}`, 14, 20);
  
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Fecha de exportación: ${dateStr}`, 14, 28);

  const tableData: any[][] = [];
  
  periods.forEach(folder => {
    folder.records.forEach(record => {
      const folioStr = record.folio ? `#${String(record.folio).padStart(4, '0')}` : 'N/A';
      tableData.push([
        folioStr,
        folder.label,
        record.title,
        record.url,
        record.observations || ''
      ]);
    });
  });

  autoTable(doc, {
    startY: 35,
    head: [['Folio', 'Período', 'Documento', 'Enlace', 'Observaciones']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50, overflow: 'linebreak' },
      4: { cellWidth: 'auto' }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('http')) {
          doc.setTextColor(37, 99, 235); // Blue color for links
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('http')) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: data.cell.raw });
        }
      }
    }
  });

  doc.save(`exportacion_${categoryName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

export const exportToExcel = (categoryName: string, periods: PeriodFolder[]) => {
  const excelData = [];
  
  for (const folder of periods) {
    for (const record of folder.records) {
      excelData.push({
        'Folio': record.folio ? `#${String(record.folio).padStart(4, '0')}` : 'N/A',
        'Período': folder.label,
        'Documento': record.title,
        'Enlace': record.url,
        'Observaciones': record.observations || ''
      });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitudes");
  
  XLSX.writeFile(workbook, `exportacion_${categoryName.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
};
