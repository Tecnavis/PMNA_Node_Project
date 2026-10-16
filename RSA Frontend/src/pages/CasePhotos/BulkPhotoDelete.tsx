import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';

type Option = { value: string; label: string };
type Preview = { company: string; bookings: number; bookingsWithPhotos: number; images: number; perKind: { kind: string; label: string; count: number }[]; sample: string[] };
type Job = {
    _id: string; status: 'running' | 'done' | 'failed'; createdAt: string; finishedAt?: string; requestedByName?: string; error?: string;
    filter: { companyName?: string; from: string; to: string; kinds: string[] };
    bookings: number; bookingsDone: number; imagesFound: number; imagesDeleted: number; imagesFailed: number;
};

const KINDS: Option[] = [
    { value: 'pickup', label: 'Pickup photos' },
    { value: 'dropoff', label: 'Drop-off photos' },
    { value: 'inventory', label: 'Inventory photo' },
    { value: 'cancel', label: 'Cancel photo' },
    { value: 'paymentQr', label: 'Payment QR' },
];

/** Admin: delete case photos of one company for a date range (closed bookings only). */
const BulkPhotoDelete: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const [companies, setCompanies] = useState<Option[]>([]);
    const [company, setCompany] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [kinds, setKinds] = useState<string[]>(KINDS.map((k) => k.value));
    const [preview, setPreview] = useState<Preview | null>(null);
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [jobs, setJobs] = useState<Job[]>([]);
    const poll = useRef<number | undefined>();
    const isAdmin = (localStorage.getItem('role') || '').toLowerCase() === 'admin';

    const loadJobs = () => axios.get(`${BASE_URL}/media/bulk-delete/jobs`).then((r) => setJobs(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => undefined);

    useEffect(() => {
        if (!open) return;
        axios.get(`${BASE_URL}/reports/options`).then((r) => setCompanies(Array.isArray(r.data?.companies) ? r.data.companies : [])).catch(() => setCompanies([]));
        loadJobs();
        return () => window.clearInterval(poll.current);
    }, [open]);

    // keep progress fresh while a delete is running
    useEffect(() => {
        window.clearInterval(poll.current);
        if (open && jobs.some((j) => j.status === 'running')) poll.current = window.setInterval(loadJobs, 3000);
        return () => window.clearInterval(poll.current);
    }, [open, jobs]);

    useEffect(() => { setPreview(null); setConfirm(''); }, [company, from, to, kinds]);

    if (!open) return null;

    const body = () => ({ company, from, to, kinds });
    const doPreview = async () => {
        setError('');
        setBusy(true);
        try {
            const r = await axios.post(`${BASE_URL}/media/bulk-delete/preview`, body());
            setPreview(r.data);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not check the photos');
        } finally { setBusy(false); }
    };
    const doDelete = async () => {
        setError('');
        setBusy(true);
        try {
            await axios.post(`${BASE_URL}/media/bulk-delete/start`, { ...body(), confirm });
            setPreview(null);
            setConfirm('');
            await loadJobs();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not start');
        } finally { setBusy(false); }
    };
    const toggleKind = (k: string) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div role="dialog" aria-modal="true" aria-labelledby="bulk-title" className="panel w-full max-w-2xl mt-10 !p-5 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 id="bulk-title" className="text-lg font-semibold">Bulk delete case photos</h3>
                    <button type="button" className="text-xl text-white-dark" onClick={onClose} aria-label="Close">×</button>
                </div>
                <div className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm">
                    Deletes the photo files from the media server for <b>one company</b> and a <b>date range</b> (date = when the booking was made).
                    Only <b>completed / cancelled / rejected</b> bookings are touched, including Old Bookings. Bookings, amounts and history are kept;
                    the booking just shows "photos removed". <b>This cannot be undone.</b> Photos from the last 30 days are protected.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block sm:col-span-3">
                        <span className="text-sm font-medium">Company</span>
                        <select className="form-select mt-1" value={company} onChange={(e) => setCompany(e.target.value)}>
                            <option value="">Choose a company…</option>
                            {companies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">From</span>
                        <input type="date" className="form-input mt-1" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">To</span>
                        <input type="date" className="form-input mt-1" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                    </label>
                    <div className="flex items-end">
                        <button type="button" className="btn btn-outline-primary w-full" disabled={busy || !company || !from || !to || !kinds.length} onClick={doPreview}>
                            {busy && !preview ? 'Checking…' : 'Check photos'}
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {KINDS.map((k) => (
                        <label key={k.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" className="form-checkbox" checked={kinds.includes(k.value)} onChange={() => toggleKind(k.value)} />{k.label}
                        </label>
                    ))}
                </div>

                {error && <p className="text-danger text-sm" role="alert">{error}</p>}

                {preview && (
                    <div className="rounded-md border border-white-light dark:border-[#1b2e4b] p-3 space-y-2">
                        <div className="text-sm">
                            <b>{preview.company}</b>: {preview.bookings} closed bookings, <b>{preview.bookingsWithPhotos}</b> with photos —{' '}
                            <b className="text-danger">{preview.images} photos</b> would be deleted.
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {preview.perKind.map((k) => <span key={k.kind} className="badge bg-white-light/60 dark:bg-[#1b2e4b] text-dark dark:text-white-light">{k.label}: {k.count}</span>)}
                        </div>
                        {preview.sample.length > 0 && <div className="text-xs text-white-dark">For example: {preview.sample.join(', ')}</div>}
                        {preview.images > 0 && (isAdmin ? (
                            <div className="flex flex-wrap items-end gap-2 pt-2">
                                <label className="block flex-1 min-w-[200px]">
                                    <span className="text-sm">Type <b>DELETE</b> to confirm</span>
                                    <input className="form-input mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
                                </label>
                                <button type="button" className="btn btn-danger" disabled={busy || confirm !== 'DELETE'} onClick={doDelete}>Delete {preview.images} photos</button>
                            </div>
                        ) : <p className="text-sm text-white-dark">Only the admin can delete photos.</p>)}
                    </div>
                )}

                <div>
                    <h4 className="font-semibold text-sm mb-2">Recent photo deletes</h4>
                    {jobs.length === 0 ? <p className="text-sm text-white-dark">None yet.</p> : (
                        <ul className="space-y-1.5 text-sm max-h-60 overflow-auto pr-1">
                            {jobs.map((j) => (
                                <li key={j._id} className="rounded border border-white-light dark:border-[#1b2e4b] px-2 py-1.5">
                                    <div className="flex justify-between gap-2">
                                        <span><b>{j.filter.companyName || 'Company'}</b> · {j.filter.from} → {j.filter.to}</span>
                                        <span className={j.status === 'done' ? 'text-success' : j.status === 'failed' ? 'text-danger' : 'text-info'}>
                                            {j.status === 'running' ? `Deleting… ${j.bookingsDone}/${j.bookings}` : j.status === 'done' ? 'Done' : 'Stopped'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-white-dark">
                                        {j.imagesDeleted} deleted{j.imagesFailed ? ` · ${j.imagesFailed} could not be deleted (kept)` : ''} · by {j.requestedByName || 'admin'} · {new Date(j.createdAt).toLocaleString('en-IN')}
                                        {j.error ? ` · ${j.error}` : ''}
                                    </div>
                                    {j.status === 'running' && j.bookings > 0 && (
                                        <div className="h-1.5 mt-1 rounded-full bg-white-light dark:bg-[#1b2e4b] overflow-hidden">
                                            <div className="h-full bg-danger transition-all" style={{ width: `${(j.bookingsDone / j.bookings) * 100}%` }} />
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkPhotoDelete;
