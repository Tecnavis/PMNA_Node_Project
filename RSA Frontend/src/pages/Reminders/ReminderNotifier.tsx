import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { listReminders, setReminderDone, snoozeReminder } from './remindersApi';

/**
 * Mounted once in the layout: every minute, pops up reminders that just became due.
 * Each reminder pops up once per browser tab session (snoozing makes it pop up again later).
 */
const ReminderNotifier = () => {
    const shown = useRef<Set<string>>(new Set());
    const navigate = useNavigate();

    useEffect(() => {
        let stopped = false;
        const check = async () => {
            if (!localStorage.getItem('token') || document.hidden) return;
            try {
                const rows = await listReminders('open');
                const now = Date.now();
                const due = rows.filter((r) => new Date(r.dueAt).getTime() <= now && !shown.current.has(`${r._id}:${r.dueAt}`));
                for (const r of due.slice(0, 3)) {
                    if (stopped) return;
                    shown.current.add(`${r._id}:${r.dueAt}`);
                    const res = await Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: r.priority === 'high' ? 'warning' : 'info',
                        title: r.title,
                        text: [r.fileNumber, r.note].filter(Boolean).join(' · ') || 'Reminder',
                        showConfirmButton: true,
                        confirmButtonText: 'Done',
                        showDenyButton: true,
                        denyButtonText: 'Snooze 15 min',
                        showCancelButton: true,
                        cancelButtonText: 'Open list',
                        timer: 60000,
                        timerProgressBar: true,
                    });
                    if (res.isConfirmed) await setReminderDone(r._id, true).catch(() => undefined);
                    else if (res.isDenied) await snoozeReminder(r._id, 15).catch(() => undefined);
                    else if (res.dismiss === Swal.DismissReason.cancel) navigate('/reminders');
                }
            } catch {
                /* offline or logged out — try again next minute */
            }
        };
        const first = window.setTimeout(check, 4000);
        const t = window.setInterval(check, 60000);
        return () => { stopped = true; window.clearTimeout(first); window.clearInterval(t); };
    }, [navigate]);

    return null;
};

export default ReminderNotifier;
