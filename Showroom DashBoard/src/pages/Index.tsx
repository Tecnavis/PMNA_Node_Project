import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ReactApexChart from 'react-apexcharts';
import { CalendarPlus, ClipboardList, QrCode, Users, Wallet, RefreshCw, Gift } from 'lucide-react';
import { IRootState } from '../store';
import { axiosInstance, BASE_URL } from '../config/axiosConfig';

type Stats = { totalBookings: number; newBookingsOther: number; pendingBookings: number; completedBookings: number; cancelledBookings?: number; thisMonth?: number; rewardUsed?: number };
type OpenBooking = { _id: string; fileNumber: string; status: string; customerName?: string; vehicleNumber?: string; createdAt: string; pickupDate?: string; statusChangedAt?: string | null; assignedTo?: string };
type Closed = { _id: string; fileNumber: string; status: string; customerName?: string; vehicleNumber?: string; at: string };
type Data = { stats: Stats; rewardPoints: number; months: { month: string; count: number }[]; openBookings: OpenBooking[]; recentClosed: Closed[] };

// The journey a customer's vehicle goes through, in plain words
const STEPS: { label: string; statuses: string[] }[] = [
    { label: 'Received', statuses: ['Booking Added', 'called to customer'] },
    { label: 'Driver assigned', statuses: ['Order Received'] },
    { label: 'On the way', statuses: ['On the way to pickup location'] },
    { label: 'Picked up', statuses: ['Vehicle Picked', 'Vehicle Confirmed', 'To DropOff Location', 'On the way to dropoff location'] },
    { label: 'Delivered', statuses: ['Vehicle Dropped', 'Order Completed'] },
];
const stepOf = (status: string) => Math.max(0, STEPS.findIndex((s) => s.statuses.includes(status)));

