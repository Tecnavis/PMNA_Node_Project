import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import { BASE_URL } from '../../config/axiosConfig';
import AdminOnly, { PageTitle, authHeader } from './AdminOnly';

type Summary = {
    text: string;
    data: { date: string; created: number; completed: number; cancelled: number; openNow: number; delayedNow: number; bookedValue: number; cashPendingCases: number; cashPendingAmount: number; ratingAvg: number | null; ratingCount: number; lowRatings: number; failedLogins: number; topDrivers: { name: string; n: number }[] };
    sending: { recipients: string[]; whatsapp: boolean; template: string | null; schedule: string };
};
const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const cronText = (c: string) => {
    const m = c.match(/^(\d{1,2}) (\d{1,2}) \* \* \*$/);
    if (!m) return c;
    const d = new Date(2000, 0, 1, Number(m[2]), Number(m[1]));
    return `every day at ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
};

const DailySummary: React.FC = () => {
    const dispatch = useDispatch();
    const [date, setDate] = useState('');
    const [s, setS] = useState<Summary | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        dispatch(setPageTitle('Daily summary'));
    }, [dispatch]);
    useEffect(() => {
        setS(null);
        axios
            .get(`${BASE_URL}/insights/daily-summary`, { ...authHeader(), params: { date: date || undefined } })
            .then((r) => { setS(r.data); setError(''); })
            .catch(() => setError('Could not build the summary'));
    }, [date]);

    const sendNow = async () => {
        setBusy(true);
        try {
            const r = await axios.post(`${BASE_URL}/insights/daily-summary/send`, { date: date || undefined }, authHeader());
            Swal.fire('Sent', `Delivered to ${r.data.results?.map((x: any) => x.to).join(', ')}`, 'success');
        } catch (e: any) {
            const d = e?.response?.data;
            Swal.fire('Not sent', d?.reason || d?.message || 'Could not send the summary', 'warning');
        } finally {
            setBusy(false);
        }
    };

    const d = s?.data;
    const cards: [string, React.ReactNode, string?][] = d
        ? [
              ['New bookings', d.created],
              ['Completed', d.completed, 'text-success'],
              ['Cancelled', d.cancelled, d.cancelled ? 'text-brand' : ''],
              ['Open now', `${d.openNow}`, ''],
              ['Delayed now', d.delayedNow, d.delayedNow ? 'text-brand' : ''],
              ['Booked value', inr(d.bookedValue)],
              ['Cash pending', `${d.cashPendingCases} · ${inr(d.cashPendingAmount)}`, d.cashPendingCases ? 'text-warning' : ''],
              ['Customer rating', d.ratingCount ? `${d.ratingAvg}★ (${d.ratingCount})` : '—'],
          ]
        : [];

    return (
        <AdminOnly>
            <div className="space-y-5">
                <PageTitle
                    eyebrow="Admin tools / Daily summary"
                    title="Daily summary"
                    sub="The owner's evening WhatsApp message. Preview any day, or send it now."
                    actions={
                        <>
                            <input type="date" className="form-input w-44" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Day" />
                            <button type="button" className="btn btn-primary" onClick={sendNow} disabled={busy || !s}>{busy ? 'Sending…' : 'Send on WhatsApp now'}</button>
                        </>
                    }
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
                    <div className="panel">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {!d && <p className="col-span-4 py-8 text-center text-sm text-white-dark">Loading…</p>}
                            {cards.map(([label, value, tone]) => (
                                <div key={label} className="ui-soft p-3">
                                    <div className="ui-eyebrow">{label}</div>
                                    <div className={`ui-num mt-1 text-2xl ${tone || ''}`}>{value}</div>
                                </div>
                            ))}
                        </div>
                        {!!d?.topDrivers.length && (
                            <div className="mt-4">
                                <div className="ui-eyebrow mb-1">Top drivers</div>
                                <div className="flex flex-wrap gap-2">{d.topDrivers.map((t) => <span key={t.name} className="ui-chip">{t.name} · {t.n}</span>)}</div>
                            </div>
                        )}
                        {!!d && d.failedLogins >= 5 && <p className="mt-4 rounded-2xl bg-brand-soft p-3 text-sm text-brand">⚠ {d.failedLogins} failed admin-website logins this day.</p>}
                    </div>

                    <div className="space-y-5">
                        <div className="panel !border-[#25D366]/30 !bg-[#f0fbf4] dark:!bg-[#0e1726]">
                            <div className="ui-eyebrow mb-2">Message preview</div>
                            <pre className="whitespace-pre-wrap rounded-2xl bg-white p-4 font-sans text-sm leading-relaxed text-[#111318] shadow-sm dark:bg-black dark:text-white">{s?.text || '…'}</pre>
                        </div>
                        <div className="panel text-sm">
                            <div className="ui-eyebrow mb-2">Sending</div>
                            <ul className="space-y-1.5 text-[#3b4153] dark:text-white-dark">
                                <li>Schedule: <b>{s ? cronText(s.sending.schedule) : '…'}</b> (India time)</li>
                                <li>To: <b>{s?.sending.recipients.length ? s.sending.recipients.join(', ') : 'not set'}</b></li>
                                <li>WhatsApp: <b className={s?.sending.whatsapp ? 'text-success' : 'text-brand'}>{s?.sending.whatsapp ? 'connected' : 'not set up'}</b></li>
                                <li>Template: <b>{s?.sending.template || 'none (plain text)'}</b></li>
                            </ul>
                            {!!s && (!s.sending.recipients.length || !s.sending.template) && (
                                <div className="mt-3 rounded-2xl bg-[#f5f6f8] p-3 text-xs text-[#5d6375] dark:bg-[#1a2941]/50">
                                    On Render, set <code>OWNER_WHATSAPP</code> (10-digit numbers, comma separated).
                                    WhatsApp only delivers plain text if the owner messaged the business number in the last 24 hours, so for a reliable daily message
                                    create a <b>Utility</b> template in WhatsApp Manager with one variable <code>{'{{1}}'}</code> and set its name in <code>WA_SUMMARY_TEMPLATE</code>.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminOnly>
    );
};

export default DailySummary;
