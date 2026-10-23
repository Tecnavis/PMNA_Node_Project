import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * One way to search, filter and page through any list on the admin site.
 *
 *   const lc = useListControls(drivers, {
 *       search: (d) => [d.name, d.phone, d.idNumber],
 *       filters: [{ key: 'type', label: 'Type', get: (d) => d.type }],   // options are built from the data
 *       storageKey: 'drivers',                                            // remember page/search when coming back
 *   });
 *   <ListToolbar lc={lc} placeholder="Search name, phone…" />
 *   {lc.pageRows.map((d, i) => <tr key={d._id}><td>{lc.rowNumber(i)}</td>…</tr>)}
 *   <Pager {...lc.pager} />
 *
 * <Pager> also works for lists the server pages: pass page / pageCount / total / pageSize yourself.
 */

export type FilterDef<T> = {
    key: string;
    label: string;
    /** value used for filtering; arrays match if any element matches */
    get: (row: T) => unknown;
    /** fixed options; leave out to build them from the rows */
    options?: { value: string; label: string }[];
    allLabel?: string;
};

type Options<T> = {
    search?: (row: T) => unknown[];
    filters?: FilterDef<T>[];
    pageSize?: number;
    /** remembers search / filters / page in this browser tab (sessionStorage) */
    storageKey?: string;
};

const norm = (v: unknown) => (v === null || v === undefined ? '' : String(v)).toLowerCase();
const flat = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap(flat) : v === null || v === undefined || v === '' ? [] : [String(v)]);

const readSaved = (key?: string) => {
    if (!key) return null;
    try {
        return JSON.parse(sessionStorage.getItem(`list:${key}`) || 'null');
    } catch {
        return null;
    }
};

