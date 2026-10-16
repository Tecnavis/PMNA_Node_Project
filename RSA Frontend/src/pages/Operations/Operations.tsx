import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { setPageTitle } from '../../store/themeConfigSlice';
import { BASE_URL } from '../../config/axiosConfig';
import LiveMap from './LiveMap';
import StatusBoard from './StatusBoard';
import Approvals from './Approvals';
import TodaySummary from './TodaySummary';
import TvSettings from '../TV/TvSettings';
import {
    ApprovalsData, BoardData, LiveData, SummaryData,
    fetchApprovals, fetchBoard, fetchLive, fetchSummary,
} from './opsApi';

type Tab = 'map' | 'board' | 'approvals' | 'today';
const TABS: { key: Tab; label: string }[] = [
    { key: 'map', label: 'Live map' },
    { key: 'board', label: 'Status board' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'today', label: 'Today' },
];
const REFRESH_MS = 30000;

const readTab = (): Tab => {
    try {
        const t = localStorage.getItem('ops-tab') as Tab | null;
        return t && TABS.some((x) => x.key === t) ? t : 'map';
    } catch {
        return 'map';
    }
};

const Chip: React.FC<{ tone: string; label: string; value: number | undefined; onClick?: () => void }> = ({ tone, label, value, onClick }) => (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${value ? tone : 'border-white-light text-white-dark dark:border-[#253b5c]'}`}>
        <span className="text-base leading-none">{value ?? '–'}</span> {label}
    </button>
);

const Operations: React.FC = () => {
    const dispatch = useDispatch();
    const [tab, setTab] = useState<Tab>(readTab);
    const [tvOpen, setTvOpen] = useState(false);
    const [live, setLive] = useState<LiveData | null>(null);
    const [board, setBoard] = useState<BoardData | null>(null);
    const [approvals, setApprovals] = useState<ApprovalsData | null>(null);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [summaryDate, setSummaryDate] = useState('');
    const [error, setError] = useState('');
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [liveTick, setLiveTick] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const boardTimer = useRef<number | undefined>();

    useEffect(() => {
        dispatch(setPageTitle('Operations'));
    }, [dispatch]);

    const chooseTab = (t: Tab) => {
        setTab(t);
        try { localStorage.setItem('ops-tab', t); } catch { /* ignore */ }
    };

    const load = useCallback(async () => {
        try {
            const [l, b, a] = await Promise.all([fetchLive(), fetchBoard(), fetchApprovals()]);
            setLive(l);
            setBoard(b);
            setApprovals(a);
            setError('');
            setUpdatedAt(new Date());
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not load live data');
        }
    }, []);

    const loadSummary = useCallback(async (d: string) => {
        try {
            setSummary(await fetchSummary(d || undefined));
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not load summary');
        }
    }, []);

    useEffect(() => {
        load();
        const t = window.setInterval(load, REFRESH_MS);
        return () => window.clearInterval(t);
    }, [load]);

    useEffect(() => {
        loadSummary(summaryDate);
        if (summaryDate) return;
        const t = window.setInterval(() => loadSummary(''), REFRESH_MS * 2);
        return () => window.clearInterval(t);
    }, [summaryDate, loadSummary]);

    // Real-time: driver positions move instantly; case changes refresh the board shortly after
    useEffect(() => {
        const socket = io(BASE_URL, { transports: ['websocket'] });
        socketRef.current = socket;
        socket.on('connect', () => socket.emit('join-ops', localStorage.getItem('token') || ''));
        socket.on('ops:location', (msg: { type: string; id: string; location: string; at: string }) => {
            const [lat, lng] = String(msg.location || '').split(',').map((x) => parseFloat(x.trim()));
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            setLive((prev) => {
                if (!prev) return prev;
                const people = prev.people.map((p) =>
                    p.type === msg.type && String(p._id) === String(msg.id)
                        ? { ...p, point: { lat, lng }, lastSeenAt: msg.at, lastSeenApprox: false, minutesSinceSeen: 0, online: true, gpsStale: false }
                        : p
                );
                return { ...prev, people };
            });
            setLiveTick((n) => n + 1);
        });
        socket.on('newChanges', () => {
            window.clearTimeout(boardTimer.current);
            boardTimer.current = window.setTimeout(load, 1500);
        });
        return () => {
            window.clearTimeout(boardTimer.current);
            socket.disconnect();
        };
    }, [load]);

    const isToday = !summaryDate;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <h5 className="text-lg font-semibold dark:text-white-light">Operations</h5>
                <div className="flex flex-wrap gap-2">
                    <Chip tone="border-danger text-danger" label="delayed" value={board?.totals.delayed} onClick={() => chooseTab('board')} />
                    <Chip tone="border-danger text-danger" label="unassigned" value={board?.totals.unassigned} onClick={() => chooseTab('board')} />
                    <Chip tone="border-warning text-warning" label="GPS not updating" value={live?.counts.gpsStale} onClick={() => chooseTab('map')} />
                    <Chip tone="border-primary text-primary" label="awaiting approval" value={approvals?.total} onClick={() => chooseTab('approvals')} />
                    <Chip tone="border-success text-success" label="on a case" value={live?.counts.busy} onClick={() => chooseTab('map')} />
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-white-dark">
                    {updatedAt && <span>Updated {updatedAt.toLocaleTimeString()}</span>}
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={load}>Refresh</button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTvOpen(true)}>📺 TV screen</button>
                </div>
            </div>
            <TvSettings open={tvOpen} onClose={() => setTvOpen(false)} />

            {error && <div className="rounded-md border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

            <div className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-white-light dark:border-[#253b5c]">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => chooseTab(t.key)}
                        className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-white-dark hover:text-primary'}`}
                    >
                        {t.label}
                        {t.key === 'approvals' && approvals?.total ? <span className="badge ml-2 bg-warning">{approvals.total}</span> : null}
                    </button>
                ))}
            </div>

            {/* keep the map mounted so markers persist while switching tabs */}
            <div className={tab === 'map' ? '' : 'hidden'}>
                <LiveMap data={live} liveTick={liveTick} />
            </div>
            {tab === 'board' && <StatusBoard data={board} onChanged={load} />}
            {tab === 'approvals' && <Approvals data={approvals} />}
            {tab === 'today' && <TodaySummary data={summary} date={summary?.date || summaryDate} onDate={setSummaryDate} isToday={isToday} />}
        </div>
    );
};

export default Operations;
