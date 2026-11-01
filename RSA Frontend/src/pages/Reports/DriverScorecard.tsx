import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { BASE_URL } from '../../config/axiosConfig';
import { useListControls, ListToolbar, Pager } from '../../components/ui/ListControls';

type Row = {
    _id: string; kind: 'driver' | 'provider'; name: string; phone: string; cases: number; completed: number; cancelled: number; completionRate: number;
    avgMinutesToPickup: number | null; pickupsMeasured: number; latePickups: number; onTimeRate: number | null; rating: number | null; ratings: number; lowRatings: number;
    cashPending: number; amount: number; score: number | null;
};
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const daysAgo = (n: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() - n * 86400000));
const scoreTone = (s: number | null) => (s === null ? 'bg-[#eef0f3] text-[#8a90a2]' : s >= 80 ? 'bg-[#d9f99d] text-[#365314]' : s >= 60 ? 'bg-warning/15 text-warning' : 'bg-brand-light text-brand');

const DriverScorecard: React.FC = () => {
    const dispatch = useDispatch();
    const [from, setFrom] = useState(daysAgo(29));
    const [to, setTo] = useState(today());
    const [rows, setRows] = useState<Row[] | null>(null);
    const [late, setLate] = useState(90);
    const [error, setError] = useState('');
    useEffect(() => {
        dispatch(setPageTitle('Driver scorecard'));
    }, [dispatch]);
    useEffect(() => {
        setRows(null);
        axios
            .get(`${BASE_URL}/insights/scorecard`, { ...auth(), params: { from, to } })
            .then((r) => { setRows(r.data?.people || []); setLate(r.data?.latePickupMinutes || 90); setError(''); })
            .catch((e) => { setRows([]); setError(e?.response?.data?.message || 'Could not load the scorecard'); });
    }, [from, to]);

    const lc = useListControls(rows || [], {
        storageKey: 'driver-scorecard',
        search: (r) => [r.name, r.phone],
        filters: [{ key: 'kind', label: 'Type', get: (r) => (r.kind === 'provider' ? 'Provider' : 'Driver') }],
        pageSize: 25,
    });
    const team = useMemo(() => {
        const list = rows || [];
        const scored = list.filter((r) => r.score !== null);
        const rated = list.filter((r) => r.rating !== null);
        return {
            cases: list.reduce((s, r) => s + r.cases, 0),
            avgScore: scored.length ? Math.round(scored.reduce((s, r) => s + (r.score || 0), 0) / scored.length) : null,
            avgRating: rated.length ? Math.round((rated.reduce((s, r) => s + (r.rating || 0) * r.ratings, 0) / Math.max(1, rated.reduce((s, r) => s + r.ratings, 0))) * 10) / 10 : null,
            late: list.reduce((s, r) => s + r.latePickups, 0),
        };
    }, [rows]);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="ui-eyebrow">Reports / Driver scorecard</div>
                    <h1 className="mt-1 text-[34px] font-normal leading-tight tracking-tight text-[#111318] dark:text-white">Driver scorecard</h1>
                    <p className="text-sm text-[#5d6375]">Score out of 100: completion 30% · on-time pickup 30% · customer rating 25% · cash settled 15%. A pickup slower than {late} min counts as late.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {[7, 30, 90].map((n) => (
                        <button key={n} type="button" className={`ui-chip ${from === daysAgo(n - 1) && to === today() ? 'ui-chip-active' : ''}`} onClick={() => { setFrom(daysAgo(n - 1)); setTo(today()); }}>Last {n} days</button>
                    ))}
                    <input type="date" className="form-input form-input-sm w-36" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
                    <input type="date" className="form-input form-input-sm w-36" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
                </div>
            </div>

            <div className="panel !p-2">
                <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x divide-[#eceef2] dark:divide-[#1b2e4b]">
                    {[
                        ['Drivers', rows?.length ?? '–'],
                        ['Cases', team.cases],
                        ['Team score', team.avgScore ?? '—'],
                        ['Customer rating', team.avgRating ? `${team.avgRating}★` : '—'],
                    ].map(([l, v]) => (
                        <div key={l as string} className="px-4 py-3"><div className="ui-eyebrow">{l}</div><div className="ui-num mt-1 text-[34px] leading-none">{v}</div></div>
                    ))}
                </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="panel">
                <ListToolbar lc={lc} placeholder="Search driver name or phone" />
                <div className="table-responsive mt-3">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#eceef2] text-left dark:border-[#1b2e4b]">
                                <th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">Driver</th><th className="px-3 py-2.5 text-center">Score</th><th className="px-3 py-2.5 text-right">Cases</th>
                                <th className="px-3 py-2.5 text-right">Completed</th><th className="px-3 py-2.5 text-right">Avg time to pickup</th><th className="px-3 py-2.5 text-right">Late pickups</th>
                                <th className="px-3 py-2.5 text-right">Rating</th><th className="px-3 py-2.5 text-right">Cash pending</th><th className="px-3 py-2.5 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!rows && <tr><td colSpan={10} className="py-10 text-center text-white-dark">Loading…</td></tr>}
                            {rows && lc.pageRows.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-white-dark">No cases with a driver in this period.</td></tr>}
                            {lc.pageRows.map((r, i) => (
                                <tr key={r._id} className="border-b border-[#f1f2f5] dark:border-[#1b2e4b]">
                                    <td className="px-3 py-2.5 text-[#8a90a2]">{lc.rowNumber(i)}</td>
                                    <td className="px-3 py-2.5"><b>{r.name}</b><div className="text-[11px] text-[#8a90a2]">{r.kind === 'provider' ? 'Provider' : 'Driver'}{r.phone ? ` · ${r.phone}` : ''}</div></td>
                                    <td className="px-3 py-2.5 text-center"><span className={`inline-block min-w-[44px] rounded-full px-2.5 py-1 text-sm font-bold ${scoreTone(r.score)}`}>{r.score ?? '—'}</span></td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{r.cases}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{r.completed}<div className="text-[11px] text-[#8a90a2]">{r.completionRate}%{r.cancelled ? ` · ${r.cancelled} cancelled` : ''}</div></td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{r.avgMinutesToPickup === null ? '—' : `${r.avgMinutesToPickup} min`}<div className="text-[11px] text-[#8a90a2]">{r.pickupsMeasured} measured</div></td>
                                    <td className={`px-3 py-2.5 text-right tabular-nums ${r.latePickups ? 'text-brand' : ''}`}>{r.latePickups}{r.onTimeRate !== null && <div className="text-[11px] text-[#8a90a2]">{r.onTimeRate}% on time</div>}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{r.rating === null ? '—' : `${r.rating}★`}<div className="text-[11px] text-[#8a90a2]">{r.ratings ? `${r.ratings} rating${r.ratings === 1 ? '' : 's'}${r.lowRatings ? ` · ${r.lowRatings} low` : ''}` : 'no ratings'}</div></td>
                                    <td className={`px-3 py-2.5 text-right tabular-nums ${r.cashPending ? 'text-warning' : ''}`}>{r.cashPending}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{inr(r.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pager {...lc.pager} />
                <p className="mt-2 text-[11px] text-[#8a90a2]">Time to pickup = from booking (or the planned pickup time for scheduled cases) to the pickup photos. Customer ratings come from the tracking link sent after drop-off.</p>
            </div>
        </div>
    );
};

export default DriverScorecard;
