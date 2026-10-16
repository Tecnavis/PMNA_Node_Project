import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';

/** "Closed bookings older than a year move here every night" + Move now (admin). */
const OneYearStrip: React.FC<{ onMoved: () => void }> = ({ onMoved }) => {
    const [info, setInfo] = useState<{ count: number; days: number; cutoff: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const isAdmin = (localStorage.getItem('role') || '').toLowerCase() === 'admin';

    const load = () => axios.get(`${BASE_URL}/archive/one-year/preview`).then((r) => setInfo(r.data)).catch(() => setInfo(null));
    useEffect(() => { load(); }, []);

    const run = async () => {
        if (!window.confirm(`Move ${info?.count} closed bookings older than a year to Old Bookings now? Nothing is deleted.`)) return;
        setBusy(true);
        setMsg('');
        try {
            const r = await axios.post(`${BASE_URL}/archive/one-year/run`);
            setMsg(r.data?.message || 'Done');
            load();
            onMoved();
        } catch (e: any) {
            setMsg(e?.response?.data?.message || 'Could not move the bookings');
        } finally {
            setBusy(false);
        }
    };

    if (!info) return null;
    return (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <span>
                Completed, cancelled and rejected bookings older than <b>{Math.round(info.days / 30.4)} months</b> move here automatically every night (cash-pending ones stay).
                {info.count > 0 ? <> <b>{info.count}</b> waiting to move.</> : ' Nothing waiting.'}
            </span>
            {isAdmin && info.count > 0 && (
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={run}>{busy ? 'Moving…' : 'Move now'}</button>
            )}
            {msg && <span className="font-semibold">{msg}</span>}
        </div>
    );
};

export default OneYearStrip;
