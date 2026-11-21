// @ts-nocheck
// Unpaid company cases: every company booking where the amount received from the company is 0.
// Filter by company / dates / search, and print grouped company-wise.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'mantine-datatable';
import Swal from 'sweetalert2';
import { axiosInstance } from '../../../config/axiosConfig';
import IconPrinter from '../../../components/Icon/IconPrinter';
import { NON_COMPLETED_STATUS } from '../../../constants/status';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const CHUNK = 1000; // server caps one request at 1000 rows

const money = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '');
const esc = (v: any) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const UnpaidCompanyCases = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<any[]>([]);
    const [companyId, setCompanyId] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [search, setSearch] = useState('');
    const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'with' | 'without'>('all');
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    useEffect(() => {
        axiosInstance
            .get(`${backendUrl}/company`)
            .then((r) => setCompanies((Array.isArray(r.data) ? r.data : r.data?.data || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)))))
            .catch(() => setCompanies([]));
    }, []);

    // Load every matching case (in chunks of 1000) so totals and printing cover all of them
    const load = async () => {
        if (fromDate && toDate && fromDate > toDate) {
            Swal.fire({ icon: 'warning', title: '"From" date is after "To" date', toast: true, position: 'top', showConfirmButton: false, timer: 3000 });
            return;
        }
        setLoading(true);
        try {
            const all: any[] = [];
            let p = 1;
            let total = Infinity;
            while (all.length < total && p <= 50) {
                const res = await axiosInstance.get(`${backendUrl}/booking`, {
                    params: {
                        companyOnly: true,
                        companyPaid: 'zero',
                        forCompanyReport: true,
                        status: NON_COMPLETED_STATUS,
                        ...(companyId && { companyId }),
                        ...(fromDate && toDate && { startDate: fromDate, endingDate: toDate }),
                        ...(search.trim() && { search: search.trim() }),
                        page: p,
                        limit: CHUNK,
                    },
                });
                const list = res.data?.bookings || [];
                total = Number(res.data?.total) || list.length;
                all.push(...list);
                if (list.length < CHUNK) break;
                p++;
            }
            // Keep the rule here too, so the list is right even if the server ignores a filter
            setRows(all.filter((b) => b.company && b.workType === 'RSAWork' && (Number(b.receivedAmountByCompany) || 0) === 0));
            setPage(1);
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Could not load unpaid cases. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(load, search ? 500 : 0);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, fromDate, toDate, search]);

    const filtered = useMemo(
        () =>
            rows.filter((b) => {
                const has = String(b.invoiceNumber || '').trim() !== '';
                return invoiceFilter === 'all' || (invoiceFilter === 'with' ? has : !has);
            }),
        [rows, invoiceFilter]
    );

    // Company-wise groups (sorted by company name, cases oldest first)
    const groups = useMemo(() => {
        const map = new Map<string, { name: string; items: any[]; total: number }>();
        filtered.forEach((b) => {
            const key = String(b.company?._id || b.company);
            if (!map.has(key)) map.set(key, { name: b.company?.name || 'Unknown company', items: [], total: 0 });
            const g = map.get(key)!;
            g.items.push(b);
            g.total += Number(b.totalAmount) || 0;
        });
        const list = Array.from(map.entries()).map(([id, g]) => ({ id, ...g }));
        list.forEach((g) => g.items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [filtered]);

    const grandTotal = groups.reduce((t, g) => t + g.total, 0);

    const periodText = fromDate && toDate ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}` : 'All dates';

    const printCompanyWise = (onlyId?: string) => {
        const list = onlyId ? groups.filter((g) => g.id === onlyId) : groups;
        if (!list.length) {
            Swal.fire({ icon: 'info', title: 'Nothing to print', toast: true, position: 'top', showConfirmButton: false, timer: 2500 });
            return;
        }
        const sections = list
            .map(
                (g, gi) => `
            <section class="${gi > 0 ? 'break' : ''}">
              <div class="head">
                <div><h2>${esc(g.name)}</h2><div class="muted">Unpaid company cases · Amount received = 0 · ${esc(periodText)}</div></div>
                <div class="sum"><div class="muted">${g.items.length} case(s)</div><b>${money(g.total)}</b></div>
              </div>
              <table>
                <thead><tr><th>#</th><th>Date</th><th>File number</th><th>Vehicle number</th><th>Customer</th><th>Invoice number</th><th class="r">Payable amount</th></tr></thead>
                <tbody>
                  ${g.items
                      .map(
                          (b, i) => `<tr><td>${i + 1}</td><td>${fmtDate(b.createdAt)}</td><td>${esc(String(b.fileNumber || '').trim())}</td><td>${esc(b.customerVehicleNumber)}</td><td>${esc(b.customerName)}</td><td>${esc(b.invoiceNumber)}</td><td class="r">${money(b.totalAmount)}</td></tr>`
                      )
                      .join('')}
                </tbody>
                <tfoot><tr><td colspan="6" class="r">Total for ${esc(g.name)}</td><td class="r">${money(g.total)}</td></tr></tfoot>
              </table>
            </section>`
            )
            .join('');
        const summary =
            list.length > 1
                ? `<section class="break"><h2>Summary</h2><div class="muted">${esc(periodText)}</div>
                   <table><thead><tr><th>Company</th><th class="r">Cases</th><th class="r">Payable amount</th></tr></thead><tbody>
                   ${list.map((g) => `<tr><td>${esc(g.name)}</td><td class="r">${g.items.length}</td><td class="r">${money(g.total)}</td></tr>`).join('')}
                   </tbody><tfoot><tr><td>Grand total</td><td class="r">${list.reduce((t, g) => t + g.items.length, 0)}</td><td class="r">${money(list.reduce((t, g) => t + g.total, 0))}</td></tr></tfoot></table></section>`
                : '';
        const w = window.open('', '', 'height=900,width=1200');
        if (!w) {
            Swal.fire('Pop-up blocked', 'Allow pop-ups for this site to print.', 'warning');
            return;
        }
        w.document.write(`<!doctype html><html><head><title>Unpaid company cases</title><style>
            body{font-family:Arial,sans-serif;color:#111;margin:24px;font-size:12px}
            h2{margin:0;font-size:18px}.muted{color:#666;font-size:11px;margin-top:2px}
            .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #DE3325;padding-bottom:8px;margin-bottom:10px}
            .sum{text-align:right}.sum b{font-size:16px}
            table{width:100%;border-collapse:collapse;margin-top:6px}
            th,td{border:1px solid #999;padding:5px 7px;text-align:left}
            th{background:#f2f2f2}.r{text-align:right}
            tfoot td{font-weight:bold;background:#fafafa}
            section{margin-bottom:24px}.break{page-break-before:always}
            @page{size:A4;margin:12mm}
        </style></head><body>${sections}${summary}</body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
    };

    const pageRecords = filtered.slice((page - 1) * pageSize, page * pageSize).map((b) => ({ ...b, id: b._id }));

    const cols = [
        { accessor: 'idx', title: '#', render: (_: any, i: number) => (page - 1) * pageSize + i + 1 },
        { accessor: 'createdAt', title: 'Date', render: (b) => fmtDate(b.createdAt) },
        { accessor: 'company', title: 'Company', render: (b) => b.company?.name || '' },
        { accessor: 'fileNumber', title: 'File number', render: (b) => String(b.fileNumber || '').trim() },
        { accessor: 'customerVehicleNumber', title: 'Vehicle number' },
        { accessor: 'customerName', title: 'Customer' },
        { accessor: 'invoiceNumber', title: 'Invoice number', render: (b) => b.invoiceNumber || <span className="text-white-dark">—</span> },
        { accessor: 'totalAmount', title: 'Payable amount', textAlignment: 'right', render: (b) => money(b.totalAmount) },
        {
            accessor: 'open',
            title: '',
            render: (b) => (
                <button type="button" className="btn btn-sm btn-outline-primary whitespace-nowrap" onClick={() => navigate(`/company-report/${b.company?._id || b.company}`)}>
                    Company report
                </button>
            ),
        },
    ];

    const ctl = 'h-9 rounded-full border border-[#e0e6ed] dark:border-[#253b5c] text-xs font-semibold';

    return (
        <div className="pt-5 space-y-5">
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h5 className="text-lg font-semibold dark:text-white-light">Unpaid company cases</h5>
                        <p className="text-white-dark text-sm">Company bookings where the amount received from the company is 0</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-sm btn-primary h-9 flex items-center gap-1.5 whitespace-nowrap" onClick={() => printCompanyWise()} disabled={loading}>
                            <IconPrinter className="w-4 h-4" />
                            {companyId ? 'Print' : 'Print company-wise'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <select className={`form-select ${ctl} py-0 w-56`} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                        <option value="">All companies</option>
                        {companies.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <label className="flex items-center gap-2 mb-0 text-xs font-semibold">
                        From
                        <input type="date" className={`form-input ${ctl} py-0 w-40`} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </label>
                    <label className="flex items-center gap-2 mb-0 text-xs font-semibold">
                        To
                        <input type="date" className={`form-input ${ctl} py-0 w-40`} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </label>
                    {(fromDate || toDate) && (
                        <button type="button" className="btn btn-sm btn-outline-dark h-9" onClick={() => { setFromDate(''); setToDate(''); }}>
                            All dates
                        </button>
                    )}
                    <div className={`flex ${ctl} overflow-hidden`}>
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'without', label: 'No invoice no.' },
                            { key: 'with', label: 'Has invoice no.' },
                        ].map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                className={`px-3 whitespace-nowrap ${invoiceFilter === f.key ? 'bg-primary text-white' : 'bg-white dark:bg-[#1b2e4b] text-[#515365] dark:text-white-dark'}`}
                                onClick={() => { setInvoiceFilter(f.key as any); setPage(1); }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <input type="text" className={`form-input ${ctl} py-0 w-52 ltr:ml-auto rtl:mr-auto`} placeholder="Search file / vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {fromDate && !toDate && <p className="text-xs text-warning mb-3">Pick a "To" date as well; until then all dates are shown.</p>}

                {/* Company-wise summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg border border-[#ebedf2] dark:border-[#1b2e4b] p-3">
                        <div className="text-white-dark text-xs">Cases</div>
                        <div className="text-xl font-bold">{filtered.length}</div>
                    </div>
                    <div className="rounded-lg border border-[#ebedf2] dark:border-[#1b2e4b] p-3">
                        <div className="text-white-dark text-xs">Companies</div>
                        <div className="text-xl font-bold">{groups.length}</div>
                    </div>
                    <div className="rounded-lg border border-[#ebedf2] dark:border-[#1b2e4b] p-3 col-span-2">
                        <div className="text-white-dark text-xs">Total payable (not received)</div>
                        <div className="text-xl font-bold text-danger">{money(grandTotal)}</div>
                    </div>
                </div>

                {!companyId && groups.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {groups.map((g) => (
                            <div key={g.id} className="flex items-center gap-2 rounded-full border border-[#e0e6ed] dark:border-[#253b5c] pl-3 pr-1 h-9 text-xs">
                                <button type="button" className="font-semibold hover:text-primary" onClick={() => setCompanyId(g.id)} title="Show only this company">
                                    {g.name}
                                </button>
                                <span className="text-white-dark">{g.items.length} · {money(g.total)}</span>
                                <button type="button" className="rounded-full p-1.5 hover:bg-primary-light" title={`Print ${g.name}`} onClick={() => printCompanyWise(g.id)}>
                                    <IconPrinter className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="datatables">
                    <DataTable
                        fetching={loading}
                        records={pageRecords}
                        columns={cols}
                        totalRecords={filtered.length}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={setPage}
                        recordsPerPageOptions={[20, 50, 100, 200, 500]}
                        onRecordsPerPageChange={(n) => { setPageSize(n); setPage(1); }}
                        withColumnBorders
                        highlightOnHover
                        striped
                        minHeight={300}
                        noRecordsText="No unpaid company cases"
                    />
                </div>
            </div>
        </div>
    );
};

export default UnpaidCompanyCases;
