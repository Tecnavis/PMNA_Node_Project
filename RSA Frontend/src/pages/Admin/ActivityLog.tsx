import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import { BASE_URL } from '../../config/axiosConfig';
import { Pager, useServerPaging } from '../../components/ui/ListControls';
import AdminOnly, { PageTitle, authHeader, fmtDateTime } from './AdminOnly';

type Login = { _id: string; kind: 'admin' | 'staff'; name?: string; login?: string; success: boolean; reason?: string; ip?: string; device?: string; at: string };
type Activity = { _id: string; actor: { role: string; id: string; name: string }; method: string; path: string; action: string; category: string; targetId?: string; status: number; ok: boolean; ip?: string; device?: string; at: string };

const REASON: Record<string, string> = {
    ok: 'Logged in',
    'ok-2fa': 'Logged in (with code)',
    'wrong-password': 'Wrong password',
    'unknown-user': 'Unknown user name',
    'otp-sent': 'Code sent — waiting',
    'otp-not-sent': 'Code could not be sent',
    'otp-wrong': 'Wrong / expired code',
};
const CATS: { key: string; label: string; tone: string }[] = [
    { key: '', label: 'All', tone: '' },
    { key: 'money', label: 'Money', tone: 'bg-success/10 text-success' },
    { key: 'delete', label: 'Deletes', tone: 'bg-brand-light text-brand' },
    { key: 'booking', label: 'Bookings', tone: 'bg-primary-light text-primary' },
    { key: 'people', label: 'People', tone: 'bg-warning/15 text-warning' },
    { key: 'settings', label: 'Settings', tone: 'bg-[#eef0f3] text-[#3b4153]' },
    { key: 'other', label: 'Other', tone: 'bg-[#eef0f3] text-[#3b4153]' },
];
const toneOf = (c: string) => CATS.find((x) => x.key === c)?.tone || 'bg-[#eef0f3] text-[#3b4153]';

