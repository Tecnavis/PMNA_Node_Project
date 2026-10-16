/**
 * Excel / PDF / CSV export for any table on the admin site.
 * Libraries are loaded only when an export is clicked (keeps pages fast).
 */
export type ExportColumn<T> = {
    key: string;
    label: string;
    /** value for the file (number stays a number in Excel) */
    value?: (row: T) => string | number | boolean | null | undefined;
    /** money / number columns are right-aligned in the PDF */
    numeric?: boolean;
    /** PDF column width hint (mm) */
    width?: number;
};

export type ExportMeta = {
    title: string;
    /** e.g. "1 Oct 2026 – 15 Oct 2026 · Status: Completed" */
    subtitle?: string;
    /** shown as a totals line at the bottom: { 'Total amount': '₹12,000' } */
    totals?: Record<string, string | number>;
    fileName?: string;
};

const cell = <T,>(c: ExportColumn<T>, row: T): string | number => {
    const v = c.value ? c.value(row) : (row as any)[c.key];
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return v as string | number;
};

const safeName = (s: string) => s.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_').slice(0, 80) || 'report';

export async function exportExcel<T>(columns: ExportColumn<T>[], rows: T[], meta: ExportMeta) {
    const XLSX = await import('xlsx');
    const header = columns.map((c) => c.label);
    const body = rows.map((r) => columns.map((c) => cell(c, r)));
    const top: (string | number)[][] = [[meta.title]];
    if (meta.subtitle) top.push([meta.subtitle]);
    top.push([]);
    const bottom: (string | number)[][] = meta.totals ? [[], ...Object.entries(meta.totals).map(([k, v]) => [k, v])] : [];
    const ws = XLSX.utils.aoa_to_sheet([...top, header, ...body, ...bottom]);
    // column widths from content
    ws['!cols'] = columns.map((c, i) => ({
        wch: Math.min(40, Math.max(c.label.length, ...body.slice(0, 300).map((r) => String(r[i] ?? '').length)) + 2),
    }));
    // freeze the header row
    (ws as any)['!freeze'] = { xSplit: 0, ySplit: top.length + 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${safeName(meta.fileName || meta.title)}.xlsx`);
}

export async function exportCsv<T>(columns: ExportColumn<T>[], rows: T[], meta: ExportMeta) {
    const esc = (v: string | number) => {
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(cell(c, r))).join(','))];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${safeName(meta.fileName || meta.title)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function exportPdf<T>(columns: ExportColumn<T>[], rows: T[], meta: ExportMeta) {
    const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const autoTable = (autoTableMod as any).default || (autoTableMod as any).autoTable;
    const landscape = columns.length > 6;
    const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(meta.title, 12, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let y = 19;
    if (meta.subtitle) {
        doc.text(doc.splitTextToSize(meta.subtitle, pageW - 24), 12, y);
        y += 5;
    }
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString('en-IN')} · ${rows.length} rows`, 12, y);
    doc.setTextColor(0);

    // jsPDF's built-in font has no ₹ sign — use "Rs." in the PDF
    const pdfText = (v: string | number) => String(v).replace(/₹/g, 'Rs. ');

    const columnStyles: Record<number, any> = {};
    columns.forEach((c, i) => {
        columnStyles[i] = { halign: c.numeric ? 'right' : 'left', ...(c.width ? { cellWidth: c.width } : {}) };
    });

    autoTable(doc, {
        startY: y + 4,
        head: [columns.map((c) => c.label)],
        body: rows.map((r) => columns.map((c) => pdfText(cell(c, r)))),
        styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [215, 20, 26], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 247, 249] },
        columnStyles,
        margin: { left: 8, right: 8 },
        didDrawPage: () => {
            const n = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(140);
            doc.text(`Page ${n}`, pageW - 20, doc.internal.pageSize.getHeight() - 6);
            doc.setTextColor(0);
        },
    });

    if (meta.totals && Object.keys(meta.totals).length) {
        let ty = ((doc as any).lastAutoTable?.finalY || y) + 7;
        if (ty > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            ty = 15;
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(Object.entries(meta.totals).map(([k, v]) => `${k}: ${pdfText(v)}`).join('    '), 12, ty);
    }
    doc.save(`${safeName(meta.fileName || meta.title)}.pdf`);
}

export const inr = (n: number) => '₹' + (Math.round(n || 0)).toLocaleString('en-IN');
