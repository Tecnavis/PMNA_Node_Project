// Search any booking from any page: case id / file number, vehicle number, mobile,
// invoice number or customer name, on any date (also Old Bookings).
// Each result offers the pages where the next step happens: amount, invoice, edit, report.
// Shortcut: press "/" or Ctrl+K to jump into the box.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../config/axiosConfig';
import { canPage } from '../utils/access';

type Hit = {
    _id: string;
    fileNumber?: string;
    customerVehicleNumber?: string;
    customerName?: string;
    mob1?: string;
    status?: string;
    workType?: string;
    company?: { _id: string; name?: string } | null;
    driver?: { _id: string; name?: string } | null;
    provider?: { _id: string; name?: string } | null;
    showroom?: { _id: string; name?: string } | null;
    totalAmount?: number;
    receivedAmountByCompany?: number;
    invoiceNumber?: string;
    approve?: boolean;
    accountantVerified?: boolean;
    createdAt?: string;
    source?: 'live' | 'archived' | 'oldBookings';
};

const money = (n?: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '');
const withSearch = (path: string, text: string, extra = '') => `${path}?search=${encodeURIComponent(text)}${extra}`;

export default function GlobalSearch() {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [hits, setHits] = useState<Hit[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const reqId = useRef(0);

    // "/" or Ctrl+K focuses the search box from anywhere
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;
            if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        const onClick = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClick);
        };
    }, []);

    useEffect(() => {
        const text = q.trim();
        setError('');
        if (text.length < 3) {
            setHits([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const id = ++reqId.current;
        const t = setTimeout(async () => {
            try {
                const res = await axiosInstance.get('/booking/lookup', { params: { q: text } });
                if (id === reqId.current) setHits(res.data?.results || []);
            } catch {
                if (id === reqId.current) {
                    setHits([]);
                    setError('Search failed. Please try again.');
                }
            } finally {
                if (id === reqId.current) setLoading(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [q]);

    const go = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    // The pages where staff continue with this booking
    const actions = (b: Hit) => {
        const key = String(b.fileNumber || b.customerVehicleNumber || '').trim();
        const list: { label: string; path: string; primary?: boolean }[] = [];
        if (b.source === 'oldBookings') {
            if (canPage('/oldBookings')) list.push({ label: 'Old Bookings', path: withSearch('/oldBookings', key), primary: true });
            return list;
        }
        if (b.company?._id && canPage('/company-report/:id'))
            list.push({ label: 'Company report · amount & invoice', path: withSearch(`/company-report/${b.company._id}`, key, '&allDates=1'), primary: true });
        if (canPage('/openbooking/:id')) list.push({ label: 'Open booking', path: `/openbooking/${b._id}`, primary: !b.company?._id });
        if (b.driver?._id && canPage('/driverreport/:id')) list.push({ label: 'Driver report', path: withSearch(`/driverreport/${b.driver._id}`, key) });
        if (b.provider?._id && canPage('/provider-report/:id')) list.push({ label: 'Provider report', path: withSearch(`/provider-report/${b.provider._id}`, key) });
        if (b.showroom?._id && canPage('/servicecenterreport/:id')) list.push({ label: 'Showroom report', path: withSearch(`/servicecenterreport/${b.showroom._id}`, key) });
        if (b.status === 'Order Completed' && !b.accountantVerified && canPage('/completedbookings')) list.push({ label: 'Completed bookings', path: withSearch('/completedbookings', key) });
        if (b.accountantVerified && canPage('/approvedbookings')) list.push({ label: 'Approved bookings', path: withSearch('/approvedbookings', key) });
        return list;
    };

    return (
        <div ref={boxRef} className="relative hidden sm:block shrink-0">
            <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && hits[0]) {
                        const a = actions(hits[0]);
                        if (a[0]) go(a[0].path);
                    }
                }}
                placeholder="Search case id, file no, vehicle, mobile, invoice…  ( / )"
                aria-label="Search bookings"
                className="h-10 w-56 lg:w-80 rounded-full border border-[#e3e6ec] bg-white px-4 text-sm outline-none focus:border-primary dark:border-[#253b5c] dark:bg-black dark:text-white-dark"
            />
            {open && q.trim().length > 0 && (
                <div className="absolute ltr:right-0 rtl:left-0 z-[60] mt-2 w-[min(92vw,560px)] max-h-[70vh] overflow-y-auto rounded-xl border border-[#e3e6ec] bg-white shadow-xl dark:border-[#253b5c] dark:bg-[#0e1726]">
                    {q.trim().length < 3 && <div className="p-4 text-sm text-white-dark">Type at least 3 characters…</div>}
                    {q.trim().length >= 3 && loading && <div className="p-4 text-sm text-white-dark">Searching all bookings…</div>}
                    {error && <div className="p-4 text-sm text-danger">{error}</div>}
                    {q.trim().length >= 3 && !loading && !error && hits.length === 0 && (
                        <div className="p-4 text-sm text-white-dark">No booking found for “{q.trim()}”. Check the number, or try the vehicle or mobile number.</div>
                    )}
                    {!loading &&
                        hits.map((b) => {
                            const received = Number(b.receivedAmountByCompany) || 0;
                            const acts = actions(b);
                            return (
                                <div key={b._id} className="border-b border-[#eef0f4] p-3 last:border-b-0 dark:border-[#1b2e4b]">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="font-semibold">{String(b.fileNumber || '').trim() || '—'}</span>
                                        <span className="text-xs text-white-dark">{fmtDate(b.createdAt)}</span>
                                        {b.status && <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] text-primary dark:bg-[#1b2e4b]">{b.status}</span>}
                                        {b.source === 'oldBookings' && <span className="rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] text-warning">Old Bookings</span>}
                                        {b.company && received === 0 && <span className="rounded-full bg-[#fdecec] px-2 py-0.5 text-[11px] text-danger">Received 0</span>}
                                        {b.company && !String(b.invoiceNumber || '').trim() && <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[11px] text-[#555] dark:bg-[#1b2e4b] dark:text-white-dark">No invoice</span>}
                                        {b.approve && <span className="rounded-full bg-[#e7f7ef] px-2 py-0.5 text-[11px] text-success">Approved</span>}
                                    </div>
                                    <div className="mt-1 text-xs text-[#555] dark:text-white-dark">
                                        {[b.customerVehicleNumber, b.customerName, b.mob1, b.company?.name || b.showroom?.name, b.driver?.name || b.provider?.name].filter(Boolean).join(' · ')}
                                    </div>
                                    {b.company && (
                                        <div className="mt-0.5 text-xs text-[#555] dark:text-white-dark">
                                            Payable {money(b.totalAmount)} · Received {money(received)}
                                            {b.invoiceNumber ? ` · Invoice ${b.invoiceNumber}` : ''}
                                        </div>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {acts.map((a) => (
                                            <button
                                                key={a.label}
                                                type="button"
                                                onClick={() => go(a.path)}
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${a.primary ? 'bg-primary text-white hover:bg-primary/90' : 'border border-[#e3e6ec] hover:border-primary hover:text-primary dark:border-[#253b5c]'}`}
                                            >
                                                {a.label}
                                            </button>
                                        ))}
                                        {acts.length === 0 && <span className="text-xs text-white-dark">You don’t have access to the pages for this booking.</span>}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
