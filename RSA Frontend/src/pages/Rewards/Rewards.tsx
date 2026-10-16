import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import IconEye from '../../components/Icon/IconEye';
import { ClientRewardDetails } from '../../interface/Rewards';

// Kept for other files that import it
export interface Staff {
    _id: string;
    name: string;
    phoneNumber?: string;
    rewardPoints?: number;
    showroomId?: any;
}

type Tab = 'Driver' | 'Showroom' | 'ShowroomStaff';
const TAB_LABEL: Record<Tab, string> = { Driver: 'Drivers', Showroom: 'Showrooms', ShowroomStaff: 'Showroom staff' };

interface PointSettings {
    _id: string;
    showroom: number;
    showroomStaff: number;
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function Rewards() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('Driver');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [drivers, setDrivers] = useState<ClientRewardDetails[]>([]);
    const [showrooms, setShowrooms] = useState<ClientRewardDetails[]>([]);
    const [showroomStaff, setShowroomStaff] = useState<(ClientRewardDetails & { showroomName?: string })[]>([]);
    const [settings, setSettings] = useState<PointSettings>({ _id: '', showroom: 0, showroomStaff: 0 });
    const [form, setForm] = useState({ showroom: '', showroomStaff: '' });
    const [saving, setSaving] = useState(false);
    const [pendingRedeems, setPendingRedeems] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [d, s, st, pts, red] = await Promise.allSettled([
                axiosInstance.get(`${BASE_URL}/driver/driverBooking`),
                axiosInstance.get(`${BASE_URL}/showroom`),
                axiosInstance.get(`${BASE_URL}/showroom/showroom-staff`),
                axiosInstance.get(`${BASE_URL}/point/showroom`),
                axiosInstance.get(`${BASE_URL}/reward/redeems`),
            ]);

