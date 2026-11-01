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
import DriverDayTimeline from './DriverDayTimeline';
import SuggestionsPanel from './SuggestionsPanel';
import RecommendationDialog from './RecommendationDialog';
import {
    ApprovalsData, BoardData, LiveData, SummaryData, Recommendation,
    fetchApprovals, fetchBoard, fetchLive, fetchSummary, fetchRecommendations,
} from './opsApi';

type Tab = 'map' | 'board' | 'day' | 'approvals' | 'today';
const TABS: { key: Tab; label: string }[] = [
    { key: 'map', label: 'Live map' },
    { key: 'board', label: 'Status board' },
    { key: 'day', label: 'Driver day' },
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
    <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${value ? tone : 'border-[#e3e6ec] bg-white text-[#8a90a2] dark:border-[#253b5c] dark:bg-black'}`}>
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
    const [recs, setRecs] = useState<Recommendation[] | null>(null);
    const [openRec, setOpenRec] = useState<Recommendation | null>(null);
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
            fetchRecommendations().then(setRecs).catch(() => setRecs((x) => x || []));
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
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="ui-eyebrow">Operations / Live</div>
                    <h1 className="mt-1 text-[34px] font-normal leading-tight tracking-tight text-[#111318] dark:text-white">Live operations</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-2 text-sm font-semibold dark:bg-primary/15">
                        <span className="h-2.5 w-2.5 rounded-full bg-success" /> Monitoring {board?.totals.open ?? '–'}
                        <span className="text-[#b9bdc9]">|</span>
                        <button type="button" className="text-primary" onClick={() => chooseTab('approvals')}>{approvals?.total ?? 0} approvals</button>
                    </span>
                    <button type="button" className="btn btn-outline-dark btn-sm" onClick={load} title={updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : ''}>↻ Refresh</button>
                    <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setTvOpen(true)}>📺 TV screen</button>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Chip tone="border-danger/40 bg-danger/5 text-danger" label="delayed" value={board?.totals.delayed} onClick={() => chooseTab('board')} />
                <Chip tone="border-warning/40 bg-warning/5 text-warning" label="at risk" value={board?.totals.atRisk} onClick={() => chooseTab('board')} />
                <Chip tone="border-primary/40 bg-primary/5 text-primary" label="unassigned" value={board?.totals.unassigned} onClick={() => chooseTab('board')} />
                <Chip tone="border-warning/40 bg-warning/5 text-warning" label="GPS not updating" value={live?.counts.gpsStale} onClick={() => chooseTab('map')} />
                <Chip tone="border-[#111318]/20 bg-white text-[#111318]" label="awaiting approval" value={approvals?.total} onClick={() => chooseTab('approvals')} />
                <Chip tone="border-success/40 bg-success/5 text-success" label="on a case" value={live?.counts.busy} onClick={() => chooseTab('map')} />
            </div>
            <TvSettings open={tvOpen} onClose={() => setTvOpen(false)} />

            {error && <div className="rounded-md border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

            <div className="inline-flex max-w-full gap-1 overflow-x-auto whitespace-nowrap rounded-full border border-[#e3e6ec] bg-white p-1 dark:border-[#253b5c] dark:bg-black">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => chooseTab(t.key)}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? 'ui-tab-active' : 'text-[#5d6375] hover:text-brand'}`}
                    >
                        {t.label}
                        {t.key === 'approvals' && approvals?.total ? <span className="ml-2 rounded-full bg-warning px-1.5 text-[11px] text-white">{approvals.total}</span> : null}
                    </button>
                ))}
            </div>

            {(tab === 'map' || tab === 'board') && recs && recs.length > 0 && <SuggestionsPanel items={recs} onOpen={setOpenRec} />}
            <RecommendationDialog rec={openRec} onClose={() => setOpenRec(null)} onDone={load} />

            {/* keep the map mounted so markers persist while switching tabs */}
            <div className={tab === 'map' ? '' : 'hidden'}>
                <LiveMap data={live} liveTick={liveTick} />
            </div>
            {tab === 'board' && <StatusBoard data={board} onChanged={load} />}
            {tab === 'day' && (
                <>
                    <DriverDayTimeline recommendations={recs || []} onSuggestion={setOpenRec} />
                    <SuggestionsPanel items={recs} onOpen={setOpenRec} />
                </>
            )}
            {tab === 'approvals' && <Approvals data={approvals} />}
            {tab === 'today' && <TodaySummary data={summary} date={summary?.date || summaryDate} onDate={setSummaryDate} isToday={isToday} />}
        </div>
    );
};

export default Operations;
