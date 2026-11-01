import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DriverDay, Recommendation, fetchDriverDay } from './opsApi';

/** Each driver's cases on one day as bars on a time line (like a dispatch timeline). Suggested moves are dashed. */
const DriverDayTimeline: React.FC<{ recommendations?: Recommendation[]; onSuggestion?: (r: Recommendation) => void }> = ({ recommendations = [], onSuggestion }) => {
    const [date, setDate] = useState('');
    const [data, setData] = useState<DriverDay | null>(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        let alive = true;
        const load = () =>
            fetchDriverDay(date || undefined)
                .then((d) => alive && (setData(d), setError('')))
                .catch(() => alive && setError('Could not load the driver timeline'));
        load();
        const t = date ? undefined : window.setInterval(load, 60000);
        return () => {
            alive = false;
            if (t) window.clearInterval(t);
        };
    }, [date]);

    // visible window: 06:00–22:00, widened to fit the day's cases
    const range = useMemo(() => {
        if (!data) return null;
        const dayStart = new Date(data.start).getTime();
        let from = dayStart + 6 * 3600000;
        let to = dayStart + 22 * 3600000;
        data.people.forEach((p) =>
            p.cases.forEach((c) => {
                from = Math.min(from, new Date(c.from).getTime());
                to = Math.max(to, new Date(c.to).getTime());
            })
        );
        // whole hours in India time (UTC+5:30)
        const IST = 19800000;
        from = Math.floor((from + IST) / 3600000) * 3600000 - IST;
        to = Math.ceil((to + IST) / 3600000) * 3600000 - IST;
        return { from, to, span: Math.max(3600000, to - from) };
    }, [data]);

    const pct = (t: string | number) => (range ? ((new Date(t).getTime() - range.from) / range.span) * 100 : 0);
    const hours = range ? Array.from({ length: Math.round(range.span / 3600000) + 1 }, (_, i) => range.from + i * 3600000).filter((_, i, a) => a.length <= 12 || i % 2 === 0) : [];
    const isToday = !date;
    const people = (data?.people || []).filter((p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));
    const sugFor = (personId: string) => recommendations.filter((r) => String(r.proposed._id) === String(personId));

    return (
        <div className="panel">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h5 className="text-base font-semibold">Driver timeline</h5>
                    <p className="text-xs text-[#8a90a2]">
                        {data ? `${data.people.length} drivers with cases` : 'Loading…'} · suggestions are dashed
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input className="form-input form-input-sm w-44" placeholder="Find driver" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Find driver" />
                    <input type="date" className="form-input form-input-sm w-40" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Day" />
                    {date && <button type="button" className="ui-chip" onClick={() => setDate('')}>Today</button>}
                </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            {data && range && (
                <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                        <div className="relative ml-[180px] h-7 border-b border-[#eceef2] text-[11px] text-[#8a90a2] dark:border-[#1b2e4b]">
                            {hours.map((h) => (
                                <span key={h} className="absolute -translate-x-1/2" style={{ left: `${pct(h)}%` }}>
                                    {new Date(h).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                            ))}
                            {isToday && (
                                <span className="absolute top-0 z-[2] -translate-x-1/2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white" style={{ left: `${pct(data.now)}%` }}>
                                    {new Date(data.now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            {isToday && <div className="pointer-events-none absolute bottom-0 top-0 z-[1] w-0.5 bg-brand/60" style={{ left: `calc(180px + (100% - 180px) * ${pct(data.now) / 100})` }} />}
                            {people.length === 0 && <p className="py-8 text-center text-sm text-white-dark">No cases with a driver on this day.</p>}
                            {people.map((p) => (
                                <div key={p._id} className="flex items-center border-b border-[#f1f2f5] py-2 last:border-0 dark:border-[#1b2e4b]">
                                    <div className="flex w-[180px] shrink-0 items-center gap-2 pr-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-[11px] font-semibold dark:bg-[#1a2941]">
                                            {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold">{p.name}</div>
                                            <div className={`text-[11px] ${p.cases.some((c) => c.open) ? 'text-[#8a90a2]' : 'font-semibold text-success'}`}>
                                                {p.cases.some((c) => c.open) ? `${p.cases.length} case${p.cases.length === 1 ? '' : 's'}` : 'Available'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative h-9 flex-1 rounded-lg bg-[#f7f8fa] dark:bg-[#1a2941]/40">
                                        {p.cases.map((c) => (
                                            <Link
                                                key={c._id}
                                                to={`/openbooking/${c._id}`}
                                                title={`${c.fileNumber} · ${c.status}${c.route ? ` · ${c.route}` : ''}`}
                                                className={`absolute top-1 flex h-7 items-center overflow-hidden rounded-md px-2 text-[11px] font-semibold text-white ${
                                                    c.delayed ? 'bg-danger' : c.open ? 'bg-primary' : 'bg-[#111318] dark:bg-white dark:text-black'
                                                }`}
                                                style={{ left: `${pct(c.from)}%`, width: `max(${pct(c.to) - pct(c.from)}%, 46px)` }}
                                            >
                                                <span className="truncate">{c.fileNumber || 'Case'}</span>
                                            </Link>
                                        ))}
                                        {isToday &&
                                            sugFor(p._id).map((r, i) => (
                                                <button
                                                    key={r.case._id}
                                                    type="button"
                                                    onClick={() => onSuggestion?.(r)}
                                                    className="absolute top-1 flex h-7 items-center rounded-md border-2 border-dashed border-primary bg-white px-2 text-[11px] font-semibold text-primary hover:bg-primary-light dark:bg-black"
                                                    style={{ left: `calc(${pct(data.now)}% + ${4 + i * 96}px)` }}
                                                    title={r.kind === 'assign' ? 'Suggested: assign this case' : 'Suggested: move this case here'}
                                                >
                                                    ● {r.kind === 'assign' ? '' : '↪ '}
                                                    {r.case.fileNumber}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[#8a90a2]">
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#111318] dark:bg-white" /> Done</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> In progress</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Delayed</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-primary" /> Suggested</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDayTimeline;
