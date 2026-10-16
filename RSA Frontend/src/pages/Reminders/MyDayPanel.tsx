import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReminderForm from './ReminderForm';
import { MyHome, Reminder, deleteReminder, dueLabel, fetchMyHome, setReminderDone, snoozeReminder, updateWorkTask } from './remindersApi';

const inr = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

/** Dashboard card: today's tasks, reminders and the person's own pending items. */
const MyDayPanel: React.FC<{ refreshKey?: number }> = ({ refreshKey = 0 }) => {
    const [data, setData] = useState<MyHome | null>(null);
    const [error, setError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Reminder | null>(null);
    const [busy, setBusy] = useState('');

    const load = useCallback(async () => {
        try {
            setData(await fetchMyHome());
            setError('');
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not load your tasks');
        }
    }, []);

    useEffect(() => {
        load();
        const t = window.setInterval(load, 60000);
        return () => window.clearInterval(t);
    }, [load, refreshKey]);

    const act = async (key: string, fn: () => Promise<unknown>) => {
        setBusy(key);
        try { await fn(); await load(); } catch (e: any) { setError(e?.response?.data?.message || 'Could not update'); } finally { setBusy(''); }
    };

    const now = Date.now();
    const tasks = data?.work?.works || [];
    const reminders = data?.reminders || [];

    return (
        <div className="panel !p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h5 className="font-semibold text-base">My day</h5>
                    <p className="text-[11px] text-white-dark">Tasks, reminders and things waiting on you</p>
                </div>
                <button type="button" className="btn btn-primary btn-sm !py-1" onClick={() => { setEditing(null); setFormOpen(true); }}>+ Reminder</button>
            </div>

            {error && <p className="text-danger text-xs mb-2">{error}</p>}

            {/* Pending on me */}
            {data && (data.cashInHand > 0 || data.myUnverifiedCompleted > 0 || data.myOpenBookings.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {data.cashInHand > 0 && <span className="badge bg-danger/10 text-danger rounded-full text-xs">Cash in hand {inr(data.cashInHand)}</span>}
                    {data.myOpenBookings.length > 0 && <Link to="/operations" className="badge bg-warning/15 text-warning rounded-full text-xs">{data.myOpenBookings.length} of my bookings open</Link>}
                    {data.myUnverifiedCompleted > 0 && <span className="badge bg-info/15 text-info rounded-full text-xs">{data.myUnverifiedCompleted} completed, not verified</span>}
                </div>
            )}

            {/* Tasks */}
            {data?.work && tasks.length > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-white-dark mb-1">
                        <span>TODAY'S TASKS</span>
                        <span>{data.work.completed}/{data.work.total} done</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white-light dark:bg-[#1b2e4b] mb-2 overflow-hidden">
                        <div className="h-full bg-success transition-all" style={{ width: `${data.work.total ? (data.work.completed / data.work.total) * 100 : 0}%` }} />
                    </div>
                    <ul className="space-y-1 max-h-48 overflow-auto pr-1">
                        {tasks.map((t, i) => {
                            const done = t.status === 'completed';
                            return (
                                <li key={i}>
                                    <label className={`flex items-start gap-2 text-sm cursor-pointer rounded px-1 py-0.5 hover:bg-white-light/40 dark:hover:bg-[#1b2e4b] ${done ? 'line-through text-white-dark' : ''}`}>
                                        <input type="checkbox" className="form-checkbox mt-0.5" checked={done} disabled={busy === `t${i}`}
                                            onChange={() => act(`t${i}`, () => updateWorkTask(data.work!._id, i, done ? 'pending' : 'completed'))} />
                                        <span className="flex-1">{t.taskName}{t.time ? <span className="text-[11px] text-white-dark ltr:ml-1"> · {t.time}</span> : null}</span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Reminders */}
            <div className="flex items-center justify-between text-xs font-semibold text-white-dark mb-1">
                <span>REMINDERS</span>
                <Link to="/reminders" className="text-primary normal-case font-normal">See all</Link>
            </div>
            {!data ? (
                <p className="text-sm text-white-dark py-4 text-center">Loading…</p>
            ) : reminders.length === 0 ? (
                <p className="text-sm text-white-dark py-4 text-center">Nothing to remember. Add a reminder for follow-ups, payments or calls.</p>
            ) : (
                <ul className="space-y-1.5 overflow-auto max-h-72 pr-1">
                    {reminders.slice(0, 12).map((r) => {
                        const late = new Date(r.dueAt).getTime() < now;
                        return (
                            <li key={r._id} className={`group rounded-md border px-2 py-1.5 text-sm ${late ? 'border-danger/40 bg-danger/5' : 'border-white-light dark:border-[#1b2e4b]'}`}>
                                <div className="flex items-start gap-2">
                                    <input type="checkbox" className="form-checkbox mt-0.5" aria-label="Mark done" disabled={busy === r._id} onChange={() => act(r._id, () => setReminderDone(r._id, true))} />
                                    <button type="button" className="flex-1 text-left min-w-0" onClick={() => { setEditing(r); setFormOpen(true); }}>
                                        <span className={`block truncate ${r.priority === 'high' ? 'font-semibold' : ''}`}>{r.priority === 'high' && <span className="text-danger">! </span>}{r.title}</span>
                                        <span className={`text-[11px] ${late ? 'text-danger font-semibold' : 'text-white-dark'}`}>
                                            {dueLabel(r.dueAt)}{r.repeat !== 'none' ? ` · repeats ${r.repeat}` : ''}{r.fileNumber ? ` · ${r.fileNumber}` : ''}
                                            {r.assignedToName ? ` · for ${r.assignedToName}` : ''}
                                        </span>
                                    </button>
                                    <div className="flex gap-1 opacity-70 group-hover:opacity-100">
                                        <button type="button" className="text-[11px] text-primary" title="Snooze 1 hour" onClick={() => act(r._id, () => snoozeReminder(r._id, 60))}>+1h</button>
                                        <button type="button" className="text-[11px] text-danger" title="Delete" onClick={() => window.confirm('Delete this reminder?') && act(r._id, () => deleteReminder(r._id))}>✕</button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            <ReminderForm open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={load} />
        </div>
    );
};

export default MyDayPanel;
