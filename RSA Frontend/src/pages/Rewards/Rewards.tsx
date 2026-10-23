import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import IconEye from '../../components/Icon/IconEye';

import { useListControls, Pager } from '../../components/ui/ListControls';
// Kept for other files that import it
export interface Staff {
    _id: string;
    name: string;
    phoneNumber?: string;
    rewardPoints?: number;
    showroomId?: any;
}

type Tab = 'Driver' | 'Showroom' | 'ShowroomStaff' | 'Executive';
const TAB_LABEL: Record<Tab, string> = { Driver: 'Drivers', Showroom: 'Showrooms', ShowroomStaff: 'Showroom staff', Executive: 'Marketing executives' };
const TABS = Object.keys(TAB_LABEL) as Tab[];

type Row = { _id: string; name: string; rewardPoints: number; extra?: string; count?: number };
type ListState = { rows: Row[]; loading: boolean; error: string };

type Settings = { showroom: string; showroomStaff: string; driver: string; executiveBooking: string; executiveVisit: string };
const SETTING_FIELDS: { key: keyof Settings; api: string; label: string; hint: string; group: string }[] = [
    { key: 'showroom', api: 'showroomBookingPoints', label: 'Showroom gets', hint: 'per booking made by the showroom or its staff', group: 'Showrooms' },
    { key: 'showroomStaff', api: 'showroomStaffBookingPoints', label: 'Showroom staff who booked gets', hint: 'per booking they made', group: 'Showrooms' },
    { key: 'driver', api: 'driverBookingPoint', label: 'Driver gets', hint: 'per case they completed (plus customer-feedback points)', group: 'Drivers' },
    { key: 'executiveBooking', api: 'executiveBookingPoint', label: 'Executive gets', hint: 'per booking from a showroom they added', group: 'Marketing executives' },
    { key: 'executiveVisit', api: 'executiveVisitPoint', label: 'Executive gets', hint: 'per monthly showroom visit verified', group: 'Marketing executives' },
];

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const emptyList = (): ListState => ({ rows: [], loading: true, error: '' });
const errText = (e: any) => e?.response?.data?.message || (e?.code === 'ECONNABORTED' ? 'The server took too long' : 'Could not load');

