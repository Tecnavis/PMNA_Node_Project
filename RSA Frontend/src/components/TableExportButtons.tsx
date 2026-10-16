import React, { useState } from 'react';
import { ExportColumn, exportExcel, exportPdf } from '../utils/exportTable';

/**
 * Excel / PDF buttons for any page that shows a table.
 * Exports what is on screen in the table inside `containerId` (all rows that are loaded).
 * Columns titled "Action(s)" or with no title are left out.
 */
type Props = { containerId: string; title: string; subtitle?: string; className?: string };

function readTable(containerId: string) {
    const root = document.getElementById(containerId);
    const table = root?.querySelector('table');
    if (!table) return null;
    const headCells = Array.from(table.querySelectorAll('thead th'));
    const headers = headCells.map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim());
    const keep = headers.map((h, i) => ({ h, i })).filter(({ h }) => h && !/^actions?$/i.test(h) && !/^select$/i.test(h));
    const rows = Array.from(table.querySelectorAll('tbody tr'))
        .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').replace(/\s+/g, ' ').trim()))
        .filter((cells) => cells.length >= keep.length && cells.some(Boolean));
    const columns: ExportColumn<string[]>[] = keep.map(({ h, i }) => ({
        key: String(i),
        label: h,
        value: (r) => {
            const v = r[i] ?? '';
            // keep numbers as numbers for Excel (e.g. "₹1,200" → 1200)
            const n = v.replace(/[₹,\s]/g, '');
            return /^-?\d+(\.\d+)?$/.test(n) && n.length < 15 ? Number(n) : v;
        },
        numeric: /amount|total|salary|km|balance|cash|paid|points|count|₹/i.test(h),
    }));
    return { columns, rows };
}

const TableExportButtons: React.FC<Props> = ({ containerId, title, subtitle, className = '' }) => {
    const [busy, setBusy] = useState('');
    const run = async (type: 'xlsx' | 'pdf') => {
        const data = readTable(containerId);
        if (!data || data.rows.length === 0) {
            alert('There is nothing in the table to export.');
            return;
        }
        setBusy(type);
        try {
            const meta = { title, subtitle: subtitle || `Exported ${new Date().toLocaleDateString('en-IN')}`, fileName: `${title}_${new Date().toISOString().slice(0, 10)}` };
            await (type === 'xlsx' ? exportExcel(data.columns, data.rows, meta) : exportPdf(data.columns, data.rows, meta));
        } catch (e) {
            console.error(e);
            alert('Export failed. Please try again.');
        } finally {
            setBusy('');
        }
    };
    return (
        <div className={`flex gap-2 ${className}`}>
            <button type="button" className="btn btn-sm btn-success" disabled={!!busy} onClick={() => run('xlsx')} title="Download the rows shown as Excel">
                {busy === 'xlsx' ? '…' : 'Excel'}
            </button>
            <button type="button" className="btn btn-sm btn-danger" disabled={!!busy} onClick={() => run('pdf')} title="Download the rows shown as PDF">
                {busy === 'pdf' ? '…' : 'PDF'}
            </button>
        </div>
    );
};

export default TableExportButtons;
