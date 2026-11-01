import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recommendation, formatMinutes } from './opsApi';
import { logReassign } from '../../components/booking/bookingToolsApi';

/**
 * "Approve reassignment?" — shows current vs proposed driver with the expected impact.
 * Approving is logged to the case timeline and opens the booking so the driver is picked there,
 * where the driver's pay and vehicle are worked out as usual (nothing is changed behind the scenes).
 */
const RecommendationDialog: React.FC<{ rec: Recommendation | null; onClose: () => void; onDone?: () => void }> = ({ rec, onClose, onDone }) => {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setError('');
        if (!rec) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [rec, onClose]);

    if (!rec) return null;
    const c = rec.case;
    const reassign = rec.kind === 'reassign';
    const limit = c.delayLimit || 0;
    const elapsed = c.minutesInStatus || 0;
    const currentLate = reassign && rec.current ? elapsed + rec.current.minutes > limit : false;
    const proposedLate = limit ? elapsed + rec.proposed.minutes > limit : false;
    const arriveAt = (m: number) => new Date(Date.now() + m * 60000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

    const decide = async (decision: 'approved' | 'rejected') => {
        setBusy(true);
        setError('');
        try {
            await logReassign(c._id, {
                to: rec.proposed._id,
                kind: rec.proposed.kind,
                decision,
                reason: reassign ? `Late on ${c.status}` : 'Unassigned case',
                impact: { savesMinutes: rec.savesMinutes || null, proposedKm: rec.proposed.km, proposedMinutes: rec.proposed.minutes, currentMinutes: rec.current?.minutes ?? null },
            });
            onDone?.();
            onClose();
            if (decision === 'approved') navigate(`/add-booking/${c._id}`);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not save the decision');
        } finally {
            setBusy(false);
        }
    };

    const Card: React.FC<{ title: string; name: string; minutes: number; km: number; late: boolean; highlight?: boolean }> = ({ title, name, minutes, km, late, highlight }) => (
        <div className={`rounded-2xl border p-4 ${highlight ? 'border-primary bg-[#f4f2ff] dark:bg-primary/10' : 'border-[#eceef2] bg-[#f5f6f8] dark:border-[#1b2e4b] dark:bg-[#1a2941]/50'}`}>
            <div className="text-sm text-[#5d6375]">{title} · {name}</div>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="ui-num text-[32px] leading-none text-[#111318] dark:text-white">{arriveAt(minutes)}</span>
                <span className="text-sm text-[#8a90a2]">{km} km</span>
            </div>
            <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${late ? 'bg-brand-light text-brand' : 'bg-[#d9f99d] text-[#365314]'}`}>{late ? 'Misses the time limit' : 'Inside the time limit'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={reassign ? 'Approve reassignment' : 'Approve assignment'}>
            <div className="my-6 w-full max-w-[620px] rounded-[22px] bg-white p-5 shadow-2xl dark:bg-[#0e1726] sm:p-7" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">● Dispatch suggestion</span>
                    <button type="button" className="text-2xl leading-none text-[#8a90a2] hover:text-black" onClick={onClose} aria-label="Close">×</button>
                </div>
                <h2 className="mt-3 text-[28px] font-normal tracking-tight text-[#111318] dark:text-white">{reassign ? 'Approve reassignment?' : 'Assign this case?'}</h2>
                <p className="mt-1 text-sm text-[#5d6375]">
                    {reassign
                        ? `Move ${c.fileNumber} from ${rec.current?.name} to ${rec.proposed.name}. ${rec.current?.name} is ${formatMinutes(rec.current?.minutes)} away from the customer.`
                        : `${c.fileNumber} has no driver yet. ${rec.proposed.name} is the nearest free ${rec.proposed.kind} with a vehicle for this service.`}
                </p>

                <div className={`mt-5 grid gap-3 ${reassign ? 'sm:grid-cols-2' : ''}`}>
                    {reassign && rec.current && <Card title="Current" name={rec.current.name} minutes={rec.current.minutes} km={rec.current.km} late={currentLate} />}
                    <Card title="Proposed" name={rec.proposed.name} minutes={rec.proposed.minutes} km={rec.proposed.km} late={proposedLate} highlight />
                </div>

                <dl className="mt-5 divide-y divide-[#eceef2] text-sm dark:divide-[#1b2e4b]">
                    {reassign && (
                        <div className="flex justify-between gap-4 py-3"><dt className="text-[#8a90a2]">Expected impact</dt><dd className="font-semibold">Reaches the customer ~{rec.savesMinutes} min earlier</dd></div>
                    )}
                    <div className="flex justify-between gap-4 py-3"><dt className="text-[#8a90a2]">Case</dt><dd className="text-right font-semibold">{c.fileNumber} · {c.status} for {formatMinutes(c.minutesInStatus)}</dd></div>
                    <div className="flex justify-between gap-4 py-3"><dt className="text-[#8a90a2]">Pickup</dt><dd className="max-w-[60%] truncate text-right font-semibold">{c.pickup.address || '—'}</dd></div>
                    <div className="flex justify-between gap-4 py-3">
                        <dt className="text-[#8a90a2]">{rec.proposed.kind === 'provider' ? 'Provider' : 'Driver'}</dt>
                        <dd className="text-right font-semibold">{rec.proposed.name} · {rec.proposed.phone} · GPS {rec.proposed.gpsMinutesAgo ? `${rec.proposed.gpsMinutesAgo} min ago` : 'now'}</dd>
                    </div>
                </dl>

                <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#f5f6f8] px-4 py-3 text-xs text-[#5d6375] dark:bg-[#1a2941]/50">
                    <span>🛡</span>
                    <span>Logged to the case timeline with your name. Approving opens the booking so you select {rec.proposed.name} there — the driver's pay and vehicle are worked out as usual. Times are estimates from GPS.</span>
                </div>
                {error && <p className="mt-3 text-sm text-danger">{error}</p>}

                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-outline-danger" onClick={() => decide('rejected')} disabled={busy}>✕ Reject</button>
                    <span className="flex-1" />
                    <button type="button" className="btn btn-outline-dark" onClick={() => { onClose(); navigate(`/openbooking/${c._id}`); }}>Review details</button>
                    <button type="button" className="btn btn-dark" onClick={() => decide('approved')} disabled={busy}>✓ Approve &amp; open booking</button>
                </div>
            </div>
        </div>
    );
};

export default RecommendationDialog;
