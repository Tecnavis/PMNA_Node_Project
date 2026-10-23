import React from 'react';

/**
 * Small shared building blocks so payment / transaction / status pages look the same
 * as the dashboard: compact header, stat tiles, cards, tabs, fields.
 */

export const money = (n: unknown) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

export const PageHeader: React.FC<{ title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
            <h1 className="text-xl font-semibold text-black dark:text-white-light">{title}</h1>
            {subtitle && <div className="mt-0.5 text-xs text-white-dark">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
const toneText: Record<Tone, string> = {
    default: 'text-black dark:text-white-light',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
};

export const StatCard: React.FC<{ label: string; value: React.ReactNode; tone?: Tone; hint?: React.ReactNode; onClick?: () => void; active?: boolean }> = ({
    label,
    value,
    tone = 'default',
    hint,
    onClick,
    active,
}) => {
    const cls = `panel !p-3 h-full text-left transition ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${active ? 'ring-2 ring-primary' : ''}`;
    const body = (
        <>
            <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-white-dark">{label}</div>
            <div className={`mt-1 text-xl font-bold leading-tight sm:text-2xl ${toneText[tone]}`}>{value}</div>
            {hint && <div className="mt-0.5 truncate text-[11px] text-white-dark">{hint}</div>}
        </>
    );
    return onClick ? (
        <button type="button" className={cls} onClick={onClick}>
            {body}
        </button>
    ) : (
        <div className={cls}>{body}</div>
    );
};

export const StatGrid: React.FC<{ children: React.ReactNode; cols?: string }> = ({ children, cols = 'grid-cols-2 md:grid-cols-4' }) => (
    <div className={`mb-4 grid gap-3 ${cols}`}>{children}</div>
);

export const Section: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; id?: string }> = ({
    title,
    actions,
    children,
    className = '',
    bodyClassName = '',
    id,
}) => (
    <div className={`panel !p-0 mb-4 ${className}`} id={id}>
        {(title || actions) && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                {title && <h2 className="text-sm font-semibold text-black dark:text-white-light">{title}</h2>}
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
        )}
        <div className={bodyClassName || 'p-4'}>{children}</div>
    </div>
);

export type TabItem<K extends string | number> = { key: K; label: string; count?: React.ReactNode; icon?: React.ReactNode };

export function SegTabs<K extends string | number>({ tabs, value, onChange, className = '' }: { tabs: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
    return (
        <div className={`flex gap-1 overflow-x-auto rounded-lg bg-white-light/60 p-1 dark:bg-[#1b2e4b]/60 ${className}`} role="tablist">
            {tabs.map((t) => {
                const on = t.key === value;
                return (
                    <button
                        key={String(t.key)}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => onChange(t.key)}
                        className={`flex min-w-max flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                            on ? 'bg-white text-primary shadow dark:bg-[#0e1726]' : 'text-white-dark hover:text-primary'
                        }`}
                    >
                        {t.icon}
                        {t.label}
                        {t.count !== undefined && t.count !== null && (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? 'bg-primary text-white' : 'bg-white-light text-black dark:bg-[#0e1726] dark:text-white-light'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: React.ReactNode; className?: string }> = ({ label, children, hint, className = '' }) => (
    <label className={`block min-w-0 ${className}`}>
        <span className="mb-1 block text-xs font-semibold text-white-dark">{label}</span>
        {children}
        {hint && <span className="mt-1 block text-xs">{hint}</span>}
    </label>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; className?: string }> = ({ value, onChange, placeholder = 'Search…', className = '' }) => (
    <div className={`relative ${className}`}>
        <input type="search" className="form-input ltr:pl-9 rtl:pr-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        <svg className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-white-dark ltr:left-3 rtl:right-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    </div>
);

export const EmptyState: React.FC<{ title: string; text?: React.ReactNode; action?: React.ReactNode }> = ({ title, text, action }) => (
    <div className="py-10 text-center">
        <div className="text-sm font-semibold text-black dark:text-white-light">{title}</div>
        {text && <div className="mx-auto mt-1 max-w-md text-xs text-white-dark">{text}</div>}
        {action && <div className="mt-3">{action}</div>}
    </div>
);

export const Badge: React.FC<{ children: React.ReactNode; tone?: Tone; className?: string }> = ({ children, tone = 'default', className = '' }) => {
    const map: Record<Tone, string> = {
        default: 'bg-white-light text-black dark:bg-[#1b2e4b] dark:text-white-light',
        primary: 'bg-primary/10 text-primary',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-danger/10 text-danger',
        info: 'bg-info/10 text-info',
    };
    return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[tone]} ${className}`}>{children}</span>;
};

/** Mantine DataTable props shared by these pages: compact, no rainbow rows. */
export const tableProps = {
    withBorder: false,
    striped: true,
    highlightOnHover: true,
    minHeight: 180,
    className: 'whitespace-nowrap table-hover',
    noRecordsText: 'Nothing to show',
} as const;

/** Client-side paging for Mantine DataTable. */
export function usePaged<T>(rows: T[], initialSize = 50) {
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(initialSize);
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    React.useEffect(() => {
        if (page > pages) setPage(1);
    }, [page, pages]);
    const pageRows = React.useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
    const paging =
        rows.length > pageSize || pageSize !== initialSize
            ? {
                  page,
                  onPageChange: setPage,
                  totalRecords: rows.length,
                  recordsPerPage: pageSize,
                  onRecordsPerPageChange: (n: number) => {
                      setPageSize(n);
                      setPage(1);
                  },
                  recordsPerPageOptions: [25, 50, 100, 250, 500],
                  paginationText: ({ from, to, totalRecords }: { from: number; to: number; totalRecords: number }) => `${from}–${to} of ${totalRecords}`,
              }
            : {};
    return { pageRows, paging, setPage };
}

/** Excel / PDF of the given rows (all of them, not just the page on screen). */
export function DataExportButtons<T>({ title, subtitle, columns, rows, totals }: { title: string; subtitle?: string; columns: import('../../utils/exportTable').ExportColumn<T>[]; rows: T[]; totals?: Record<string, string | number> }) {
    const [busy, setBusy] = React.useState('');
    const run = async (type: 'xlsx' | 'pdf') => {
        if (!rows.length) {
            alert('There is nothing to export.');
            return;
        }
        setBusy(type);
        try {
            const m = await import('../../utils/exportTable');
            const meta = { title, subtitle: subtitle || `Exported ${new Date().toLocaleDateString('en-IN')}`, totals, fileName: `${title}_${new Date().toISOString().slice(0, 10)}` };
            await (type === 'xlsx' ? m.exportExcel(columns, rows, meta) : m.exportPdf(columns, rows, meta));
        } catch (e) {
            console.error(e);
            alert('Export failed. Please try again.');
        } finally {
            setBusy('');
        }
    };
    return (
        <div className="flex gap-2">
            <button type="button" className="btn btn-sm btn-success" disabled={!!busy} onClick={() => run('xlsx')} title={`Download ${rows.length} rows as Excel`}>
                {busy === 'xlsx' ? '…' : 'Excel'}
            </button>
            <button type="button" className="btn btn-sm btn-danger" disabled={!!busy} onClick={() => run('pdf')} title={`Download ${rows.length} rows as PDF`}>
                {busy === 'pdf' ? '…' : 'PDF'}
            </button>
        </div>
    );
}
