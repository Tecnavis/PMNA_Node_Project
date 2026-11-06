import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Pager } from '../../components/ui/ListControls';
import { blocked } from '../../utils/access';
import {
    ExecRow,
    ShowroomRow,
    TaskCounts,
    TaskRow,
    TaskType,
    TYPE_LABEL,
    assignShowrooms,
    cancelTask,
    createTask,
    errorText,
    fmtDay,
    getExecutives,
    getShowrooms,
    getTasks,
    istDay,
    unassignShowrooms,
    updateTask,
} from './execTasksApi';

/**
 * Admin / staff: put showrooms under a marketing executive and give them tasks.
 * Visits close their task by themselves when the executive records the visit in the app;
 * "Add showrooms" tasks close when the executive has added that many new showrooms.
 */

const toast = (title: string, icon: 'success' | 'error' | 'info' = 'success') => Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2600 });

const Modal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ open, title, onClose, children, footer, wide }) => {
    useEffect(() => {
        if (!open) return;
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={onClose}>
            <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-3xl bg-white shadow-2xl dark:bg-[#0e1726]`} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
                <div className="flex items-center justify-between border-b border-[#eceef2] px-6 py-4 dark:border-[#1b2e4b]">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button type="button" className="rounded-full p-1 text-xl leading-none text-[#8a90a2] hover:bg-[#f5f6f8]" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
                {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#eceef2] px-6 py-4 dark:border-[#1b2e4b]">{footer}</div>}
            </div>
        </div>
    );
};

const Field: React.FC<{ label: string; error?: string; hint?: string; children: React.ReactNode }> = ({ label, error, hint, children }) => (
    <label className="block">
        <span className="mb-1 block text-sm font-semibold text-[#3b4153] dark:text-white-dark">{label}</span>
        {children}
        {error ? <span className="mt-1 block text-xs font-semibold text-brand">{error}</span> : hint ? <span className="mt-1 block text-xs text-[#8a90a2]">{hint}</span> : null}
    </label>
);

/** Searchable list of showrooms with checkboxes (or single choice). */
const ShowroomPicker: React.FC<{ selected: string[]; onChange: (ids: string[], rows: ShowroomRow[]) => void; single?: boolean; forExecutive?: string }> = ({ selected, onChange, single, forExecutive }) => {
    const [search, setSearch] = useState('');
    const [scope, setScope] = useState<'all' | 'unassigned' | 'mine'>('all');
    const [rows, setRows] = useState<ShowroomRow[] | null>(null);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [known, setKnown] = useState<Record<string, ShowroomRow>>({});
    useEffect(() => {
        const t = setTimeout(() => {
            setRows(null);
            getShowrooms({ search, scope, executive: scope === 'mine' ? forExecutive : undefined, page, limit: 30 })
                .then((r) => {
                    setRows(r.data);
                    setPages(r.pages);
                    setKnown((k) => ({ ...k, ...Object.fromEntries(r.data.map((s) => [s._id, s])) }));
                })
                .catch(() => setRows([]));
        }, 300);
        return () => clearTimeout(t);
    }, [search, scope, page, forExecutive]);
    const toggle = (s: ShowroomRow) => {
        const next = single ? [s._id] : selected.includes(s._id) ? selected.filter((x) => x !== s._id) : [...selected, s._id];
        onChange(next, next.map((id) => known[id] || s));
    };
    const pageIds = (rows || []).map((s) => s._id);
    const allOnPage = !single && pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    return (
        <div className="rounded-2xl border border-[#e3e6ec] dark:border-[#1b2e4b]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#eceef2] p-3 dark:border-[#1b2e4b]">
                <input className="form-input min-w-[180px] flex-1" placeholder="Search showroom name, code, place, district" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                {(['all', 'unassigned', ...(forExecutive ? ['mine'] : [])] as ('all' | 'unassigned' | 'mine')[]).map((s) => (
                    <button key={s} type="button" className={`ui-chip ${scope === s ? 'ui-chip-active' : ''}`} onClick={() => { setScope(s); setPage(1); }}>
                        {s === 'all' ? 'All' : s === 'unassigned' ? 'No executive' : 'Already theirs'}
                    </button>
                ))}
            </div>
            {!single && (
                <div className="flex items-center justify-between px-3 pt-2 text-xs text-[#8a90a2]">
                    <button
                        type="button"
                        className="font-semibold text-primary disabled:opacity-40"
                        disabled={!pageIds.length}
                        onClick={() => {
                            const next = allOnPage ? selected.filter((id) => !pageIds.includes(id)) : [...new Set([...selected, ...pageIds])];
                            onChange(next, next.map((id) => known[id]).filter(Boolean));
                        }}
                    >
                        {allOnPage ? 'Unselect this page' : 'Select this page'}
                    </button>
                    <span>{selected.length} selected</span>
                </div>
            )}
            <ul className="max-h-72 divide-y divide-[#f1f2f5] overflow-y-auto dark:divide-[#1b2e4b]">
                {!rows && <li className="p-4 text-center text-sm text-white-dark">Loading…</li>}
                {rows && rows.length === 0 && <li className="p-4 text-center text-sm text-white-dark">No showrooms found</li>}
                {(rows || []).map((s) => {
                    const on = selected.includes(s._id);
                    return (
                        <li key={s._id}>
                            <button type="button" onClick={() => toggle(s)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f7f8fa] dark:hover:bg-[#1a2941]/40 ${on ? 'bg-brand-soft dark:bg-[#1a2941]' : ''}`}>
                                <input type={single ? 'radio' : 'checkbox'} readOnly checked={on} className={single ? 'form-radio' : 'form-checkbox'} tabIndex={-1} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold">{s.name}</span>
                                    <span className="block truncate text-xs text-[#8a90a2]">{[s.code, s.district || s.location].filter(Boolean).join(' · ')}</span>
                                </span>
                                <span className="shrink-0 text-right text-xs">
                                    {s.lookedAfterBy ? (
                                        <span className="ui-chip !py-0.5">{s.lookedAfterBy.name}</span>
                                    ) : (
                                        <span className="text-brand">No executive</span>
                                    )}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            {pages > 1 && (
                <div className="flex items-center justify-between border-t border-[#eceef2] px-3 py-2 text-xs dark:border-[#1b2e4b]">
                    <button type="button" className="font-semibold text-primary disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Previous</button>
                    <span>Page {page} of {pages}</span>
                    <button type="button" className="font-semibold text-primary disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next ›</button>
                </div>
            )}
        </div>
    );
};

const TABS: { key: string; label: string; countKey?: keyof TaskCounts }[] = [
    { key: 'open', label: 'Open', countKey: 'open' },
    { key: 'overdue', label: 'Overdue', countKey: 'overdue' },
    { key: 'done', label: 'Done', countKey: 'done' },
    { key: 'cancelled', label: 'Cancelled', countKey: 'cancelled' },
    { key: 'all', label: 'All' },
];

const ExecTasks: React.FC = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Executive tasks'));
    }, [dispatch]);
    const readOnly = blocked('executives.assign');

    const [execs, setExecs] = useState<ExecRow[] | null>(null);
    const [unassigned, setUnassigned] = useState(0);
    const [execId, setExecId] = useState('');
    const [status, setStatus] = useState('open');
    const [type, setType] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [tasks, setTasks] = useState<TaskRow[] | null>(null);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<TaskCounts>({ open: 0, overdue: 0, done: 0, cancelled: 0 });
    const [error, setError] = useState('');
    const [view, setView] = useState<'tasks' | 'showrooms'>('tasks');
    const [reload, setReload] = useState(0);
    const refresh = () => setReload((n) => n + 1);

    // modals
    const [assignOpen, setAssignOpen] = useState(false);
    const [taskOpen, setTaskOpen] = useState(false);

    useEffect(() => {
        getExecutives()
            .then((r) => {
                setExecs(r.list);
                setUnassigned(r.unassigned);
            })
            .catch((e) => {
                setExecs([]);
                setError(errorText(e, 'Could not load executives'));
            });
    }, [reload]);

    useEffect(() => {
        const t = setTimeout(() => {
            setTasks(null);
            getTasks({ executive: execId || undefined, status, type: type || undefined, search: search || undefined, page, limit: pageSize })
                .then((r) => {
                    setTasks(r.data);
                    setTotal(r.total);
                    setCounts(r.counts);
                    setError('');
                })
                .catch((e) => {
                    setTasks([]);
                    setError(errorText(e, 'Could not load tasks'));
                });
        }, 250);
        return () => clearTimeout(t);
    }, [execId, status, type, search, page, pageSize, reload]);

    const exec = useMemo(() => (execs || []).find((e) => e._id === execId) || null, [execs, execId]);

    const closeTask = async (t: TaskRow) => {
        const r = await Swal.fire({ title: 'Mark as done?', input: 'textarea', inputLabel: 'Note (what was done)', inputPlaceholder: 'Optional', showCancelButton: true, confirmButtonText: 'Mark done' });
        if (!r.isConfirmed) return;
        try {
            await updateTask(t._id, { status: 'done', note: r.value || 'Closed by the office' });
            toast('Task marked done');
            refresh();
        } catch (e) {
            toast(errorText(e), 'error');
        }
    };
    const cancel = async (t: TaskRow) => {
        const r = await Swal.fire({ title: 'Cancel this task?', text: t.title, icon: 'warning', showCancelButton: true, confirmButtonText: 'Cancel task', cancelButtonText: 'Keep' });
        if (!r.isConfirmed) return;
        try {
            await cancelTask(t._id);
            toast('Task cancelled');
            refresh();
        } catch (e) {
            toast(errorText(e), 'error');
        }
    };
    const reopen = async (t: TaskRow) => {
        try {
            await updateTask(t._id, { status: 'open' });
            toast('Task opened again');
            refresh();
        } catch (e) {
            toast(errorText(e), 'error');
        }
    };
    const changeDue = async (t: TaskRow) => {
        const r = await Swal.fire({
            title: 'Due date',
            input: 'date',
            inputValue: t.dueDate ? istDay(new Date(t.dueDate)) : '',
            showCancelButton: true,
            showDenyButton: !!t.dueDate,
            denyButtonText: 'No due date',
            confirmButtonText: 'Save',
        });
        if (r.isDismissed) return;
        try {
            await updateTask(t._id, { dueDate: r.isDenied ? null : r.value || null });
            toast('Due date saved');
            refresh();
        } catch (e) {
            toast(errorText(e), 'error');
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="ui-eyebrow">Marketing Executives / Tasks</div>
                    <h1 className="mt-1 text-[34px] font-normal leading-tight tracking-tight text-[#111318] dark:text-white">Executive tasks</h1>
                    <p className="text-sm text-[#5d6375]">Put showrooms under an executive and give them work. Visits close by themselves when the executive records the visit in the app.</p>
                </div>
                {!readOnly && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-outline-primary" onClick={() => setTaskOpen(true)} disabled={!execs?.length}>
                            + New task
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => setAssignOpen(true)} disabled={!execs?.length}>
                            Assign showrooms
                        </button>
                    </div>
                )}
            </div>
            {readOnly && <div className="rounded-2xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#5d6375] dark:bg-[#1a2941]/50">You can see tasks, but giving showrooms or tasks to executives is switched off for your login.</div>}
            {error && <div className="rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">{error}</div>}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_1fr]">
                {/* executives */}
                <div className="panel !p-2">
                    <button type="button" onClick={() => { setExecId(''); setPage(1); setView('tasks'); }} className={`mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left ${!execId ? 'bg-brand-soft text-brand dark:bg-[#1a2941]' : 'hover:bg-[#f5f6f8] dark:hover:bg-[#1a2941]/40'}`}>
                        <span className="font-semibold">All executives</span>
                        {unassigned > 0 && <span className="text-xs">{unassigned} showroom{unassigned === 1 ? '' : 's'} with no executive</span>}
                    </button>
                    {!execs && <p className="p-4 text-center text-sm text-white-dark">Loading…</p>}
                    {execs && execs.length === 0 && <p className="p-4 text-center text-sm text-white-dark">No marketing executives yet.</p>}
                    <ul className="max-h-[560px] space-y-1 overflow-y-auto">
                        {(execs || []).map((e) => (
                            <li key={e._id}>
                                <button type="button" onClick={() => { setExecId(e._id); setPage(1); }} className={`w-full rounded-2xl px-3 py-2.5 text-left ${execId === e._id ? 'bg-brand-soft dark:bg-[#1a2941]' : 'hover:bg-[#f5f6f8] dark:hover:bg-[#1a2941]/40'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`truncate font-semibold ${execId === e._id ? 'text-brand' : ''}`}>{e.name}</span>
                                        <span className="shrink-0 text-xs text-[#8a90a2]">{e.showrooms} showroom{e.showrooms === 1 ? '' : 's'}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                                        <span className="text-[#8a90a2]">{e.phone}</span>
                                        {e.openTasks > 0 && <span className="rounded-full bg-[#eef0f3] px-2 font-semibold text-[#3b4153] dark:bg-[#1b2e4b] dark:text-white-dark">{e.openTasks} open</span>}
                                        {e.overdueTasks > 0 && <span className="rounded-full bg-brand px-2 font-semibold text-white">{e.overdueTasks} overdue</span>}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="space-y-4">
                    {exec && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" className={`ui-chip ${view === 'tasks' ? 'ui-chip-active' : ''}`} onClick={() => setView('tasks')}>Tasks of {exec.name}</button>
                            <button type="button" className={`ui-chip ${view === 'showrooms' ? 'ui-chip-active' : ''}`} onClick={() => setView('showrooms')}>Showrooms of {exec.name} ({exec.showrooms})</button>
                        </div>
                    )}

                    {view === 'showrooms' && exec ? (
                        <ExecShowrooms exec={exec} readOnly={readOnly} onChanged={refresh} reloadKey={reload} />
                    ) : (
                        <div className="panel">
                            <div className="flex flex-wrap items-center gap-2">
                                {TABS.map((t) => (
                                    <button key={t.key} type="button" className={`ui-chip ${status === t.key ? 'ui-chip-active' : ''}`} onClick={() => { setStatus(t.key); setPage(1); }}>
                                        {t.label}
                                        {t.countKey && <span className={`ml-1.5 rounded-full px-1.5 text-[11px] ${t.key === 'overdue' && counts.overdue ? 'bg-brand text-white' : 'bg-black/5 dark:bg-white/10'}`}>{counts[t.countKey]}</span>}
                                    </button>
                                ))}
                                <div className="ml-auto flex flex-wrap gap-2">
                                    <select className="form-select w-40" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Task type">
                                        <option value="">All types</option>
                                        {(Object.keys(TYPE_LABEL) as TaskType[]).map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
                                    </select>
                                    <input className="form-input w-56" placeholder="Search task or showroom" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                                </div>
                            </div>

                            <div className="table-responsive mt-4">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#eceef2] text-left dark:border-[#1b2e4b]">
                                            <th className="px-3 py-2.5">Task</th>
                                            {!execId && <th className="px-3 py-2.5">Executive</th>}
                                            <th className="px-3 py-2.5">Due</th>
                                            <th className="px-3 py-2.5">Status</th>
                                            <th className="px-3 py-2.5 text-right"> </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!tasks && <tr><td colSpan={5} className="py-10 text-center text-white-dark">Loading…</td></tr>}
                                        {tasks && tasks.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-10 text-center text-white-dark">
                                                    No {status === 'all' ? '' : TABS.find((t) => t.key === status)?.label.toLowerCase()} tasks{exec ? ` for ${exec.name}` : ''}.
                                                </td>
                                            </tr>
                                        )}
                                        {(tasks || []).map((t) => (
                                            <tr key={t._id} className="border-b border-[#f1f2f5] align-top dark:border-[#1b2e4b]">
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="ui-chip !py-0.5 text-[11px]">{TYPE_LABEL[t.type]}</span>
                                                        {t.priority === 'high' && t.status === 'open' && <span className="rounded-full bg-brand px-2 text-[11px] font-semibold text-white">Urgent</span>}
                                                    </div>
                                                    <div className="mt-1 font-semibold text-[#111318] dark:text-white">{t.title}</div>
                                                    {t.showroom && <div className="text-xs text-[#8a90a2]">{[t.showroom.name, t.showroom.code, t.showroom.district].filter(Boolean).join(' · ')}</div>}
                                                    {t.type === 'onboard' && (
                                                        <div className="mt-1.5 w-48">
                                                            <div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f3]"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (t.progress / Math.max(1, t.target)) * 100)}%` }} /></div>
                                                            <div className="mt-0.5 text-[11px] text-[#8a90a2]">{t.progress} of {t.target} added</div>
                                                        </div>
                                                    )}
                                                    {t.notes && <div className="mt-1 text-xs text-[#5d6375]">{t.notes}</div>}
                                                    <div className="mt-1 text-[11px] text-[#8a90a2]">Given {fmtDay(t.createdAt)}{t.assignedBy ? ` by ${t.assignedBy}` : ''}</div>
                                                </td>
                                                {!execId && <td className="px-3 py-3"><div className="font-semibold">{t.executive.name}</div><div className="text-xs text-[#8a90a2]">{t.executive.phone}</div></td>}
                                                <td className={`px-3 py-3 whitespace-nowrap ${t.overdue ? 'font-semibold text-brand' : ''}`}>
                                                    {t.dueDate ? fmtDay(t.dueDate) : <span className="text-[#8a90a2]">No date</span>}
                                                    {t.overdue && <div className="text-[11px]">Overdue</div>}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {t.status === 'open' && <span className="ui-chip !py-0.5">Open</span>}
                                                    {t.status === 'done' && (
                                                        <div>
                                                            <span className="inline-block rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">Done</span>
                                                            <div className="mt-1 text-[11px] text-[#8a90a2]">{fmtDay(t.completedAt)} · {t.completedBy === 'auto' ? 'automatically' : t.completedBy === 'executive' ? 'by executive' : `by ${t.completedBy}`}</div>
                                                            {t.completionNote && <div className="text-[11px] text-[#5d6375]">{t.completionNote}</div>}
                                                        </div>
                                                    )}
                                                    {t.status === 'cancelled' && <span className="inline-block rounded-full bg-[#eef0f3] px-2.5 py-0.5 text-xs font-semibold text-[#8a90a2]">Cancelled</span>}
                                                </td>
                                                <td className="px-3 py-3 text-right whitespace-nowrap">
                                                    {!readOnly && t.status === 'open' && (
                                                        <div className="flex justify-end gap-1.5">
                                                            <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => changeDue(t)}>Due date</button>
                                                            <button type="button" className="btn btn-outline-success btn-sm" onClick={() => closeTask(t)}>Done</button>
                                                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => cancel(t)}>Cancel</button>
                                                        </div>
                                                    )}
                                                    {!readOnly && t.status !== 'open' && <button type="button" className="text-xs font-semibold text-primary" onClick={() => reopen(t)}>Open again</button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pager page={page} pageCount={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
                        </div>
                    )}
                </div>
            </div>

            {assignOpen && execs && <AssignModal execs={execs} defaultExec={execId} onClose={() => setAssignOpen(false)} onDone={() => { setAssignOpen(false); refresh(); }} />}
            {taskOpen && execs && <TaskModal execs={execs} defaultExec={execId} onClose={() => setTaskOpen(false)} onDone={() => { setTaskOpen(false); refresh(); }} />}
        </div>
    );
};

/** Showrooms an executive looks after, with "take back". */
const ExecShowrooms: React.FC<{ exec: ExecRow; readOnly: boolean; onChanged: () => void; reloadKey: number }> = ({ exec, readOnly, onChanged, reloadKey }) => {
    const [rows, setRows] = useState<ShowroomRow[] | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [sel, setSel] = useState<string[]>([]);
    const load = useCallback(() => {
        setRows(null);
        getShowrooms({ executive: exec._id, scope: 'mine', search, page, limit: 25 })
            .then((r) => { setRows(r.data); setTotal(r.total); })
            .catch(() => setRows([]));
    }, [exec._id, search, page]);
    useEffect(() => {
        const t = setTimeout(load, 250);
        return () => clearTimeout(t);
    }, [load, reloadKey]);
    useEffect(() => setSel([]), [exec._id]);

    const takeBack = async () => {
        const r = await Swal.fire({
            title: `Take ${sel.length} showroom${sel.length === 1 ? '' : 's'} back?`,
            text: 'Each goes back to the executive who added it (or to no executive). Open tasks stay as they are.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Take back',
        });
        if (!r.isConfirmed) return;
        try {
            const res = await unassignShowrooms(sel);
            toast(res.message);
            setSel([]);
            onChanged();
            load();
        } catch (e) {
            toast(errorText(e), 'error');
        }
    };

    return (
        <div className="panel">
            <div className="flex flex-wrap items-center gap-2">
                <input className="form-input w-64" placeholder="Search showroom" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                <span className="text-sm text-[#8a90a2]">{total} showroom{total === 1 ? '' : 's'} with {exec.name}</span>
                {!readOnly && sel.length > 0 && <button type="button" className="btn btn-outline-danger btn-sm ml-auto" onClick={takeBack}>Take back {sel.length}</button>}
            </div>
            <div className="table-responsive mt-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#eceef2] text-left dark:border-[#1b2e4b]">
                            {!readOnly && <th className="w-8 px-3 py-2.5" />}
                            <th className="px-3 py-2.5">Showroom</th>
                            <th className="px-3 py-2.5">How</th>
                            <th className="px-3 py-2.5">Last visit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!rows && <tr><td colSpan={4} className="py-10 text-center text-white-dark">Loading…</td></tr>}
                        {rows && rows.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-white-dark">No showrooms yet. Use “Assign showrooms”.</td></tr>}
                        {(rows || []).map((s) => (
                            <tr key={s._id} className="border-b border-[#f1f2f5] dark:border-[#1b2e4b]">
                                {!readOnly && (
                                    <td className="px-3 py-2.5">
                                        {s.lookedAfterBy?.how === 'assigned' && (
                                            <input type="checkbox" className="form-checkbox" checked={sel.includes(s._id)} onChange={() => setSel(sel.includes(s._id) ? sel.filter((x) => x !== s._id) : [...sel, s._id])} aria-label={`Select ${s.name}`} />
                                        )}
                                    </td>
                                )}
                                <td className="px-3 py-2.5"><div className="font-semibold">{s.name}</div><div className="text-xs text-[#8a90a2]">{[s.code, s.district || s.location, s.phone].filter(Boolean).join(' · ')}</div></td>
                                <td className="px-3 py-2.5 text-xs">{s.lookedAfterBy?.how === 'assigned' ? <span>Given by office{s.addedBy ? ` (added by ${s.addedBy.name})` : ''}</span> : <span className="text-[#8a90a2]">Added by them</span>}</td>
                                <td className="px-3 py-2.5 text-xs">{s.lastVisitAt ? fmtDay(s.lastVisitAt) : <span className="text-brand">Never visited</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pager page={page} pageCount={Math.max(1, Math.ceil(total / 25))} total={total} pageSize={25} onPage={setPage} />
        </div>
    );
};

const AssignModal: React.FC<{ execs: ExecRow[]; defaultExec: string; onClose: () => void; onDone: () => void }> = ({ execs, defaultExec, onClose, onDone }) => {
    const [executiveId, setExecutiveId] = useState(defaultExec);
    const [ids, setIds] = useState<string[]>([]);
    const [rows, setRows] = useState<ShowroomRow[]>([]);
    const [visitTask, setVisitTask] = useState(true);
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('normal');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const others = rows.filter((s) => s.lookedAfterBy && s.lookedAfterBy._id !== executiveId);
    useEffect(() => {
        setErrors((e) => {
            const n = { ...e };
            if (executiveId) delete n.executive;
            if (ids.length) delete n.showrooms;
            if (!dueDate || dueDate >= istDay()) delete n.due;
            return n;
        });
    }, [executiveId, ids, dueDate]);

    const save = async () => {
        const er: Record<string, string> = {};
        if (!executiveId) er.executive = 'Executive is not selected';
        if (!ids.length) er.showrooms = 'No showroom is selected';
        if (dueDate && dueDate < istDay()) er.due = 'Due date is in the past';
        setErrors(er);
        if (Object.keys(er).length) return;
        setBusy(true);
        try {
            const r = await assignShowrooms({ executiveId, showroomIds: ids, visitTask, dueDate: visitTask ? dueDate || undefined : undefined, notes: visitTask ? notes : undefined, priority });
            toast(r.message);
            onDone();
        } catch (e) {
            setErrors({ form: errorText(e, 'Could not assign') });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            wide
            title="Assign showrooms"
            onClose={onClose}
            footer={
                <>
                    {errors.form && <span className="mr-auto text-sm font-semibold text-brand">{errors.form}</span>}
                    <button type="button" className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : `Assign ${ids.length || ''} showroom${ids.length === 1 ? '' : 's'}`}</button>
                </>
            }
        >
            <div className="space-y-4">
                <Field label="Executive *" error={errors.executive}>
                    <select className="form-select" value={executiveId} onChange={(e) => setExecutiveId(e.target.value)}>
                        <option value="">Choose…</option>
                        {execs.map((e) => <option key={e._id} value={e._id}>{e.name} — {e.showrooms} showrooms</option>)}
                    </select>
                </Field>
                <Field label="Showrooms *" error={errors.showrooms}>
                    <ShowroomPicker selected={ids} onChange={(next, r) => { setIds(next); setRows(r); }} forExecutive={executiveId || undefined} />
                </Field>
                {others.length > 0 && (
                    <p className="rounded-2xl bg-warning/10 px-3 py-2 text-xs text-warning">
                        {others.length} of these {others.length === 1 ? 'is' : 'are'} now with another executive ({[...new Set(others.map((s) => s.lookedAfterBy?.name))].join(', ')}). They will move to the one you chose. The person who added a showroom keeps the credit in reports.
                    </p>
                )}
                <div className="rounded-2xl bg-[#f7f8fa] p-4 dark:bg-[#1a2941]/40">
                    <label className="flex items-center gap-2 font-semibold">
                        <input type="checkbox" className="form-checkbox" checked={visitTask} onChange={(e) => setVisitTask(e.target.checked)} />
                        Also give a visit task for each showroom
                    </label>
                    {visitTask && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Visit by" error={errors.due} hint="Leave empty for no due date">
                                <input type="date" className="form-input" value={dueDate} min={istDay()} onChange={(e) => setDueDate(e.target.value)} />
                            </Field>
                            <Field label="Priority">
                                <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                                    <option value="normal">Normal</option>
                                    <option value="high">Urgent</option>
                                </select>
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Note for the executive">
                                    <textarea className="form-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Meet the service manager, collect staff list" />
                                </Field>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const TaskModal: React.FC<{ execs: ExecRow[]; defaultExec: string; onClose: () => void; onDone: () => void }> = ({ execs, defaultExec, onClose, onDone }) => {
    const [executiveId, setExecutiveId] = useState(defaultExec);
    const [type, setType] = useState<TaskType>('visit');
    const [showroomIds, setShowroomIds] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [area, setArea] = useState('');
    const [target, setTarget] = useState('5');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('normal');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const needsShowroom = type === 'visit' || type === 'follow-up';
    useEffect(() => {
        setErrors((e) => {
            const n = { ...e };
            if (executiveId) delete n.executive;
            if (showroomIds.length) delete n.showroom;
            if (title.trim() || notes.trim()) delete n.title;
            if (Number(target) >= 1) delete n.target;
            if (!dueDate || dueDate >= istDay()) delete n.due;
            return n;
        });
    }, [executiveId, showroomIds, title, notes, target, dueDate]);

    const save = async () => {
        const er: Record<string, string> = {};
        if (!executiveId) er.executive = 'Executive is not selected';
        if (needsShowroom && !showroomIds.length) er.showroom = 'Showroom is not selected';
        if (type === 'other' && !title.trim()) er.title = 'Task is not filled';
        if (type === 'follow-up' && !title.trim() && !notes.trim()) er.title = 'What to follow up is not filled';
        if (type === 'onboard' && !(Number(target) >= 1)) er.target = 'How many showrooms is not filled';
        if (dueDate && dueDate < istDay()) er.due = 'Due date is in the past';
        setErrors(er);
        if (Object.keys(er).length) return;
        setBusy(true);
        try {
            const r = await createTask({
                executiveId,
                type,
                showroomIds: needsShowroom ? showroomIds : undefined,
                title: title.trim() || undefined,
                notes: notes.trim() || undefined,
                area: type === 'onboard' ? area.trim() : undefined,
                target: type === 'onboard' ? Number(target) : undefined,
                dueDate: dueDate || undefined,
                priority,
            });
            toast(r.message);
            onDone();
        } catch (e) {
            setErrors({ form: errorText(e, 'Could not save the task') });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            wide
            title="New task"
            onClose={onClose}
            footer={
                <>
                    {errors.form && <span className="mr-auto text-sm font-semibold text-brand">{errors.form}</span>}
                    <button type="button" className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Give task'}</button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Executive *" error={errors.executive}>
                        <select className="form-select" value={executiveId} onChange={(e) => setExecutiveId(e.target.value)}>
                            <option value="">Choose…</option>
                            {execs.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Type of task *">
                        <select className="form-select" value={type} onChange={(e) => { setType(e.target.value as TaskType); setErrors({}); }}>
                            <option value="visit">Visit showroom(s)</option>
                            <option value="follow-up">Follow up with a showroom</option>
                            <option value="onboard">Add new showrooms</option>
                            <option value="other">Other</option>
                        </select>
                    </Field>
                </div>
                <p className="text-xs text-[#8a90a2]">
                    {type === 'visit' && 'One task per showroom. Each closes by itself when the executive records the visit (photo + location) in the app.'}
                    {type === 'follow-up' && 'The executive marks it done in the app with a note.'}
                    {type === 'onboard' && 'Closes by itself when the executive has added this many new showrooms from the app.'}
                    {type === 'other' && 'The executive marks it done in the app with a note.'}
                </p>
                {needsShowroom && (
                    <Field label={type === 'visit' ? 'Showrooms *' : 'Showroom *'} error={errors.showroom}>
                        <ShowroomPicker selected={showroomIds} single={type === 'follow-up'} onChange={(next) => setShowroomIds(next)} forExecutive={executiveId || undefined} />
                    </Field>
                )}
                {type === 'onboard' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="How many new showrooms *" error={errors.target}>
                            <input type="number" min={1} max={500} className="form-input" value={target} onChange={(e) => setTarget(e.target.value)} />
                        </Field>
                        <Field label="Area" hint="Where to look, e.g. Manjeri">
                            <input className="form-input" value={area} onChange={(e) => setArea(e.target.value)} />
                        </Field>
                    </div>
                )}
                <Field label={type === 'other' ? 'Task *' : 'Title'} error={errors.title} hint={type === 'other' ? undefined : 'Optional — a title is made from the type and showroom'}>
                    <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'follow-up' ? 'e.g. Collect pending payment' : type === 'other' ? 'e.g. Distribute new brochures' : ''} />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Due date" error={errors.due} hint="Leave empty for no due date">
                        <input type="date" className="form-input" value={dueDate} min={istDay()} onChange={(e) => setDueDate(e.target.value)} />
                    </Field>
                    <Field label="Priority">
                        <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                            <option value="normal">Normal</option>
                            <option value="high">Urgent</option>
                        </select>
                    </Field>
                </div>
                <Field label="Note for the executive">
                    <textarea className="form-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
            </div>
        </Modal>
    );
};

export default ExecTasks;