const ago = (iso?: string | null) => {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    if (m < 1440) return `${Math.round(m / 60)} h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const Index = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const showroomId = localStorage.getItem('showroomId') || '';
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [updated, setUpdated] = useState<Date | null>(null);

    const load = useCallback(async () => {
        if (!showroomId) { setError('Please log in again.'); return; }
        setLoading(true);
        try {
            const res = await axiosInstance.get(`${BASE_URL}/showroom-dashboard/${showroomId}`);
            const d = res.data || {};
            setData({
                stats: d.stats || d.bookingData?.[0] || { totalBookings: 0, newBookingsOther: 0, pendingBookings: 0, completedBookings: 0 },
                rewardPoints: d.rewardPoints ?? Number(localStorage.getItem('showroomRewardPoints') || 0),
                months: d.months || [],
                openBookings: d.openBookings || [],
                recentClosed: d.recentClosed || [],
            });
            setError('');
            setUpdated(new Date());
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not load your dashboard. Check your internet and try again.');
        } finally {
            setLoading(false);
        }
    }, [showroomId]);

    useEffect(() => {
        load();
        const t = window.setInterval(() => !document.hidden && load(), 30000);
        return () => window.clearInterval(t);
    }, [load]);

    const s = data?.stats;
    const usable = Math.floor((data?.rewardPoints || 0) / 2);

    const chart = useMemo(() => ({
        series: [{ name: 'Bookings', data: (data?.months || []).map((m) => m.count) }],
        options: {
            chart: { type: 'bar' as const, toolbar: { show: false }, fontFamily: 'inherit' },
            colors: ['#D7141A'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
            dataLabels: { enabled: true, style: { fontSize: '11px' }, offsetY: -18 },
            grid: { borderColor: isDark ? '#191e3a' : '#eef0f4' },
            xaxis: { categories: (data?.months || []).map((m) => new Date(`${m.month}-15`).toLocaleDateString('en-IN', { month: 'short' })), labels: { style: { colors: isDark ? '#888ea8' : '#64748b' } } },
            yaxis: { show: false, min: 0, forceNiceScale: true },
            tooltip: { theme: isDark ? 'dark' : 'light' },
        },
    }), [data, isDark]);

    const tiles = [
        { label: 'This month', value: s?.thisMonth ?? '–', tone: 'text-red-700' },
        { label: 'Waiting', value: s?.newBookingsOther ?? '–', tone: 'text-amber-600', hint: 'Received, not yet picked by a driver' },
        { label: 'In progress', value: s?.pendingBookings ?? '–', tone: 'text-blue-600' },
        { label: 'Completed', value: s?.completedBookings ?? '–', tone: 'text-green-600' },
        { label: 'All bookings', value: s?.totalBookings ?? '–', tone: 'text-slate-700 dark:text-white-light' },
    ];

    const actions = [
        { to: '/addbook', label: 'New booking', icon: CalendarPlus, primary: true },
        { to: '/showrm', label: 'All bookings', icon: ClipboardList },
        { to: '/staff', label: 'Staff', icon: Users },
        { to: '/showrm/qr', label: 'Staff QR', icon: QrCode },
        { to: '/report', label: 'Cash report', icon: Wallet },
    ];

    return (
        <div className="container mx-auto px-3 sm:px-6 py-4 space-y-4">
            {/* Top: quick actions + rewards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl bg-white dark:bg-[#0e1726] shadow-sm border border-slate-100 dark:border-[#1b2e4b] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-white-light">Dashboard</h1>
                            <p className="text-xs text-slate-500">{updated ? `Updated ${updated.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · refreshes every 30 s` : 'Loading…'}</p>
                        </div>
                        <button type="button" onClick={load} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#1b2e4b] text-slate-500" aria-label="Refresh">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {actions.map(({ to, label, icon: Icon, primary }) => (
                            <Link key={to} to={to}
                                className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 text-sm font-semibold transition ${primary ? 'bg-red-700 text-white hover:bg-red-800 col-span-2 sm:col-span-1' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-[#1b2e4b] dark:text-white-light'}`}>
                                <Icon className="w-5 h-5" />
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-red-700 to-red-500 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold opacity-90"><Gift className="w-4 h-4" /> Reward points</div>
                    <div className="text-4xl font-extrabold mt-1">{(data?.rewardPoints ?? 0).toLocaleString('en-IN')}</div>
                    <p className="text-xs opacity-90 mt-1">
                        You earn points for every booking that is completed and verified.
                        {usable > 0 ? ` Up to ${usable.toLocaleString('en-IN')} can be taken off your next booking.` : ''}
                    </p>
                </div>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">{error} <button type="button" className="underline ml-2" onClick={load}>Try again</button></div>}

            {/* KPI tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {tiles.map((t) => (
                    <div key={t.label} title={t.hint} className="rounded-xl bg-white dark:bg-[#0e1726] border border-slate-100 dark:border-[#1b2e4b] shadow-sm p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.label}</div>
                        <div className={`text-2xl font-bold mt-1 ${t.tone}`}>{t.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Live bookings */}
                <div className="lg:col-span-2 rounded-xl bg-white dark:bg-[#0e1726] border border-slate-100 dark:border-[#1b2e4b] shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-slate-800 dark:text-white-light">Live bookings <span className="text-slate-400 font-normal">({data?.openBookings.length ?? 0})</span></h2>
                        <Link to="/showrm" className="text-sm text-red-700 font-semibold">See all →</Link>
                    </div>
                    {!data ? (
                        <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
                    ) : data.openBookings.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-sm text-slate-500 mb-3">No vehicles on the way right now.</p>
                            <Link to="/addbook" className="inline-block rounded-lg bg-red-700 text-white text-sm font-semibold px-4 py-2">Book a tow truck</Link>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {data.openBookings.map((b) => {
                                const step = stepOf(b.status);
                                return (
                                    <li key={b._id} className="rounded-lg border border-slate-100 dark:border-[#1b2e4b] p-3">
                                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                            <div className="font-semibold text-slate-800 dark:text-white-light">
                                                {b.vehicleNumber || 'Vehicle'} <span className="text-slate-400 font-normal text-sm">· {b.customerName || '—'}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">{b.fileNumber} · {ago(b.statusChangedAt || b.createdAt)}</div>
                                        </div>
                                        <ol className="mt-3 grid grid-cols-5 gap-1" aria-label={`Progress: ${STEPS[step].label}`}>
                                            {STEPS.map((st, i) => (
                                                <li key={st.label} className="text-center">
                                                    <div className={`h-1.5 rounded-full ${i <= step ? 'bg-red-600' : 'bg-slate-200 dark:bg-[#1b2e4b]'}`} />
                                                    <div className={`mt-1 text-[10px] sm:text-[11px] leading-tight ${i === step ? 'font-bold text-red-700' : i < step ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>{st.label}</div>
                                                </li>
                                            ))}
                                        </ol>
                                        {b.assignedTo && <div className="mt-2 text-xs text-slate-500">Driver: <span className="font-semibold text-slate-700 dark:text-white-light">{b.assignedTo}</span></div>}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Chart + recent */}
                <div className="space-y-4">
                    <div className="rounded-xl bg-white dark:bg-[#0e1726] border border-slate-100 dark:border-[#1b2e4b] shadow-sm p-4">
                        <h2 className="font-bold text-slate-800 dark:text-white-light">Bookings per month</h2>
                        {data?.months.length ? <ReactApexChart type="bar" height={190} series={chart.series} options={chart.options as any} /> : <p className="text-sm text-slate-500 py-8 text-center">—</p>}
                    </div>
                    <div className="rounded-xl bg-white dark:bg-[#0e1726] border border-slate-100 dark:border-[#1b2e4b] shadow-sm p-4">
                        <h2 className="font-bold text-slate-800 dark:text-white-light mb-2">Recently finished</h2>
                        {!data?.recentClosed.length ? <p className="text-sm text-slate-500">Nothing yet.</p> : (
                            <ul className="divide-y divide-slate-100 dark:divide-[#1b2e4b]">
                                {data.recentClosed.map((b) => (
                                    <li key={b._id} className="py-2 flex items-center justify-between gap-2 text-sm">
                                        <div className="min-w-0">
                                            <div className="font-semibold truncate">{b.vehicleNumber || b.fileNumber}</div>
                                            <div className="text-xs text-slate-500 truncate">{b.customerName || ''} · {ago(b.at)}</div>
                                        </div>
                                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${b.status === 'Order Completed' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {b.status === 'Order Completed' ? 'Completed' : b.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Index;
