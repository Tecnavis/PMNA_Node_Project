import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactModal from 'react-modal';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { IconPrinter } from '@tabler/icons-react';
import { Booking } from '../Bookings/Bookings';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { formattedTime, dateFormate } from '../../utils/dateUtils';
import BookingSkeleton from '../../components/Skeleton/BookingSkeleton';
import IconBarChart from '../../components/Icon/IconBarChart';
import IconClock from '../../components/Icon/IconClock';
import IconListCheck from '../../components/Icon/IconListCheck';
import { connectSocket, disconnectSocket } from '../../utils/socket';
import FeedbackModal from '../Bookings/FeedbackModal';
import Feedbacks from '../Feedback/Feedback';
import { Badge, EmptyState, PageHeader, SearchBox, SegTabs, money } from '../../components/ui/PageKit';

type ApiError = {
    success: false;
    errorCode: string;
    errors: Array<{ message: string }>;
};
export interface SocketData {
    type: 'update' | 'newBooking';
    bookingId: string;
    status?: string;
    newBooking: Booking;
    updatedBooking: Booking;
}

enum Tabs {
    OngoingBookings = 'OngoingBookings',
    CashPendingBookings = 'CashPendingBookings',
    CompletedBookings = 'CompletedBookings',
}

const apiStatusFor = (t: Tabs) => (t === Tabs.CompletedBookings ? 'Order Completed' : t);

const statusTone = (s?: string): 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'default' => {
    if (!s) return 'default';
    if (s === 'Order Completed') return 'success';
    if (s === 'Rejected' || s === 'Cancelled') return 'danger';
    if (s === 'Booking Added' || s === 'pending') return 'warning';
    if (/dropoff|dropped/i.test(s)) return 'info';
    return 'primary';
};

const fmtWhen = (v?: unknown) => {
    if (!v) return '';
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return '';
    return `${dateFormate(v as string)}, ${formattedTime(v as string)}`;
};

const pendingOf = (b: Booking) => (b?.totalAmount || 0) - (b?.partialAmount || 0);

