import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASE_URL } from '../../config/axiosConfig';

/**
 * Wall-TV monitoring screen. Log in with the 8-digit passcode set by the admin
 * (Operations → TV screen). View only. Uses fetch (not the admin axios) so it never
 * touches the admin login.
 */
type Case = { _id: string; fileNumber: string; status: string; minutesInStatus: number | null; delayed: boolean; unassigned: boolean; vehicleNumber: string; customer: string; assignedTo: string; client: string; pickup: string; dropoff: string };
type Person = { _id: string; type: 'driver' | 'provider'; name: string; online: boolean; busy: boolean; gpsStale: boolean; minutesSinceSeen: number | null; activeCase: { fileNumber: string; status: string } | null };
type Activity = { _id: string; at: string; fileNumber: string; status: string; isNew: boolean; vehicleNumber: string; assignedTo: string; client: string };
type Live = {
    generatedAt: string;
    totals: { open: number; scheduled: number; delayed: number; unassigned: number };
    today: { created: number; completed: number; cancelled: number; openNow: number; scheduledUpcoming: number; cashPending: number; amount: number };
    fleet: { drivers: number; providers: number; online: number; busy: number; gpsStale: number; withLocation: number };
    people: Person[];
    columns: { status: string; cases: Case[] }[];
    approvals: { total: number; queues: { label: string; count: number }[] };
    activity: Activity[];
    perPerson: { _id: string; name: string; cases: number; completed: number }[];
};

const TOKEN_KEY = 'rsa-tv-token';
const REFRESH_MS = 15000;
const API = String(BASE_URL || '').replace(/\/+$/, '');

const SHORT: Record<string, string> = {
    'Booking Added': 'New',
    'called to customer': 'Called',
    'Order Received': 'Accepted',
    'On the way to pickup location': 'To pickup',
    'Vehicle Picked': 'Picked',
    'Vehicle Confirmed': 'Confirmed',
    'On the way to dropoff location': 'To drop-off',
    'Vehicle Dropped': 'Dropped',
    'Order Completed': 'Completed',
    Cancelled: 'Cancelled',
    Rejected: 'Rejected',
    Scheduled: 'Scheduled',
};
const COLOR: Record<string, string> = {
    'Booking Added': '#818cf8', 'called to customer': '#38bdf8', 'Order Received': '#2dd4bf', 'On the way to pickup location': '#fbbf24',
    'Vehicle Picked': '#fb923c', 'Vehicle Confirmed': '#f87171', 'On the way to dropoff location': '#c084fc', 'Vehicle Dropped': '#4ade80',
    'Order Completed': '#22c55e', Cancelled: '#94a3b8', Rejected: '#94a3b8', Scheduled: '#94a3b8',
};
const mins = (m: number | null) => (m === null || m === undefined ? '' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`);
const inr = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };

// ------------------------------------------------------------------ passcode screen
const PasscodeLogin: React.FC<{ onDone: (t: string) => void }> = ({ onDone }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = useCallback(async (value: string) => {
        setBusy(true);
        setError('');
        try {
            const r = await fetch(`${API}/tv/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode: value }) });
            const d = await r.json().catch(() => ({}));
            if (!r.ok || !d.token) throw new Error(d.message || 'Could not log in');
            try { localStorage.setItem(TOKEN_KEY, d.token); } catch { /* ignore */ }
            onDone(d.token);
        } catch (e: any) {
            setError(e.message || 'Could not log in');
            setCode('');
        } finally {
            setBusy(false);
        }
    }, [onDone]);

    const press = (k: string) => {
        if (busy) return;
        if (k === 'del') return setCode((c) => c.slice(0, -1));
        if (k === 'clr') return setCode('');
        setCode((c) => {
            const next = (c + k).slice(0, 8);
            if (next.length === 8) submit(next);
            return next;
        });
    };
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (/^\d$/.test(e.key)) press(e.key);
            else if (e.key === 'Backspace') press('del');
            else if (e.key === 'Escape') press('clr');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <img src="/assets/images/RSALogo.png" alt="RSA Kerala" className="h-16 w-[200px] object-cover mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Live monitor</h1>
                <p className="text-slate-400 text-sm mt-1 mb-6">Enter the 8-digit TV passcode</p>
                <div className="flex justify-center gap-2 mb-4" aria-label={`${code.length} of 8 digits entered`}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <span key={i} className={`w-4 h-4 rounded-full border-2 ${i < code.length ? 'bg-red-500 border-red-500' : 'border-slate-500'}`} />
                    ))}
                </div>
                <p className="h-6 text-red-400 text-sm" role="alert">{busy ? 'Checking…' : error}</p>
                <div className="grid grid-cols-3 gap-3 mt-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'del'].map((k) => (
                        <button key={k} type="button" onClick={() => press(k)} disabled={busy}
                            className="h-16 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-red-500">
                            {k === 'del' ? '⌫' : k === 'clr' ? 'C' : k}
                        </button>
                    ))}
                </div>
                <p className="text-slate-500 text-xs mt-6">The admin sets this passcode in Operations → TV screen.</p>
            </div>
        </div>
    );
};

