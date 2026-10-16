import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import { setPageTitle } from '../../store/themeConfigSlice';
import { BASE_URL } from '../../config/axiosConfig';
import { ExportColumn, exportCsv, exportExcel, exportPdf, inr } from '../../utils/exportTable';

// ---------------------------------------------------------------- types
type Option = { value: string; label: string };
type Options = { statuses: string[]; companies: Option[]; showrooms: Option[]; drivers: Option[]; providers: Option[]; serviceTypes: Option[] };
type BookingRow = {
    _id: string; date: string; day: string; fileNumber: string; status: string; workType: string; customerName: string; phone: string;
    vehicleNumber: string; vehicle: string; serviceType: string; company: string; showroom: string; assignedTo: string; assignedType: string;
    baseLocation: string; pickup: string; dropoff: string; km: number; totalAmount: number; collected: number; balance: number;
    cashPending: boolean; verified: boolean; driverSalary: number; bookedBy: string; payment: string; rewardAmount: number;
    cancelReason: string; invoiceNumber: string; archived: boolean;
};
type Group = { name: string; type?: string; count: number; amount: number; km?: number };
type BookingSummary = {
    count: number; totalAmount: number; collected: number; balance: number; driverSalary: number; km: number;
    completed: number; cancelled: number; open: number; verified: number; cashPendingCount: number;
    byStatus: Record<string, number>; byDay: { day: string; count: number; amount: number }[]; topClients: Group[]; topAssigned: Group[];
};
type ExpenseRow = { _id: string; date: string; day: string; who: string; type: string; description: string; amount: number; status: string; km?: number; settled?: boolean };

type Kind = 'bookings' | 'expenses';
type View = 'list' | 'assigned' | 'client' | 'day';

type Filters = {
    preset: string; from: string; to: string; dateField: 'createdAt' | 'pickupDate';
    status: string[]; workType: string; payment: string; company: string; showroom: string; driver: string; provider: string;
    serviceType: string; verified: string; cashPending: string; q: string; includeArchived: boolean; expenseKind: 'driver' | 'diesel' | 'company';
};