const esc = (v: unknown) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const Status: React.FC = () => {
    const [tab, setTab] = useState<Tabs>(Tabs.OngoingBookings);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loader, setLoader] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [total, setTotal] = useState<number>(0);
    const [pageSize, setPageSize] = useState<number>(10);
    const [counts, setCounts] = useState<Partial<Record<Tabs, number>>>({});

    const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [savingPayment, setSavingPayment] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [feedbacks, setFeedbacks] = useState<Feedbacks[]>([]);
    const [selectedResponses, setSelectedResponses] = useState<{ [key: string]: string }>({});
    const [selectedBookingId, setSelectedBookingId] = useState<string>('');
    const [receivedUser, setReceivedUser] = useState<string>('');
    const [query, setQuery] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const currentTabRef = useRef<Tabs>(Tabs.OngoingBookings);
    const queryRef = useRef('');
    const pageRef = useRef(1);
    const pageSizeRef = useRef(10);
    const abortControllerRef = useRef<AbortController | null>(null);

    const role = localStorage.getItem('role') || '';

    const fetchBookings = useCallback(async (search: string, page: number = 1, limit: number = pageSizeRef.current) => {
        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoader(true);
        const currentTab = currentTabRef.current;
        try {
            const response = await axiosInstance.get(`/booking/status-based`, {
                params: { page, limit, search: search.trim(), status: apiStatusFor(currentTab) },
                signal: abortController.signal,
            });
            if (currentTabRef.current === currentTab) {
                setBookings(response.data.bookings || []);
                setTotalPages(response.data.totalPages || 0);
                setTotal(response.data.total ?? 0);
                setCurrentPage(response.data.page || page);
                pageRef.current = response.data.page || page;
                if (!search.trim()) setCounts((c) => ({ ...c, [currentTab]: response.data.total ?? 0 }));
            }
        } catch (error: any) {
            if (error?.name === 'CanceledError') return;
            console.error('Error fetching bookings', error);
            if (currentTabRef.current === currentTab) setBookings([]);
        } finally {
            if (abortControllerRef.current === abortController) {
                setLoader(false);
                abortControllerRef.current = null;
            }
        }
    }, []);

    /** Tab counts for the tab chips (cheap: limit=1, server counts). */
    const fetchCounts = useCallback(async () => {
        const all = [Tabs.OngoingBookings, Tabs.CashPendingBookings, Tabs.CompletedBookings];
        const res = await Promise.allSettled(all.map((t) => axiosInstance.get('/booking/status-based', { params: { page: 1, limit: 1, search: '', status: apiStatusFor(t) } })));
        const next: Partial<Record<Tabs, number>> = {};
        res.forEach((r, i) => {
            if (r.status === 'fulfilled') next[all[i]] = r.value.data?.total ?? 0;
        });
        setCounts((c) => ({ ...c, ...next }));
    }, []);

    const refresh = useCallback(() => {
        fetchBookings(queryRef.current, pageRef.current);
        fetchCounts();
    }, [fetchBookings, fetchCounts]);

    const debouncedSearch = useMemo(() => debounce((search: string) => fetchBookings(search, 1), 450), [fetchBookings]);

    // Load on tab change (and first open)
    useEffect(() => {
        currentTabRef.current = tab;
        setBookings([]);
        fetchBookings(queryRef.current, 1);
    }, [tab, fetchBookings]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    // Live updates: one socket for the page
    useEffect(() => {
        let socketInstance: ReturnType<typeof connectSocket> | null = null;
        try {
            socketInstance = connectSocket('test@example.com');
            socketInstance.on('newChanges', async (data: SocketData) => {
                try {
                    if (!data.type) return;
                    const currentTab = currentTabRef.current;
                    if (data.status) {
                        if (data.status === 'Order Completed') {
                            setBookings((prev) => prev.filter((b) => b._id !== data.bookingId));
                        } else {
                            setBookings((prev) => prev.map((b) => (b._id === data.bookingId ? { ...b, ...(data.updatedBooking as Booking) } : b)));
                        }
                        return;
                    }
                    if (data.type === 'newBooking') {
                        if (currentTab === Tabs.OngoingBookings && data.newBooking) setBookings((prev) => [data.newBooking as Booking, ...prev]);
                        setCounts((c) => ({ ...c, [Tabs.OngoingBookings]: (c[Tabs.OngoingBookings] || 0) + 1 }));
                        return;
                    }
                    const response = await axiosInstance.get(`/booking/${data.bookingId}`);
                    const updated = response.data;
                    setBookings((prev) => prev.map((b) => (b._id === data.bookingId ? { ...b, ...updated } : b)));
                    const completed = updated?.status === 'Order Completed';
                    if ((completed && currentTab !== Tabs.CompletedBookings) || (!completed && currentTab === Tabs.CompletedBookings)) {
                        fetchBookings(queryRef.current, 1);
                        fetchCounts();
                    }
                } catch (err) {
                    console.error('Error handling socket data:', err);
                }
            });
        } catch (error) {
            console.error('Socket setup failed:', error);
        }
        return () => {
            socketInstance?.off('newChanges');
            disconnectSocket();
            debouncedSearch.cancel();
            abortControllerRef.current?.abort();
        };
    }, [fetchBookings, fetchCounts, debouncedSearch]);

    const onSearch = (v: string) => {
        setQuery(v);
        queryRef.current = v;
        debouncedSearch.cancel();
        if (v.trim() === '') fetchBookings('', 1);
        else debouncedSearch(v);
    };

    const handlePageChange = (page: number) => {
        if (page === currentPage || page < 1 || page > totalPages) return;
        fetchBookings(queryRef.current, page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        pageSizeRef.current = newSize;
        fetchBookings(queryRef.current, 1, newSize);
    };

    const handlePaymentSettlement = (record: Booking) => {
        setSelectedBooking(record);
        setPaymentAmount(pendingOf(record));
        setReceivedUser('');
        setShowPaymentModal(true);
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentAmount(0);
        setReceivedUser('');
    };

    const handleSettleCashPending = async (bookingId: string) => {
        const confirmation = await Swal.fire({
            title: 'Confirm Settlement',
            text: 'Are you sure you want to settle this cash pending amount?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, settle it!',
            cancelButtonText: 'Cancel',
        });
        if (!confirmation.isConfirmed) return;

        setIsProcessing(bookingId);
        const toastId = toast.loading('Processing cash settlement...');
        try {
            const response = await axiosInstance.patch(`${BASE_URL}/booking/settle-cash-pending/${bookingId}`);
            toast.success(response.data.message || 'Cash pending settled successfully!', { id: toastId });
            await Swal.fire({ title: 'Success!', text: 'Cash pending has been settled successfully.', icon: 'success', confirmButtonColor: '#3085d6' });
            refresh();
        } catch (error) {
            const axiosError = error as AxiosError<ApiError>;
            let errorMessage = 'Failed to settle cash pending';
            if (axiosError.response) errorMessage = axiosError.response.data?.errors?.[0]?.message || (axiosError.response.data as any)?.message || errorMessage;
            else if (axiosError.request) errorMessage = 'Network error - please check your connection';
            toast.error(errorMessage, { id: toastId, duration: 5000 });
            await Swal.fire({ title: 'Error!', text: errorMessage, icon: 'error', confirmButtonColor: '#d33' });
        } finally {
            setIsProcessing(null);
        }
    };

    const maxPayable = selectedBooking ? pendingOf(selectedBooking) : 0;

    const handleSavePayment = async () => {
        const amount = Number(paymentAmount);
        if (!amount || amount <= 0) {
            Swal.fire({ icon: 'error', title: 'Invalid Amount', text: 'Please enter a valid amount greater than zero', confirmButtonColor: '#3085d6' });
            return;
        }
        if (!receivedUser) {
            Swal.fire({ icon: 'warning', title: 'Who received the money?', text: 'Choose Driver, Staff or Showroom.', confirmButtonColor: '#3085d6' });
            return;
        }
        setSavingPayment(true);
        try {
            const driverId = selectedBooking?.driver?._id;
            await axiosInstance.patch(`/booking/sattle-amount/${selectedBooking?._id}`, {
                partialAmount: paymentAmount,
                receivedUser,
                receivedUserId: receivedUser === 'Driver' ? driverId : undefined,
                role,
            });
            closePaymentModal();
            toast.success('Payment saved');
            refresh();
        } catch (error: any) {
            console.error('Error saving payment:', error);
            Swal.fire({ icon: 'error', title: 'Could not save payment', text: error?.response?.data?.message || 'Please try again.' });
        } finally {
            setSavingPayment(false);
        }
    };

    const handleChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.trim();
        if (/^\d*$/.test(value)) {
            const numericValue = Number(value);
            if (numericValue <= maxPayable) setPaymentAmount(numericValue);
        }
    };

    const openFeedbackModal = async (id: string) => {
        setIsOpen(true);
        setSelectedBookingId(id);
        try {
            const response = await axiosInstance.get(`${BASE_URL}/feedback/`);
            setFeedbacks(response.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const onClose = async () => {
        setIsOpen(false);
        setSelectedBookingId('');
        setSelectedResponses({});
    };

    const handleOptionChange = (questionId: string, response: string) => {
        setSelectedResponses((prev) => ({ ...prev, [questionId]: response }));
    };

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        const allAnswered = feedbacks.every((f) => selectedResponses[f._id]);
        if (!allAnswered) {
            Swal.fire({ icon: 'error', title: 'Incomplete Feedback', text: 'Please answer all questions before submitting.', toast: true, position: 'top', showConfirmButton: false, timer: 3000, padding: '10px 20px' });
            return;
        }
        const feedbackData = feedbacks?.map((f) => ({ questionId: f._id, response: selectedResponses[f._id] || '', yesPoint: f.yesPoint, noPoint: f.noPoint }));
        try {
            await axiosInstance.put(`${BASE_URL}/booking/postfeedback/${selectedBookingId}`, { feedback: feedbackData });
            Swal.fire({ icon: 'success', title: 'Feedback added', toast: true, position: 'top', showConfirmButton: false, timer: 3000, padding: '10px 20px' });
            onClose();
            refresh();
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) console.error('Error saving feedback:', error.response?.data || error.message);
            else console.error('An unexpected error occurred:', error);
            Swal.fire({ icon: 'error', title: 'Could not save feedback', toast: true, position: 'top', showConfirmButton: false, timer: 3000 });
        }
    };

    const openPrint = (title: string, body: string, landscape = false) => {
        const w = window.open('', '_blank');
        if (!w) {
            toast.error('Please allow popups to print details');
            return;
        }
        w.document.write(`<html><head><title>${esc(title)}</title><style>
            body{font-family:Arial,sans-serif;padding:16px;color:#111}
            h2{margin:0 0 4px} .sub{color:#666;font-size:12px;margin-bottom:12px}
            table{width:100%;border-collapse:collapse;font-size:12px}
            th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
            th{background:#f3f4f6} td.n{text-align:right;white-space:nowrap} .red{color:#c00;font-weight:bold}
            @media print{@page{size:${landscape ? 'landscape' : 'portrait'};margin:10mm}}
        </style></head><body onload="window.print();window.close();">${body}</body></html>`);
        w.document.close();
    };

    const printPendingDetails = (b: Booking) => {
        const row = (k: string, v: unknown, cls = '') => `<tr><th style="width:35%">${k}</th><td class="${cls}">${esc(v)}</td></tr>`;
        openPrint(
            `Pending Details - ${b?.fileNumber}`,
            `<h2>Pending Work Details</h2><div class="sub">File ${esc(b?.fileNumber)} · printed ${new Date().toLocaleString('en-IN')}</div><table>
            ${row('Date', dateFormate(b?.createdAt as unknown as string))}
            ${row('Vehicle Number', b?.customerVehicleNumber || 'N/A')}
            ${row('Customer', b?.customerName || 'N/A')}
            ${row('Mobile Number', b?.mob1 || (b as any)?.mob2 || 'N/A')}
            ${row('Pickup Location', b?.location)}
            ${row('Dropoff Location', b?.dropoffLocation)}
            ${row('Driver', b?.driver?.name || 'N/A')}
            ${row('Total Amount', money(b?.totalAmount))}
            ${row('Pending Amount', money(pendingOf(b)), 'red')}
            ${row('Remark', b?.partialPaymentRemark || 'N/A')}
            </table>`
        );
    };

    const pendingOnPage = useMemo(() => bookings.filter((b) => b.cashPending), [bookings]);
    const pendingTotal = useMemo(() => pendingOnPage.reduce((s, b) => s + pendingOf(b), 0), [pendingOnPage]);

    const printAllPendingBookings = () => {
        if (pendingOnPage.length === 0) {
            toast.error('No pending bookings to print');
            return;
        }
        const rows = pendingOnPage
            .map(
                (b, i) => `<tr><td>${i + 1}</td><td>${esc(dateFormate(b?.createdAt as unknown as string))}</td><td>${esc(b?.fileNumber || 'N/A')}</td><td>${esc(b?.customerVehicleNumber || 'N/A')}</td>
                <td>${esc(b?.customerName || 'N/A')}</td><td>${esc(b?.mob1 || (b as any)?.mob2 || 'N/A')}</td><td>${esc(b?.location)}</td><td>${esc(b?.dropoffLocation)}</td>
                <td class="n">${money(b?.totalAmount)}</td><td class="n red">${money(pendingOf(b))}</td><td>${esc(b?.partialPaymentRemark || 'N/A')}</td><td>${esc(b?.driver?.name || 'N/A')}</td></tr>`
            )
            .join('');
        openPrint(
            'All Pending Bookings',
            `<h2>Cash pending bookings</h2><div class="sub">${pendingOnPage.length} bookings · total pending ${money(pendingTotal)} · printed ${new Date().toLocaleString('en-IN')}</div>
            <table><tr><th>No</th><th>Date</th><th>File No</th><th>Vehicle No</th><th>Customer</th><th>Mobile</th><th>Pickup</th><th>Dropoff</th><th>Total</th><th>Pending</th><th>Remark</th><th>Driver</th></tr>${rows}</table>
            <p style="text-align:right;font-weight:bold;margin-top:12px">Total pending: ${money(pendingTotal)}</p>`,
            true
        );
    };

    const tabs = [
        { key: Tabs.OngoingBookings, label: 'Ongoing', count: counts[Tabs.OngoingBookings], icon: <IconBarChart className="h-4 w-4" /> },
        { key: Tabs.CashPendingBookings, label: 'Cash pending', count: counts[Tabs.CashPendingBookings], icon: <IconClock className="h-4 w-4" /> },
        { key: Tabs.CompletedBookings, label: 'Completed', count: counts[Tabs.CompletedBookings], icon: <IconListCheck className="h-4 w-4" /> },
    ];

    const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, total);

    const pageNumbers = useMemo(() => {
        const n = Math.min(5, totalPages);
        let start = 1;
        if (totalPages > 5) start = Math.min(Math.max(1, currentPage - 2), totalPages - 4);
        return Array.from({ length: n }, (_, i) => start + i);
    }, [currentPage, totalPages]);

    return (
        <div>
            <PageHeader
                title="Booking status"
                subtitle="Live: changes from drivers and staff appear automatically"
                actions={<SearchBox value={query} onChange={onSearch} placeholder="File no., vehicle, customer, phone, driver…" className="w-full sm:w-80" />}
            />

            <SegTabs tabs={tabs} value={tab} onChange={(k) => setTab(k)} className="mb-4" />

            {tab === Tabs.CashPendingBookings && (
                <div className="panel !p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                            <div className="text-[11px] font-semibold uppercase text-white-dark">On this page</div>
                            <div className="font-bold">{pendingOnPage.length} bookings</div>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase text-white-dark">Pending amount (this page)</div>
                            <div className="font-bold text-danger">{money(pendingTotal)}</div>
                        </div>
                    </div>
                    <button type="button" className="btn btn-success btn-sm gap-2" onClick={printAllPendingBookings} disabled={!pendingOnPage.length}>
                        <IconPrinter size={16} /> Print list
                    </button>
                </div>
            )}

            {loader && bookings.length === 0 ? (
                <BookingSkeleton />
            ) : bookings.length === 0 ? (
                <div className="panel">
                    <EmptyState
                        title={query ? `No bookings match “${query}”` : 'No bookings here'}
                        text={query ? 'Try a file number, vehicle number, customer name or phone.' : tab === Tabs.CashPendingBookings ? 'There is no cash waiting to be collected.' : undefined}
                    />
                </div>
            ) : (
                <div className={`grid gap-3 xl:grid-cols-2 ${loader ? 'opacity-60 transition-opacity' : ''}`}>
                    {bookings.map((b) => (
                        <BookingCard
                            key={b._id}
                            b={b}
                            isProcessing={isProcessing === b._id}
                            onFeedback={() => openFeedbackModal(b._id)}
                            onPrint={() => printPendingDetails(b)}
                            onSettle={() => handlePaymentSettlement(b)}
                            onSettleCash={() => handleSettleCashPending(b._id)}
                        />
                    ))}
                </div>
            )}

            {total > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="text-white-dark">
                        Showing <b className="text-black dark:text-white-light">{from}–{to}</b> of <b className="text-black dark:text-white-light">{total.toLocaleString('en-IN')}</b>
                    </div>
                    <div className="flex items-center gap-1">
                        <button type="button" className="btn btn-outline-primary btn-sm" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)} aria-label="Previous page">
                            ‹
                        </button>
                        {pageNumbers.map((p) => (
                            <button key={p} type="button" onClick={() => handlePageChange(p)} className={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-outline-primary'}`}>
                                {p}
                            </button>
                        ))}
                        <button type="button" className="btn btn-outline-primary btn-sm" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)} aria-label="Next page">
                            ›
                        </button>
                    </div>
                    <label className="flex items-center gap-2 text-white-dark">
                        Per page
                        <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="form-select form-select-sm w-auto">
                            {[10, 20, 50, 100, 500].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            )}

            <ReactModal
                isOpen={showPaymentModal}
                onRequestClose={closePaymentModal}
                contentLabel="Payment Settlement"
                ariaHideApp={false}
                className="mx-auto mt-[10vh] w-[92vw] max-w-md rounded-lg bg-white p-5 shadow-xl outline-none dark:bg-[#0e1726]"
                overlayClassName="fixed inset-0 z-[999] bg-black/50 overflow-y-auto"
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">Settle payment</h2>
                        <div className="text-xs text-white-dark">
                            {selectedBooking?.fileNumber} · {selectedBooking?.customerName}
                        </div>
                    </div>
                    <button type="button" className="text-2xl leading-none text-white-dark hover:text-danger" onClick={closePaymentModal} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-white-light/60 p-2 dark:bg-[#1b2e4b]">
                        <div className="text-[11px] text-white-dark">Total</div>
                        <div className="font-bold">{money(selectedBooking?.totalAmount)}</div>
                    </div>
                    <div className="rounded-md bg-white-light/60 p-2 dark:bg-[#1b2e4b]">
                        <div className="text-[11px] text-white-dark">Received</div>
                        <div className="font-bold text-primary">{money(selectedBooking?.partialAmount)}</div>
                    </div>
                    <div className="rounded-md bg-danger/10 p-2">
                        <div className="text-[11px] text-white-dark">Payable</div>
                        <div className="font-bold text-danger">{money(maxPayable)}</div>
                    </div>
                </div>
                <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-white-dark">Amount received now</span>
                    <input type="text" inputMode="numeric" value={paymentAmount || ''} onChange={handleChangeAmount} className="form-input" placeholder="0" autoFocus />
                </label>
                {paymentAmount > 0 && paymentAmount < maxPayable && <div className="mt-1 text-xs text-danger">Balance remaining: {money(maxPayable - paymentAmount)}</div>}
                <div className="mt-4">
                    <span className="mb-1 block text-xs font-semibold text-white-dark">Received by</span>
                    <div className="flex flex-wrap gap-2">
                        {['Driver', ...(role !== 'admin' ? ['Staff'] : []), 'Showroom'].map((u) => (
                            <label key={u} className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${receivedUser === u ? 'border-primary bg-primary/10 text-primary' : 'border-white-light dark:border-[#253b5c]'}`}>
                                <input type="radio" name="role" value={u} className="sr-only" checked={receivedUser === u} onChange={(e) => setReceivedUser(e.target.value)} />
                                {u}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={closePaymentModal}>
                        Cancel
                    </button>
                    <button type="button" onClick={handleSavePayment} className="btn btn-success" disabled={savingPayment}>
                        {savingPayment ? 'Saving…' : 'Save payment'}
                    </button>
                </div>
            </ReactModal>

            <FeedbackModal feedbacks={feedbacks} isOpen={isOpen} onChange={handleOptionChange} onClose={onClose} onSubmit={handleSubmitFeedback} selectedResponses={selectedResponses} />
        </div>
    );
};

const Info: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
    <div className={`min-w-0 ${className}`}>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white-dark">{label}</div>
        <div className="truncate text-sm text-black dark:text-white-light" title={typeof children === 'string' ? children : undefined}>
            {children || <span className="text-white-dark">—</span>}
        </div>
    </div>
);

const BookingCard: React.FC<{
    b: Booking;
    isProcessing: boolean;
    onFeedback: () => void;
    onPrint: () => void;
    onSettle: () => void;
    onSettleCash: () => void;
}> = ({ b, isProcessing, onFeedback, onPrint, onSettle, onSettleCash }) => {
    const phone = b?.mob1 || (b as any)?.mob2;
    const pickupAt = fmtWhen(b?.pickupTime);
    const dropAt = fmtWhen(b?.dropoffTime);
    return (
        <section className="panel !p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white-light px-4 py-2.5 dark:border-[#1b2e4b]">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Link to={`/openbooking/${b?._id}`} className="shrink-0 font-semibold text-primary hover:underline">
                        {b?.fileNumber || 'No file number'}
                    </Link>
                    <Badge tone={statusTone(b?.status)}>{b?.status || '—'}</Badge>
                    {b.cashPending && <Badge tone="danger">Cash pending</Badge>}
                </div>
                <div className="text-xs text-white-dark">{fmtWhen(b?.createdAt)}</div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-3">
                <Info label="Driver">
                    {b?.driver?.name ? (
                        <>
                            {b.driver.name}
                            {b.driver.phone && (
                                <a href={`tel:${b.driver.phone}`} className="block text-xs text-primary">
                                    {b.driver.phone}
                                </a>
                            )}
                        </>
                    ) : (
                        <span className="text-warning">Not assigned</span>
                    )}
                </Info>
                <Info label="Customer">
                    {b?.customerName}
                    {phone && (
                        <a href={`tel:${phone}`} className="block text-xs text-primary">
                            {phone}
                        </a>
                    )}
                </Info>
                <Info label="Vehicle">{b?.customerVehicleNumber}</Info>
                <Info label="Pickup" className="col-span-2 sm:col-span-3">
                    <span className="whitespace-normal">
                        {b?.location || '—'} <span className="text-white-dark">→</span> {b?.dropoffLocation || '—'}
                    </span>
                </Info>
                {(pickupAt || dropAt) && (
                    <>
                        <Info label="Picked up">{pickupAt}</Info>
                        <Info label="Dropped">{dropAt}</Info>
                    </>
                )}
                {b.cashPending && (
                    <>
                        <Info label="Total">{money(b?.totalAmount)}</Info>
                        <Info label="Pending">
                            <span className="font-bold text-danger">{money(pendingOf(b))}</span>
                        </Info>
                    </>
                )}
            </div>

            {b?.partialPaymentRemark && (
                <div className="mx-4 mb-3 rounded-md bg-warning/10 px-3 py-2 text-xs">
                    <b className="text-warning">Payment remark:</b> {b.partialPaymentRemark}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-white-light bg-white-light/30 px-4 py-2.5 dark:border-[#1b2e4b] dark:bg-transparent">
                <Link to={`/openbooking/${b?._id}`} className="btn btn-primary btn-sm">
                    Order details
                </Link>
                {!b.feedbackCheck && b.verified && (
                    <button type="button" onClick={onFeedback} className="btn btn-outline-success btn-sm">
                        Feedback
                    </button>
                )}
                {b.cashPending && (
                    <>
                        <button type="button" onClick={onSettle} className="btn btn-success btn-sm">
                            Settle payment
                        </button>
                        {b.partialPayment && (
                            <button type="button" onClick={onSettleCash} disabled={isProcessing} className="btn btn-danger btn-sm">
                                {isProcessing ? 'Processing…' : 'Settle cash pending'}
                            </button>
                        )}
                        <button type="button" onClick={onPrint} className="btn btn-outline-secondary btn-sm gap-1 ltr:ml-auto rtl:mr-auto">
                            <IconPrinter size={15} /> Print
                        </button>
                    </>
                )}
            </div>
        </section>
    );
};

export default Status;