// ------------------------------------------------------------------ live wall
const Clock: React.FC = () => {
    const [now, setNow] = useState(new Date());
    useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(t); }, []);
    return (
        <div className="text-right leading-tight">
            <div className="text-3xl font-bold tabular-nums">{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
            <div className="text-slate-400 text-sm">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
    );
};

const Big: React.FC<{ label: string; value: React.ReactNode; color?: string; alert?: boolean }> = ({ label, value, color = 'text-white', alert }) => (
    <div className={`rounded-xl px-4 py-3 bg-white/5 border ${alert ? 'border-red-500 animate-pulse' : 'border-white/10'}`}>
        <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</div>
        <div className={`text-4xl font-extrabold tabular-nums ${color}`}>{value}</div>
    </div>
);

const Wall: React.FC<{ token: string; onLogout: () => void }> = ({ token, onLogout }) => {
    const [data, setData] = useState<Live | null>(null);
    const [error, setError] = useState('');
    const [lastOk, setLastOk] = useState<Date | null>(null);
    const prevNew = useRef<Set<string>>(new Set());
    const [flash, setFlash] = useState<string[]>([]);

    const load = useCallback(async () => {
        try {
            const r = await fetch(`${API}/tv/live`, { headers: { Authorization: `Bearer ${token}` } });
            if (r.status === 401) { onLogout(); return; }
            const d = await r.json();
            if (!r.ok || !Array.isArray(d.columns)) throw new Error(d.message || 'Server problem');
            // highlight cases that just appeared
            const ids = new Set<string>(d.columns.flatMap((c: any) => c.cases.map((k: Case) => k._id)));
            if (prevNew.current.size) setFlash([...ids].filter((x) => !prevNew.current.has(x)));
            prevNew.current = ids;
            setData(d);
            setError('');
            setLastOk(new Date());
        } catch (e: any) {
            setError(e?.message === 'Failed to fetch' ? 'No connection — retrying…' : e?.message || 'Could not update — retrying…');
        }
    }, [token, onLogout]);

    useEffect(() => {
        load();
        const t = window.setInterval(load, REFRESH_MS);
        // keep the TV from sleeping where the browser allows it
        let lock: any = null;
        (navigator as any).wakeLock?.request?.('screen').then((l: any) => (lock = l)).catch(() => undefined);
        return () => { window.clearInterval(t); lock?.release?.().catch?.(() => undefined); };
    }, [load]);

    const people = useMemo(() => {
        const list = data?.people || [];
        const rank = (p: Person) => (p.online && !p.busy ? 0 : p.busy ? 1 : 2);
        return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    }, [data]);
    const columns = (data?.columns || []).filter((c) => c.status !== 'Scheduled');
    const stale = lastOk && Date.now() - lastOk.getTime() > REFRESH_MS * 4;

    const fullscreen = () => {
        const el: any = document.documentElement;
        if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
        else document.exitFullscreen?.();
    };

    return (
        <div className="h-screen overflow-hidden bg-[#0b1220] text-white p-4 flex flex-col gap-3 select-none" style={{ fontSize: 'clamp(12px, 0.85vw, 18px)' }}>
            {/* Header */}
            <div className="flex items-center gap-4">
                <img src="/assets/images/RSALogo.png" alt="RSA Kerala" className="h-12 w-[160px] object-cover rounded bg-white" />
                <div>
                    <div className="text-2xl font-bold">Live operations</div>
                    <div className={`text-sm ${error || stale ? 'text-red-400' : 'text-emerald-400'}`}>
                        ● {error || (stale ? 'Data may be old' : `Live · updated ${lastOk ? lastOk.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '…'}`)}
                    </div>
                </div>
                <div className="flex-1" />
                <button type="button" onClick={fullscreen} className="text-slate-400 hover:text-white text-sm border border-white/20 rounded px-3 py-1">Full screen</button>
                <button type="button" onClick={onLogout} className="text-slate-500 hover:text-white text-sm">Log out</button>
                <Clock />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
                <Big label="Open now" value={data?.totals.open ?? '–'} color="text-sky-300" />
                <Big label="Delayed" value={data?.totals.delayed ?? '–'} color={data?.totals.delayed ? 'text-red-400' : 'text-white'} alert={!!data?.totals.delayed} />
                <Big label="No driver" value={data?.totals.unassigned ?? '–'} color={data?.totals.unassigned ? 'text-amber-300' : 'text-white'} alert={!!data?.totals.unassigned} />
                <Big label="New today" value={data?.today.created ?? '–'} />
                <Big label="Done today" value={data?.today.completed ?? '–'} color="text-emerald-400" />
                <Big label="Cancelled" value={data?.today.cancelled ?? '–'} color="text-slate-300" />
                <Big label="Drivers free" value={data ? Math.max(0, data.fleet.online - data.fleet.busy) : '–'} color="text-emerald-300" />
                <Big label="Approvals" value={data?.approvals.total ?? '–'} color={data?.approvals.total ? 'text-amber-300' : 'text-white'} />
            </div>

            {/* Main */}
            <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateRows: 'minmax(0, 1.15fr) minmax(0, 1fr)' }}>
                {/* Status lanes */}
                <div className="grid gap-3 min-h-0" style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}>
                    {columns.map((c) => (
                        <div key={c.status} className="rounded-xl bg-white/5 border border-white/10 flex flex-col min-h-0">
                            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between" style={{ borderTop: `4px solid ${COLOR[c.status] || '#64748b'}`, borderRadius: '0.75rem 0.75rem 0 0' }}>
                                <span className="font-semibold truncate">{SHORT[c.status] || c.status}</span>
                                <span className="text-xl font-bold tabular-nums">{c.cases.length}</span>
                            </div>
                            <div className="p-2 space-y-2 overflow-hidden flex-1">
                                {c.cases.slice(0, 5).map((k) => (
                                    <div key={k._id} className={`rounded-lg px-2 py-1.5 ${k.delayed ? 'bg-red-500/20 border border-red-500/60' : 'bg-white/5'} ${flash.includes(k._id) ? 'ring-2 ring-sky-400' : ''}`}>
                                        <div className="flex justify-between gap-1">
                                            <span className="font-bold truncate">{k.vehicleNumber || k.fileNumber}</span>
                                            <span className={`tabular-nums whitespace-nowrap ${k.delayed ? 'text-red-300 font-bold' : 'text-slate-400'}`}>{mins(k.minutesInStatus)}</span>
                                        </div>
                                        <div className="text-slate-400 truncate" style={{ fontSize: '0.85em' }}>
                                            {k.unassigned ? <span className="text-amber-300 font-semibold">No driver</span> : k.assignedTo}{k.client ? ` · ${k.client}` : ''}
                                        </div>
                                    </div>
                                ))}
                                {c.cases.length > 5 && <div className="text-center text-slate-400 text-sm">+{c.cases.length - 5} more</div>}
                                {c.cases.length === 0 && <div className="text-center text-slate-600 text-sm pt-4">—</div>}
                            </div>
                        </div>
                    ))}
                    {!data && <div className="text-slate-400 p-6">Loading…</div>}
                </div>
                <div className="grid grid-cols-12 gap-3 min-h-0">

                {/* Drivers */}
                <div className="col-span-7 rounded-xl bg-white/5 border border-white/10 flex flex-col min-h-0">
                    <div className="px-3 py-2 border-b border-white/10 flex justify-between items-center">
                        <span className="font-semibold">Drivers & providers</span>
                        <span className="text-sm text-slate-400">
                            <span className="text-emerald-400">{data ? Math.max(0, data.fleet.online - data.fleet.busy) : 0} free</span> · <span className="text-sky-300">{data?.fleet.busy ?? 0} busy</span> · {data ? data.fleet.drivers + data.fleet.providers - data.fleet.online : 0} offline
                        </span>
                    </div>
                    <div className="p-2 grid grid-cols-2 xl:grid-cols-3 gap-x-3 gap-y-1 overflow-hidden content-start">
                        {people.slice(0, 45).map((p) => {
                            const state = p.busy ? 'busy' : p.online ? 'free' : 'off';
                            return (
                                <div key={p._id} className={`flex items-center gap-2 rounded-md px-2 py-1 ${state === 'off' ? 'opacity-50' : ''}`}>
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${state === 'free' ? 'bg-emerald-400' : state === 'busy' ? 'bg-sky-400' : 'bg-slate-600'}`} />
                                    <span className="truncate flex-1">{p.name}{p.type === 'provider' ? <span className="text-slate-500"> (P)</span> : null}</span>
                                    <span className="text-slate-400 truncate" style={{ fontSize: '0.85em', maxWidth: '45%' }}>
                                        {p.activeCase ? `${SHORT[p.activeCase.status] || p.activeCase.status}` : state === 'off' ? (p.minutesSinceSeen !== null ? `seen ${mins(p.minutesSinceSeen)} ago` : '') : p.gpsStale ? 'GPS old' : 'free'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Activity */}
                <div className="col-span-5 rounded-xl bg-white/5 border border-white/10 flex flex-col min-h-0">
                    <div className="px-3 py-2 border-b border-white/10 font-semibold">Today's activity</div>
                    <ul className="p-2 overflow-hidden">
                        {(data?.activity || []).slice(0, 30).map((a) => (
                            <li key={`${a._id}-${a.at}`} className="grid gap-2 py-0.5 whitespace-nowrap" style={{ gridTemplateColumns: '4.5em minmax(0,1.1fr) minmax(0,0.9fr) minmax(0,1fr)' }}>
                                <span className="text-slate-500 tabular-nums">{new Date(a.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                <span className="font-semibold truncate">{a.vehicleNumber || a.fileNumber}</span>
                                <span className="truncate" style={{ color: COLOR[a.status] || '#cbd5e1' }}>{a.isNew ? 'Booked' : SHORT[a.status] || a.status}</span>
                                <span className="text-slate-400 truncate">{a.assignedTo || a.client}</span>
                            </li>
                        ))}
                        {data && data.activity.length === 0 && <li className="text-slate-500">Nothing yet today.</li>}
                    </ul>
                </div>
            </div>

            </div>
            {/* Footer strip */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-400 text-sm">
                <span>Booked value today: <b className="text-white">{inr(data?.today.amount || 0)}</b></span>
                <span>Scheduled ahead: <b className="text-white">{data?.today.scheduledUpcoming ?? 0}</b></span>
                <span>Cash pending: <b className="text-white">{data?.today.cashPending ?? 0}</b> cases</span>
                {data?.approvals.queues.filter((q) => q.count).map((q) => <span key={q.label}>{q.label}: <b className="text-amber-300">{q.count}</b></span>)}
                {!!data?.perPerson.length && <span>Top today: <b className="text-white">{data.perPerson.slice(0, 3).map((p) => `${p.name} (${p.completed}/${p.cases})`).join(', ')}</b></span>}
            </div>
        </div>
    );
};

const TvScreen: React.FC = () => {
    const [token, setToken] = useState(readToken);
    useEffect(() => { document.title = 'RSA Live monitor'; }, []);
    const logout = useCallback(() => {
        try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
        setToken('');
    }, []);
    return token ? <Wall token={token} onLogout={logout} /> : <PasscodeLogin onDone={setToken} />;
};

export default TvScreen;
