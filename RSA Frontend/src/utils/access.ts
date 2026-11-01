import axios from 'axios';
import { useEffect, useState } from 'react';
import { BASE_URL } from '../config/axiosConfig';
import { pageDefault, pageKey } from '../config/menu';

/**
 * What the logged-in user may see/do, as set on the Staff permissions screen.
 * Only explicit settings are stored; everything else keeps the built-in rule for the role.
 * Admin logins always get the built-in rules (everything).
 */
type State = { isAdmin: boolean; role: string; permissions: Record<string, boolean>; loadedAt: number; tok?: string };
// permissions belong to one login: a different token never reuses them
const tokTag = () => (localStorage.getItem('token') || '').slice(-24);
const KEY = 'perms:v1';
let state: State = read();
const listeners = new Set<() => void>();

function read(): State {
    try {
        const s = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (s && typeof s === 'object' && s.permissions && s.tok === tokTag()) return s;
    } catch {
        /* ignore */
    }
    return { isAdmin: localStorage.getItem('role') === 'admin', role: localStorage.getItem('role') || '', permissions: {}, loadedAt: 0, tok: tokTag() };
}
function write(next: State) {
    state = next;
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* ignore */
    }
    listeners.forEach((l) => l());
}

export const currentRole = () => localStorage.getItem('role') || '';
export const isAdminLogin = () => currentRole() === 'admin';

/** Load (or refresh) my permissions from the server. Safe to call often. */
export async function loadPermissions(force = false) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (state.tok !== tokTag()) state = { ...read(), loadedAt: 0 }; // logged in as someone else
    if (!force && Date.now() - state.loadedAt < 60_000) return;
    try {
        const r = await axios.get(`${BASE_URL}/permissions/me`, { headers: { Authorization: `Bearer ${token}` } });
        write({ isAdmin: !!r.data?.isAdmin, role: r.data?.role || currentRole(), permissions: r.data?.permissions || {}, loadedAt: Date.now(), tok: tokTag() });
    } catch {
        // offline / old server: keep what we have (built-in rules still apply)
        state = { ...state, loadedAt: Date.now() };
    }
}
export const clearPermissions = () => write({ isAdmin: false, role: '', permissions: {}, loadedAt: 0 });

/** Is this key allowed? `def` is the built-in rule used when nothing is set. */
export function can(key: string, def = true): boolean {
    if (isAdminLogin()) return def;
    if (state.tok !== tokTag()) return def;
    const v = state.permissions[key];
    return typeof v === 'boolean' ? v : def;
}
/** Was this key explicitly switched off for me? */
export const blocked = (key: string) => !isAdminLogin() && state.tok === tokTag() && state.permissions[key] === false;

export const canPage = (path: string) => can(pageKey(path), pageDefault(path, currentRole()));

/** Re-render when permissions change (after login or a refresh). */
export function useAccess() {
    const [, setTick] = useState(0);
    useEffect(() => {
        const l = () => setTick((n) => n + 1);
        listeners.add(l);
        loadPermissions();
        return () => {
            listeners.delete(l);
        };
    }, []);
    return { can, canPage, blocked, isAdmin: isAdminLogin() };
}
