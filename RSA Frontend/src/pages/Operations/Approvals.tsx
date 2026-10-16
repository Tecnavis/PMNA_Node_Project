import React from 'react';
import { Link } from 'react-router-dom';
import { ApprovalsData } from './opsApi';

const money = (n?: number) => (typeof n === 'number' && !Number.isNaN(n) ? `₹${n.toLocaleString('en-IN')}` : '');
const ago = (d: string) => {
    const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m} min ago`;
    if (m < 1440) return `${Math.round(m / 60)} h ago`;
    return `${Math.round(m / 1440)} d ago`;
};

const Approvals: React.FC<{ data: ApprovalsData | null }> = ({ data }) => {
    if (!data) return null;
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.queues.map((q) => (
                <div key={q.key} className="panel flex flex-col">
                    <div className="mb-3 flex items-center justify-between">
                        <h6 className="font-semibold dark:text-white-light">{q.label}</h6>
                        <span className={`badge ${q.count ? 'bg-warning' : 'bg-success'}`}>{q.count}</span>
                    </div>
                    {q.count === 0 ? (
                        <p className="flex-1 text-sm text-white-dark">Nothing waiting. ✔</p>
                    ) : (
                        <ul className="flex-1 divide-y divide-white-light text-sm dark:divide-[#253b5c]">
                            {q.items.map((i) => (
                                <li key={i._id} className="flex items-center gap-2 py-2">
                                    <div className="min-w-0 flex-1">
                                        {i.link ? (
                                            <Link to={i.link} className="font-semibold text-primary hover:underline">{i.title}</Link>
                                        ) : (
                                            <span className="font-semibold">{i.title}</span>
                                        )}
                                        <div className="truncate text-xs text-white-dark">{[i.detail, ago(i.at)].filter(Boolean).join(' · ')}</div>
                                    </div>
                                    {money(i.amount) && <span className="shrink-0 text-xs font-semibold">{money(i.amount)}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                    <Link to={q.link} className="btn btn-sm btn-outline-primary mt-3 self-start">
                        {q.count > q.items.length ? `Open all ${q.count}` : 'Open'} →
                    </Link>
                </div>
            ))}
        </div>
    );
};

export default Approvals;