            if (d.status === 'fulfilled' && Array.isArray(d.value.data)) {
                setDrivers(d.value.data.map((x: any) => ({ _id: x._id, name: x.name, rewardPoints: num(x.rewardPoints), staff: [] })));
            }
            const staffRows = st.status === 'fulfilled' && Array.isArray(st.value.data?.data) ? st.value.data.data : [];
            const staffList = staffRows.map((x: any) => ({
                _id: x._id,
                name: x.name,
                rewardPoints: num(x.rewardPoints),
                showroomId: x.showroomId?._id || x.showroomId || '',
                showroomName: x.showroomId?.name || '',
                staff: [],
            }));
            setShowroomStaff(staffList);
            if (s.status === 'fulfilled' && Array.isArray(s.value.data)) {
                setShowrooms(
                    s.value.data.map((x: any) => ({
                        _id: x._id,
                        name: x.name,
                        rewardPoints: num(x.rewardPoints),
                        staff: staffList.filter((m: any) => String(m.showroomId) === String(x._id)),
                    }))
                );
            }
            if (pts.status === 'fulfilled') {
                const p = pts.value.data;
                const next = { _id: p._id, showroom: num(p.bookingPointsForShowroom), showroomStaff: num(p.bookingPointsForShowroomStaff) };
                setSettings(next);
                setForm({ showroom: String(next.showroom), showroomStaff: String(next.showroomStaff) });
            }
            if (red.status === 'fulfilled') {
                const rows = red.value.data?.data || [];
                setPendingRedeems(rows.filter((r: any) => !r.approval && !r.rejected).length);
            }
            setLoading(false);
        };
        load();
    }, []);

    const savePoints = async () => {
        const showroom = Number(form.showroom);
        const staff = Number(form.showroomStaff);
        if (!Number.isFinite(showroom) || !Number.isFinite(staff) || showroom < 0 || staff < 0) {
            Swal.fire({ icon: 'warning', title: 'Enter 0 or a positive number for both' });
            return;
        }
        setSaving(true);
        try {
            await axiosInstance.put(`${BASE_URL}/point/showroom`, { showroomBookingPoints: showroom, showroomStaffBookingPoints: staff });
            setSettings((s) => ({ ...s, showroom, showroomStaff: staff }));
            Swal.fire({ icon: 'success', title: 'Points saved', timer: 1500, showConfirmButton: false });
        } catch (e: any) {
            Swal.fire({ icon: 'error', title: 'Could not save', text: e?.response?.data?.message || e?.message });
        } finally {
            setSaving(false);
        }
    };

    const rows = useMemo(() => {
        const list = tab === 'Driver' ? drivers : tab === 'Showroom' ? showrooms : showroomStaff;
        const q = search.trim().toLowerCase();
        return list
            .filter((r: any) => !q || r.name?.toLowerCase().includes(q) || r.showroomName?.toLowerCase().includes(q))
            .sort((a, b) => b.rewardPoints - a.rewardPoints);
    }, [tab, drivers, showrooms, showroomStaff, search]);

    const totals = {
        Driver: drivers.reduce((a, r) => a + r.rewardPoints, 0),
        Showroom: showrooms.reduce((a, r) => a + r.rewardPoints, 0),
        ShowroomStaff: showroomStaff.reduce((a, r) => a + r.rewardPoints, 0),
    };
    const changed = String(settings.showroom) !== form.showroom || String(settings.showroomStaff) !== form.showroomStaff;

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* How points are earned */}
                <div className="panel lg:col-span-2">
                    <h5 className="font-semibold mb-1">Points per booking</h5>
                    <p className="text-xs text-white-dark mb-4">
                        Given automatically when a booking made by a showroom (or its staff) is <b>verified</b>. Each booking earns once.
                        Drivers earn points from customer feedback.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <label className="block">
                            <span className="text-sm font-medium">Showroom gets</span>
                            <div className="flex mt-1">
                                <input
                                    id="pts-showroom"
                                    type="number"
                                    min={0}
                                    className="form-input ltr:rounded-r-none rtl:rounded-l-none"
                                    value={form.showroom}
                                    onChange={(e) => setForm((f) => ({ ...f, showroom: e.target.value }))}
                                />
                                <span className="flex items-center px-3 border border-white-light bg-[#eee] dark:border-[#17263c] dark:bg-[#1b2e4b] ltr:rounded-r-md rtl:rounded-l-md text-xs">pts</span>
                            </div>
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium">Showroom staff who booked gets</span>
                            <div className="flex mt-1">
                                <input
                                    id="pts-staff"
                                    type="number"
                                    min={0}
                                    className="form-input ltr:rounded-r-none rtl:rounded-l-none"
                                    value={form.showroomStaff}
                                    onChange={(e) => setForm((f) => ({ ...f, showroomStaff: e.target.value }))}
                                />
                                <span className="flex items-center px-3 border border-white-light bg-[#eee] dark:border-[#17263c] dark:bg-[#1b2e4b] ltr:rounded-r-md rtl:rounded-l-md text-xs">pts</span>
                            </div>
                        </label>
                        <button type="button" className="btn btn-primary" disabled={!changed || saving} onClick={savePoints}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Totals */}
                <div className="panel">
                    <h5 className="font-semibold mb-3">Points held</h5>
                    <ul className="space-y-2 text-sm">
                        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
                            <li key={t} className="flex justify-between">
                                <span>{TAB_LABEL[t]}</span>
                                <b>{totals[t].toLocaleString('en-IN')}</b>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-white-dark mt-3">A showroom can use up to half its points as a discount on a booking.</p>
                </div>
            </div>

            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2" role="tablist">
                        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
                            <button
                                key={t}
                                role="tab"
                                aria-selected={tab === t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline-primary'}`}
                            >
                                {TAB_LABEL[t]} <span className="opacity-70 ltr:ml-1 rtl:mr-1">({(t === 'Driver' ? drivers : t === 'Showroom' ? showrooms : showroomStaff).length})</span>
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
                                <th className="text-right">Points</th>
                                <th className="text-center w-24">History</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-white-dark">Loading…</td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-white-dark">Nothing to show</td>
                                </tr>
                            ) : (
                                rows.map((r: any) => (
                                    <tr key={r._id}>
                                        <td className="font-medium">{r.name || '—'}</td>
                                        {tab === 'ShowroomStaff' && <td>{r.showroomName || '—'}</td>}
                                        {tab === 'Showroom' && <td>{r.staff?.length || 0}</td>}
                                        <td className="text-right font-semibold">{r.rewardPoints.toLocaleString('en-IN')}</td>
                                        <td className="text-center">
                                            <button
                                                type="button"
                                                title="Redemption history"
                                                onClick={() => navigate(`/reward-details?userType=${tab}&id=${r._id}`)}
                                            >
                                                <IconEye className="text-primary m-auto" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Rewards;
