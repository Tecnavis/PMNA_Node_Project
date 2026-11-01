import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../../config/axiosConfig';

/** Monthly statement of this showroom's cases, printable / savable as PDF from the browser. */
type Case = { _id: string; fileNumber: string; date: string; status: string; customer: string; vehicle: string; service: string; category: string; route: string; distance: number | null; amount: number; showroomAmount: number; received: number; cashPending: boolean };
type Data = { month: string; showroom: { name: string; location: string; phone: string; code: string } | null; totals: { cases: number; completed: number; cancelled: number; amount: number; showroomAmount: number; received: number }; cases: Case[] };

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
const monthName = (m: string) => new Date(`${m}-15T12:00:00+05:30`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

const MonthlyStatement: React.FC = () => {
    const [month, setMonth] = useState(thisMonth());
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        setData(null);
        axios
            .get(`${BASE_URL}/showroom-portal/statement`, { params: { month }, headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
            .then((r) => { setData(r.data); setError(''); })
            .catch((e) => setError(e?.response?.data?.message || 'Could not load the statement'));
    }, [month]);

    return (
        <div className="space-y-4">
            <style>{`@media print { .no-print { display:none !important } body { background:#fff !important } .print-sheet { box-shadow:none !important; border:0 !important } }`}</style>
            <div className="no-print flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Monthly statement</h1>
                    <p className="text-sm text-gray-500">All cases RSA Kerala handled for your showroom in a month. Print or “Save as PDF” to keep a copy.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input type="month" className="form-input w-44" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
                    <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!data}>Print / Save PDF</button>
                </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="print-sheet rounded-2xl border border-gray-200 bg-white p-6 text-black shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
                    <div>
                        <img src="/assets/images/RSALogo.png" alt="RSA Kerala" style={{ width: 183, height: 50, objectFit: "cover" }} />
                        <div className="mt-2 text-xs text-gray-500">Road Side Assistance Kerala · Help 77 800 800 77</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase tracking-wider text-gray-500">Statement</div>
                        <div className="text-xl font-semibold">{monthName(month)}</div>
                        {data?.showroom && (
                            <div className="mt-1 text-sm">
                                <b>{data.showroom.name}</b>
                                {data.showroom.code ? ` · ${data.showroom.code}` : ''}
                                <div className="text-gray-500">{data.showroom.location}</div>
                            </div>
                        )}
                    </div>
                </div>

                {!data && !error && <p className="py-10 text-center text-sm text-gray-500">Loading…</p>}
                {data && (
                    <>
                        <div className="grid grid-cols-2 gap-3 py-4 md:grid-cols-4">
                            {[
                                ['Cases', data.totals.cases],
                                ['Completed', data.totals.completed],
                                ['Cancelled', data.totals.cancelled],
                                ['Amount (completed)', inr(data.totals.amount)],
                            ].map(([l, v]) => (
                                <div key={l as string} className="rounded-xl bg-gray-50 p-3">
                                    <div className="text-[11px] uppercase tracking-wider text-gray-500">{l}</div>
                                    <div className="mt-1 text-xl font-semibold">{v}</div>
                                </div>
                            ))}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-500">
                                        <th className="py-2 pr-2">#</th><th className="py-2 pr-2">Date</th><th className="py-2 pr-2">File no.</th><th className="py-2 pr-2">Vehicle / customer</th>
                                        <th className="py-2 pr-2">Service</th><th className="py-2 pr-2">Route</th><th className="py-2 pr-2">Status</th><th className="py-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.cases.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-500">No cases this month.</td></tr>}
                                    {data.cases.map((c, i) => (
                                        <tr key={c._id} className="border-b border-gray-100 align-top">
                                            <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
                                            <td className="whitespace-nowrap py-2 pr-2">{new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                            <td className="py-2 pr-2"><Link to={`/showrm/viewmore/${c._id}`} className="no-print font-semibold text-primary">{c.fileNumber}</Link><span className="hidden print:inline">{c.fileNumber}</span></td>
                                            <td className="py-2 pr-2">{c.vehicle}<div className="text-xs text-gray-500">{c.customer}</div></td>
                                            <td className="py-2 pr-2">{c.service}{c.category ? <div className="text-xs text-gray-500">{c.category}</div> : null}</td>
                                            <td className="py-2 pr-2 text-xs">{c.route}{c.distance ? <div className="text-gray-500">{c.distance} km</div> : null}</td>
                                            <td className="py-2 pr-2 text-xs">{c.status}{c.cashPending ? <div className="text-amber-600">cash pending</div> : null}</td>
                                            <td className="py-2 text-right tabular-nums">{c.status === 'Order Completed' ? inr(c.amount) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {data.cases.length > 0 && (
                                    <tfoot>
                                        <tr className="font-semibold"><td colSpan={7} className="py-3 text-right">Total for completed cases</td><td className="py-3 text-right tabular-nums">{inr(data.totals.amount)}</td></tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        <p className="mt-4 text-[11px] text-gray-500">Generated {new Date().toLocaleString('en-IN')} from RSA Kerala records. This is a statement of cases, not a tax invoice.</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default MonthlyStatement;
