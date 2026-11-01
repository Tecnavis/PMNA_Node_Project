import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import { BASE_URL } from '../../config/axiosConfig';
import { ACTIONS, ALL_PAGES, pageDefault, pageKey } from '../../config/menu';
import { isAdminLogin, loadPermissions } from '../../utils/access';

type Perms = Record<string, boolean>;
type RoleRow = { _id: string; name: string; permissions: Perms; staffCount: number };
type StaffRow = { _id: string; name: string; userName: string; phone: string; role: { _id: string; name: string } | null; permissions: Perms };
type Tri = 'inherit' | 'allow' | 'block';

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
const triOf = (p: Perms, key: string): Tri => (p[key] === true ? 'allow' : p[key] === false ? 'block' : 'inherit');

const TriSwitch: React.FC<{ value: Tri; onChange: (v: Tri) => void; inheritLabel: string; inheritAllowed: boolean }> = ({ value, onChange, inheritLabel, inheritAllowed }) => (
    <div className="inline-flex shrink-0 rounded-full border border-[#e3e6ec] bg-white p-0.5 text-xs font-semibold dark:border-[#253b5c] dark:bg-black" role="radiogroup">
        {(
            [
                ['inherit', `${inheritLabel}: ${inheritAllowed ? 'on' : 'off'}`],
                ['allow', 'Allow'],
                ['block', 'Block'],
            ] as [Tri, string][]
        ).map(([v, label]) => (
            <button
                key={v}
                type="button"
                role="radio"
                aria-checked={value === v}
                onClick={() => onChange(v)}
                className={`rounded-full px-3 py-1 transition ${
                    value === v ? (v === 'allow' ? 'bg-success text-white' : v === 'block' ? 'bg-brand text-white' : 'bg-[#eef0f3] text-[#111318] dark:bg-[#1a2941] dark:text-white') : 'text-[#8a90a2] hover:text-[#111318]'
                }`}
            >
                {label}
            </button>
        ))}
    </div>
);

