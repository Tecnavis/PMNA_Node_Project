import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';
import { fmtWhen } from './bookingToolsApi';

/** The customer's rating for this case (from the tracking link). Low ratings can be marked as followed up. */
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
type Rating = { stars: number; comment: string; at: string; reviewedAt: string | null; reviewedBy: string | null } | null;

const CustomerRatingCard: React.FC<{ bookingId: string; onChanged?: () => void }> = ({ bookingId, onChanged }) => {
    const [r, setR] = useState<Rating | undefined>(undefined);
    const [busy, setBusy] = useState(false);
    const load = () => axios.get(`${BASE_URL}/booking-tools/${bookingId}/rating`, auth()).then((x) => setR(x.data?.rating ?? null)).catch(() => setR(null));
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingId]);
    if (r === undefined || r === null) return null;
    const low = r.stars <= 2;
    const markReviewed = async () => {
        setBusy(true);
        try {
            await axios.post(`${BASE_URL}/booking-tools/${bookingId}/rating-reviewed`, {}, auth());
            await load();
            onChanged?.();
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className={`panel ${low && !r.reviewedAt ? '!border-brand/30 !bg-brand-soft' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="ui-eyebrow">Customer rating</div>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-2xl tracking-wider text-warning" aria-label={`${r.stars} of 5 stars`}>{'★'.repeat(r.stars)}<span className="text-[#dfe2e8]">{'★'.repeat(5 - r.stars)}</span></span>
                        <span className="text-sm text-[#8a90a2]">{fmtWhen(r.at)}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-[#3b4153] dark:text-white-dark">“{r.comment}”</p>}
                </div>
                {low && (r.reviewedAt ? (
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">Followed up by {r.reviewedBy || 'admin'} · {fmtWhen(r.reviewedAt)}</span>
                ) : (
                    <button type="button" className="btn btn-dark btn-sm" onClick={markReviewed} disabled={busy}>Mark as followed up</button>
                ))}
            </div>
        </div>
    );
};

export default CustomerRatingCard;
