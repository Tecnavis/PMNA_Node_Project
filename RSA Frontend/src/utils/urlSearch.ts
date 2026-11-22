import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Lets a page pick up ?search=... (and other values) from its address,
 * so the header search can open a page already filtered to one booking.
 * Runs on first load and whenever the address changes.
 */
export function useUrlParam(key: string, apply: (value: string) => void) {
    const { search } = useLocation();
    useEffect(() => {
        const v = new URLSearchParams(search).get(key);
        if (v !== null) apply(v);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, key]);
}
