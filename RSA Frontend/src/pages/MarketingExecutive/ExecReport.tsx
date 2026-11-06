import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Pager } from '../../components/ui/ListControls';
import { getImageUrl } from '../../utils/imageUrl';
import {
    ExecRow,
    NewShowroomRow,
    SummaryRow,
    SummaryTotals,
    VisitRow,
    errorText,
    fmtDay,
    fmtWhen,
    getExecutives,
    getNewShowrooms,
    getSummary,
    getVisits,
    istDay,
} from './execTasksApi';

/** Marketing executive report: visits and new showroom additions for any period. */

type Tab = 'summary' | 'visits' | 'new';
const MAX_DISTANCE = 500; // same as the app's "be at the showroom" limit (VISIT_MAX_DISTANCE_M default)

const monthStart = (offset = 0) => {
    const [y, m] = istDay().split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + offset, 1));
    return d.toISOString().slice(0, 10);
};
const monthEnd = (offset = 0) => {
    const [y, m] = istDay().split('-').map(Number);
    const d = new Date(Date.UTC(y, m + offset, 0));
    return d.toISOString().slice(0, 10);
};
const daysAgo = (n: number) => istDay(new Date(Date.now() - n * 86400000));
const PRESETS: { label: string; from: () => string; to: () => string }[] = [
    { label: 'This month', from: () => monthStart(0), to: () => istDay() },
    { label: 'Last month', from: () => monthStart(-1), to: () => monthEnd(-1) },
    { label: 'Last 7 days', from: () => daysAgo(6), to: () => istDay() },
    { label: 'Last 90 days', from: () => daysAgo(89), to: () => istDay() },
];

const Kpi: React.FC<{ label: string; value: React.ReactNode; tone?: string; sub?: string }> = ({ label, value, tone = '', sub }) => (
    <div className="px-4 py-3">
        <div className="ui-eyebrow">{label}</div>
        <div className={`ui-num mt-1 text-[30px] leading-none ${tone}`}>{value}</div>
        {sub && <div className="mt-1 text-[11px] text-[#8a90a2]">{sub}</div>}
    </div>
);