// ---------------------------------------------------------------- dates (India)
const ist = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
const addDays = (s: string, n: number) => ist(new Date(new Date(`${s}T12:00:00+05:30`).getTime() + n * 86400000));
const PRESETS: { key: string; label: string; range: () => [string, string] }[] = [
    { key: 'today', label: 'Today', range: () => [ist(new Date()), ist(new Date())] },
    { key: 'yesterday', label: 'Yesterday', range: () => { const y = addDays(ist(new Date()), -1); return [y, y]; } },
    { key: 'last7', label: 'Last 7 days', range: () => [addDays(ist(new Date()), -6), ist(new Date())] },
    { key: 'thisMonth', label: 'This month', range: () => { const t = ist(new Date()); return [t.slice(0, 8) + '01', t]; } },
    { key: 'lastMonth', label: 'Last month', range: () => { const first = ist(new Date()).slice(0, 8) + '01'; const end = addDays(first, -1); return [end.slice(0, 8) + '01', end]; } },
    { key: 'last30', label: 'Last 30 days', range: () => [addDays(ist(new Date()), -29), ist(new Date())] },
    { key: 'custom', label: 'Custom…', range: () => [ist(new Date()), ist(new Date())] },
];
const fmtDay = (s: string) => (s ? new Date(`${s}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (s: string) => (s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

const defaultFilters = (): Filters => {
    const [from, to] = PRESETS[3].range();
    return { preset: 'thisMonth', from, to, dateField: 'createdAt', status: [], workType: '', payment: '', company: '', showroom: '', driver: '', provider: '', serviceType: '', verified: '', cashPending: '', q: '', includeArchived: false, expenseKind: 'driver' };
};
const STORE_KEY = 'reports-center-filters';
const loadFilters = (): Filters => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (!saved) return defaultFilters();
        const f = { ...defaultFilters(), ...saved } as Filters;
        if (f.preset !== 'custom') { const p = PRESETS.find((x) => x.key === f.preset); if (p) [f.from, f.to] = p.range(); }
        return f;
    } catch { return defaultFilters(); }
};

// ---------------------------------------------------------------- columns
const STATUS_TONE: Record<string, string> = {
    'Order Completed': 'bg-success/15 text-success', Cancelled: 'bg-danger/15 text-danger', Rejected: 'bg-danger/15 text-danger',
    'Booking Added': 'bg-warning/15 text-warning', Scheduled: 'bg-info/15 text-info',
};
type Col<T> = ExportColumn<T> & { render?: (r: T) => React.ReactNode; defaultHidden?: boolean; sortValue?: (r: T) => string | number };

const BOOKING_COLS: Col<BookingRow>[] = [
    { key: 'date', label: 'Date', value: (r) => fmtDateTime(r.date), sortValue: (r) => r.date, width: 22 },
    { key: 'fileNumber', label: 'File no.', render: (r) => <span className="font-semibold">{r.fileNumber}{r.archived && <span className="text-[10px] text-white-dark ltr:ml-1"> (archived)</span>}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'phone', label: 'Phone', defaultHidden: true },
    { key: 'vehicleNumber', label: 'Vehicle no.' },
    { key: 'vehicle', label: 'Vehicle', defaultHidden: true },
    { key: 'serviceType', label: 'Service' },
    { key: 'company', label: 'Company', value: (r) => r.company || r.showroom, render: (r) => r.company || (r.showroom ? <span>{r.showroom} <span className="text-[10px] text-white-dark">(showroom)</span></span> : '—') },
    { key: 'showroom', label: 'Showroom', defaultHidden: true },
    { key: 'assignedTo', label: 'Driver / provider' },
    { key: 'pickup', label: 'Pickup', defaultHidden: true },
    { key: 'dropoff', label: 'Drop-off', defaultHidden: true },
    { key: 'km', label: 'KM', numeric: true, defaultHidden: true },
    { key: 'status', label: 'Status', render: (r) => <span className={`badge rounded-full text-[11px] ${STATUS_TONE[r.status] || 'bg-primary/10 text-primary'}`}>{r.status}</span> },
    { key: 'payment', label: 'Payment', defaultHidden: true },
    { key: 'totalAmount', label: 'Amount', numeric: true, value: (r) => r.totalAmount, render: (r) => inr(r.totalAmount) },
    { key: 'collected', label: 'Collected', numeric: true, value: (r) => r.collected, render: (r) => inr(r.collected), defaultHidden: true },
    { key: 'balance', label: 'Pending', numeric: true, value: (r) => r.balance, render: (r) => (r.balance ? <span className="text-danger font-semibold">{inr(r.balance)}</span> : '—') },
    { key: 'driverSalary', label: 'Driver salary', numeric: true, value: (r) => r.driverSalary, render: (r) => inr(r.driverSalary), defaultHidden: true },
    { key: 'verified', label: 'Verified', render: (r) => (r.verified ? '✓' : '') },
    { key: 'bookedBy', label: 'Booked by', defaultHidden: true },
    { key: 'invoiceNumber', label: 'Invoice no.', defaultHidden: true },
    { key: 'cancelReason', label: 'Cancel reason', defaultHidden: true },
];
const GROUP_COLS: Col<Group>[] = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'type', label: 'Type' },
    { key: 'count', label: 'Bookings', numeric: true },
    { key: 'km', label: 'KM', numeric: true, value: (r) => Math.round(r.km || 0) },
    { key: 'amount', label: 'Amount', numeric: true, value: (r) => r.amount, render: (r) => inr(r.amount) },
];
const EXPENSE_COLS: Col<ExpenseRow>[] = [
    { key: 'date', label: 'Date', value: (r) => fmtDateTime(r.date), sortValue: (r) => r.date },
    { key: 'who', label: 'Driver / employee' },
    { key: 'type', label: 'Type' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status', render: (r) => <span className="capitalize">{r.status || '—'}</span> },
    { key: 'amount', label: 'Amount', numeric: true, value: (r) => r.amount, render: (r) => inr(r.amount) },
];

// ---------------------------------------------------------------- small pieces
const Tile: React.FC<{ label: string; value: React.ReactNode; tone?: string; sub?: React.ReactNode; onClick?: () => void; active?: boolean }> = ({ label, value, tone = 'text-dark dark:text-white-light', sub, onClick, active }) => (
    <button type="button" onClick={onClick} disabled={!onClick}
        className={`panel !p-3 text-left transition ${onClick ? 'hover:shadow-md cursor-pointer' : 'cursor-default'} ${active ? 'ring-2 ring-primary' : ''}`}>
        <div className="text-[11px] uppercase tracking-wide text-white-dark">{label}</div>
        <div className={`text-lg sm:text-xl font-bold leading-tight mt-1 ${tone}`}>{value}</div>
        {sub && <div className="text-[11px] text-white-dark mt-0.5">{sub}</div>}
    </button>
);

const Select: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: Option[]; all?: string; id: string }> = ({ label, value, onChange, options, all = 'All', id }) => (
    <label className="block min-w-0" htmlFor={id}>
        <span className="text-[11px] font-semibold text-white-dark">{label}</span>
        <select id={id} className="form-select form-select-sm mt-0.5 w-full" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{all}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </label>
);

const StatusPicker: React.FC<{ statuses: string[]; value: string[]; onChange: (v: string[]) => void }> = ({ statuses, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
    const label = value.length === 0 ? 'All statuses' : value.length === 1 ? (value[0] === 'open' ? 'All open cases' : value[0]) : `${value.length} statuses`;
    return (
        <div className="relative min-w-0" ref={ref}>
            <span className="text-[11px] font-semibold text-white-dark">Status</span>
            <button type="button" className="form-select form-select-sm mt-0.5 w-full text-left truncate" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{label}</button>
            {open && (
                <div className="absolute z-30 mt-1 w-64 max-h-80 overflow-auto rounded-md border border-white-light bg-white p-2 shadow-lg dark:border-[#253b5c] dark:bg-[#0e1726]">
                    <div className="flex gap-2 mb-2">
                        <button type="button" className="btn btn-outline-primary btn-sm flex-1 !py-1" onClick={() => onChange(['open'])}>Open cases</button>
                        <button type="button" className="btn btn-outline-secondary btn-sm flex-1 !py-1" onClick={() => onChange([])}>Clear</button>
                    </div>
                    {statuses.map((s) => (
                        <label key={s} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                            <input type="checkbox" className="form-checkbox" checked={value.includes(s)} onChange={() => toggle(s.toString())} />
                            {s}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

function useSorted<T>(rows: T[], cols: Col<T>[]) {
    const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
    const sorted = useMemo(() => {
        if (!sort) return rows;
        const c = cols.find((x) => x.key === sort.key);
        if (!c) return rows;
        const get = (r: T) => (c.sortValue ? c.sortValue(r) : c.value ? c.value(r) : (r as any)[c.key]) ?? '';
        return [...rows].sort((a, b) => {
            const x = get(a), y = get(b);
            return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir;
        });
    }, [rows, cols, sort]);
    const toggle = (key: string) => setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
    return { sorted, sort, toggle };
}

function DataTableView<T extends { _id?: string; name?: string }>({ rows, cols, emptyText, pageSize = 50 }: { rows: T[]; cols: Col<T>[]; emptyText: string; pageSize?: number }) {
    const { sorted, sort, toggle } = useSorted(rows, cols);
    const [page, setPage] = useState(0);
    useEffect(() => setPage(0), [rows]);
    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const view = sorted.slice(page * pageSize, page * pageSize + pageSize);
    return (
        <>
            <div className="table-responsive">
                <table className="table-hover table-compact whitespace-nowrap text-[13px]">
                    <thead>
                        <tr>
                            {cols.map((c) => (
                                <th key={c.key} className={`${c.numeric ? 'text-right' : ''} cursor-pointer select-none`} onClick={() => toggle(c.key)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                                    {c.label}{sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {view.length === 0 ? (
                            <tr><td colSpan={cols.length} className="text-center py-10 text-white-dark">{emptyText}</td></tr>
                        ) : view.map((r, i) => (
                            <tr key={(r._id as string) || r.name || i}>
                                {cols.map((c) => (
                                    <td key={c.key} className={c.numeric ? 'text-right tabular-nums' : 'max-w-[220px] truncate'}>
                                        {c.render ? c.render(r) : String((c.value ? c.value(r) : (r as any)[c.key]) ?? '') || '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {pages > 1 && (
                <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-white-dark">{page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}</span>
                    <div className="flex gap-1">
                        <button type="button" className="btn btn-sm btn-outline-primary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next ›</button>
                    </div>
                </div>
            )}
        </>
    );
}

// ---------------------------------------------------------------- page
const ReportsCenter: React.FC = () => {
    const dispatch = useDispatch();
    useEffect(() => { dispatch(setPageTitle('Reports')); }, [dispatch]);

    const [kind, setKind] = useState<Kind>('bookings');
    const [view, setView] = useState<View>('list');
    const [filters, setFilters] = useState<Filters>(loadFilters);
    const [options, setOptions] = useState<Options | null>(null);
    const [rows, setRows] = useState<BookingRow[]>([]);
    const [summary, setSummary] = useState<BookingSummary | null>(null);
    const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
    const [expenseTotal, setExpenseTotal] = useState(0);
    const [truncated, setTruncated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [moreFilters, setMoreFilters] = useState(false);
    const [exporting, setExporting] = useState('');
    const [hidden, setHidden] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('reports-center-hidden') || 'null') || BOOKING_COLS.filter((c) => c.defaultHidden).map((c) => c.key); }
        catch { return BOOKING_COLS.filter((c) => c.defaultHidden).map((c) => c.key); }
    });
    const [showCols, setShowCols] = useState(false);
    const [quick, setQuick] = useState<'' | 'pending' | 'unverified' | 'cancelled'>('');

    const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
    useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(filters)); } catch { /* ignore */ } }, [filters]);
    useEffect(() => { try { localStorage.setItem('reports-center-hidden', JSON.stringify(hidden)); } catch { /* ignore */ } }, [hidden]);

    useEffect(() => {
        axios.get(`${BASE_URL}/reports/options`).then((r) => setOptions({ statuses: [], companies: [], showrooms: [], drivers: [], providers: [], serviceTypes: [], ...(r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : {}) })).catch(() => setOptions({ statuses: [], companies: [], showrooms: [], drivers: [], providers: [], serviceTypes: [] }));
    }, []);

    const params = useMemo(() => {
        const p: Record<string, string> = { from: filters.from, to: filters.to };
        if (kind === 'bookings') {
            p.dateField = filters.dateField;
            if (filters.status.length) p.status = filters.status.join(',');
            (['workType', 'payment', 'company', 'showroom', 'driver', 'provider', 'serviceType', 'verified', 'cashPending', 'q'] as const).forEach((k) => { if (filters[k]) p[k] = String(filters[k]).trim(); });
            if (filters.includeArchived) p.includeArchived = '1';
        } else {
            p.kind = filters.expenseKind;
            if (filters.driver && filters.expenseKind !== 'company') p.driver = filters.driver;
        }
        return p;
    }, [filters, kind]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            if (kind === 'bookings') {
                const r = await axios.get(`${BASE_URL}/reports/bookings`, { params });
                setRows(Array.isArray(r.data?.rows) ? r.data.rows : []);
                setSummary(r.data?.summary && Array.isArray(r.data.summary.byDay) ? r.data.summary : null);
                setTruncated(!!r.data.truncated);
            } else {
                const r = await axios.get(`${BASE_URL}/reports/expenses`, { params });
                setExpenses(Array.isArray(r.data?.rows) ? r.data.rows : []);
                setExpenseTotal(Number(r.data?.summary?.amount) || 0);
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not load the report. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [kind, params]);

    // reload automatically when filters change (search waits for typing to stop)
    useEffect(() => {
        const t = window.setTimeout(load, filters.q ? 450 : 0);
        return () => window.clearTimeout(t);
    }, [load, filters.q]);

    const quickRows = useMemo(() => {
        if (!quick) return rows;
        if (quick === 'pending') return rows.filter((r) => r.cashPending);
        if (quick === 'unverified') return rows.filter((r) => !r.verified && r.status === 'Order Completed');
        return rows.filter((r) => r.status === 'Cancelled' || r.status === 'Rejected');
    }, [rows, quick]);

    const groups = useMemo((): Group[] => {
        if (view === 'list' || view === 'day') return [];
        const m: Record<string, Group> = {};
        for (const r of quickRows) {
            const name = view === 'assigned' ? r.assignedTo || 'Not assigned' : r.company || r.showroom || 'Direct customer';
            const type = view === 'assigned' ? r.assignedType : r.company ? 'Company' : r.showroom ? 'Showroom' : 'Direct';
            const g = (m[name] ||= { name, type, count: 0, amount: 0, km: 0 });
            g.count++; g.amount += r.totalAmount; g.km = (g.km || 0) + r.km;
        }
        return Object.values(m).sort((a, b) => b.count - a.count);
    }, [quickRows, view]);

    const dayGroups = useMemo((): Group[] => {
        const m: Record<string, Group> = {};
        for (const r of quickRows) { const g = (m[r.day] ||= { name: r.day, count: 0, amount: 0, km: 0 }); g.count++; g.amount += r.totalAmount; g.km = (g.km || 0) + r.km; }
        return Object.values(m).sort((a, b) => a.name.localeCompare(b.name));
    }, [quickRows]);

    const visibleCols = BOOKING_COLS.filter((c) => !hidden.includes(c.key));
    const dayCols: Col<Group>[] = [{ ...GROUP_COLS[0], label: 'Day', value: (r) => fmtDay(r.name), render: (r) => <span className="font-semibold">{fmtDay(r.name)}</span> }, ...GROUP_COLS.slice(2)];

    // ---- describe current filters (for exports)
    const optLabel = (list: Option[] | undefined, v: string) => list?.find((o) => o.value === v)?.label || v;
    const describe = () => {
        const parts = [`${fmtDay(filters.from)}${filters.to !== filters.from ? ' – ' + fmtDay(filters.to) : ''}`];
        if (kind === 'bookings') {
            if (filters.status.length) parts.push('Status: ' + filters.status.map((s) => (s === 'open' ? 'Open cases' : s)).join(', '));
            if (filters.company) parts.push('Company: ' + optLabel(options?.companies, filters.company));
            if (filters.showroom) parts.push('Showroom: ' + optLabel(options?.showrooms, filters.showroom));
            if (filters.driver) parts.push('Driver: ' + optLabel(options?.drivers, filters.driver));
            if (filters.provider) parts.push('Provider: ' + optLabel(options?.providers, filters.provider));
            if (filters.serviceType) parts.push('Service: ' + optLabel(options?.serviceTypes, filters.serviceType));
            if (filters.workType) parts.push('Work: ' + filters.workType);
            if (filters.payment) parts.push('Payment: ' + filters.payment);
            if (filters.verified) parts.push(filters.verified === 'yes' ? 'Verified only' : 'Not verified');
            if (filters.cashPending) parts.push(filters.cashPending === 'yes' ? 'Cash pending' : 'No cash pending');
            if (filters.q) parts.push(`Search: "${filters.q}"`);
            if (quick) parts.push({ pending: 'Cash pending', unverified: 'Completed, not verified', cancelled: 'Cancelled' }[quick]);
        } else parts.push({ driver: 'Driver expenses', diesel: 'Diesel expenses', company: 'Company expenses' }[filters.expenseKind]);
        return parts.join(' · ');
    };

    const doExport = async (type: 'xlsx' | 'pdf' | 'csv') => {
        setExporting(type);
        try {
            const fn = type === 'xlsx' ? exportExcel : type === 'pdf' ? exportPdf : exportCsv;
            const subtitle = describe();
            if (kind === 'expenses') {
                await fn(EXPENSE_COLS, expenses, { title: 'Expense report', subtitle, totals: { Entries: expenses.length, Total: inr(expenseTotal) }, fileName: `expenses_${filters.from}_${filters.to}` });
            } else if (view === 'list') {
                const total = quickRows.reduce((a, r) => a + r.totalAmount, 0);
                const pend = quickRows.reduce((a, r) => a + r.balance, 0);
                await fn(visibleCols, quickRows, { title: 'Bookings report', subtitle, totals: { Bookings: quickRows.length, 'Total amount': inr(total), 'Cash pending': inr(pend) }, fileName: `bookings_${filters.from}_${filters.to}` });
            } else {
                const g = view === 'day' ? dayGroups : groups;
                const cols = view === 'day' ? dayCols : GROUP_COLS;
                const title = view === 'day' ? 'Bookings by day' : view === 'assigned' ? 'Bookings by driver / provider' : 'Bookings by company / showroom';
                await fn(cols, g, { title, subtitle, totals: { Bookings: g.reduce((a, x) => a + x.count, 0), 'Total amount': inr(g.reduce((a, x) => a + x.amount, 0)) }, fileName: `${title.replace(/\W+/g, '_')}_${filters.from}_${filters.to}` });
            }
        } catch (e) {
            console.error(e);
            alert('Export failed. Please try again.');
        } finally {
            setExporting('');
        }
    };

    const setPreset = (key: string) => {
        const p = PRESETS.find((x) => x.key === key);
        if (!p) return;
        if (key === 'custom') { set('preset', 'custom'); return; }
        const [from, to] = p.range();
        setFilters((f) => ({ ...f, preset: key, from, to }));
    };
    const activeFilterCount = kind === 'bookings'
        ? [filters.status.length > 0, filters.workType, filters.payment, filters.company, filters.showroom, filters.driver, filters.provider, filters.serviceType, filters.verified, filters.cashPending, filters.includeArchived].filter(Boolean).length
        : 0;

    const chart = useMemo(() => {
        const days = summary?.byDay || [];
        return {
            series: [{ name: 'Bookings', data: days.map((d) => d.count) }],
            options: {
                chart: { type: 'bar' as const, toolbar: { show: false }, sparkline: { enabled: false }, fontFamily: 'inherit' },
                plotOptions: { bar: { borderRadius: 3, columnWidth: days.length > 20 ? '80%' : '50%' } },
                dataLabels: { enabled: false },
                colors: ['#D7141A'],
                grid: { borderColor: 'rgba(148,163,184,0.2)', padding: { left: 0, right: 0 } },
                xaxis: { categories: days.map((d) => new Date(`${d.day}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })), labels: { rotate: -45, style: { fontSize: '10px' } }, tickAmount: Math.min(days.length, 15) },
                yaxis: { labels: { style: { fontSize: '10px' } }, forceNiceScale: true },
                tooltip: { y: { formatter: (v: number, o: any) => `${v} bookings · ${inr(days[o.dataPointIndex]?.amount || 0)}` } },
            },
        };
    }, [summary]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold dark:text-white-light">Reports</h2>
                    <p className="text-xs text-white-dark">Pick a period and filters — the report updates automatically. Export what you see.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-sm btn-success" disabled={!!exporting || loading} onClick={() => doExport('xlsx')}>{exporting === 'xlsx' ? 'Preparing…' : 'Excel'}</button>
                    <button type="button" className="btn btn-sm btn-danger" disabled={!!exporting || loading} onClick={() => doExport('pdf')}>{exporting === 'pdf' ? 'Preparing…' : 'PDF'}</button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!!exporting || loading} onClick={() => doExport('csv')}>CSV</button>
                </div>
            </div>

            {/* Kind tabs */}
            <div className="flex flex-wrap gap-2">
                {(['bookings', 'expenses'] as Kind[]).map((k) => (
                    <button key={k} type="button" onClick={() => setKind(k)} className={`btn btn-sm ${kind === k ? 'btn-primary' : 'btn-outline-primary'}`}>{k === 'bookings' ? 'Bookings' : 'Expenses'}</button>
                ))}
                <span className="flex-1" />
                <Link to="/dcpreport" className="btn btn-sm btn-outline-secondary">Driver / company / provider statements</Link>
                <Link to="/showroomreport" className="btn btn-sm btn-outline-secondary">Showroom statements</Link>
            </div>

            {/* Filters */}
            <div className="panel !p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
                    <Select id="rc-preset" label="Period" value={filters.preset} all="Choose…" onChange={setPreset} options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} />
                    <label className="block" htmlFor="rc-from">
                        <span className="text-[11px] font-semibold text-white-dark">From</span>
                        <input id="rc-from" type="date" className="form-input form-input-sm mt-0.5 w-full" value={filters.from} max={filters.to}
                            onChange={(e) => setFilters((f) => ({ ...f, preset: 'custom', from: e.target.value || f.from }))} />
                    </label>
                    <label className="block" htmlFor="rc-to">
                        <span className="text-[11px] font-semibold text-white-dark">To</span>
                        <input id="rc-to" type="date" className="form-input form-input-sm mt-0.5 w-full" value={filters.to} min={filters.from}
                            onChange={(e) => setFilters((f) => ({ ...f, preset: 'custom', to: e.target.value || f.to }))} />
                    </label>
                    {kind === 'bookings' ? (
                        <>
                            <StatusPicker statuses={options?.statuses || []} value={filters.status} onChange={(v) => set('status', v)} />
                            <label className="block col-span-2 md:col-span-1 xl:col-span-1" htmlFor="rc-q">
                                <span className="text-[11px] font-semibold text-white-dark">Search</span>
                                <input id="rc-q" className="form-input form-input-sm mt-0.5 w-full" placeholder="File no, customer, vehicle, phone" value={filters.q} onChange={(e) => set('q', e.target.value)} />
                            </label>
                            <div className="flex gap-2 col-span-2 md:col-span-1">
                                <button type="button" className="btn btn-sm btn-outline-primary flex-1" onClick={() => setMoreFilters((m) => !m)} aria-expanded={moreFilters}>
                                    {moreFilters ? 'Fewer filters' : 'More filters'}{activeFilterCount ? ` (${activeFilterCount})` : ''}
                                </button>
                                <button type="button" className="btn btn-sm btn-outline-secondary" title="Reset filters" onClick={() => { setFilters(defaultFilters()); setQuick(''); }}>Reset</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Select id="rc-ekind" label="Expense type" value={filters.expenseKind} all="Driver expenses" onChange={(v) => set('expenseKind', (v || 'driver') as Filters['expenseKind'])}
                                options={[{ value: 'diesel', label: 'Diesel expenses' }, { value: 'company', label: 'Company expenses' }]} />
                            {filters.expenseKind !== 'company' && <Select id="rc-edriver" label="Driver" value={filters.driver} onChange={(v) => set('driver', v)} options={options?.drivers || []} />}
                        </>
                    )}
                </div>
                {kind === 'bookings' && moreFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mt-3 pt-3 border-t border-white-light dark:border-[#1b2e4b]">
                        <Select id="rc-company" label="Company" value={filters.company} onChange={(v) => set('company', v)} options={options?.companies || []} />
                        <Select id="rc-showroom" label="Showroom" value={filters.showroom} onChange={(v) => set('showroom', v)} options={options?.showrooms || []} />
                        <Select id="rc-driver" label="Driver" value={filters.driver} onChange={(v) => set('driver', v)} options={options?.drivers || []} />
                        <Select id="rc-provider" label="Provider" value={filters.provider} onChange={(v) => set('provider', v)} options={options?.providers || []} />
                        <Select id="rc-service" label="Service type" value={filters.serviceType} onChange={(v) => set('serviceType', v)} options={options?.serviceTypes || []} />
                        <Select id="rc-work" label="Work type" value={filters.workType} onChange={(v) => set('workType', v)} options={[{ value: 'RSAWork', label: 'RSA work' }, { value: 'PaymentWork', label: 'Payment work' }]} />
                        <Select id="rc-pay" label="Payment" value={filters.payment} onChange={(v) => set('payment', v)} options={[{ value: 'company', label: 'Company (credit)' }, { value: 'cash', label: 'Cash / UPI' }]} />
                        <Select id="rc-ver" label="Verified" value={filters.verified} onChange={(v) => set('verified', v)} options={[{ value: 'yes', label: 'Verified' }, { value: 'no', label: 'Not verified' }]} />
                        <Select id="rc-cash" label="Cash pending" value={filters.cashPending} onChange={(v) => set('cashPending', v)} options={[{ value: 'yes', label: 'Pending' }, { value: 'no', label: 'Cleared' }]} />
                        <Select id="rc-datefield" label="Date means" value={filters.dateField === 'pickupDate' ? 'pickupDate' : ''} all="Booking created" onChange={(v) => set('dateField', v === 'pickupDate' ? 'pickupDate' : 'createdAt')} options={[{ value: 'pickupDate', label: 'Pickup date' }]} />
                        <label className="flex items-center gap-2 text-sm mt-4 col-span-2">
                            <input type="checkbox" className="form-checkbox" checked={filters.includeArchived} onChange={(e) => set('includeArchived', e.target.checked)} />
                            Include archived (old) bookings
                        </label>
                    </div>
                )}
            </div>

            {error && <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error} <button type="button" className="underline ltr:ml-2" onClick={load}>Retry</button></div>}
            {truncated && <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">Showing the latest 10,000 bookings only — narrow the period to see everything.</div>}

            {kind === 'bookings' ? (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Tile label="Bookings" value={loading && !summary ? '…' : (summary?.count ?? 0).toLocaleString('en-IN')} sub={summary ? `${summary.completed} done · ${summary.open} open` : ''} onClick={() => setQuick('')} active={quick === ''} />
                        <Tile label="Total amount" value={inr(summary?.totalAmount || 0)} tone="text-primary" sub={summary ? `${inr(summary.collected)} collected` : ''} />
                        <Tile label="Cash pending" value={inr(summary?.balance || 0)} tone="text-danger" sub={`${summary?.cashPendingCount || 0} bookings`} onClick={() => setQuick(quick === 'pending' ? '' : 'pending')} active={quick === 'pending'} />
                        <Tile label="Not verified" value={rows.filter((r) => !r.verified && r.status === 'Order Completed').length.toLocaleString('en-IN')} tone="text-warning" sub="completed, waiting" onClick={() => setQuick(quick === 'unverified' ? '' : 'unverified')} active={quick === 'unverified'} />
                        <Tile label="Cancelled" value={(summary?.cancelled || 0).toLocaleString('en-IN')} sub="cancelled / rejected" onClick={() => setQuick(quick === 'cancelled' ? '' : 'cancelled')} active={quick === 'cancelled'} />
                        <Tile label="Driver salary" value={inr(summary?.driverSalary || 0)} sub={`${Math.round(summary?.km || 0).toLocaleString('en-IN')} km`} />
                    </div>

                    {/* Chart + top lists */}
                    {summary && summary.byDay.length > 1 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="panel !p-3 lg:col-span-2">
                                <div className="text-sm font-semibold mb-1">Bookings per day</div>
                                <ReactApexChart type="bar" height={200} series={chart.series} options={chart.options as any} />
                            </div>
                            <div className="panel !p-3">
                                <div className="text-sm font-semibold mb-2">Top clients</div>
                                <ul className="space-y-1.5 text-sm">
                                    {summary.topClients.slice(0, 6).map((c) => (
                                        <li key={c.name} className="flex justify-between gap-2"><span className="truncate">{c.name}</span><span className="text-white-dark whitespace-nowrap">{c.count} · {inr(c.amount)}</span></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="panel !p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex flex-wrap gap-1" role="tablist">
                                {([['list', 'All bookings'], ['assigned', 'By driver / provider'], ['client', 'By company / showroom'], ['day', 'By day']] as [View, string][]).map(([v, l]) => (
                                    <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`btn btn-sm !py-1 ${view === v ? 'btn-secondary' : 'btn-outline-secondary'}`}>{l}</button>
                                ))}
                            </div>
                            {view === 'list' && (
                                <div className="relative">
                                    <button type="button" className="btn btn-sm btn-outline-primary !py-1" onClick={() => setShowCols((s) => !s)} aria-expanded={showCols}>Columns</button>
                                    {showCols && (
                                        <div className="absolute ltr:right-0 rtl:left-0 z-30 mt-1 w-56 max-h-80 overflow-auto rounded-md border border-white-light bg-white p-2 shadow-lg dark:border-[#253b5c] dark:bg-[#0e1726]">
                                            {BOOKING_COLS.map((c) => (
                                                <label key={c.key} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                                                    <input type="checkbox" className="form-checkbox" checked={!hidden.includes(c.key)} onChange={() => setHidden((h) => (h.includes(c.key) ? h.filter((x) => x !== c.key) : [...h, c.key]))} />
                                                    {c.label}
                                                </label>
                                            ))}
                                            <button type="button" className="btn btn-sm btn-outline-secondary w-full mt-2 !py-1" onClick={() => setShowCols(false)}>Done</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {loading && rows.length === 0 ? (
                            <div className="py-12 text-center text-white-dark">Loading…</div>
                        ) : view === 'list' ? (
                            <DataTableView rows={quickRows} cols={visibleCols} emptyText="No bookings for these filters" />
                        ) : view === 'day' ? (
                            <DataTableView rows={dayGroups} cols={dayCols} emptyText="No bookings for these filters" />
                        ) : (
                            <DataTableView rows={groups} cols={GROUP_COLS} emptyText="No bookings for these filters" />
                        )}
                        {loading && rows.length > 0 && <div className="text-xs text-white-dark mt-2">Updating…</div>}
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Tile label="Entries" value={expenses.length.toLocaleString('en-IN')} />
                        <Tile label="Total" value={inr(expenseTotal)} tone="text-primary" />
                        <Tile label="Pending approval" value={inr(expenses.filter((e) => /pending/i.test(e.status)).reduce((a, e) => a + e.amount, 0))} tone="text-warning" />
                    </div>
                    <div className="panel !p-3">
                        {loading && expenses.length === 0 ? <div className="py-12 text-center text-white-dark">Loading…</div> : <DataTableView rows={expenses} cols={EXPENSE_COLS} emptyText="No expenses for these filters" />}
                    </div>
                </>
            )}
        </div>
    );
};

export default ReportsCenter;
