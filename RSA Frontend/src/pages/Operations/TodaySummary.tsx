import React from 'react';
import { Link } from 'react-router-dom';
import { SummaryData } from './opsApi';

const Tile: React.FC<{ label: string; value: number | string; tone?: string; hint?: string }> = ({ label, value, tone = 'text-primary', hint }) => (
    <div className="panel p-4">
        <div className="text-xs uppercase tracking-wide text-white-dark">{label}</div>
        <div className={`mt-1 text-3xl font-bold ${tone}`}>{value}</div>
        {hint && <div className="mt-1 text-xs text-white-dark">{hint}</div>}
    </div>
);

const TodaySummary: React.FC<{ data: SummaryData | null; date: string; onDate: (d: string) => void; isToday: boolean }> = ({ data, date, onDate, isToday }) => (
    <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium" htmlFor="ops-date">Day</label>
            <input id="ops-date" type="date" className="form-input w-auto" value={date} onChange={(e) => onDate(e.target.value)} />
            {!isToday && (
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onDate('')}>Back to today</button>
            )}
        </div>
        {data && (
            <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                    <Tile label="New cases" value={data.totals.created} />
                    <Tile label="Completed" value={data.totals.completed} tone="text-success" />
                    <Tile label="Cancelled / rejected" value={data.totals.cancelled} tone="text-danger" />
                    <Tile label="Open right now" value={data.totals.openNow} tone="text-warning" hint="All days" />
                    <Tile label="Scheduled ahead" value={data.totals.scheduledUpcoming} tone="text-info" />
                    <Tile label="Cash pending" value={data.totals.cashPending} tone="text-warning" hint="All days" />
                </div>
                <div className="panel">
                    <h6 className="mb-3 font-semibold dark:text-white-light">Cases per driver / provider ({data.date})</h6>
                    {data.perPerson.length === 0 ? (
                        <p className="text-sm text-white-dark">No assigned cases on this day.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th className="text-center">Cases</th>
                                        <th className="text-center">Completed</th>
                                        <th className="text-center">Still open</th>
                                        <th className="text-right">Booked amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.perPerson.map((p) => (
                                        <tr key={p._id}>
                                            <td>
                                                <Link className="text-primary hover:underline" to={p.type === 'driver' ? `/driverreport/${p._id}` : `/provider-report/${p._id}`}>
                                                    {p.name}
                                                </Link>
                                            </td>
                                            <td className="capitalize">{p.type}</td>
                                            <td className="text-center">{p.cases}</td>
                                            <td className="text-center text-success">{p.completed}</td>
                                            <td className={`text-center ${p.open ? 'text-warning' : ''}`}>{p.open}</td>
                                            <td className="text-right">₹{p.amount.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
);

export default TodaySummary;