function Rewards() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('Driver');
    const [search, setSearch] = useState('');
    const [lists, setLists] = useState<Record<Tab, ListState>>({ Driver: emptyList(), Showroom: emptyList(), ShowroomStaff: emptyList(), Executive: emptyList() });
    const [saved, setSaved] = useState<Settings>({ showroom: '0', showroomStaff: '0', driver: '0', executiveBooking: '0', executiveVisit: '0' });
    const [form, setForm] = useState<Settings>(saved);
    const [settingsError, setSettingsError] = useState('');
    const [saving, setSaving] = useState(false);
    const [pendingRedeems, setPendingRedeems] = useState<number | null>(null);

    const setList = (t: Tab, patch: Partial<ListState>) => setLists((l) => ({ ...l, [t]: { ...l[t], ...patch } }));

    // every part loads on its own — one slow or failing list never blocks the page
    const load = useCallback(() => {
        TABS.forEach((t) => setList(t, { loading: true, error: '' }));

        axiosInstance.get(`${BASE_URL}/driver/driverBooking`, { timeout: 30000 })
            .then((r) => setList('Driver', { loading: false, rows: (Array.isArray(r.data) ? r.data : r.data?.data || []).map((x: any) => ({ _id: x._id, name: x.name, rewardPoints: num(x.rewardPoints) })) }))
            .catch((e) => setList('Driver', { loading: false, error: errText(e) }));

        Promise.allSettled([
            axiosInstance.get(`${BASE_URL}/showroom`, { timeout: 30000 }),
            axiosInstance.get(`${BASE_URL}/showroom/showroom-staff`, { timeout: 30000 }),
        ]).then(([s, st]) => {
            const staffRaw = st.status === 'fulfilled' ? (Array.isArray(st.value.data?.data) ? st.value.data.data : Array.isArray(st.value.data) ? st.value.data : []) : [];
            const staff = staffRaw.map((x: any) => ({ _id: x._id, name: x.name, rewardPoints: num(x.rewardPoints), extra: x.showroomId?.name || '', showroomId: String(x.showroomId?._id || x.showroomId || '') }));
            setList('ShowroomStaff', st.status === 'fulfilled' ? { loading: false, rows: staff } : { loading: false, error: errText(st.reason) });
            if (s.status === 'fulfilled') {
                const raw = Array.isArray(s.value.data) ? s.value.data : s.value.data?.data || [];
                setList('Showroom', { loading: false, rows: raw.map((x: any) => ({ _id: x._id, name: x.name, rewardPoints: num(x.rewardPoints), count: staff.filter((m: any) => m.showroomId === String(x._id)).length })) });
            } else setList('Showroom', { loading: false, error: errText(s.reason) });
        });

        axiosInstance.get(`${BASE_URL}/marketing-executives`, { params: { disablePagination: true, limit: 1000 }, timeout: 30000 })
            .then((r) => {
                const raw = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
                setList('Executive', { loading: false, rows: raw.map((x: any) => ({ _id: x._id, name: x.name, rewardPoints: num(x.rewardPoints), extra: x.phone || '' })) });
            })
            .catch((e) => setList('Executive', { loading: false, error: errText(e) }));

        axiosInstance.get(`${BASE_URL}/point/showroom`, { timeout: 30000 })
            .then((r) => {
                const p = r.data || {};
                const next: Settings = {
                    showroom: String(num(p.bookingPointsForShowroom)),
                    showroomStaff: String(num(p.bookingPointsForShowroomStaff)),
                    driver: String(num(p.driverBookingPoint)),
                    executiveBooking: String(num(p.executiveBookingPoint)),
                    executiveVisit: String(num(p.executiveVisitPoint)),
                };
                setSaved(next);
                setForm(next);
                setSettingsError('');
            })
            .catch((e) => setSettingsError(errText(e)));

        axiosInstance.get(`${BASE_URL}/reward/redeems`, { timeout: 30000 })
            .then((r) => { const rows = Array.isArray(r.data?.data) ? r.data.data : []; setPendingRedeems(rows.filter((x: any) => !x.approval && !x.rejected).length); })
            .catch(() => setPendingRedeems(null));
    }, []);

    useEffect(() => { load(); }, [load]);

    const changed = SETTING_FIELDS.some((f) => form[f.key] !== saved[f.key]);
    const savePoints = async () => {
        const body: Record<string, number> = {};
        for (const f of SETTING_FIELDS) {
            const n = Number(form[f.key]);
            if (form[f.key] === '' || !Number.isFinite(n) || n < 0) {
                Swal.fire({ icon: 'warning', title: 'Enter 0 or a positive number in every box' });
                return;
            }
            body[f.api] = n;
        }
        setSaving(true);
        try {
            await axiosInstance.put(`${BASE_URL}/point/showroom`, body);
            setSaved({ ...form });
            Swal.fire({ icon: 'success', title: 'Points saved', timer: 1500, showConfirmButton: false });
        } catch (e: any) {
            Swal.fire({ icon: 'error', title: 'Could not save', text: e?.response?.data?.message || e?.message });
        } finally {
            setSaving(false);
        }
    };

    const current = lists[tab];
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return current.rows.filter((r) => !q || r.name?.toLowerCase().includes(q) || r.extra?.toLowerCase().includes(q)).sort((a, b) => b.rewardPoints - a.rewardPoints);
    }, [current, search]);
    const total = (t: Tab) => lists[t].rows.reduce((a, r) => a + r.rewardPoints, 0);
    const paged = useListControls(rows, { pageSize: 25 }); // paging only; the search box above narrows `rows`
    const groups = Array.from(new Set(SETTING_FIELDS.map((f) => f.group)));

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold dark:text-white-light">Rewards</h2>
                <div className="flex flex-wrap gap-2">
                    <Link to="/redeems" className="btn btn-outline-primary btn-sm">
                        Redemptions
                        {pendingRedeems ? <span className="badge bg-danger ltr:ml-2 rtl:mr-2 rounded-full">{pendingRedeems}</span> : null}
                    </Link>
                    <Link to="/reward-item" className="btn btn-primary btn-sm">Reward items</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Points settings */}
                <div className="panel xl:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                            <h5 className="font-semibold">Points settings</h5>
                            <p className="text-xs text-white-dark">Points are given automatically when a case is <b>verified</b> (visits: when the visit is recorded). Each case earns once.</p>
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" disabled={!changed || saving} onClick={savePoints}>{saving ? 'Saving…' : 'Save all'}</button>
                    </div>
                    {settingsError && <p className="text-danger text-sm mb-2">Settings: {settingsError} <button type="button" className="underline" onClick={load}>Retry</button></p>}
                    <div className="space-y-4">
                        {groups.map((g) => (
                            <div key={g}>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark mb-1.5">{g}</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {SETTING_FIELDS.filter((f) => f.group === g).map((f) => (
                                        <label key={f.key} className="block">
                                            <span className="text-sm font-medium">{f.label}</span>
                                            <div className="flex mt-1">
                                                <input
                                                    id={`pts-${f.key}`}
                                                    type="number"
                                                    min={0}
                                                    className="form-input ltr:rounded-r-none rtl:rounded-l-none"
                                                    value={form[f.key]}
                                                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                                                />
                                                <span className="flex items-center px-3 border border-white-light bg-[#eee] dark:border-[#17263c] dark:bg-[#1b2e4b] ltr:rounded-r-md rtl:rounded-l-md text-xs whitespace-nowrap">pts</span>
                                            </div>
                                            <span className="text-[11px] text-white-dark">{f.hint}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="panel">
                    <h5 className="font-semibold mb-3">Points held</h5>
                    <ul className="space-y-2 text-sm">
                        {TABS.map((t) => (
                            <li key={t} className="flex justify-between">
                                <span>{TAB_LABEL[t]}</span>
                                <b>{lists[t].loading ? '…' : lists[t].error ? '—' : total(t).toLocaleString('en-IN')}</b>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-white-dark mt-3">A showroom can use up to half its points as a discount on a booking. Drivers, showroom staff and marketing executives redeem reward items in their apps.</p>
                </div>
            </div>

            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2" role="tablist">
                        {TABS.map((t) => (
                            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)}
                                className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline-primary'}`}>
                                {TAB_LABEL[t]} <span className="opacity-70 ltr:ml-1 rtl:mr-1">({lists[t].loading ? '…' : lists[t].rows.length})</span>
                            </button>
                        ))}
                    </div>
                    <input className="form-input w-full sm:w-64" placeholder="Search name…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Name</th>
                                {tab === 'ShowroomStaff' && <th>Showroom</th>}
                                {tab === 'Showroom' && <th>Staff</th>}
                                {tab === 'Executive' && <th>Phone</th>}
                                <th className="text-right">Points</th>
                                <th className="text-center w-24">History</th>
                            </tr>
                        </thead>
                        <tbody>
                            {current.loading ? (
                                <tr><td colSpan={4} className="text-center py-8 text-white-dark">Loading…</td></tr>
                            ) : current.error ? (
                                <tr><td colSpan={4} className="text-center py-8 text-danger">{current.error}. <button type="button" className="underline" onClick={load}>Try again</button></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-white-dark">Nothing to show</td></tr>
                            ) : (
                                paged.pageRows.map((r) => (
                                    <tr key={r._id}>
                                        <td className="font-medium">{r.name || '—'}</td>
                                        {tab === 'ShowroomStaff' && <td>{r.extra || '—'}</td>}
                                        {tab === 'Showroom' && <td>{r.count || 0}</td>}
                                        {tab === 'Executive' && <td>{r.extra || '—'}</td>}
                                        <td className="text-right font-semibold">{r.rewardPoints.toLocaleString('en-IN')}</td>
                                        <td className="text-center">
                                            <button type="button" title="Redemption history" onClick={() => navigate(`/reward-details?userType=${tab}&id=${r._id}`)}>
                                                <IconEye className="text-primary m-auto" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager {...paged.pager} />
            </div>
        </div>
    );
}

export default Rewards;
