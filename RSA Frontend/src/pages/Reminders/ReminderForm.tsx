import React, { useEffect, useState } from 'react';
import { Reminder, ReminderInput, createReminder, fetchStaffNames, toLocalInput, updateReminder } from './remindersApi';

type Props = {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    editing?: Reminder | null;
    /** prefill a case number (e.g. from a booking page) */
    fileNumber?: string;
};

const QUICK: { label: string; at: () => Date }[] = [
    { label: 'In 1 hour', at: () => new Date(Date.now() + 3600000) },
    { label: 'This evening', at: () => { const d = new Date(); d.setHours(18, 0, 0, 0); return d < new Date() ? new Date(Date.now() + 3600000) : d; } },
    { label: 'Tomorrow 10 AM', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; } },
    { label: 'Next week', at: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); return d; } },
];

const ReminderForm: React.FC<Props> = ({ open, onClose, onSaved, editing, fileNumber }) => {
    const [form, setForm] = useState<ReminderInput>({ title: '', dueAt: toLocalInput(QUICK[0].at()), repeat: 'none', priority: 'normal', fileNumber: '', assignedTo: '', note: '' });
    const [staff, setStaff] = useState<{ _id: string; name: string }[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        if (editing) {
            setForm({
                title: editing.title, note: editing.note || '', dueAt: toLocalInput(new Date(editing.dueAt)), repeat: editing.repeat, priority: editing.priority,
                fileNumber: editing.fileNumber || '', assignedTo: editing.assignedTo || '',
            });
        } else {
            setForm({ title: '', dueAt: toLocalInput(QUICK[0].at()), repeat: 'none', priority: 'normal', fileNumber: fileNumber || '', assignedTo: '', note: '' });
        }
        if (staff.length === 0) fetchStaffNames().then(setStaff).catch(() => setStaff([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing, fileNumber]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    const set = (k: keyof ReminderInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { setError('Write what to remember.'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = { ...form, dueAt: new Date(form.dueAt).toISOString() };
            if (editing) await updateReminder(editing._id, payload);
            else await createReminder(payload);
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Could not save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <form role="dialog" aria-modal="true" aria-labelledby="reminder-form-title" onSubmit={save}
                className="panel w-full max-w-lg mt-10 !p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 id="reminder-form-title" className="text-lg font-semibold">{editing ? 'Edit reminder' : 'New reminder'}</h3>
                    <button type="button" className="text-white-dark hover:text-dark text-xl leading-none" onClick={onClose} aria-label="Close">×</button>
                </div>
                <label className="block">
                    <span className="text-sm font-medium">Remind me to…</span>
                    <input autoFocus className="form-input mt-1" maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Call customer about drop-off photos" />
                </label>
                <div>
                    <span className="text-sm font-medium">When</span>
                    <div className="flex flex-wrap gap-1 mt-1 mb-2">
                        {QUICK.map((q) => (
                            <button key={q.label} type="button" className="btn btn-sm btn-outline-primary !py-0.5 !px-2 text-xs" onClick={() => set('dueAt', toLocalInput(q.at()))}>{q.label}</button>
                        ))}
                    </div>
                    <input type="datetime-local" className="form-input" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-sm font-medium">Repeat</span>
                        <select className="form-select mt-1" value={form.repeat} onChange={(e) => set('repeat', e.target.value)}>
                            <option value="none">Don't repeat</option>
                            <option value="daily">Every day</option>
                            <option value="weekly">Every week</option>
                            <option value="monthly">Every month</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">Priority</span>
                        <select className="form-select mt-1" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">Case / file no. <span className="text-white-dark">(optional)</span></span>
                        <input className="form-input mt-1" value={form.fileNumber} onChange={(e) => set('fileNumber', e.target.value)} placeholder="RSA-1234" />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">For</span>
                        <select className="form-select mt-1" value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
                            <option value="">Me</option>
                            {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </label>
                </div>
                <label className="block">
                    <span className="text-sm font-medium">Note <span className="text-white-dark">(optional)</span></span>
                    <textarea className="form-textarea mt-1" rows={2} maxLength={2000} value={form.note} onChange={(e) => set('note', e.target.value)} />
                </label>
                {error && <p className="text-danger text-sm" role="alert">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save reminder'}</button>
                </div>
            </form>
        </div>
    );
};

export default ReminderForm;
