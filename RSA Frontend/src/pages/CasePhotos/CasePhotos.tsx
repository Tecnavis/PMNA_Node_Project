import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { setPageTitle } from '../../store/themeConfigSlice';
import { BASE_URL } from '../../config/axiosConfig';
import ImageGallery from '../OldBookings/ImageGallery';

type PhotoGroups = {
    pickup: string[];
    dropoff: string[];
    cancel: string[];
    inventory: string[];
    paymentQr: string[];
};

type CaseResult = {
    _id: string;
    fileNumber: string;
    customerName: string;
    vehicleNumber: string;
    status: string;
    createdAt: string;
    archived: boolean;
    photoCount: number;
    stackcpFolder: string | null;
    photos: PhotoGroups;
};

const GROUPS: { key: keyof PhotoGroups; label: string }[] = [
    { key: 'pickup', label: 'Pickup photos' },
    { key: 'dropoff', label: 'Drop-off photos' },
    { key: 'inventory', label: 'Inventory photo' },
    { key: 'cancel', label: 'Cancellation photo' },
    { key: 'paymentQr', label: 'Payment QR' },
];

const todayIST = () => format(new Date(), 'yyyy-MM-dd');
const yesterdayIST = () => format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

const CasePhotos: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [query, setQuery] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [withPhotos, setWithPhotos] = useState(true);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<CaseResult[] | null>(null);
    const [truncated, setTruncated] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Case Photos'));
    }, [dispatch]);

    const search = async (overrides?: { q?: string; from?: string; to?: string }) => {
        const q = (overrides?.q ?? query).trim();
        const from = overrides?.from ?? fromDate;
        const to = overrides?.to ?? toDate;

        if (!q && !from) {
            toast.error('Enter a case ID / vehicle number, or pick a date');
            return;
        }

        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (withPhotos) params.set('withPhotos', 'true');

        setLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/media/case-photos?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
            });
            setResults(res.data.data || []);
            setTruncated(Boolean(res.data.truncated));
        } catch (err: any) {
            if (err?.response?.status === 401) {
                toast.error('Session expired — please sign in again');
                navigate('/auth/boxed-signin');
                return;
            }
            toast.error(err?.response?.data?.message || 'Could not load case photos');
        } finally {
            setLoading(false);
        }
    };

    const quickDate = (d: string) => {
        setFromDate(d);
        setToDate('');
        search({ from: d, to: '' });
    };

    const clearAll = () => {
        setQuery('');
        setFromDate('');
        setToDate('');
        setResults(null);
        setTruncated(false);
    };

    const copyFolder = async (folder: string) => {
        try {
            await navigator.clipboard.writeText(folder);
            toast.success('Folder path copied');
        } catch {
            toast.error('Could not copy');
        }
    };

    return (
        <div className="space-y-5">
            {/* Search */}
            <div className="panel">
                <div className="mb-4">
                    <h5 className="text-lg font-semibold dark:text-white-light">Case Photos</h5>
                    <p className="text-sm text-white-dark">Find pickup, drop-off and other photos by case ID, vehicle number or date.</p>
                </div>

                <form
                    className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search();
                    }}
                >
                    <div className="md:col-span-5">
                        <label htmlFor="case-q" className="mb-1 block text-sm font-medium">
                            Case ID or vehicle number
                        </label>
                        <input
                            id="case-q"
                            type="text"
                            className="form-input"
                            placeholder="e.g. RSA-1234 or KL07AB1234"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="case-from" className="mb-1 block text-sm font-medium">
                            Date (from)
                        </label>
                        <input id="case-from" type="date" className="form-input" value={fromDate} max={todayIST()} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="case-to" className="mb-1 block text-sm font-medium">
                            To <span className="text-white-dark">(optional)</span>
                        </label>
                        <input id="case-to" type="date" className="form-input" value={toDate} min={fromDate || undefined} max={todayIST()} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                    <div className="flex gap-2 md:col-span-3">
                        <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                            {loading ? 'Searching…' : 'Search'}
                        </button>
                        <button type="button" className="btn btn-outline-secondary" onClick={clearAll} disabled={loading}>
                            Clear
                        </button>
                    </div>
                </form>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-white-dark">Quick:</span>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => quickDate(todayIST())} disabled={loading}>
                        Today
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => quickDate(yesterdayIST())} disabled={loading}>
                        Yesterday
                    </button>
                    <label className="ml-auto inline-flex cursor-pointer items-center gap-2">
                        <input type="checkbox" className="form-checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} />
                        <span>Only cases that have photos</span>
                    </label>
                </div>
            </div>

            {/* Results */}
            {results !== null && (
                <div className="space-y-4">
                    <p className="text-sm text-white-dark">
                        {results.length === 0
                            ? 'No matching cases.'
                            : `${results.length} case${results.length === 1 ? '' : 's'} found${truncated ? ' — showing the newest 100, narrow the search to see more' : ''}.`}
                    </p>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {results.map((c) => (
                            <div key={c._id} className="panel">
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <h6 className="text-base font-semibold dark:text-white-light">{c.fileNumber || 'No case ID'}</h6>
                                        <p className="text-xs text-white-dark">
                                            {c.createdAt ? format(new Date(c.createdAt), 'dd MMM yyyy, hh:mm a') : '—'}
                                            {c.customerName ? ` · ${c.customerName}` : ''}
                                            {c.vehicleNumber ? ` · ${c.vehicleNumber}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {c.status && <span className="badge badge-outline-primary">{c.status}</span>}
                                        {c.archived && <span className="badge badge-outline-secondary">Archived</span>}
                                        <span className="badge badge-outline-info">
                                            {c.photoCount} photo{c.photoCount === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                </div>

                                {c.stackcpFolder && (
                                    <div className="mb-3 flex items-center gap-2 rounded bg-gray-50 px-2 py-1 text-xs dark:bg-[#1b2e4b]">
                                        <span className="text-white-dark">StackCP folder:</span>
                                        <code className="truncate">{c.stackcpFolder}</code>
                                        <button type="button" className="ml-auto shrink-0 text-primary hover:underline" onClick={() => copyFolder(c.stackcpFolder as string)}>
                                            Copy
                                        </button>
                                    </div>
                                )}

                                {c.photoCount === 0 ? (
                                    <p className="text-sm text-white-dark">No photos for this case.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {GROUPS.filter((g) => c.photos[g.key].length > 0).map((g) => (
                                            <ImageGallery key={g.key} images={c.photos[g.key]} title={g.label} maxDisplay={6} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CasePhotos;