const StaffPermissions: React.FC = () => {
    const dispatch = useDispatch();
    const [mode, setMode] = useState<'roles' | 'staff'>('roles');
    const [roles, setRoles] = useState<RoleRow[]>([]);
    const [staff, setStaff] = useState<StaffRow[]>([]);
    const [selected, setSelected] = useState<string>('');
    const [draft, setDraft] = useState<Perms>({});
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Staff permissions'));
    }, [dispatch]);

    const load = async () => {
        try {
            const [r, s] = await Promise.all([axios.get(`${BASE_URL}/permissions/roles`, auth()), axios.get(`${BASE_URL}/permissions/staff`, auth())]);
            setRoles(r.data?.roles || []);
            setStaff(s.data?.staff || []);
            setError('');
        } catch (e: any) {
            setError(e?.response?.status === 403 ? 'Only the admin login can change permissions.' : 'Could not load roles and staff.');
        }
    };
    useEffect(() => {
        if (isAdminLogin()) load();
    }, []);

    const current = mode === 'roles' ? roles.find((r) => r._id === selected) : staff.find((s) => s._id === selected);
    const roleName = mode === 'roles' ? (current as RoleRow | undefined)?.name || '' : (current as StaffRow | undefined)?.role?.name || '';
    const rolePerms: Perms = mode === 'staff' ? roles.find((r) => r._id === (current as StaffRow | undefined)?.role?._id)?.permissions || {} : {};

    useEffect(() => {
        setDraft({ ...((current as any)?.permissions || {}) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, mode, roles, staff]);

    const saved: Perms = (current as any)?.permissions || {};
    const dirty = JSON.stringify(Object.entries(saved).sort()) !== JSON.stringify(Object.entries(draft).sort());

    // what applies when this row is left on "inherit"
    const inheritedPage = (path: string) => {
        const def = pageDefault(path, roleName);
        if (mode === 'roles') return def;
        const v = rolePerms[pageKey(path)];
        return typeof v === 'boolean' ? v : def;
    };
    const inheritedAction = (key: string) => (mode === 'roles' ? true : typeof rolePerms[key] === 'boolean' ? rolePerms[key] : true);

    const setKey = (key: string, v: Tri) =>
        setDraft((d) => {
            const n = { ...d };
            if (v === 'inherit') delete n[key];
            else n[key] = v === 'allow';
            return n;
        });

    const sections = useMemo(() => {
        const out: Record<string, { path: string; label: string }[]> = {};
        ALL_PAGES().forEach((p) => (out[p.section] = [...(out[p.section] || []), p]));
        return out;
    }, []);

    const effectiveCount = () => {
        const pages = ALL_PAGES();
        const on = pages.filter((p) => (typeof draft[pageKey(p.path)] === 'boolean' ? draft[pageKey(p.path)] : inheritedPage(p.path))).length;
        return `${on} of ${pages.length} pages`;
    };

    const save = async () => {
        if (!current) return;
        setSaving(true);
        try {
            await axios.put(`${BASE_URL}/permissions/${mode === 'roles' ? 'roles' : 'staff'}/${current._id}`, { permissions: draft }, auth());
            await load();
            loadPermissions(true);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Permissions saved', showConfirmButton: false, timer: 2200 });
        } catch (e: any) {
            Swal.fire('Not saved', e?.response?.data?.message || 'Could not save the permissions', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isAdminLogin()) {
        return (
            <div className="panel mx-auto mt-10 max-w-md text-center">
                <h2 className="text-xl font-semibold">Admin only</h2>
                <p className="mt-1 text-sm text-[#5d6375]">Only the admin login can change staff permissions.</p>
            </div>
        );
    }

    const list =
        mode === 'roles'
            ? roles.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase())).map((r) => ({ id: r._id, title: r.name, sub: `${r.staffCount} staff`, changed: Object.keys(r.permissions || {}).length }))
            : staff
                  .filter((s) => !search || `${s.name} ${s.userName} ${s.phone} ${s.role?.name || ''}`.toLowerCase().includes(search.toLowerCase()))
                  .map((s) => ({ id: s._id, title: s.name, sub: `${s.role?.name || 'No role'} · ${s.userName}`, changed: Object.keys(s.permissions || {}).length }));

    const inheritLabel = mode === 'roles' ? 'Default' : 'Role';

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="ui-eyebrow">Settings / Staff permissions</div>
                    <h1 className="mt-1 text-[34px] font-normal leading-tight tracking-tight text-[#111318] dark:text-white">Staff permissions</h1>
                    <p className="text-sm text-[#5d6375]">Choose what each role — or one staff member — can open and do. Anything you leave on “{inheritLabel}” keeps working as it does today.</p>
                </div>
                <div className="inline-flex rounded-full border border-[#e3e6ec] bg-white p-1 dark:border-[#253b5c] dark:bg-black">
                    {(['roles', 'staff'] as const).map((m) => (
                        <button key={m} type="button" onClick={() => { setMode(m); setSelected(''); setSearch(''); }} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${mode === m ? 'ui-tab-active' : 'text-[#5d6375] hover:text-brand'}`}>
                            {m === 'roles' ? 'By role' : 'By staff member'}
                        </button>
                    ))}
                </div>
            </div>
            {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
                <div className="panel !p-4">
                    <input className="form-input mb-3" placeholder={mode === 'roles' ? 'Find role' : 'Find staff (name, phone, role)'} value={search} onChange={(e) => setSearch(e.target.value)} />
                    <div className="max-h-[65vh] space-y-1.5 overflow-y-auto">
                        {list.length === 0 && <p className="py-6 text-center text-sm text-white-dark">Nothing found.</p>}
                        {list.map((x) => (
                            <button key={x.id} type="button" onClick={() => setSelected(x.id)} className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${selected === x.id ? 'border-brand/40 bg-brand-soft' : 'border-transparent hover:bg-[#f5f6f8] dark:hover:bg-[#1a2941]/50'}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-semibold capitalize">{x.title}</span>
                                    {x.changed > 0 && <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary">{x.changed} changed</span>}
                                </div>
                                <div className="truncate text-xs text-[#8a90a2]">{x.sub}</div>
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-[11px] text-[#8a90a2]">The admin login always has full access. A staff member's own setting wins over their role's.</p>
                </div>

                <div className="panel">
                    {!current ? (
                        <div className="py-16 text-center text-sm text-[#5d6375]">Choose a {mode === 'roles' ? 'role' : 'staff member'} on the left.</div>
                    ) : (
                        <>
                            <div className="sticky top-16 z-[5] -mx-5 -mt-5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-t-[18px] border-b border-[#eceef2] bg-white/95 px-5 py-4 backdrop-blur dark:border-[#1b2e4b] dark:bg-[#0e1726]/95">
                                <div>
                                    <div className="text-lg font-semibold capitalize">{mode === 'roles' ? (current as RoleRow).name : (current as StaffRow).name}</div>
                                    <div className="text-xs text-[#8a90a2]">
                                        {mode === 'staff' && <span className="capitalize">Role: {roleName || 'none'} · </span>}
                                        {effectiveCount()} · {Object.keys(draft).length} setting{Object.keys(draft).length === 1 ? '' : 's'} changed
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setDraft({})} disabled={!Object.keys(draft).length}>Reset all to {inheritLabel.toLowerCase()}</button>
                                    <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
                                </div>
                            </div>

                            <div className="ui-eyebrow mb-2">Pages in the menu</div>
                            <div className="space-y-4">
                                {Object.entries(sections).map(([section, pages]) => (
                                    <div key={section} className="rounded-2xl border border-[#eceef2] dark:border-[#1b2e4b]">
                                        <div className="flex items-center justify-between gap-2 border-b border-[#eceef2] px-4 py-2.5 dark:border-[#1b2e4b]">
                                            <span className="font-semibold capitalize">{section}</span>
                                            <span className="flex gap-3 text-xs font-semibold">
                                                <button type="button" className="text-success" onClick={() => pages.forEach((p) => setKey(pageKey(p.path), 'allow'))}>Allow all</button>
                                                <button type="button" className="text-brand" onClick={() => pages.forEach((p) => setKey(pageKey(p.path), 'block'))}>Block all</button>
                                                <button type="button" className="text-[#8a90a2]" onClick={() => pages.forEach((p) => setKey(pageKey(p.path), 'inherit'))}>Reset</button>
                                            </span>
                                        </div>
                                        <ul className="divide-y divide-[#f1f2f5] dark:divide-[#1b2e4b]">
                                            {pages.map((p) => (
                                                <li key={p.path} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                                                    <span>
                                                        <span className="block text-sm font-medium">{p.label}</span>
                                                        <span className="block font-mono text-[11px] text-[#b0b5c2]">{p.path}</span>
                                                    </span>
                                                    <TriSwitch value={triOf(draft, pageKey(p.path))} onChange={(v) => setKey(pageKey(p.path), v)} inheritLabel={inheritLabel} inheritAllowed={inheritedPage(p.path)} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            <div className="ui-eyebrow mb-2 mt-6">Actions (also checked by the server)</div>
                            <ul className="divide-y divide-[#f1f2f5] rounded-2xl border border-[#eceef2] dark:divide-[#1b2e4b] dark:border-[#1b2e4b]">
                                {ACTIONS.map((a) => (
                                    <li key={a.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                                        <span>
                                            <span className="block text-sm font-medium">{a.label}</span>
                                            {a.hint && <span className="block text-[11px] text-[#8a90a2]">{a.hint}</span>}
                                        </span>
                                        <TriSwitch value={triOf(draft, a.key)} onChange={(v) => setKey(a.key, v)} inheritLabel={inheritLabel} inheritAllowed={inheritedAction(a.key)} />
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 text-[11px] text-[#8a90a2]">Changes apply within a minute, without logging out. Blocked actions show “Your account is not allowed to …” if someone tries them.</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaffPermissions;
