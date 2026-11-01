import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import { BASE_URL } from '../../config/axiosConfig';
import AdminOnly, { PageTitle, authHeader, fmtBytes, fmtDateTime } from './AdminOnly';

type BackupSet = { set: string; files: { name: string; bytes: number }[]; at: number };
type Run = { _id: string; set: string; reason: string; ok: boolean; error?: string; files: number; bytes?: number; seconds: number; by: string; at: string };

const setLabel = (s: string) => {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(-.*)?$/);
    if (!m) return s;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+05:30`);
    return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}${m[6] ? ' · manual' : ' · monthly'}`;
};

const Backups: React.FC = () => {
    const dispatch = useDispatch();
    const [sets, setSets] = useState<BackupSet[] | null>(null);
    const [runs, setRuns] = useState<Run[]>([]);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState('');
    const [open, setOpen] = useState('');
    const [info, setInfo] = useState({ schedule: '', keep: 12 });

    useEffect(() => {
        dispatch(setPageTitle('Backups'));
    }, [dispatch]);
    const load = () =>
        axios
            .get(`${BASE_URL}/backups`, authHeader())
            .then((r) => {
                setSets(r.data?.sets || []);
                setRuns(r.data?.runs || []);
                setRunning(!!r.data?.running);
                setError(r.data?.error || '');
                setInfo({ schedule: r.data?.schedule || '', keep: r.data?.keep || 12 });
            })
            .catch(() => setError('Could not load backups'));
    useEffect(() => {
        load();
    }, []);
    useEffect(() => {
        if (!running) return;
        const t = window.setInterval(load, 15000);
        return () => window.clearInterval(t);
    }, [running]);

    const runNow = async () => {
        const ok = await Swal.fire({ title: 'Back up everything now?', text: 'All data is copied to the private backup folder on the media server. It takes a few minutes and changes nothing.', showCancelButton: true, confirmButtonText: 'Start backup' });
        if (!ok.isConfirmed) return;
        try {
            await axios.post(`${BASE_URL}/backups/run`, {}, authHeader());
            setRunning(true);
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Backup started', showConfirmButton: false, timer: 2500 });
        } catch (e: any) {
            Swal.fire('Not started', e?.response?.data?.message || 'Could not start the backup', 'warning');
        }
    };

    const download = async (set: string, file: string) => {
        try {
            const r = await axios.get(`${BASE_URL}/backups/${set}/${file}`, { ...authHeader(), responseType: 'blob' });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${set}-${file}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        } catch {
            Swal.fire('Download failed', 'Could not fetch the file from the media server', 'error');
        }
    };

    const last = runs[0];
    return (
        <AdminOnly>
            <div className="space-y-5">
                <PageTitle
                    eyebrow="Admin tools / Backups"
                    title="Backups"
                    sub={<>A full copy of the data is saved automatically on the 1st of every month, plus an Excel file of that month's bookings and expenses. The newest {info.keep} are kept, in a private folder on the media server that can't be opened by a web address.</>}
                    actions={<button type="button" className="btn btn-primary" onClick={runNow} disabled={running}>{running ? 'Backup running…' : 'Back up now'}</button>}
                />
                {error && <div className="rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">The media server didn't answer: {error}. Check that <code>api/backup.php</code> is uploaded to the media site.</div>}
                {last && (
                    <div className={`rounded-2xl px-4 py-3 text-sm ${last.ok ? 'bg-success/10 text-success' : 'bg-brand-soft text-brand'}`}>
                        Last backup: <b>{fmtDateTime(last.at)}</b> — {last.ok ? `${last.files} files, ${fmtBytes(last.bytes)}, ${last.seconds}s` : `failed: ${last.error}`}
                    </div>
                )}
                <div className="panel !p-0 overflow-hidden">
                    {!sets ? (
                        <p className="p-8 text-center text-sm text-white-dark">Loading…</p>
                    ) : sets.length === 0 ? (
                        <p className="p-8 text-center text-sm text-white-dark">No backups yet. Click “Back up now” to make the first one.</p>
                    ) : (
                        <ul className="divide-y divide-[#eceef2] dark:divide-[#1b2e4b]">
                            {sets.map((s) => {
                                const total = s.files.reduce((a, f) => a + f.bytes, 0);
                                const excel = s.files.find((f) => f.name.endsWith('.xlsx'));
                                return (
                                    <li key={s.set} className="px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold">{setLabel(s.set)}</div>
                                                <div className="text-xs text-[#8a90a2]">{s.files.length} files · {fmtBytes(total)}</div>
                                            </div>
                                            {excel && <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => download(s.set, excel.name)}>⬇ Excel ({excel.name.replace('export-', '').replace('.xlsx', '')})</button>}
                                            <button type="button" className="text-xs font-semibold text-primary" onClick={() => setOpen(open === s.set ? '' : s.set)}>{open === s.set ? 'Hide files' : 'All files'}</button>
                                        </div>
                                        {open === s.set && (
                                            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                                {s.files.map((f) => (
                                                    <button key={f.name} type="button" onClick={() => download(s.set, f.name)} className="flex items-center justify-between rounded-xl bg-[#f5f6f8] px-3 py-2 text-left text-xs hover:bg-primary-light dark:bg-[#1a2941]/50">
                                                        <span className="truncate font-mono">{f.name}</span>
                                                        <span className="ml-2 shrink-0 text-[#8a90a2]">{fmtBytes(f.bytes)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <p className="text-xs text-[#8a90a2]">The .json.gz files hold every record exactly as stored (one per line), for restoring with <code>mongoimport</code>. The Excel file is for reading. Downloads go through the backend with your admin login.</p>
            </div>
        </AdminOnly>
    );
};

export default Backups;
