import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ALL_PAGES, pageKey } from '../config/menu';
import { useAccess } from '../utils/access';

/**
 * Stops a staff member opening a page an admin has switched off for them (Staff permissions),
 * also when they type the address. Pages nobody has switched off behave exactly as before.
 */
const paths = () => ALL_PAGES().map((p) => p.path).sort((a, b) => b.length - a.length);

const PageGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { pathname } = useLocation();
    const { blocked } = useAccess();
    const match = pathname === '/' ? '/' : paths().find((p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)));
    if (match && blocked(pageKey(match))) {
        return (
            <div className="panel mx-auto mt-10 max-w-md text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-xl text-brand">🔒</div>
                <h2 className="text-xl font-semibold">You don't have access to this page</h2>
                <p className="mt-1 text-sm text-[#5d6375]">An admin has switched it off for your account. Ask them to change your permissions if you need it.</p>
                <Link to="/" className="btn btn-dark mx-auto mt-5 w-fit">Go to dashboard</Link>
            </div>
        );
    }
    return <>{children}</>;
};

export default PageGuard;