const ExecReport: React.FC = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Executive report'));
    }, [dispatch]);

    const [from, setFrom] = useState(monthStart(0));
    const [to, setTo] = useState(istDay());
    const [executive, setExecutive] = useState('');
    const [execs, setExecs] = useState<ExecRow[]>([]);
    const [tab, setTab] = useState<Tab>('summary');
    const [error, setError] = useState('');

    const [summary, setSummary] = useState<{ data: SummaryRow[]; totals: SummaryTotals } | null>(null);
    const [visits, setVisits] = useState<VisitRow[] | null>(null);
    const [visitTotal, setVisitTotal] = useState(0);
    const [visitPage, setVisitPage] = useState(1);
    const [added, setAdded] = useState<NewShowroomRow[] | null>(null);
    const [addedTotal, setAddedTotal] = useState(0);
    const [addedPage, setAddedPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const PAGE = 50;

    useEffect(() => {
        getExecutives().then((r) => setExecs(r.list)).catch(() => setExecs([]));
    }, []);

    const badRange = from > to;
    useEffect(() => {
        if (badRange) return;
        setSummary(null);
        getSummary({ from, to, executive: executive || undefined })
            .then((r) => { setSummary(r); setError(''); })
            .catch((e) => setError(errorText(e, 'Could not load the report')));
    }, [from, to, executive, badRange]);
    useEffect(() => {
        if (badRange || tab !== 'visits') return;
        setVisits(null);
        getVisits({ from, to, executive: executive || undefined, page: visitPage, limit: PAGE })
            .then((r) => { setVisits(r.data); setVisitTotal(r.total); })
            .catch((e) => { setVisits([]); setError(errorText(e, 'Could not load visits')); });
    }, [from, to, executive, tab, visitPage, badRange]);
    useEffect(() => {
        if (badRange || tab !== 'new') return;
        setAdded(null);
        getNewShowrooms({ from, to, executive: executive || undefined, page: addedPage, limit: PAGE })
            .then((r) => { setAdded(r.data); setAddedTotal(r.total); })
            .catch((e) => { setAdded([]); setError(errorText(e, 'Could not load new showrooms')); });
    }, [from, to, executive, tab, addedPage, badRange]);
    useEffect(() => {
        setVisitPage(1);
        setAddedPage(1);
    }, [from, to, executive]);

    const t = summary?.totals;
    const execName = execs.find((e) => e._id === executive)?.name;

    const exportExcel = async () => {
        setExporting(true);
        try {
            const wb = XLSX.utils.book_new();
            const s = summary || (await getSummary({ from, to, executive: executive || undefined }));
            XLSX.utils.book_append_sheet(
                wb,
                XLSX.utils.json_to_sheet(
                    s.data.map((r) => ({
                        Executive: r.name,
                        Phone: r.phone,
                        'Showrooms looked after': r.showrooms,
                        Visits: r.visits,
                        'Showrooms visited': r.showroomsVisited,
                        'Coverage %': r.coverage ?? '',
                        'Not visited': r.notVisited,
                        'New showrooms added': r.newShowrooms,
                        'Bookings from their showrooms': r.bookings,
                        'Tasks given': r.tasksGiven,
                        'Tasks done': r.tasksDone,
                        'Done on time': r.tasksDoneOnTime,
                        'Open tasks now': r.openTasks,
                        'Overdue now': r.overdueTasks,
                        'Last visit': r.lastVisitAt ? fmtWhen(r.lastVisitAt) : '',
                    }))
                ),
                'Summary'
            );
            const all = async <T,>(get: (p: number) => Promise<{ data: T[]; pages: number }>) => {
                const first = await get(1);
                const out = [...first.data];
                for (let p = 2; p <= Math.min(first.pages, 50); p++) out.push(...(await get(p)).data);
                return out;
            };
            const vs = await all((p) => getVisits({ from, to, executive: executive || undefined, page: p, limit: 200 }));
            XLSX.utils.book_append_sheet(
                wb,
                XLSX.utils.json_to_sheet(
                    vs.map((v) => ({
                        'Date & time': fmtWhen(v.at),
                        Executive: v.executive.name,
                        Showroom: v.showroom?.name || '',
                        Code: v.showroom?.code || '',
                        District: v.showroom?.district || '',
                        'Distance from showroom (m)': v.distanceM ?? '',
                        'GPS accuracy (m)': v.accuracy ?? '',
                        Location: v.point ? `${v.point.lat}, ${v.point.lng}` : '',
                        Photo: v.image ? getImageUrl(v.image) : '',
                    }))
                ),
                'Visits'
            );
            const ns = await all((p) => getNewShowrooms({ from, to, executive: executive || undefined, page: p, limit: 200 }));
            XLSX.utils.book_append_sheet(
                wb,
                XLSX.utils.json_to_sheet(
                    ns.map((n) => ({
                        Added: fmtDay(n.createdAt),
                        Showroom: n.name,
                        Code: n.code,
                        District: n.district,
                        Place: n.location,
                        Phone: n.phone,
                        'Added by': n.addedBy.name,
                        'Looked after by': n.lookedAfterBy || n.addedBy.name,
                        Bookings: n.bookings,
                        'First booking': n.firstBookingAt ? fmtDay(n.firstBookingAt) : '',
                        Visits: n.visits,
                    }))
                ),
                'New showrooms'
            );
            XLSX.writeFile(wb, `executive-report-${from}-to-${to}${execName ? `-${execName.replace(/\s+/g, '-')}` : ''}.xlsx`);
        } catch (e) {
            Swal.fire('Export failed', errorText(e), 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="ui-eyebrow">Marketing Executives / Report</div>
                    <h1 className="mt-1 text-[34px] font-normal leading-tight tracking-tight text-[#111318] dark:text-white">Executive report</h1>
                    <p className="text-sm text-[#5d6375]">Showroom visits and new showroom additions by each marketing executive.</p>
                </div>
                <button type="button" className="btn btn-outline-primary" onClick={exportExcel} disabled={exporting || badRange}>
                    {exporting ? 'Preparing…' : '⬇ Excel'}
                </button>
            </div>

            <div className="panel flex flex-wrap items-center gap-2">
                {PRESETS.map((p, i) => (
                    <button key={p.label} type="button" className={`ui-chip ${PRESETS.findIndex((x) => from === x.from() && to === x.to()) === i ? 'ui-chip-active' : ''}`} onClick={() => { setFrom(p.from()); setTo(p.to()); }}>
                        {p.label}
                    </button>
                ))}
                <input type="date" className="form-input form-input-sm w-36" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
                <span className="text-[#8a90a2]">to</span>
                <input type="date" className="form-input form-input-sm w-36" value={to} min={from} max={istDay()} onChange={(e) => setTo(e.target.value)} aria-label="To" />
                <select className="form-select form-select-sm ml-auto w-56" value={executive} onChange={(e) => setExecutive(e.target.value)} aria-label="Executive">
                    <option value="">All executives</option>
                    {execs.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
            </div>
            {badRange && <div className="rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">The “from” date is after the “to” date.</div>}
            {error && <div className="rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">{error}</div>}

            <div className="panel !p-2">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 xl:divide-x divide-[#eceef2] dark:divide-[#1b2e4b]">
                    <Kpi label="Visits" value={t ? t.visits : '–'} sub={t ? `${t.showroomsVisited} showrooms` : undefined} />
                    <Kpi label="Coverage" value={t && t.showrooms ? `${Math.round((t.showroomsVisited / t.showrooms) * 100)}%` : '—'} sub={t ? `of ${t.showrooms} showrooms` : undefined} />
                    <Kpi label="New showrooms" value={t ? t.newShowrooms : '–'} tone="text-brand" />
                    <Kpi label="Bookings" value={t ? t.bookings : '–'} sub="from their showrooms" />
                    <Kpi label="Tasks done" value={t ? `${t.tasksDone}` : '–'} sub={t ? `${t.tasksGiven} given in period` : undefined} />
                    <Kpi label="Overdue now" value={t ? t.overdueTasks : '–'} tone={t?.overdueTasks ? 'text-brand' : ''} sub={t ? `${t.openTasks} open` : undefined} />
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {([['summary', 'By executive'], ['visits', 'Visits'], ['new', 'New showrooms']] as [Tab, string][]).map(([k, l]) => (
                    <button key={k} type="button" className={`ui-chip ${tab === k ? 'ui-chip-active' : ''}`} onClick={() => setTab(k)}>{l}</button>
                ))}
            </div>

            {tab === 'summary' && (
                <div className="panel">
                    <div className="table-responsive">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eceef2] text-left dark:border-[#1b2e4b]">
                                    <th className="px-3 py-2.5">Executive</th>
                                    <th className="px-3 py-2.5 text-right">Showrooms</th>
                                    <th className="px-3 py-2.5 text-right">Visits</th>
                                    <th className="px-3 py-2.5">Coverage</th>
                                    <th className="px-3 py-2.5 text-right">New showrooms</th>
                                    <th className="px-3 py-2.5 text-right">Bookings</th>
                                    <th className="px-3 py-2.5 text-right">Tasks done</th>
                                    <th className="px-3 py-2.5 text-right">Open / overdue</th>
                                    <th className="px-3 py-2.5">Last visit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!summary && !badRange && <tr><td colSpan={9} className="py-10 text-center text-white-dark">Loading…</td></tr>}
                                {summary && summary.data.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-white-dark">No marketing executives.</td></tr>}
                                {(summary?.data || []).map((r) => (
                                    <tr key={r._id} className="cursor-pointer border-b border-[#f1f2f5] hover:bg-[#fafbfc] dark:border-[#1b2e4b] dark:hover:bg-[#1a2941]/30" onClick={() => { setExecutive(r._id); setTab('visits'); }} title="See this executive's visits">
                                        <td className="px-3 py-2.5"><b>{r.name}</b><div className="text-[11px] text-[#8a90a2]">{r.phone}</div></td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{r.showrooms}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{r.visits}<div className="text-[11px] text-[#8a90a2]">{r.showroomsVisited} showrooms</div></td>
                                        <td className="px-3 py-2.5">
                                            {r.coverage === null ? (
                                                <span className="text-[#8a90a2]">—</span>
                                            ) : (
                                                <div className="w-32">
                                                    <div className="flex justify-between text-xs"><b>{r.coverage}%</b><span className="text-[#8a90a2]">{r.notVisited} not visited</span></div>
                                                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#eef0f3]"><div className={`h-full rounded-full ${r.coverage >= 80 ? 'bg-success' : r.coverage >= 50 ? 'bg-warning' : 'bg-brand'}`} style={{ width: `${r.coverage}%` }} /></div>
                                                </div>
                                            )}
                                        </td>
                                        <td className={`px-3 py-2.5 text-right tabular-nums ${r.newShowrooms ? 'font-bold text-brand' : ''}`}>{r.newShowrooms}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{r.bookings}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{r.tasksDone}<div className="text-[11px] text-[#8a90a2]">{r.tasksDoneOnTime} on time · {r.tasksGiven} given</div></td>
                                        <td className={`px-3 py-2.5 text-right tabular-nums ${r.overdueTasks ? 'text-brand' : ''}`}>{r.openTasks}{r.overdueTasks ? ` / ${r.overdueTasks}` : ''}</td>
                                        <td className="px-3 py-2.5 text-xs">{r.lastVisitAt ? fmtDay(r.lastVisitAt) : <span className="text-brand">Never</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-[11px] text-[#8a90a2]">Coverage = showrooms they look after that were visited in this period. New showrooms are credited to the executive who added them, even if the showroom was later given to someone else. Click a row to see that executive’s visits.</p>
                </div>
            )}

            {tab === 'visits' && (
                <div className="panel">
                    <div className="table-responsive">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eceef2] text-left dark:border-[#1b2e4b]">
                                    <th className="px-3 py-2.5">When</th>
                                    {!executive && <th className="px-3 py-2.5">Executive</th>}
                                    <th className="px-3 py-2.5">Showroom</th>
                                    <th className="px-3 py-2.5">Distance</th>
                                    <th className="px-3 py-2.5">GPS accuracy</th>
                                    <th className="px-3 py-2.5">Photo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!visits && <tr><td colSpan={6} className="py-10 text-center text-white-dark">Loading…</td></tr>}
                                {visits && visits.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-white-dark">No visits in this period{execName ? ` by ${execName}` : ''}.</td></tr>}
                                {(visits || []).map((v) => (
                                    <tr key={v._id} className="border-b border-[#f1f2f5] dark:border-[#1b2e4b]">
                                        <td className="px-3 py-2.5 whitespace-nowrap">{fmtWhen(v.at)}</td>
                                        {!executive && <td className="px-3 py-2.5 font-semibold">{v.executive.name}</td>}
                                        <td className="px-3 py-2.5"><div className="font-semibold">{v.showroom?.name || '(removed)'}</div><div className="text-xs text-[#8a90a2]">{[v.showroom?.code, v.showroom?.district || v.showroom?.location].filter(Boolean).join(' · ')}</div></td>
                                        <td className="px-3 py-2.5">
                                            {v.distanceM === null ? (
                                                <span className="text-xs text-[#8a90a2]">showroom location not saved</span>
                                            ) : (
                                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.distanceM <= MAX_DISTANCE ? 'bg-success/15 text-success' : 'bg-brand-light text-brand'}`}>
                                                    {v.distanceM < 1000 ? `${v.distanceM} m` : `${(v.distanceM / 1000).toFixed(1)} km`}
                                                </span>
                                            )}
                                            {v.point && (
                                                <a className="ml-2 text-xs font-semibold text-primary" href={`https://www.google.com/maps?q=${v.point.lat},${v.point.lng}`} target="_blank" rel="noreferrer">Map</a>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs tabular-nums">{v.accuracy === null ? '—' : `±${Math.round(v.accuracy)} m`}</td>
                                        <td className="px-3 py-2.5">
                                            {v.image ? (
                                                <a href={getImageUrl(v.image)} target="_blank" rel="noreferrer">
                                                    <img src={getImageUrl(v.image)} alt={`Visit at ${v.showroom?.name || 'showroom'}`} className="h-12 w-16 overflow-hidden rounded-lg bg-[#eef0f3] object-cover text-[0px]" loading="lazy" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-[#8a90a2]">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pager page={visitPage} pageCount={Math.max(1, Math.ceil(visitTotal / PAGE))} total={visitTotal} pageSize={PAGE} onPage={setVisitPage} />
                </div>
            )}

            {tab === 'new' && (
                <div className="panel">
                    <div className="table-responsive">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#eceef2] text-left dark:border-[#1b2e4b]">
                                    <th className="px-3 py-2.5">Added</th>
                                    <th className="px-3 py-2.5">Showroom</th>
                                    {!executive && <th className="px-3 py-2.5">Added by</th>}
                                    <th className="px-3 py-2.5">Looked after by</th>
                                    <th className="px-3 py-2.5 text-right">Bookings</th>
                                    <th className="px-3 py-2.5 text-right">Visits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!added && <tr><td colSpan={6} className="py-10 text-center text-white-dark">Loading…</td></tr>}
                                {added && added.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-white-dark">No new showrooms in this period{execName ? ` by ${execName}` : ''}.</td></tr>}
                                {(added || []).map((n) => (
                                    <tr key={n._id} className="border-b border-[#f1f2f5] dark:border-[#1b2e4b]">
                                        <td className="px-3 py-2.5 whitespace-nowrap">{fmtDay(n.createdAt)}</td>
                                        <td className="px-3 py-2.5"><div className="font-semibold">{n.name}</div><div className="text-xs text-[#8a90a2]">{[n.code, n.district || n.location, n.phone].filter(Boolean).join(' · ')}</div></td>
                                        {!executive && <td className="px-3 py-2.5 font-semibold">{n.addedBy.name}</td>}
                                        <td className="px-3 py-2.5">{n.lookedAfterBy || n.addedBy.name}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{n.bookings}{n.firstBookingAt && <div className="text-[11px] text-[#8a90a2]">first {fmtDay(n.firstBookingAt)}</div>}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{n.visits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pager page={addedPage} pageCount={Math.max(1, Math.ceil(addedTotal / PAGE))} total={addedTotal} pageSize={PAGE} onPage={setAddedPage} />
                </div>
            )}
        </div>
    );
};

export default ExecReport;
