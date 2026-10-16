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

const Kpi: React.FC<{ label: string; value: React.ReactNode; to?: string; tone?: string; pulse?: boolean; hint?: string }> = ({ label, value, to, tone = '', pulse, hint }) => {
    const body = (
        <div className={`panel !p-3 h-full transition hover:shadow-md ${pulse ? 'ring-2 ring-offset-1 ring-primary animate-pulse' : ''}`} title={hint}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark truncate">{label}</div>
            <div className={`mt-1 text-2xl font-bold leading-none ${tone}`}>{value}</div>
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
    const unassigned = useMemo(() => (board?.columns || []).flatMap((c) => c.cases).filter((c) => c.unassigned), [board]);
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
            colors: ['#D7141A', '#00ab55'],
            stroke: { width: [0, 2], curve: 'smooth' as const },
            plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
            dataLabels: { enabled: false },
            legend: { position: 'top' as const, horizontalAlign: 'right' as const, fontSize: '11px', labels: { colors: isDark ? '#bfc9d4' : undefined } },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed', padding: { left: 4, right: 4 } },
            xaxis: { categories: trend.map((d) => new Date(`${d.day}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })), labels: { style: { fontSize: '10px', colors: isDark ? '#888ea8' : undefined } } },
            yaxis: { labels: { style: { fontSize: '10px', colors: isDark ? '#888ea8' : undefined } }, forceNiceScale: true, min: 0 },
            tooltip: { theme: isDark ? 'dark' : 'light', shared: true, intersect: false, y: { formatter: (v: number, o: any) => (o.seriesIndex === 0 ? `${v} · ${inr(trend[o.dataPointIndex]?.amount || 0)}` : `${v}`) } },
        },
    }), [trend, isDark]);

    const totalToday = trend.length ? trend[trend.length - 1] : null;

    return (
        <div className="space-y-4">
            {/* Title row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-xl font-semibold dark:text-white-light">Dashboard</h2>
                    <p className="text-[11px] text-white-dark">
                        {updatedAt ? `Live · updated ${updatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Loading…'}
                        {opsError && <span className="text-danger ltr:ml-2">{opsError}</span>}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to="/add-booking" className="btn btn-primary btn-sm">+ New booking</Link>
                    <Link to="/operations" className="btn btn-outline-primary btn-sm">Operations</Link>
                    <Link to="/reports" className="btn btn-outline-primary btn-sm">Reports</Link>
                </div>
            </div>


            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                <Kpi label="Showroom new" value={counts?.showroom ?? '–'} to="/bookings" tone="text-success" pulse={!!counts?.showroom} hint="Showroom bookings waiting to be taken" />
                <Kpi label="WhatsApp new" value={counts?.whatsapp ?? '–'} to="/bookings" tone="text-[#25D366]" pulse={!!counts?.whatsapp} hint="WhatsApp bookings waiting to be taken" />
                <Kpi label="Other new" value={counts?.other ?? '–'} to="/bookings" tone="text-primary" />
                <Kpi label="In progress" value={board?.totals.open ?? counts?.inProgress ?? '–'} to="/operations" tone="text-info" />
                <Kpi label="Delayed" value={board?.totals.delayed ?? '–'} to="/operations" tone={board?.totals.delayed ? 'text-danger' : ''} pulse={!!board?.totals.delayed} hint="Cases stuck in a status longer than allowed" />
                <Kpi label="Not assigned" value={board?.totals.unassigned ?? '–'} to="/operations" tone={board?.totals.unassigned ? 'text-warning' : ''} />
                <Kpi label="Done today" value={today?.totals.completed ?? '–'} tone="text-success" hint={`${today?.totals.created ?? 0} created today`} />
                <Kpi label="Approvals" value={approvals?.total ?? '–'} to="/operations" tone={approvals?.total ? 'text-warning' : ''} hint="Expenses, redemptions, verifications and cash waiting" />
            </div>

            {/* Row: pipeline | today | fleet */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="panel !p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-base">Live status</h5>
                        <Link to="/operations" className="text-xs text-primary">Board →</Link>
                    </div>
                    {!board ? <p className="text-sm text-white-dark">Loading…</p> : pipeline.length === 0 ? <p className="text-sm text-white-dark">No open cases.</p> : (
                        <ul className="space-y-1.5">
                            {pipeline.map((c) => {
                                const late = c.cases.filter((x) => x.delayed).length;
                                return (
                                    <li key={c.status} className="text-xs">
                                        <div className="flex justify-between mb-0.5">
                                            <span className="truncate">{c.status}</span>
                                            <span className="font-semibold">{c.cases.length}{late ? <span className="text-danger"> · {late} late</span> : null}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white-light dark:bg-[#1b2e4b] overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${(c.cases.length / pipelineMax) * 100}%`, background: STATUS_COLORS[c.status] || '#4361ee' }} />
                                        </div>
                                    </li>
                                );
                            })}
                            {!!board.totals.scheduled && <li className="text-xs text-white-dark pt-1">+ {board.totals.scheduled} scheduled for later</li>}
                        </ul>
                    )}
                </div>

                <div className="panel !p-4">
                    <h5 className="font-semibold text-base mb-2">Today</h5>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                            ['Created', today?.totals.created, ''],
                            ['Completed', today?.totals.completed, 'text-success'],
                            ['Cancelled', today?.totals.cancelled, 'text-danger'],
                        ].map(([l, v, tone]) => (
                            <div key={l as string} className="rounded-md bg-white-light/40 dark:bg-[#1b2e4b] py-2">
                                <div className={`text-xl font-bold ${tone}`}>{v ?? '–'}</div>
                                <div className="text-[11px] text-white-dark">{l}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-white-dark">Booked value today</span><b>{inr(totalToday?.amount || 0)}</b></div>
                        <div className="flex justify-between"><span className="text-white-dark">Cash pending (all)</span><Link to="/reports" className="font-semibold text-danger">{today?.totals.cashPending ?? '–'} cases</Link></div>
                        <div className="flex justify-between"><span className="text-white-dark">Scheduled ahead</span><b>{today?.totals.scheduledUpcoming ?? '–'}</b></div>
                    </div>
                    {!!today?.perPerson.length && (
                        <div className="mt-3">
                            <div className="text-[11px] font-semibold text-white-dark mb-1">BUSIEST TODAY</div>
                            <ul className="space-y-0.5 text-xs">
                                {today.perPerson.slice(0, 4).map((p) => (
                                    <li key={p._id} className="flex justify-between"><span className="truncate">{p.name}</span><span className="text-white-dark">{p.completed}/{p.cases} done</span></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="panel !p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-base">Drivers & providers</h5>
                        <Link to="/operations" className="text-xs text-primary">Map →</Link>
                    </div>
                    {!live ? <p className="text-sm text-white-dark">Loading…</p> : (
                        <>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-md bg-success/10 py-2"><div className="text-xl font-bold text-success">{live.counts.online}</div><div className="text-[11px] text-white-dark">Online</div></div>
                                <div className="rounded-md bg-info/10 py-2"><div className="text-xl font-bold text-info">{live.counts.busy}</div><div className="text-[11px] text-white-dark">On a job</div></div>
                                <div className="rounded-md bg-warning/10 py-2"><div className="text-xl font-bold text-warning">{live.counts.gpsStale}</div><div className="text-[11px] text-white-dark">GPS old</div></div>
                            </div>
                            <p className="text-[11px] text-white-dark mt-2">{live.counts.drivers} drivers · {live.counts.providers} providers · {live.counts.withLocation} with location</p>
                            {unassigned.length > 0 && (
                                <div className="mt-3">
                                    <div className="text-[11px] font-semibold text-warning mb-1">WAITING FOR A DRIVER</div>
                                    <ul className="space-y-0.5 text-xs">
                                        {unassigned.slice(0, 4).map((c) => (
                                            <li key={c._id} className="flex justify-between gap-2">
                                                <Link to={`/add-booking/${c._id}`} className="text-primary truncate">{c.fileNumber || 'No file no.'}</Link>
                                                <span className="text-white-dark whitespace-nowrap">{formatMinutes(c.minutesInStatus)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Row: trend | my day */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-4">
                    <div className="panel !p-4">
                        <div className="flex items-center justify-between">
                            <h5 className="font-semibold text-base">Last 14 days</h5>
                            <span className="text-xs text-white-dark">{trend.reduce((a, d) => a + d.count, 0)} bookings · {inr(trend.reduce((a, d) => a + d.amount, 0))}</span>
                        </div>
                        {trend.length ? <ReactApexChart type="line" height={220} series={chart.series} options={chart.options as any} /> : <p className="text-sm text-white-dark py-10 text-center">Loading…</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Needs attention */}
                        <div className="panel !p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="font-semibold text-base">Needs attention</h5>
                                <span className="badge bg-danger/10 text-danger rounded-full">{delayedCases.length}</span>
                            </div>
                            {delayedCases.length === 0 ? <p className="text-sm text-white-dark">No delayed cases. 👍</p> : (
                                <ul className="space-y-1.5 max-h-64 overflow-auto pr-1">
                                    {delayedCases.slice(0, 10).map((c) => (
                                        <li key={c._id} className="rounded border border-danger/30 px-2 py-1 text-xs">
                                            <div className="flex justify-between gap-2">
                                                <Link to={`/add-booking/${c._id}`} className="font-semibold text-primary truncate">{c.fileNumber || 'No file no.'}</Link>
                                                <span className="text-danger whitespace-nowrap">{formatMinutes(c.minutesInStatus)}</span>
                                            </div>
                                            <div className="text-white-dark truncate">{c.status} · {c.driver?.name || c.provider?.name || 'not assigned'}{c.customerName ? ` · ${c.customerName}` : ''}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Approvals */}
                        <div className="panel !p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="font-semibold text-base">Waiting for approval</h5>
                                <Link to="/operations" className="text-xs text-primary">Open →</Link>
                            </div>
                            {!approvals ? <p className="text-sm text-white-dark">Loading…</p> : approvals.total === 0 ? <p className="text-sm text-white-dark">Nothing waiting. 👍</p> : (
                                <ul className="space-y-1 text-sm">
                                    {approvals.queues.filter((q) => q.count > 0).map((q) => (
                                        <li key={q.key}>
                                            <Link to={q.link || '/operations'} className="flex justify-between rounded px-2 py-1 hover:bg-white-light/40 dark:hover:bg-[#1b2e4b]">
                                                <span>{q.label}</span><b className="text-warning">{q.count}</b>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <MyDayPanel />

                    {/* Vehicle alerts */}
                    <div className="panel !p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-base">Vehicle alerts</h5>
                            <span className={`badge rounded-full ${alertsCount ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'}`}>{alertsCount}</span>
                        </div>
                        {alertsCount === 0 ? <p className="text-sm text-white-dark">No renewals or services due.</p> : (
                            <ul className="space-y-1.5 max-h-72 overflow-auto pr-1">
                                {expiredRecords.map((r, i) => (
                                    <li key={`${r._id}-${r.type}-${i}`} className="flex items-center justify-between gap-2 rounded border border-white-light dark:border-[#1b2e4b] px-2 py-1 text-xs">
                                        <span><b>{r.vehicleNumber}</b> · {r.type} <span className={new Date(r.expiryDate) < new Date() ? 'text-danger' : 'text-warning'}>{expiryText(r)}</span></span>
                                        {canRenew && <button type="button" className="btn btn-primary btn-sm !py-0.5 !px-2 text-[11px]" onClick={() => handleRenewal(r._id)}>Renew</button>}
                                    </li>
                                ))}
                                {exceededRecords.map((v, i) => (
                                    <li key={`km-${i}`} className="flex items-center justify-between gap-2 rounded border border-white-light dark:border-[#1b2e4b] px-2 py-1 text-xs">
                                        <span><b>{v.serviceVehicle}</b> · service due <span className="text-danger">({v.serviceKM} km)</span></span>
                                        <button type="button" className="btn btn-outline-danger btn-sm !py-0.5 !px-2 text-[11px]" onClick={() => handleDismissVehicleServiceKm(v)}>Serviced</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

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
