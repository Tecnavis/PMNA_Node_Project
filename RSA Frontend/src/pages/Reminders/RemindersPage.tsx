import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import ReminderForm from './ReminderForm';
import { Reminder, deleteReminder, dueLabel, listReminders, setReminderDone, snoozeReminder } from './remindersApi';

const RemindersPage: React.FC = () => {
    const dispatch = useDispatch();
    useEffect(() => { dispatch(setPageTitle('Reminders')); }, [dispatch]);
    const isAdmin = (localStorage.getItem('role') || '').toLowerCase() === 'admin';

    const [status, setStatus] = useState<'open' | 'done'>('open');
    const [everyone, setEveryone] = useState(false);
    const [rows, setRows] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Reminder | null>(null);
    const [q, setQ] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setRows(await listReminders(status, everyone ? 'all' : undefined));
            setError('');
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not load reminders');
        } finally {
            setLoading(false);
        }
    }, [status, everyone]);
    useEffect(() => { load(); }, [load]);

    const act = async (fn: () => Promise<unknown>) => {
        try { await fn(); await load(); } catch (e: any) { setError(e?.response?.data?.message || 'Could not update'); }
    };

    const groups = useMemo(() => {
        const now = new Date();
        const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
        const endWeek = new Date(endToday); endWeek.setDate(endWeek.getDate() + 7);
        const list = rows.filter((r) => !q || `${r.title} ${r.note || ''} ${r.fileNumber || ''} ${r.assignedToName || ''} ${r.createdByName || ''}`.toLowerCase().includes(q.toLowerCase()));
        if (status === 'done') return [{ title: 'Done', items: list }];
        return [
            { title: 'Overdue', items: list.filter((r) => new Date(r.dueAt) < now), tone: 'text-danger' },
            { title: 'Today', items: list.filter((r) => new Date(r.dueAt) >= now && new Date(r.dueAt) <= endToday) },
            { title: 'Next 7 days', items: list.filter((r) => new Date(r.dueAt) > endToday && new Date(r.dueAt) <= endWeek) },
            { title: 'Later', items: list.filter((r) => new Date(r.dueAt) > endWeek) },
        ].filter((g) => g.items.length);
    }, [rows, status, q]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold dark:text-white-light">Reminders</h2>
                    <p className="text-xs text-white-dark">Follow-ups, calls, payments and renewals. Due reminders pop up on any page.</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>+ New reminder</button>
            </div>
            <div className="panel !p-3 flex flex-wrap items-center gap-2">
                {(['open', 'done'] as const).map((s) => (
                    <button key={s} type="button" className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setStatus(s)}>{s === 'open' ? 'To do' : 'Done'}</button>
                ))}
                {isAdmin && (
                    <label className="flex items-center gap-2 text-sm ltr:ml-2">
                        <input type="checkbox" className="form-checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} /> Everyone's reminders
                    </label>
                )}
                <input className="form-input form-input-sm w-full sm:w-64 ltr:sm:ml-auto" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            {loading && rows.length === 0 ? (
                <div className="panel text-center text-white-dark py-10">Loading…</div>
            ) : groups.length === 0 ? (
                <div className="panel text-center text-white-dark py-10">{status === 'open' ? 'Nothing pending. 🎉' : 'No finished reminders yet.'}</div>
            ) : groups.map((g) => (
                <div key={g.title} className="panel !p-3">
                    <h6 className={`font-semibold text-sm mb-2 ${(g as any).tone || ''}`}>{g.title} <span className="text-white-dark font-normal">({g.items.length})</span></h6>
                    <ul className="divide-y divide-white-light dark:divide-[#1b2e4b]">
                        {g.items.map((r) => (
                            <li key={r._id} className="flex flex-wrap items-center gap-3 py-2">
                                <input type="checkbox" className="form-checkbox" checked={r.done} aria-label={r.done ? 'Mark not done' : 'Mark done'} onChange={() => act(() => setReminderDone(r._id, !r.done))} />
                                <button type="button" className="flex-1 min-w-[200px] text-left" onClick={() => { setEditing(r); setFormOpen(true); }}>
                                    <div className={`text-sm ${r.priority === 'high' ? 'font-semibold' : ''} ${r.done ? 'line-through text-white-dark' : ''}`}>{r.priority === 'high' && <span className="text-danger">! </span>}{r.title}</div>
                                    <div className="text-[11px] text-white-dark">
                                        {r.done ? `Done ${r.doneAt ? new Date(r.doneAt).toLocaleString('en-IN') : ''}${r.doneByName ? ' by ' + r.doneByName : ''}` : dueLabel(r.dueAt)}
                                        {r.repeat !== 'none' ? ` · repeats ${r.repeat}` : ''}{r.fileNumber ? ` · ${r.fileNumber}` : ''}
                                        {r.assignedToName ? ` · for ${r.assignedToName}` : ''}{r.createdByName ? ` · by ${r.createdByName}` : ''}
                                    </div>
                                    {r.note && <div className="text-xs text-white-dark mt-0.5 line-clamp-2">{r.note}</div>}
                                </button>
                                {!r.done && (
                                    <div className="flex gap-1">
                                        <button type="button" className="btn btn-sm btn-outline-secondary !py-0.5 !px-2" onClick={() => act(() => snoozeReminder(r._id, 60))}>+1 h</button>
                                        <button type="button" className="btn btn-sm btn-outline-secondary !py-0.5 !px-2" onClick={() => act(() => snoozeReminder(r._id, 60 * 24))}>Tomorrow</button>
                                    </div>
                                )}
                                <button type="button" className="btn btn-sm btn-outline-danger !py-0.5 !px-2" onClick={() => window.confirm('Delete this reminder?') && act(() => deleteReminder(r._id))}>Delete</button>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            <ReminderForm open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={load} />
        </div>
    );
};

export default RemindersPage;