export function useListControls<T>(rows: T[] | null | undefined, opts: Options<T> = {}) {
    const saved = useRef(readSaved(opts.storageKey)).current;
    const [query, setQueryState] = useState<string>(saved?.query || '');
    const [filterValues, setFilterValues] = useState<Record<string, string>>(saved?.filters || {});
    const [page, setPage] = useState<number>(saved?.page || 1);
    const [pageSize, setPageSizeState] = useState<number>(saved?.pageSize || opts.pageSize || 25);

    const list = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
    const filterDefs = opts.filters || [];

    const filterOptions = useMemo(() => {
        const out: Record<string, { value: string; label: string }[]> = {};
        for (const f of filterDefs) {
            if (f.options) {
                out[f.key] = f.options;
                continue;
            }
            const seen = new Map<string, string>();
            for (const r of list) for (const v of flat(f.get(r))) if (!seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
            out[f.key] = [...seen.values()].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list, filterDefs.length]);

    const filtered = useMemo(() => {
        const words = norm(query).split(/\s+/).filter(Boolean);
        const active = filterDefs.filter((f) => filterValues[f.key]);
        if (!words.length && !active.length) return list;
        return list.filter((r) => {
            for (const f of active) {
                const want = filterValues[f.key].toLowerCase();
                if (!flat(f.get(r)).some((v) => v.toLowerCase() === want)) return false;
            }
            if (words.length) {
                const hay = (opts.search ? opts.search(r) : Object.values(r as any)).flatMap(flat).join(' ').toLowerCase();
                // also match phone numbers / IDs typed with spaces or dashes
                const compact = hay.replace(/[\s-]/g, '');
                return words.every((w) => hay.includes(w) || compact.includes(w.replace(/[\s-]/g, '')));
            }
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list, query, filterValues]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    // While the data is still loading (no rows yet) keep the remembered page instead of snapping to 1.
    const loaded = list.length > 0;
    const current = loaded ? Math.min(Math.max(1, page), pageCount) : Math.max(1, page);
    useEffect(() => {
        if (loaded && page !== current) setPage(current);
    }, [loaded, page, current]);

    useEffect(() => {
        if (!opts.storageKey) return;
        try {
            sessionStorage.setItem(`list:${opts.storageKey}`, JSON.stringify({ query, filters: filterValues, page: current, pageSize }));
        } catch {
            /* storage unavailable: fine */
        }
    }, [opts.storageKey, query, filterValues, current, pageSize]);

    const start = (current - 1) * pageSize;
    const pageRows = useMemo(() => filtered.slice(start, start + pageSize), [filtered, start, pageSize]);

    const setQuery = (q: string) => {
        setQueryState(q);
        setPage(1);
    };
    const setFilter = (key: string, value: string) => {
        setFilterValues((f) => ({ ...f, [key]: value }));
        setPage(1);
    };
    const setPageSize = (n: number) => {
        setPageSizeState(n);
        setPage(1);
    };
    const reset = () => {
        setQueryState('');
        setFilterValues({});
        setPage(1);
    };
    const activeCount = (query ? 1 : 0) + Object.values(filterValues).filter(Boolean).length;

    return {
        rows: list,
        filtered,
        pageRows,
        query,
        setQuery,
        filterDefs,
        filterOptions,
        filterValues,
        setFilter,
        reset,
        activeCount,
        rowNumber: (i: number) => start + i + 1,
        pager: { page: current, pageCount, total: filtered.length, pageSize, onPage: setPage, onPageSize: setPageSize },
    };
}

export type ListControls<T> = ReturnType<typeof useListControls<T>>;

/** Search box + filter dropdowns + "x of y" + Clear. */
export function ListToolbar<T>({ lc, placeholder = 'Search…', children, className = '' }: { lc: ListControls<T>; placeholder?: string; children?: React.ReactNode; className?: string }) {
    return (
        <div className={`mb-4 flex flex-wrap items-center gap-2 ${className}`}>
            <div className="relative w-full sm:w-72">
                <input type="search" className="form-input ltr:pl-9 rtl:pr-9" value={lc.query} onChange={(e) => lc.setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
                <svg className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-white-dark ltr:left-3 rtl:right-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                </svg>
            </div>
            {lc.filterDefs.map((f) => (
                <select key={f.key} className="form-select w-auto min-w-[140px]" value={lc.filterValues[f.key] || ''} onChange={(e) => lc.setFilter(f.key, e.target.value)} aria-label={f.label}>
                    <option value="">{f.allLabel || `All ${f.label.toLowerCase()}`}</option>
                    {(lc.filterOptions[f.key] || []).map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            ))}
            {children}
            <div className="flex items-center gap-2 text-xs text-white-dark ltr:ml-auto rtl:mr-auto">
                <span>
                    {lc.activeCount ? (
                        <>
                            <b className="text-black dark:text-white-light">{lc.filtered.length.toLocaleString('en-IN')}</b> of {lc.rows.length.toLocaleString('en-IN')}
                        </>
                    ) : (
                        <>
                            <b className="text-black dark:text-white-light">{lc.rows.length.toLocaleString('en-IN')}</b> total
                        </>
                    )}
                </span>
                {lc.activeCount > 0 && (
                    <button type="button" className="btn btn-outline-secondary btn-sm !py-1" onClick={lc.reset}>
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}

/** Page numbers with first/last, a "go to page" box and rows-per-page. Works for client or server paging. */
export const Pager: React.FC<{
    page: number;
    pageCount: number;
    total: number;
    pageSize: number;
    onPage: (p: number) => void;
    onPageSize?: (n: number) => void;
    sizes?: number[];
    loading?: boolean;
    className?: string;
}> = ({ page, pageCount, total, pageSize, onPage, onPageSize, sizes = [10, 25, 50, 100], loading, className = '' }) => {
    const [jump, setJump] = useState('');
    if (!total) return null;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const go = (p: number) => {
        const n = Math.min(Math.max(1, p), pageCount);
        if (n !== page) onPage(n);
    };

    // 1 … 4 5 [6] 7 8 … 20
    const nums: (number | '…')[] = [];
    const add = (n: number) => nums.push(n);
    const lo = Math.max(2, page - 2);
    const hi = Math.min(pageCount - 1, page + 2);
    add(1);
    if (lo > 2) nums.push('…');
    for (let n = lo; n <= hi; n++) add(n);
    if (hi < pageCount - 1) nums.push('…');
    if (pageCount > 1) add(pageCount);

    const btn = 'inline-flex h-8 min-w-[32px] items-center justify-center rounded-md border px-2 text-sm transition disabled:opacity-40';
    const idle = 'border-white-light bg-white hover:border-primary hover:text-primary dark:border-[#253b5c] dark:bg-[#0e1726]';
    return (
        <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 text-sm ${loading ? 'opacity-60' : ''} ${className}`}>
            <div className="text-white-dark">
                Showing <b className="text-black dark:text-white-light">{from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')}</b> of{' '}
                <b className="text-black dark:text-white-light">{total.toLocaleString('en-IN')}</b>
            </div>
            {pageCount > 1 && (
                <nav className="flex flex-wrap items-center gap-1" aria-label="Pages">
                    <button type="button" className={`${btn} ${idle}`} onClick={() => go(1)} disabled={page <= 1} aria-label="First page">
                        «
                    </button>
                    <button type="button" className={`${btn} ${idle}`} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
                        ‹
                    </button>
                    {nums.map((n, i) =>
                        n === '…' ? (
                            <span key={`e${i}`} className="px-1 text-white-dark">
                                …
                            </span>
                        ) : (
                            <button
                                key={n}
                                type="button"
                                className={`${btn} ${n === page ? 'border-primary bg-primary text-white' : idle}`}
                                onClick={() => go(n)}
                                aria-current={n === page ? 'page' : undefined}
                            >
                                {n}
                            </button>
                        )
                    )}
                    <button type="button" className={`${btn} ${idle}`} onClick={() => go(page + 1)} disabled={page >= pageCount} aria-label="Next page">
                        ›
                    </button>
                    <button type="button" className={`${btn} ${idle}`} onClick={() => go(pageCount)} disabled={page >= pageCount} aria-label="Last page">
                        »
                    </button>
                    {pageCount > 7 && (
                        <form
                            className="flex items-center gap-1 ltr:ml-2 rtl:mr-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const n = parseInt(jump, 10);
                                if (n) go(n);
                                setJump('');
                            }}
                        >
                            <input
                                className="form-input form-input-sm h-8 w-16 text-center"
                                inputMode="numeric"
                                placeholder="Page"
                                value={jump}
                                onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
                                aria-label="Go to page"
                            />
                            <button type="submit" className={`${btn} ${idle}`}>
                                Go
                            </button>
                        </form>
                    )}
                </nav>
            )}
            {onPageSize && (
                <label className="flex items-center gap-2 text-white-dark">
                    Rows
                    <select className="form-select form-select-sm w-auto" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
                        {Array.from(new Set([...sizes, pageSize]))
                            .sort((a, b) => a - b)
                            .map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                    </select>
                </label>
            )}
        </div>
    );
};

/**
 * State for lists the server pages: page, rows per page, a search box that waits for a pause in typing,
 * and the total. Remembered per tab when storageKey is set.
 *
 *   const sp = useServerPaging({ storageKey: 'bookings' });
 *   useEffect(() => { load(sp.page, sp.pageSize, sp.search) }, [sp.page, sp.pageSize, sp.search]);
 *   ... after loading: sp.setTotal(res.data.total)
 *   <input value={sp.searchInput} onChange={(e) => sp.setSearchInput(e.target.value)} />
 *   <Pager {...sp.pager} />
 */
export function useServerPaging({ storageKey, pageSize: initialSize = 25, delay = 400 }: { storageKey?: string; pageSize?: number; delay?: number } = {}) {
    const saved = useRef(readSaved(storageKey)).current;
    const [page, setPageState] = useState<number>(saved?.page || 1);
    const [pageSize, setPageSizeState] = useState<number>(saved?.pageSize || initialSize);
    const [searchInput, setSearchInput] = useState<string>(saved?.query || '');
    const [search, setSearch] = useState<string>(saved?.query || '');
    const [total, setTotal] = useState<number>(0);

    useEffect(() => {
        if (searchInput === search) return;
        const t = setTimeout(() => {
            setSearch(searchInput.trim() === search.trim() ? searchInput : searchInput);
            setPageState(1);
        }, delay);
        return () => clearTimeout(t);
    }, [searchInput, search, delay]);

    useEffect(() => {
        if (!storageKey) return;
        try {
            sessionStorage.setItem(`list:${storageKey}`, JSON.stringify({ query: search, page, pageSize }));
        } catch {
            /* fine */
        }
    }, [storageKey, search, page, pageSize]);

    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const setPage = (p: number) => setPageState(Math.max(1, p));
    const setPageSize = (n: number) => {
        setPageSizeState(n);
        setPageState(1);
    };
    const resetSearch = () => {
        setSearchInput('');
        setSearch('');
        setPageState(1);
    };
    return {
        page,
        setPage,
        pageSize,
        setPageSize,
        searchInput,
        setSearchInput,
        search: search.trim(),
        resetSearch,
        total,
        setTotal,
        rowNumber: (i: number) => (page - 1) * pageSize + i + 1,
        pager: { page, pageCount, total, pageSize, onPage: setPage, onPageSize: setPageSize },
    };
}

/**
 * Text box that reports its value only after typing pauses (default 400 ms), so the page searches once
 * instead of once per letter. Use onSearch to also reset the page:  onSearch={(v) => { setPage(1); setSearch(v); }}
 */
export const DebouncedSearch: React.FC<{ value: string; onSearch: (v: string) => void; placeholder?: string; className?: string; delay?: number }> = ({
    value,
    onSearch,
    placeholder = 'Search…',
    className = 'form-input',
    delay = 400,
}) => {
    const [text, setText] = useState(value);
    const last = useRef(value);
    useEffect(() => {
        // the page changed the value itself (e.g. Clear): show it
        if (value !== last.current) {
            last.current = value;
            setText(value);
        }
    }, [value]);
    useEffect(() => {
        if (text === last.current) return;
        const t = setTimeout(() => {
            last.current = text;
            onSearch(text);
        }, delay);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, delay]);
    return <input type="search" className={className} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} aria-label={placeholder} />;
};
