import React from 'react';
import { isAdminLogin } from '../../utils/access';

/** Wraps the admin-tools pages: only the admin login sees them (the server checks too). */
const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    isAdminLogin() ? (
        <>{children}</>
    ) : (
        <div className="panel mx-auto mt-10 max-w-md text-center">
            <h2 className="text-xl font-semibold">Admin only</h2>
            <p className="mt-1 text-sm text-[#5d6375]">This page is only for the admin login.</p>
        </div>
    );

export default AdminOnly;

export const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
export const fmtDateTime = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
export const fmtBytes = (n?: number) => (!n ? '—' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const PageTitle: React.FC<{ eyebrow: string; title: string; sub?: React.ReactNode; actions?: React.ReactNode }> = ({ eyebrow, title, sub, actions }) => (
    <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
            <div className="ui-eyebrow">{eyebrow}</div>
            <h1 className="mt-1 text-[34px] font-normal leading-tight tracking-tight text-[#111318] dark:text-white">{title}</h1>
            {sub && <p className="text-sm text-[#5d6375]">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);
