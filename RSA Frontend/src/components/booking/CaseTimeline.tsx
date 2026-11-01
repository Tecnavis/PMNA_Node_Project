import React, { useEffect, useState } from 'react';
import { TimelineItem, fmtWhen, getTimeline } from './bookingToolsApi';

/** "Case timeline" on the booking page: every status change, assignment and share, with who did it. */
const STATUS_TONE: Record<string, string> = {
    'Order Completed': 'bg-success',
    'Vehicle Dropped': 'bg-success',
    Cancelled: 'bg-danger',
    Rejected: 'bg-danger',
};

const describe = (i: TimelineItem): { title: string; detail?: string; tone: string } => {
    switch (i.type) {
        case 'created':
            return { title: 'Booking created', detail: i.to && i.to !== 'Booking Added' ? i.to : undefined, tone: 'bg-[#111318]' };
        case 'status':
            return { title: i.to || 'Status changed', detail: i.from ? `from ${i.from}` : undefined, tone: STATUS_TONE[i.to] || 'bg-primary' };
        case 'assigned':
            return { title: `Assigned to ${i.to || (i.meta?.kind === 'provider' ? 'a provider' : 'a driver')}`, detail: i.from ? `was ${i.from}` : undefined, tone: 'bg-[#111318]' };
        case 'tracking-shared':
            return {
                title: 'Live tracking shared',
                detail: [i.meta?.recipients?.length ? `with ${i.meta.recipients.join(', ')}` : 'link only', i.meta?.showDriver ? 'driver shown' : ''].filter(Boolean).join(' · '),
                tone: 'bg-brand',
            };
        case 'tracking-revoked':
            return { title: 'Tracking link switched off', tone: 'bg-[#8a90a2]' };
        case 'reassign-approved':
            return { title: `Reassignment to ${i.to || 'another driver'} approved`, detail: [i.meta?.reason, i.meta?.impact?.savesMinutes ? `saves ~${i.meta.impact.savesMinutes} min` : ''].filter(Boolean).join(' · '), tone: 'bg-brand' };
        case 'reassign-rejected':
            return { title: `Suggestion to move to ${i.to || 'another driver'} rejected`, detail: i.meta?.reason, tone: 'bg-[#8a90a2]' };
        case 'pickup-photos':
            return { title: 'Pickup photos taken', tone: 'bg-primary' };
        case 'dropoff-photos':
            return { title: 'Drop-off photos taken', tone: 'bg-primary' };
        case 'verified':
            return { title: 'Booking verified', tone: 'bg-success' };
        case 'upi-verified':
            return { title: 'UPI payment verified', tone: 'bg-success' };
        case 'photos-deleted':
            return { title: 'Photos removed', detail: i.to, tone: 'bg-[#8a90a2]' };
        default:
            return { title: i.type, tone: 'bg-[#8a90a2]' };
    }
};

const CaseTimeline: React.FC<{ bookingId: string; refreshKey?: number }> = ({ bookingId, refreshKey = 0 }) => {
    const [items, setItems] = useState<TimelineItem[] | null>(null);
    const [early, setEarly] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        getTimeline(bookingId)
            .then((d) => {
                if (!alive) return;
                setItems(Array.isArray(d.items) ? d.items : []);
                setEarly(!!d.logStartedEarly);
                setError('');
            })
            .catch(() => alive && setError('Could not load the timeline'));
        return () => {
            alive = false;
        };
    }, [bookingId, refreshKey]);

    return (
        <div className="panel">
            <div className="mb-4 flex items-center justify-between">
                <h5 className="text-base font-semibold">Case timeline</h5>
                <span className="ui-eyebrow">India time</span>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            {!items && !error && <p className="text-sm text-white-dark">Loading…</p>}
            {items && items.length === 0 && <p className="text-sm text-white-dark">Nothing recorded yet.</p>}
            {items && items.length > 0 && (
                <ol className="relative">
                    {items.map((i, idx) => {
                        const d = describe(i);
                        const last = idx === items.length - 1;
                        return (
                            <li key={i._id} className="relative flex gap-3 pb-5 last:pb-0">
                                {!last && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 bg-[#e3e6ec] dark:bg-[#253b5c]" />}
                                <span className={`relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-[#0e1726] ${d.tone}`}>
                                    <span className="h-2 w-2 rounded-full bg-white" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                        <span className="font-semibold text-[#111318] dark:text-white">{d.title}</span>
                                        <span className="text-xs tabular-nums text-[#8a90a2]">{fmtWhen(i.at)}</span>
                                    </div>
                                    <div className="text-xs text-[#8a90a2]">
                                        {[d.detail, i.by ? `by ${i.by}` : i.source === 'record' ? 'from the booking record' : ''].filter(Boolean).join(' · ')}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
            {early && items && items.length > 0 && <p className="mt-4 text-[11px] text-[#8a90a2]">Detailed history (who changed what) is recorded from this update onwards; older cases show what the booking itself stores.</p>}
        </div>
    );
};

export default CaseTimeline;
