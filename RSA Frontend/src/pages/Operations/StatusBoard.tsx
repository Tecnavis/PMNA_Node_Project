import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { BoardData, OpsCase, STATUS_COLORS, formatMinutes, updateCaseStatus } from './opsApi';

// Statuses an admin may set from the board. Completing / cancelling need payment or a cancel photo,
// so those stay on the case page.
const WORKFLOW = [
    'Booking Added',
    'called to customer',
    'Order Received',
    'On the way to pickup location',
    'Vehicle Picked',
    'Vehicle Confirmed',
    'On the way to dropoff location',
    'Vehicle Dropped',
];
const nextStatus = (s: string) => {
    const i = WORKFLOW.indexOf(s);
    return i >= 0 && i < WORKFLOW.length - 1 ? WORKFLOW[i + 1] : null;
};

const CaseCard: React.FC<{ c: OpsCase; onChanged: () => void }> = ({ c, onChanged }) => {
    const [busy, setBusy] = useState(false);
    const next = nextStatus(c.status);
    const who = c.driver || c.provider;

    const change = async (status: string) => {
        if (!status || status === c.status) return;
        const ok = await Swal.fire({
            icon: 'question',
            title: `Move ${c.fileNumber || 'case'}?`,
            html: `<b>${c.status}</b> → <b>${status}</b>${who ? `<br><small>${who.name} will be notified as usual.</small>` : ''}`,
            showCancelButton: true,
            confirmButtonText: 'Yes, update',
        });
        if (!ok.isConfirmed) return;
        setBusy(true);
        try {
            await updateCaseStatus(c._id, status);
            toast.success(`${c.fileNumber || 'Case'}: ${status}`);
            onChanged();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Could not update status');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`rounded-md border bg-white p-3 text-sm shadow-sm dark:bg-[#1b2e4b] ${c.delayed ? 'border-danger' : 'border-white-light dark:border-[#253b5c]'}`}>
            <div className="flex items-start justify-between gap-2">
                <Link to={`/openbooking/${c._id}`} className="font-semibold text-primary hover:underline">
                    {c.fileNumber || 'No case ID'}
                </Link>
                <span className={`shrink-0 text-xs ${c.delayed ? 'font-semibold text-danger' : 'text-white-dark'}`} title={c.delayLimit ? `Alert after ${c.delayLimit} min` : ''}>
                    {c.scheduledFor ? `Pickup ${new Date(c.scheduledFor).toLocaleDateString()}` : formatMinutes(c.minutesInStatus)}
                </span>
            </div>
            <div className="mt-1 text-xs text-white-dark">
                {[c.customerName, c.vehicleNumber].filter(Boolean).join(' · ') || '—'}
            </div>
            {c.pickup.address && <div className="mt-0.5 line-clamp-2 text-xs text-white-dark">📍 {c.pickup.address}</div>}
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                {who ? (
                    <span className="badge badge-outline-dark">{c.provider ? 'Provider' : 'Driver'}: {who.name}</span>
                ) : (
                    <span className="badge bg-danger">Unassigned</span>
                )}
                {c.cashPending && <span className="badge badge-outline-warning">Cash pending</span>}
                {(c.showroom || c.company) && <span className="badge badge-outline-secondary">{c.showroom || c.company}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
                {next && c.status !== 'Scheduled' && (
                    <button type="button" disabled={busy} className="btn btn-sm btn-primary" onClick={() => change(next)} title={`Move to "${next}"`}>
                        → {next.length > 18 ? `${next.slice(0, 16)}…` : next}
                    </button>
                )}
                <select
                    className="form-select form-select-sm w-auto py-1 text-xs"
                    value=""
                    disabled={busy || c.status === 'Scheduled'}
                    onChange={(e) => change(e.target.value)}
                    aria-label="Change status"
                >
                    <option value="">Status…</option>
                    {WORKFLOW.filter((s) => s !== c.status).map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <Link to={`/add-booking/${c._id}`} className="btn btn-sm btn-outline-primary">{who ? 'Edit' : 'Assign'}</Link>
                {c.customerPhone && <a href={`tel:${c.customerPhone}`} className="btn btn-sm btn-outline-success" title="Call customer">📞 Cust.</a>}
                {who?.phone && <a href={`tel:${who.phone}`} className="btn btn-sm btn-outline-success" title={`Call ${who.name}`}>📞 {c.provider ? 'Prov.' : 'Drv.'}</a>}
            </div>
        </div>
    );
};

const StatusBoard: React.FC<{ data: BoardData | null; onChanged: () => void }> = ({ data, onChanged }) => {
    const [search, setSearch] = useState('');
    const [onlyDelayed, setOnlyDelayed] = useState(false);
    const [onlyUnassigned, setOnlyUnassigned] = useState(false);
    const [showScheduled, setShowScheduled] = useState(false);

    const columns = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data?.columns || [])
            .filter((col) => showScheduled || col.status !== 'Scheduled')
            .map((col) => ({
                ...col,
                cases: col.cases.filter(
                    (c) =>
                        (!onlyDelayed || c.delayed) &&
                        (!onlyUnassigned || c.unassigned) &&
                        (!q ||
                            [c.fileNumber, c.customerName, c.vehicleNumber, c.customerPhone, c.driver?.name, c.provider?.name, c.showroom, c.company]
                                .filter(Boolean)
                                .some((v) => String(v).toLowerCase().includes(q)))
                ),
            }));
    }, [data, search, onlyDelayed, onlyUnassigned, showScheduled]);

    return (
        <div>
            <div className="panel mb-4 flex flex-wrap items-center gap-3 p-3">
                <input className="form-input w-full sm:w-72" placeholder="Search case ID, customer, vehicle, driver…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="form-checkbox text-danger" checked={onlyDelayed} onChange={(e) => setOnlyDelayed(e.target.checked)} />
                    Only delayed ({data?.totals.delayed ?? 0})
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="form-checkbox" checked={onlyUnassigned} onChange={(e) => setOnlyUnassigned(e.target.checked)} />
                    Only unassigned ({data?.totals.unassigned ?? 0})
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="form-checkbox" checked={showScheduled} onChange={(e) => setShowScheduled(e.target.checked)} />
                    Show scheduled ({data?.totals.scheduled ?? 0})
                </label>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3">
                {columns.map((col) => (
                    <div key={col.status} className="w-[270px] shrink-0">
                        <div className="sticky top-0 mb-2 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-white" style={{ background: STATUS_COLORS[col.status] || '#334155' }}>
                            <span className="truncate capitalize">{col.status}</span>
                            <span className="ml-2 rounded-full bg-white/25 px-2 text-xs">{col.cases.length}</span>
                        </div>
                        {col.delayLimit && <div className="mb-2 px-1 text-[11px] text-white-dark">Alert after {formatMinutes(col.delayLimit)}</div>}
                        <div className="space-y-2">
                            {col.cases.length === 0 && <div className="rounded-md border border-dashed border-white-light p-4 text-center text-xs text-white-dark dark:border-[#253b5c]">No cases</div>}
                            {col.cases.map((c) => (
                                <CaseCard key={c._id} c={c} onChanged={onChanged} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatusBoard;
