import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';

/** Admin: set / change / turn off the 8-digit TV passcode. */
const TvSettings: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const isAdmin = (localStorage.getItem('role') || '').toLowerCase() === 'admin';
    const tvUrl = `${window.location.origin}${window.location.pathname}#/tv`;

    const load = () => axios.get(`${BASE_URL}/tv/settings`).then((r) => { setEnabled(!!r.data?.enabled); setUpdatedAt(r.data?.updatedAt || null); }).catch(() => setEnabled(null));
    useEffect(() => { if (open) { setMsg(null); setCode(''); load(); } }, [open]);
    if (!open) return null;

    const save = async () => {
        if (!/^\d{8}$/.test(code)) { setMsg({ ok: false, text: 'Enter exactly 8 digits.' }); return; }
        setBusy(true);
        try {
            const r = await axios.put(`${BASE_URL}/tv/passcode`, { passcode: code });
            setMsg({ ok: true, text: r.data?.message || 'Saved' });
            setCode('');
            load();
        } catch (e: any) {
            setMsg({ ok: false, text: e?.response?.data?.message || 'Could not save' });
        } finally { setBusy(false); }
    };
    const turnOff = async () => {
        if (!window.confirm('Turn off the TV screen? Every TV will be logged out.')) return;
        setBusy(true);
        try { await axios.delete(`${BASE_URL}/tv/passcode`); setMsg({ ok: true, text: 'TV screen turned off.' }); load(); }
        catch (e: any) { setMsg({ ok: false, text: e?.response?.data?.message || 'Could not turn off' }); }
        finally { setBusy(false); }
    };
    const random = () => {
        let s = '';
        while (!/^\d{8}$/.test(s) || /^(\d)\1{7}$/.test(s)) s = String(Math.floor(10000000 + Math.random() * 90000000));
        setCode(s);
    };

    return (
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div role="dialog" aria-modal="true" aria-labelledby="tv-title" className="panel w-full max-w-md mt-16 !p-5 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 id="tv-title" className="text-lg font-semibold">TV screen</h3>
                    <button type="button" className="text-xl text-white-dark" onClick={onClose} aria-label="Close">×</button>
                </div>
                <p className="text-sm text-white-dark">
                    A view-only live screen for the office TV: open cases, delays, free drivers and today's activity. Open this address on the TV and enter the passcode:
                </p>
                <div className="flex gap-2">
                    <input readOnly className="form-input text-xs" value={tvUrl} onFocus={(e) => e.target.select()} />
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigator.clipboard?.writeText(tvUrl)}>Copy</button>
                    <a className="btn btn-outline-secondary btn-sm" href="#/tv" target="_blank" rel="noreferrer">Open</a>
                </div>
                <div className="text-sm">
                    Status: {enabled === null ? '…' : enabled ? <b className="text-success">On</b> : <b className="text-danger">Off (no passcode)</b>}
                    {updatedAt && <span className="text-white-dark"> · passcode set {new Date(updatedAt).toLocaleString('en-IN')}</span>}
                </div>
                {isAdmin ? (
                    <>
                        <label className="block">
                            <span className="text-sm font-medium">{enabled ? 'New passcode (logs out all TVs)' : 'Set passcode'}</span>
                            <div className="flex gap-2 mt-1">
                                <input className="form-input tracking-[0.4em] font-mono text-lg" inputMode="numeric" maxLength={8} value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="••••••••" />
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={random}>Random</button>
                            </div>
                        </label>
                        {msg && <p className={`text-sm ${msg.ok ? 'text-success' : 'text-danger'}`} role="status">{msg.text}</p>}
                        <div className="flex justify-between gap-2">
                            {enabled ? <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={turnOff}>Turn off</button> : <span />}
                            <button type="button" className="btn btn-primary" disabled={busy || code.length !== 8} onClick={save}>{busy ? 'Saving…' : 'Save passcode'}</button>
                        </div>
                        <p className="text-xs text-white-dark">Write the passcode down — it can't be shown again, only replaced.</p>
                    </>
                ) : (
                    <p className="text-sm text-white-dark">Only the admin can set or change the passcode.</p>
                )}
            </div>
        </div>
    );
};

export default TvSettings;
