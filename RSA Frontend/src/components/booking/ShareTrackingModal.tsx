import React, { useEffect, useState } from 'react';
import { TrackingLinkRow, createLink, fmtWhen, getLinks, revokeLink } from './bookingToolsApi';

type Props = { bookingId: string; open: boolean; onClose: () => void; onShared?: () => void };

const copy = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    }
};

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; title: string; hint: string }> = ({ on, onChange, title, hint }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
        <span>
            <span className="block font-semibold text-[#111318] dark:text-white">{title}</span>
            <span className="block text-xs font-normal text-[#8a90a2]">{hint}</span>
        </span>
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-primary' : 'bg-[#dfe2e8]'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
    </label>
);

/** "Share live tracking": a private link for the customer / showroom with the live map and ETA, never amounts. */
const ShareTrackingModal: React.FC<Props> = ({ bookingId, open, onClose, onShared }) => {
    const [links, setLinks] = useState<TrackingLinkRow[]>([]);
    const [customer, setCustomer] = useState<{ name: string; phones: string[] } | null>(null);
    const [picked, setPicked] = useState<Record<string, boolean>>({});
    const [extraName, setExtraName] = useState('');
    const [extraPhone, setExtraPhone] = useState('');
    const [showMap, setShowMap] = useState(true);
    const [showDriver, setShowDriver] = useState(false);
    const [expiry, setExpiry] = useState('after-delivery');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ url: string; recipients: { name: string; phone: string; whatsappUrl: string }[] } | null>(null);
    const [copied, setCopied] = useState('');

    const load = () =>
        getLinks(bookingId)
            .then((d) => {
                setLinks(d.links || []);
                setCustomer(d.customer);
                const first: Record<string, boolean> = {};
                (d.customer?.phones || []).forEach((p, i) => (first[p] = i === 0));
                setPicked(first);
            })
            .catch(() => setError('Could not load tracking links'));

    useEffect(() => {
        if (!open) return;
        setResult(null);
        setError('');
        setCopied('');
        load();
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, bookingId]);

    if (!open) return null;

    const active = links.filter((l) => l.active);
    const share = async () => {
        setBusy(true);
        setError('');
        try {
            const sendTo = [
                ...Object.entries(picked).filter(([, v]) => v).map(([phone]) => ({ name: customer?.name || 'Customer', phone })),
                ...(extraPhone.trim() ? [{ name: extraName.trim() || 'Contact', phone: extraPhone.trim() }] : []),
            ];
            const r = await createLink(bookingId, { showDriver, showMap, expiry: expiry.startsWith('h') ? 'hours' : 'after-delivery', hours: expiry.startsWith('h') ? Number(expiry.slice(1)) : undefined, sendTo });
            setResult({ url: r.link.url, recipients: r.recipients });
            setExtraName('');
            setExtraPhone('');
            load();
            onShared?.();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not create the link');
        } finally {
            setBusy(false);
        }
    };
    const doCopy = async (url: string) => {
        if (await copy(url)) {
            setCopied(url);
            window.setTimeout(() => setCopied(''), 1800);
        }
    };
    const switchOff = async (l: TrackingLinkRow) => {
        try {
            await revokeLink(bookingId, l._id);
            load();
            onShared?.();
        } catch {
            setError('Could not switch the link off');
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share live tracking">
            <div className="my-6 w-full max-w-[560px] rounded-[22px] bg-white p-5 shadow-2xl dark:bg-[#0e1726] sm:p-7" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-[26px] font-normal tracking-tight text-[#111318] dark:text-white">Share live tracking</h2>
                        <p className="mt-1 text-sm text-[#5d6375]">Send a link to this case. They see the live map and ETA — never your rates or other cases.</p>
                    </div>
                    <button type="button" className="text-2xl leading-none text-[#8a90a2] hover:text-black" onClick={onClose} aria-label="Close">×</button>
                </div>

                {result ? (
                    <div className="mt-5 space-y-3">
                        <div className="ui-eyebrow">Tracking link</div>
                        <div className="flex items-center gap-2 rounded-2xl bg-[#f5f6f8] p-2 pl-4 dark:bg-[#1a2941]/50">
                            <span className="min-w-0 flex-1 truncate font-mono text-sm">{result.url}</span>
                            <button type="button" className="btn btn-outline-dark btn-sm shrink-0" onClick={() => doCopy(result.url)}>{copied === result.url ? 'Copied ✓' : 'Copy link'}</button>
                        </div>
                        {result.recipients.length > 0 && (
                            <>
                                <div className="ui-eyebrow pt-2">Send on WhatsApp</div>
                                {result.recipients.map((r) => (
                                    <a key={r.phone} href={r.whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-[#e3e6ec] px-4 py-3 hover:border-[#25D366] dark:border-[#253b5c]">
                                        <span><b>{r.name}</b> <span className="text-sm text-[#8a90a2]">+{r.phone}</span></span>
                                        <span className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white">Open WhatsApp</span>
                                    </a>
                                ))}
                            </>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" className="btn btn-outline-dark" onClick={() => setResult(null)}>Share another</button>
                            <button type="button" className="btn btn-dark" onClick={onClose}>Done</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="ui-eyebrow mt-5 mb-2">Send to</div>
                        <div className="divide-y divide-[#eceef2] rounded-2xl border border-[#e3e6ec] px-4 dark:divide-[#1b2e4b] dark:border-[#253b5c]">
                            {(customer?.phones || []).map((ph) => (
                                <label key={ph} className="flex cursor-pointer items-center gap-3 py-3">
                                    <input type="checkbox" className="form-checkbox" checked={!!picked[ph]} onChange={(e) => setPicked((x) => ({ ...x, [ph]: e.target.checked }))} />
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">{(customer?.name || 'C').slice(0, 1).toUpperCase()}</span>
                                    <span>
                                        <span className="block font-semibold">{customer?.name || 'Customer'}</span>
                                        <span className="block text-xs text-[#8a90a2]">Customer · {ph}</span>
                                    </span>
                                </label>
                            ))}
                            <div className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_1fr]">
                                <input className="form-input form-input-sm" placeholder="Add name (showroom, staff…)" value={extraName} onChange={(e) => setExtraName(e.target.value)} aria-label="Name" />
                                <input className="form-input form-input-sm" placeholder="Phone number" inputMode="tel" value={extraPhone} onChange={(e) => setExtraPhone(e.target.value)} aria-label="Phone" />
                            </div>
                        </div>

                        <div className="ui-eyebrow mt-5 mb-1">What they can see</div>
                        <div className="divide-y divide-[#eceef2] rounded-2xl bg-[#f5f6f8] px-4 dark:divide-[#1b2e4b] dark:bg-[#1a2941]/50">
                            <Toggle on={showMap} onChange={setShowMap} title="Live map and ETA" hint="Updates every minute while the driver's GPS is on" />
                            <Toggle on={showDriver} onChange={setShowDriver} title="Driver name and phone" hint="Off by default for driver privacy" />
                        </div>

                        <div className="ui-eyebrow mt-5 mb-1">Link expires</div>
                        <select className="form-select" value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label="Link expires">
                            <option value="after-delivery">24 hours after the case is completed</option>
                            <option value="h6">In 6 hours</option>
                            <option value="h24">In 24 hours</option>
                            <option value="h72">In 3 days</option>
                        </select>

                        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={share} disabled={busy}>{busy ? 'Creating…' : 'Create link'}</button>
                        </div>
                    </>
                )}

                {links.length > 0 && (
                    <div className="mt-6 border-t border-[#eceef2] pt-4 dark:border-[#1b2e4b]">
                        <div className="ui-eyebrow mb-2">Links for this case · {active.length} active</div>
                        <ul className="space-y-2">
                            {links.slice(0, 6).map((l) => (
                                <li key={l._id} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f5f6f8] px-3 py-2 text-xs dark:bg-[#1a2941]/50">
                                    <span className={`h-2 w-2 rounded-full ${l.active ? 'bg-success' : 'bg-[#b9bdc9]'}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{l.sentTo?.length ? l.sentTo.map((s) => s.name || s.phone).join(', ') : 'Link only'}</span>
                                        <span className="text-[#8a90a2]">
                                            {fmtWhen(l.createdAt)}
                                            {l.createdBy ? ` · ${l.createdBy}` : ''} · {l.views} view{l.views === 1 ? '' : 's'}
                                            {l.show.driver ? ' · driver shown' : ''}
                                            {!l.active ? (l.revokedAt ? ' · switched off' : ' · expired') : ''}
                                        </span>
                                    </span>
                                    {l.active && (
                                        <>
                                            <button type="button" className="font-semibold text-primary" onClick={() => doCopy(l.url)}>{copied === l.url ? 'Copied ✓' : 'Copy'}</button>
                                            <button type="button" className="font-semibold text-danger" onClick={() => switchOff(l)}>Switch off</button>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareTrackingModal;
