import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';
import Swal from 'sweetalert2';
import { IRootState } from '../store';
import { setPageTitle } from '../store/themeConfigSlice';
import { dateFormate } from '../utils/dateUtils';
import { VehicleRecord } from './VehicleDetails/VehicleCompliance';
import { BASE_URL } from '../config/axiosConfig';
import { ROLES } from '../constants/roles';
import AddVehicleCompliance from './VehicleDetails/addVehicleCompliance';
import MyDayPanel from './Reminders/MyDayPanel';
import MiniMap from './Operations/MiniMap';
import SuggestionsPanel from './Operations/SuggestionsPanel';
import RecommendationDialog from './Operations/RecommendationDialog';
import { Recommendation, fetchRecommendations } from './Operations/opsApi';
import { ApprovalsData, BoardData, LiveData, STATUS_COLORS, SummaryData, fetchApprovals, fetchBoard, fetchLive, fetchSummary, formatMinutes } from './Operations/opsApi';

interface ComplianceRecord {
    _id: string;
    type: string;
    expiryDate: string;
    vehicleNumber: string;
}
type Counts = { showroom: number; whatsapp: number; other: number; inProgress: number; completed: number };
type TrendPoint = { day: string; count: number; completed: number; cancelled: number; amount: number };

const REFRESH_MS = 30000;
const inr = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const ALERT_SOUND = '/mixkit-signal-alert-771.wav';

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const pctChange = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

