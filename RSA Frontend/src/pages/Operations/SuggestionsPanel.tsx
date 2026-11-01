import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Recommendation, formatMinutes } from './opsApi';
import { can } from '../../utils/access';

const DISMISS_KEY = 'ops-dismissed-suggestions';
const readDismissed = (): string[] => {
    try {
        return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]');
    } catch {
        return [];
    }
};
export const suggestionKey = (r: Recommendation) => `${r.kind}:${r.case._id}:${r.proposed._id}`;

/** "Dispatch suggestions" — nearest-driver ideas the dispatcher approves, reviews or dismisses. */
const SuggestionsPanel: React.FC<{ items: Recommendation[] | null; onOpen: (r: Recommendation) => void; compact?: boolean }> = ({ items, onOpen, compact }) => {
    const [dismissed, setDismissed] = useState<string[]>(readDismissed);
    const visible = (items || []).filter((r) => !dismissed.includes(suggestionKey(r)));
    const dismiss = (r: Recommendation) => {
        const next = [...dismissed, suggestionKey(r)];
        setDismissed(next);
        try {
            sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next));
        } catch {
            /* fine */
        }
    };

    return (
        <div className={compact ? '' : 'panel !border-primary/20 !bg-[#f4f2ff] dark:!bg-primary/10'}>
            {!compact && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                        <div className="font-semibold">Dispatch suggestions</div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">{visible.length} need you · from driver GPS</div>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5d6375] dark:bg-black">🔒 You approve first</span>
                </div>
            )}
            {!items ? (
                <p className="text-sm text-white-dark">Loading…</p>
            ) : visible.length === 0 ? (
                <p className="text-sm text-[#5d6375]">No suggestions right now. They appear when a case has no driver, or a driver heading to a customer is running late and someone free is closer.</p>
            ) : (
                <div className={compact ? 'space-y-2' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'}>
                    {visible.slice(0, compact ? 3 : 9).map((r, i) => (
                        <div key={suggestionKey(r)} className="rounded-2xl bg-white p-4 dark:bg-black">
                            <div className="flex items-start gap-2">
                                <span className="flex h-6 min-w-[26px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{String(i + 1).padStart(2, '0')}</span>
                                <div className="min-w-0 font-semibold leading-snug">
                                    {r.kind === 'assign' ? `Assign ${r.case.fileNumber} to ${r.proposed.name}` : `Move ${r.case.fileNumber} to ${r.proposed.name}`}
                                </div>
                            </div>
                            {!compact && (
                                <p className="mt-2 text-sm text-[#5d6375]">
                                    {r.kind === 'assign'
                                        ? `No driver for ${formatMinutes(r.case.minutesInStatus)}. ${r.proposed.name} is ${r.proposed.km} km from the pickup and free.`
                                        : `${r.current?.name} is ${formatMinutes(r.current?.minutes)} away; ${r.proposed.name} is ${r.proposed.km} km away and free.`}
                                </p>
                            )}
                            <span className="mt-2 inline-block rounded-full bg-[#ecfdf3] px-2.5 py-0.5 text-xs font-semibold text-success">
                                {r.kind === 'reassign' ? `Saves ~${r.savesMinutes} min` : `${r.proposed.km} km · ~${r.proposed.minutes} min away`}
                            </span>
                            <div className="mt-3 flex items-center gap-2">
                                {can('dispatch.approve') && <button type="button" className="btn btn-dark btn-sm" onClick={() => onOpen(r)}>Approve</button>}
                                <Link to={`/openbooking/${r.case._id}`} className="btn btn-outline-dark btn-sm">Review</Link>
                                <button type="button" className="ml-auto text-xs font-semibold text-[#8a90a2] hover:text-brand" onClick={() => dismiss(r)}>Dismiss</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SuggestionsPanel;