const ActivityLog: React.FC = () => {
    const dispatch = useDispatch();
    const [tab, setTab] = useState<'activity' | 'logins'>('activity');
    useEffect(() => {
        dispatch(setPageTitle('Activity & logins'));
    }, [dispatch]);

    // shared filters
    const sp = useServerPaging({ storageKey: `audit-${tab}`, pageSize: 25 });
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [category, setCategory] = useState('');
    const [actor, setActor] = useState('');
    const [result, setResult] = useState('');
    const [rows, setRows] = useState<any[]>([]);
    const [people, setPeople] = useState<{ id: string; name: string; count: number }[]>([]);
    const [failed24h, setFailed24h] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const seq = useRef(0);

    useEffect(() => {
        const my = ++seq.current;
        setLoading(true);
        const params: any = { page: sp.page, limit: sp.pageSize, search: sp.search || undefined, from: from || undefined, to: to || undefined };
        if (tab === 'activity') Object.assign(params, { category: category || undefined, actor: actor || undefined });
        else params.result = result || undefined;
        axios
            .get(`${BASE_URL}/audit/${tab}`, { ...authHeader(), params })
            .then((r) => {
                if (my !== seq.current) return;
                setRows(r.data?.rows || []);
                sp.setTotal(Number(r.data?.total) || 0);
                if (tab === 'activity') setPeople(r.data?.people || []);
                else setFailed24h(Number(r.data?.failed24h) || 0);
                setError('');
            })
            .catch(() => my === seq.current && setError('Could not load the log'))
            .finally(() => my === seq.current && setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, sp.page, sp.pageSize, sp.search, from, to, category, actor, result]);

    const resetFilters = () => {
        setFrom('');
        setTo('');
        setCategory('');
        setActor('');
        setResult('');
        sp.resetSearch();
    };

    return (
        <AdminOnly>
            <div className="space-y-5">
                <PageTitle
                    eyebrow="Admin tools / Activity"
                    title="Activity & logins"
                    sub="Who logged in, and what they changed on the admin website. Kept for one year."
                    actions={
                        <div className="inline-flex rounded-full border border-[#e3e6ec] bg-white p-1 dark:border-[#253b5c] dark:bg-black">
                            {(['activity', 'logins'] as const).map((t) => (
                                <button key={t} type="button" onClick={() => { setTab(t); sp.setPage(1); }} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? 'ui-tab-active' : 'text-[#5d6375] hover:text-brand'}`}>
                                    {t === 'activity' ? 'Changes' : 'Logins'}
                                </button>
                            ))}
                        </div>
                    }
                />

                {tab === 'logins' && failed24h >= 5 && (
                    <div className="rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">
                        ⚠ {failed24h} failed login attempts in the last 24 hours. Check the list below for unknown user names or places.
                    </div>
                )}

                <div className="panel !p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <input className="form-input w-full sm:w-64" placeholder={tab === 'activity' ? 'Search person, action, case ID…' : 'Search name, user name, IP, device…'} value={sp.searchInput} onChange={(e) => sp.setSearchInput(e.target.value)} />
                        {tab === 'activity' ? (
                            <>
                                <select className="form-select w-auto" value={actor} onChange={(e) => { setActor(e.target.value); sp.setPage(1); }} aria-label="Person">
                                    <option value="">Everyone</option>
                                    {people.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.count})</option>
                                    ))}
                                </select>
                                <div className="flex flex-wrap gap-1">
                                    {CATS.map((c) => (
                                        <button key={c.key} type="button" onClick={() => { setCategory(c.key); sp.setPage(1); }} className={`ui-chip ${category === c.key ? 'ui-chip-active' : ''}`}>{c.label}</button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <select className="form-select w-auto" value={result} onChange={(e) => { setResult(e.target.value); sp.setPage(1); }} aria-label="Result">
                                <option value="">All attempts</option>
                                <option value="ok">Successful</option>
                                <option value="failed">Failed</option>
                            </select>
                        )}
                        <label className="flex items-center gap-1 text-xs text-[#8a90a2]">From <input type="date" className="form-input form-input-sm w-36" value={from} onChange={(e) => { setFrom(e.target.value); sp.setPage(1); }} /></label>
                        <label className="flex items-center gap-1 text-xs text-[#8a90a2]">To <input type="date" className="form-input form-input-sm w-36" value={to} onChange={(e) => { setTo(e.target.value); sp.setPage(1); }} /></label>
                        <button type="button" className="ml-auto text-xs font-semibold text-[#8a90a2] hover:text-brand" onClick={resetFilters}>Clear</button>
                    </div>
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <div className="panel !p-0 overflow-hidden">
                    <div className="table-responsive">
                        <table className="w-full text-sm">
                            <thead>
                                {tab === 'activity' ? (
                                    <tr className="border-b border-[#eceef2] text-left dark:border-[#1b2e4b]"><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">What</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Device</th></tr>
                                ) : (
                                    <tr className="border-b border-[#eceef2] text-left dark:border-[#1b2e4b]"><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">IP address</th><th className="px-4 py-3">Device</th></tr>
                                )}
                            </thead>
                            <tbody>
                                {!loading && rows.length === 0 && (
                                    <tr><td colSpan={5} className="px-4 py-10 text-center text-white-dark">Nothing recorded for these filters yet.</td></tr>
                                )}
                                {tab === 'activity' &&
                                    (rows as Activity[]).map((r) => (
                                        <tr key={r._id} className="border-b border-[#f1f2f5] align-top dark:border-[#1b2e4b]">
                                            <td className="whitespace-nowrap px-4 py-3 text-xs text-[#5d6375]">{fmtDateTime(r.at)}</td>
                                            <td className="px-4 py-3"><b>{r.actor?.name || (r.actor?.role === 'Admin' ? 'Admin' : '—')}</b><div className="text-[11px] text-[#8a90a2]">{r.actor?.role === 'Admin' ? 'Admin login' : 'Staff'}</div></td>
                                            <td className="px-4 py-3">
                                                <span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneOf(r.category)}`}>{CATS.find((c) => c.key === r.category)?.label || r.category}</span>
                                                {r.action}
                                                {r.targetId && /^\/booking/.test(r.path) && (
                                                    <Link to={`/openbooking/${r.targetId}`} className="ml-2 text-xs font-semibold text-primary">open case</Link>
                                                )}
                                                <div className="font-mono text-[11px] text-[#b0b5c2]">{r.method} {r.path}</div>
                                            </td>
                                            <td className="px-4 py-3">{r.ok ? <span className="text-success">Done</span> : <span className="text-danger">Refused ({r.status})</span>}</td>
                                            <td className="px-4 py-3 text-xs text-[#5d6375]">{r.device}<div className="text-[11px] text-[#b0b5c2]">{r.ip}</div></td>
                                        </tr>
                                    ))}
                                {tab === 'logins' &&
                                    (rows as Login[]).map((r) => (
                                        <tr key={r._id} className="border-b border-[#f1f2f5] dark:border-[#1b2e4b]">
                                            <td className="whitespace-nowrap px-4 py-3 text-xs text-[#5d6375]">{fmtDateTime(r.at)}</td>
                                            <td className="px-4 py-3"><b>{r.name || r.login || '—'}</b><div className="text-[11px] text-[#8a90a2]">{r.kind === 'admin' ? 'Admin login' : 'Staff'}{r.login && r.name && r.login !== r.name ? ` · ${r.login}` : ''}</div></td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.success ? 'bg-success/10 text-success' : r.reason === 'otp-sent' ? 'bg-[#eef0f3] text-[#3b4153]' : 'bg-brand-light text-brand'}`}>{REASON[r.reason || ''] || (r.success ? 'Logged in' : 'Failed')}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">{r.ip || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-[#5d6375]">{r.device || '—'}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <Pager {...sp.pager} loading={loading} sizes={[25, 50, 100, 200]} />
            </div>
        </AdminOnly>
    );
};

export default ActivityLog;