/** One cell of the top figures row (reference style: label, big light number, small pill, one line under it). */
const Stat: React.FC<{ label: string; value: React.ReactNode; pill?: React.ReactNode; pillTone?: string; sub?: React.ReactNode; to?: string; pulse?: boolean }> = ({ label, value, pill, pillTone = 'bg-[#eef0f3] text-[#4b5165]', sub, to, pulse }) => {
    const body = (
        <div className={`h-full px-4 py-3 rounded-2xl transition ${to ? 'hover:bg-[#f5f6f8] dark:hover:bg-[#1a2941]/50' : ''}`}>
            <div className="ui-eyebrow truncate">{label}</div>
            <div className="mt-2 flex items-center gap-2">
                <span className="ui-num text-[40px] leading-none text-[#111318] dark:text-white">{value}</span>
                {pill !== undefined && pill !== null && pill !== '' && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pillTone} ${pulse ? 'animate-pulse' : ''}`}>{pill}</span>
                )}
            </div>
            {sub && <div className="mt-2 truncate text-xs text-[#8a90a2]">{sub}</div>}
        </div>
    );
    return to ? <Link to={to} className="block h-full">{body}</Link> : body;
};

const Index = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [role, setRole] = useState<string>(localStorage.getItem('role') || '');
    const [counts, setCounts] = useState<Counts | null>(null);
    const [expiredRecords, setExpiredRecords] = useState<ComplianceRecord[]>([]);
    const [exceededRecords, setExceededRecords] = useState<VehicleRecord[]>([]);
    const [board, setBoard] = useState<BoardData | null>(null);
    const [approvals, setApprovals] = useState<ApprovalsData | null>(null);
    const [live, setLive] = useState<LiveData | null>(null);
    const [today, setToday] = useState<SummaryData | null>(null);
    const [trend, setTrend] = useState<TrendPoint[]>([]);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [opsError, setOpsError] = useState('');
    const [recs, setRecs] = useState<Recommendation[] | null>(null);
    const [openRec, setOpenRec] = useState<Recommendation | null>(null);

    // compliance renewal modal
    const [recordId, setRecordId] = useState('');
    const [openRenewal, setOpenRenewal] = useState(false);
    const [dismissMode, setDismissMode] = useState(false);
    const [dismissRecordType, setDismissRecordType] = useState('');
    const [dismissVehicleNumber, setDismissVehicleNumber] = useState('');

    // new-booking sound alerts
    const prev = useRef<{ showroom: number; whatsapp: number } | null>(null);
    const audio = useRef<HTMLAudioElement | null>(null);
    const interacted = useRef(false);
    const pendingSound = useRef(false);

    useEffect(() => { dispatch(setPageTitle('Dashboard')); }, [dispatch]);

    useEffect(() => {
        audio.current = new Audio(ALERT_SOUND);
        audio.current.preload = 'auto';
        const onInteract = () => {
            interacted.current = true;
            if (pendingSound.current) { pendingSound.current = false; audio.current?.play().catch(() => undefined); }
        };
        ['click', 'keydown', 'touchstart'].forEach((e) => document.addEventListener(e, onInteract, { once: false }));
        return () => {
            ['click', 'keydown', 'touchstart'].forEach((e) => document.removeEventListener(e, onInteract));
            audio.current?.pause();
            audio.current = null;
        };
    }, []);
    const ding = () => {
        if (!audio.current) return;
        if (!interacted.current) { pendingSound.current = true; return; }
        audio.current.currentTime = 0;
        audio.current.play().catch(() => undefined);
    };

    // login check + staff role name (role id → name), as before
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role');
        if (!token) { navigate('/auth/boxed-signin'); return; }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        if (storedRole && storedRole !== 'admin' && /^[0-9a-f]{24}$/i.test(storedRole)) {
            axios.get<{ _id: string; name: string }[]>(`${backendUrl}/role`).then((r) => {
                const found = r.data.find((x) => x._id === storedRole);
                if (found) { localStorage.setItem('role', found.name); setRole(found.name); }
            }).catch(() => undefined);
        }
    }, [navigate, backendUrl]);

    const loadCounts = useCallback(async () => {
        const r = await axios.get(`${backendUrl}/dashboard`);
        const d = (Array.isArray(r.data?.bookingData) && r.data.bookingData[0]) || {};
        const next: Counts = {
            showroom: d.newBookingsShowRoom || 0,
            whatsapp: d.whatsappBooking || 0,
            other: d.newBookingsOther || 0,
            inProgress: d.pendingBookings || 0,
            completed: d.completedBookings || 0,
        };
        if (prev.current && (next.showroom > prev.current.showroom || next.whatsapp > prev.current.whatsapp)) ding();
        prev.current = { showroom: next.showroom, whatsapp: next.whatsapp };
        setCounts(next);
        setExpiredRecords(Array.isArray(r.data?.records) ? r.data.records : []);
    }, [backendUrl]);

    const loadServiceKm = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/vehicle/exceeded-service`, { timeout: 15000 });
            setExceededRecords(Array.isArray(res.data?.vehicles) ? res.data.vehicles : []);
        } catch (error: any) {
            if (error?.response?.status === 404) setExceededRecords([]);
        }
    }, []);

    const loadOps = useCallback(async () => {
        const results = await Promise.allSettled([
            fetchBoard(), fetchApprovals(), fetchLive(), fetchSummary(),
            axios.get(`${BASE_URL}/ops/trend`, { params: { days: 14 } }).then((r) => (Array.isArray(r.data?.series) ? (r.data.series as TrendPoint[]) : [])),
        ]);
        const [b, a, l, s, t] = results;
        fetchRecommendations().then(setRecs).catch(() => setRecs((x) => x || []));
        if (b.status === 'fulfilled') setBoard(b.value);
        if (a.status === 'fulfilled') setApprovals(a.value);
        if (l.status === 'fulfilled') setLive(l.value);
        if (s.status === 'fulfilled') setToday(s.value);
        if (t.status === 'fulfilled') setTrend(t.value);
        const failed = results.filter((x) => x.status === 'rejected').length;
        setOpsError(failed === results.length ? 'Live figures could not be loaded. Retrying…' : '');
        setUpdatedAt(new Date());
    }, []);

    const loadAll = useCallback(() => {
        loadCounts().catch(() => undefined);
        loadOps();
    }, [loadCounts, loadOps]);

    useEffect(() => {
        loadAll();
        loadServiceKm();
        const t = window.setInterval(() => { if (!document.hidden) loadAll(); }, REFRESH_MS);
        return () => window.clearInterval(t);
    }, [loadAll, loadServiceKm]);

    // ---------------- compliance actions (unchanged behaviour)
    const handleRenewal = (id: string) => { setRecordId(id); setOpenRenewal(true); };
    const handleDismissVehicleServiceKm = async (vehicle: VehicleRecord) => {
        const result = await Swal.fire({
            title: 'Dismiss Service KM Exceeded?',
            text: 'This will update the vehicle status and mark all completed bookings as requiring service. Continue?',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, dismiss and update record',
        });
        if (!result.isConfirmed) return;
        setRecordId(vehicle?.recordId || '');
        setDismissRecordType('Service KM Exceeded');
        setDismissVehicleNumber(vehicle.serviceVehicle);
        setDismissMode(true);
        setOpenRenewal(true);
    };
    const expiryText = (r: ComplianceRecord) => {
        const d = new Date(r.expiryDate);
        const t = new Date();
        if (d.toDateString() === t.toDateString()) return 'expires today';
        return d > t ? `expires ${dateFormate(r.expiryDate)}` : `expired ${dateFormate(r.expiryDate)}`;
    };
    const canRenew = ['', ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.VERIFIER, ROLES.Manager].includes(role);

    // ---------------- derived
    const delayedCases = useMemo(() => (board?.columns || []).flatMap((c) => c.cases).filter((c) => c.delayed).sort((a, b) => (b.minutesInStatus || 0) - (a.minutesInStatus || 0)), [board]);
    const unassigned = useMemo(() => (board?.columns || []).flatMap((c) => c.cases).filter((c) => c.unassigned && c.status !== 'Scheduled'), [board]);
    const pipeline = board?.columns.filter((c) => c.status !== 'Scheduled') || [];
    const pipelineMax = Math.max(1, ...pipeline.map((c) => c.cases.length));
    const alertsCount = expiredRecords.length + exceededRecords.length;

    const chart = useMemo(() => ({
        series: [
            { name: 'Bookings', type: 'column', data: trend.map((d) => d.count) },
            { name: 'Completed', type: 'line', data: trend.map((d) => d.completed) },
        ],
        options: {
            chart: { toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false } },
            colors: ['#5b4cf0', '#111318'],
            stroke: { width: [0, 2], curve: 'smooth' as const },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
            dataLabels: { enabled: false },
            legend: { position: 'top' as const, horizontalAlign: 'right' as const, fontSize: '11px', labels: { colors: isDark ? '#bfc9d4' : undefined } },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed', padding: { left: 4, right: 4 } },
            xaxis: { categories: trend.map((d) => new Date(`${d.day}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })), labels: { style: { fontSize: '10px', colors: isDark ? '#888ea8' : undefined } } },
            yaxis: { labels: { style: { fontSize: '10px', colors: isDark ? '#888ea8' : undefined } }, forceNiceScale: true, min: 0 },
            tooltip: { theme: isDark ? 'dark' : 'light', shared: true, intersect: false, y: { formatter: (v: number, o: any) => (o.seriesIndex === 0 ? `${v} · ${inr(trend[o.dataPointIndex]?.amount || 0)}` : `${v}`) } },
        },
    }), [trend, isDark]);

    const totalToday = trend.length ? trend[trend.length - 1] : null;
    const yesterday = trend.length > 1 ? trend[trend.length - 2] : null;
    const doneDelta = today && yesterday ? pctChange(today.totals.completed, yesterday.completed) : null;
    const newTotal = counts ? counts.showroom + counts.whatsapp + counts.other : null;
    const name = (localStorage.getItem('name') || '').split(' ')[0];
    const now = updatedAt || new Date();

    // the case that most needs a look: longest delayed, else longest open
    const allOpen = useMemo(() => (board?.columns || []).filter((c) => c.status !== 'Scheduled').flatMap((c) => c.cases), [board]);
    const focusCase = delayedCases[0] || [...allOpen].sort((a, b) => (b.minutesInStatus || 0) - (a.minutesInStatus || 0))[0] || null;
    const steps = (board?.statuses || []).filter((st) => st !== 'Scheduled');
    const stepIndex = focusCase ? steps.indexOf(focusCase.status) : -1;
    const delayedByStatus = pipeline.map((c) => ({ status: c.status, late: c.cases.filter((x) => x.delayed).length })).filter((x) => x.late > 0).sort((a, b) => b.late - a.late);
    const lateMax = Math.max(1, ...delayedByStatus.map((x) => x.late));
    const openQueues = (approvals?.queues || []).filter((q) => q.count > 0);

    return (
        <div className="space-y-5">
            {/* Greeting row */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <div className="ui-eyebrow">
                        {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · {now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                        {opsError && <span className="normal-case tracking-normal text-danger ltr:ml-2">{opsError}</span>}
                    </div>
                    <h1 className="mt-1 text-[34px] font-normal leading-tight tracking-tight text-[#111318] dark:text-white">
                        {greeting()}
                        {name ? `, ${name}` : ''}
                    </h1>
                    <p className="text-sm text-[#5d6375] dark:text-white-dark">Here's what needs your attention across today's operation.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link to="/operations" className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-2 text-sm font-semibold text-[#111318] dark:bg-primary/15 dark:text-white">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                        </span>
                        Monitoring {board?.totals.open ?? '–'}
                        <span className="text-[#b9bdc9]">|</span>
                        <span className="text-primary">{approvals?.total ?? 0} approvals</span>
                    </Link>
                    <Link to="/add-booking" className="btn btn-primary md:hidden">+ New booking</Link>
                </div>
            </div>

            {/* Top figures */}
            <div className="panel !p-2">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 xl:divide-x divide-[#eceef2] dark:divide-[#1b2e4b]">
                    <Stat label="Open cases" value={board?.totals.open ?? counts?.inProgress ?? '–'} to="/operations" pill={board ? `${board.totals.scheduled} later` : undefined} sub={`${live?.counts.busy ?? '–'} drivers on a job`} />
                    <Stat
                        label="New bookings"
                        value={newTotal ?? '–'}
                        to="/bookings"
                        pill={newTotal ? 'waiting' : undefined}
                        pillTone="bg-success text-white"
                        pulse={!!(counts?.showroom || counts?.whatsapp)}
                        sub={counts ? `Showroom ${counts.showroom} · WhatsApp ${counts.whatsapp} · Other ${counts.other}` : 'Loading…'}
                    />
                    <Stat
                        label="Done today"
                        value={today?.totals.completed ?? '–'}
                        to="/completedbookings"
                        pill={doneDelta === null ? undefined : `${doneDelta >= 0 ? '+' : ''}${doneDelta}%`}
                        pillTone={doneDelta !== null && doneDelta >= 0 ? 'bg-[#d9f99d] text-[#365314]' : 'bg-danger/10 text-danger'}
                        sub={`${today?.totals.created ?? '–'} created · ${today?.totals.cancelled ?? 0} cancelled`}
                    />
                    <Stat label="Delayed" value={board?.totals.delayed ?? '–'} to="/operations" pill={board?.totals.delayed ? 'late' : undefined} pillTone="bg-brand-light text-brand" pulse={!!board?.totals.delayed} sub="Too long in one status" />
                    <Stat label="Not assigned" value={board?.totals.unassigned ?? '–'} to="/operations" pill={board?.totals.unassigned ? 'no driver' : undefined} pillTone="bg-primary text-white" sub="Waiting for a driver" />
                    <Stat label="Approvals" value={approvals?.total ?? '–'} to="/operations" pill={approvals?.total ? `${openQueues.length} queues` : undefined} pillTone="bg-warning/15 text-warning" sub="Expenses, cash, verifications" />
                </div>
            </div>

            {/* Focus case | Operations brief */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_1fr]">
                <div className={`panel dark:!bg-[#0e1726] ${focusCase?.delayed ? '!border-brand/20 !bg-brand-soft' : '!bg-[#f5f6f8]'}`}>
                    {!board ? (
                        <p className="py-16 text-center text-sm text-white-dark">Loading…</p>
                    ) : !focusCase ? (
                        <div className="py-16 text-center">
                            <div className="text-2xl font-light">All on plan</div>
                            <p className="mt-1 text-sm text-white-dark">No open cases right now.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide dark:bg-black ${focusCase.delayed ? 'text-danger' : 'text-primary'}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${focusCase.delayed ? 'bg-danger' : 'bg-primary'}`} />
                                        {focusCase.delayed ? 'Needs attention' : 'Longest open'} · {formatMinutes(focusCase.minutesInStatus)} in status
                                    </span>
                                    <h3 className="mt-3 flex flex-wrap items-center gap-2 text-2xl font-normal tracking-tight">
                                        <span className="truncate">{(focusCase.pickup.address || 'Pickup').split(',')[0]}</span>
                                        <span className="text-[#8a90a2]">→</span>
                                        <span className="truncate">{(focusCase.dropoff.address || 'Drop').split(',')[0]}</span>
                                        {focusCase.delayed && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">⚠ Delayed</span>}
                                    </h3>
                                    <p className="mt-1 text-sm text-[#5d6375]">
                                        <Link to={`/openbooking/${focusCase._id}`} className="font-semibold text-primary">{focusCase.fileNumber || 'No file no.'}</Link>
                                        {focusCase.company ? ` · ${focusCase.company}` : focusCase.showroom ? ` · ${focusCase.showroom}` : ''}
                                        {focusCase.serviceType ? ` · ${focusCase.serviceType}` : ''}
                                        {focusCase.vehicleNumber ? ` · ${focusCase.vehicleNumber}` : ''}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-6 text-right">
                                    <div>
                                        <div className="ui-eyebrow">Status</div>
                                        <div className="mt-1 text-lg font-medium" style={{ color: STATUS_COLORS[focusCase.status] }}>{focusCase.status}</div>
                                        <div className="text-xs text-[#8a90a2]">since {new Date(focusCase.statusSince).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</div>
                                    </div>
                                    <div>
                                        <div className="ui-eyebrow">Allowed</div>
                                        <div className={`ui-num mt-1 text-3xl ${focusCase.delayed ? 'text-danger' : ''}`}>{focusCase.delayLimit ? formatMinutes(focusCase.delayLimit) : '—'}</div>
                                        <div className={`text-xs ${focusCase.delayed ? 'text-danger' : 'text-[#8a90a2]'}`}>
                                            {focusCase.delayed && focusCase.delayLimit && focusCase.minutesInStatus ? `+${formatMinutes(focusCase.minutesInStatus - focusCase.delayLimit)} over` : 'in this status'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-white p-3 dark:bg-black">
                                    <div className="ui-eyebrow">{focusCase.provider ? 'Provider' : 'Driver'}</div>
                                    {focusCase.driver || focusCase.provider ? (
                                        <>
                                            <div className="mt-1 truncate font-semibold">{(focusCase.driver || focusCase.provider)!.name}</div>
                                            <a href={`tel:${(focusCase.driver || focusCase.provider)!.phone}`} className="text-xs text-primary">{(focusCase.driver || focusCase.provider)!.phone}</a>
                                        </>
                                    ) : (
                                        <Link to={`/add-booking/${focusCase._id}`} className="mt-1 block font-semibold text-primary">Assign a driver →</Link>
                                    )}
                                </div>
                                <div className="rounded-2xl bg-white p-3 dark:bg-black">
                                    <div className="ui-eyebrow">Customer</div>
                                    <div className="mt-1 truncate font-semibold">{focusCase.customerName || '—'}</div>
                                    {focusCase.customerPhone && <a href={`tel:${focusCase.customerPhone}`} className="text-xs text-primary">{focusCase.customerPhone}</a>}
                                </div>
                                <div className="rounded-2xl bg-white p-3 dark:bg-black">
                                    <div className="ui-eyebrow">Payment</div>
                                    <div className={`mt-1 font-semibold ${focusCase.cashPending ? 'text-danger' : 'text-success'}`}>{focusCase.cashPending ? 'Cash pending' : 'No cash due'}</div>
                                    <div className="text-xs text-[#8a90a2]">Booked {new Date(focusCase.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                </div>
                            </div>

                            {/* status line, like the route timeline in the reference */}
                            {steps.length > 0 && (
                                <div className="mt-6 overflow-x-auto pb-1">
                                    <div className="relative min-w-[560px] px-2">
                                        <div className="absolute left-4 right-4 top-[11px] h-[3px] rounded-full bg-[#dfe2e8] dark:bg-[#253b5c]" />
                                        <div
                                            className={`absolute left-4 top-[11px] h-[3px] rounded-full ${focusCase.delayed ? 'bg-danger' : 'bg-[#111318] dark:bg-white'}`}
                                            style={{ width: `calc(${(Math.max(0, stepIndex) / Math.max(1, steps.length - 1)) * 100}% - ${(Math.max(0, stepIndex) / Math.max(1, steps.length - 1)) * 32}px)` }}
                                        />
                                        <ol className="relative flex justify-between">
                                            {steps.map((st, i) => {
                                                const done = i < stepIndex;
                                                const current = i === stepIndex;
                                                return (
                                                    <li key={st} className="flex w-0 flex-1 flex-col items-center text-center">
                                                        <span
                                                            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                                                                current
                                                                    ? focusCase.delayed
                                                                        ? 'border-danger bg-danger text-white ring-4 ring-danger/15'
                                                                        : 'border-[#111318] bg-[#111318] text-white ring-4 ring-black/10'
                                                                    : done
                                                                    ? 'border-[#111318] bg-[#111318] text-white dark:border-white dark:bg-white dark:text-black'
                                                                    : 'border-[#cfd3dc] bg-white dark:bg-black'
                                                            }`}
                                                        >
                                                            {done ? '✓' : ''}
                                                        </span>
                                                        <span className={`mt-2 px-1 text-[11px] leading-tight ${current ? 'font-semibold text-[#111318] dark:text-white' : 'text-[#8a90a2]'}`}>{st}</span>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {delayedCases.length > 1 && (
                                <div className="mt-5 border-t border-[#e3e6ec] pt-3 dark:border-[#253b5c]">
                                    <div className="ui-eyebrow mb-2">Also delayed</div>
                                    <div className="flex flex-wrap gap-2">
                                        {delayedCases.slice(1, 9).map((c) => (
                                            <Link key={c._id} to={`/openbooking/${c._id}`} className="ui-chip">
                                                <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                                                {c.fileNumber || 'Case'} <span className="font-normal text-[#8a90a2]">{formatMinutes(c.minutesInStatus)}</span>
                                            </Link>
                                        ))}
                                        {delayedCases.length > 9 && <Link to="/operations" className="ui-chip">+{delayedCases.length - 9} more</Link>}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Operations brief */}
                <div className="panel !border-primary/20 !bg-[#f4f2ff] dark:!bg-primary/10">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111318] text-white">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l3-8 4 16 3-8h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        <div>
                            <div className="font-semibold">Operations brief</div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                                Live · updated {now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 text-[22px] font-normal leading-snug tracking-tight">
                        {!board
                            ? 'Loading the live picture…'
                            : board.totals.delayed
                            ? `${board.totals.delayed} case${board.totals.delayed === 1 ? ' is' : 's are'} running late${board.totals.unassigned ? ` and ${board.totals.unassigned} ${board.totals.unassigned === 1 ? 'has' : 'have'} no driver` : ''}. The rest of the network is on plan.`
                            : board.totals.atRisk
                            ? `${board.totals.atRisk} case${board.totals.atRisk === 1 ? ' looks' : 's look'} likely to run late based on driver GPS. Nothing is late yet.`
                            : board.totals.unassigned
                            ? `${board.totals.unassigned} case${board.totals.unassigned === 1 ? '' : 's'} waiting for a driver. Nothing is running late.`
                            : 'Everything is on plan. No delayed or unassigned cases.'}
                    </p>

                    {delayedByStatus.length > 0 && (
                        <>
                            <div className="ui-eyebrow mt-5 mb-2">Where they are stuck</div>
                            <ul className="space-y-2">
                                {delayedByStatus.slice(0, 5).map((x) => (
                                    <li key={x.status} className="flex items-center gap-3 text-sm">
                                        <span className="w-6 text-right font-semibold tabular-nums text-primary">{String(x.late).padStart(2, '0')}</span>
                                        <span className="flex-1 truncate">{x.status}</span>
                                        <span className="h-1 w-20 overflow-hidden rounded-full bg-white dark:bg-black">
                                            <span className="block h-full rounded-full bg-primary" style={{ width: `${(x.late / lateMax) * 100}%` }} />
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {recs && recs.length > 0 && (
                        <>
                            <div className="ui-eyebrow mt-5 mb-2">Proposed · needs your approval</div>
                            <SuggestionsPanel items={recs} onOpen={setOpenRec} compact />
                        </>
                    )}
                    <div className="ui-eyebrow mt-5 mb-2">Waiting for you</div>
                    <div className="space-y-2">
                        {unassigned.length > 0 && (
                            <Link to="/operations" className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm hover:shadow-sm dark:bg-black">
                                <b>Assign {unassigned.length} case{unassigned.length === 1 ? '' : 's'}</b>
                                <span className="truncate text-xs text-[#8a90a2]">{unassigned.slice(0, 3).map((c) => c.fileNumber).join(', ')}</span>
                                <span className="ml-auto text-[#8a90a2]">›</span>
                            </Link>
                        )}
                        {openQueues.map((q) => (
                            <Link key={q.key} to={q.link || '/operations'} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm hover:shadow-sm dark:bg-black">
                                <b>{q.label}</b>
                                <span className="text-xs text-[#8a90a2]">{q.count} waiting</span>
                                <span className="ml-auto text-[#8a90a2]">›</span>
                            </Link>
                        ))}
                        {!unassigned.length && !openQueues.length && <p className="text-sm text-[#5d6375]">Nothing waiting. 👍</p>}
                    </div>
                    <Link to="/operations" className="btn btn-primary mt-4 w-full sm:w-auto">✓ Open operations</Link>
                </div>
            </div>

            {/* Live network | Today's people | trend */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.45fr]">
                <div className="panel relative overflow-hidden !p-0">
                    <MiniMap data={live} height={300} />
                    <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm dark:bg-black">
                        <span className="h-2 w-2 rounded-full bg-success" /> Live network
                        <span className="font-normal text-[#8a90a2]">{live ? `${live.counts.withLocation} on map · ${live.counts.online} online` : '…'}</span>
                    </div>
                    <Link to="/operations" className="absolute bottom-3 left-3 z-[500] rounded-full bg-[#111318] px-3 py-1.5 text-xs font-semibold text-white">Open live map →</Link>
                </div>

                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="text-base font-semibold">Last 14 days</h5>
                            <p className="text-xs text-[#8a90a2]">{trend.reduce((a, d) => a + d.count, 0)} bookings · {inr(trend.reduce((a, d) => a + d.amount, 0))} · today {inr(totalToday?.amount || 0)}</p>
                        </div>
                        <Link to="/reports" className="ui-chip">Reports</Link>
                    </div>
                    {trend.length ? <ReactApexChart type="line" height={230} series={chart.series} options={chart.options as any} /> : <p className="py-10 text-center text-sm text-white-dark">Loading…</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                {/* Today's drivers, like the dispatch timeline */}
                <div className="panel xl:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h5 className="text-base font-semibold">Today by driver</h5>
                            <p className="text-xs text-[#8a90a2]">
                                {today?.perPerson.length ?? 0} working · cash pending on {today?.totals.cashPending ?? '–'} cases · {today?.totals.scheduledUpcoming ?? 0} scheduled ahead
                            </p>
                        </div>
                        <Link to="/operations" className="ui-chip">All drivers</Link>
                    </div>
                    {!today ? (
                        <p className="text-sm text-white-dark">Loading…</p>
                    ) : today.perPerson.length === 0 ? (
                        <p className="text-sm text-white-dark">No cases handled yet today.</p>
                    ) : (
                        <ul className="divide-y divide-[#eceef2] dark:divide-[#1b2e4b]">
                            {today.perPerson.slice(0, 8).map((p) => (
                                <li key={p._id} className="flex items-center gap-3 py-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-[11px] font-semibold dark:bg-[#1a2941]">
                                        {(p.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                    <div className="w-40 min-w-0">
                                        <div className="truncate text-sm font-semibold">{p.name}</div>
                                        <div className="text-[11px] text-[#8a90a2]">{p.type === 'provider' ? 'Provider' : 'Driver'}</div>
                                    </div>
                                    <div className="flex h-6 flex-1 overflow-hidden rounded-lg bg-[#f1f2f5] dark:bg-[#1a2941]">
                                        <div className="flex items-center bg-[#111318] px-2 text-[11px] font-semibold text-white dark:bg-white dark:text-black" style={{ width: `${p.cases ? (p.completed / p.cases) * 100 : 0}%`, minWidth: p.completed ? 28 : 0 }}>
                                            {p.completed || ''}
                                        </div>
                                        {p.open > 0 && (
                                            <div className="flex items-center bg-primary px-2 text-[11px] font-semibold text-white" style={{ width: `${(p.open / Math.max(1, p.cases)) * 100}%`, minWidth: 28 }}>
                                                {p.open}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-20 text-right text-xs tabular-nums text-[#5d6375]">{inr(p.amount)}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {!!today?.perPerson.length && (
                        <div className="mt-3 flex gap-4 text-[11px] text-[#8a90a2]">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#111318] dark:bg-white" /> Completed</span>
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" /> Open</span>
                        </div>
                    )}
                </div>

                <div className="space-y-5">
                    <MyDayPanel />

                    {/* Vehicle alerts */}
                    <div className="panel">
                        <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-base font-semibold">Vehicle alerts</h5>
                            <span className={`badge ${alertsCount ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'}`}>{alertsCount}</span>
                        </div>
                        {alertsCount === 0 ? (
                            <p className="text-sm text-white-dark">No renewals or services due.</p>
                        ) : (
                            <ul className="max-h-72 space-y-1.5 overflow-auto pr-1">
                                {expiredRecords.map((r, i) => (
                                    <li key={`${r._id}-${r.type}-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-[#f5f6f8] px-3 py-2 text-xs dark:bg-[#1a2941]/50">
                                        <span>
                                            <b>{r.vehicleNumber}</b> · {r.type} <span className={new Date(r.expiryDate) < new Date() ? 'text-danger' : 'text-warning'}>{expiryText(r)}</span>
                                        </span>
                                        {canRenew && (
                                            <button type="button" className="btn btn-dark btn-sm !px-3 !py-0.5 text-[11px]" onClick={() => handleRenewal(r._id)}>
                                                Renew
                                            </button>
                                        )}
                                    </li>
                                ))}
                                {exceededRecords.map((v, i) => (
                                    <li key={`km-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-[#f5f6f8] px-3 py-2 text-xs dark:bg-[#1a2941]/50">
                                        <span>
                                            <b>{v.serviceVehicle}</b> · service due <span className="text-danger">({v.serviceKM} km)</span>
                                        </span>
                                        <button type="button" className="btn btn-outline-danger btn-sm !px-3 !py-0.5 text-[11px]" onClick={() => handleDismissVehicleServiceKm(v)}>
                                            Serviced
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <RecommendationDialog rec={openRec} onClose={() => setOpenRec(null)} onDone={loadAll} />
            <AddVehicleCompliance
                isEditingForDissmissBtn={dismissMode}
                open={openRenewal}
                id={recordId}
                recordType={dismissRecordType}
                dissmissVehicleNumber={dismissVehicleNumber}
                handleClose={() => {
                    setOpenRenewal(false);
                    setDismissMode(false);
                    setRecordId('');
                    setDismissRecordType('');
                    setDismissVehicleNumber('');
                    loadCounts().catch(() => undefined);
                    loadServiceKm();
                }}
                fetchComplianceDetails={loadServiceKm}
                isEditMode={true}
            />
        </div>
    );
};

export default Index;
