import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { LiveData, OpsCase, OpsPerson, STATUS_COLORS, formatMinutes } from './opsApi';

type Filter = 'all' | 'busy' | 'free' | 'stale' | 'drivers' | 'providers';

const KERALA_CENTER: L.LatLngExpression = [10.35, 76.3];

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const freshness = (p: OpsPerson) => (p.gpsStale ? 'stale' : p.online ? 'online' : 'offline');
const FRESH_COLORS = { online: '#16a34a', offline: '#94a3b8', stale: '#dc2626' };

const personIcon = (p: OpsPerson) => {
    const color = FRESH_COLORS[freshness(p)];
    const initials = (p.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const shape = p.type === 'provider' ? 'border-radius:6px' : 'border-radius:50%';
    const ring = p.busy ? `box-shadow:0 0 0 3px ${STATUS_COLORS[p.activeCases[0]?.status] || '#334155'}` : 'box-shadow:0 1px 3px rgba(0,0,0,.35)';
    return L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;${shape};background:${color};color:#fff;font:600 11px/30px system-ui;text-align:center;border:2px solid #fff;${ring}">${esc(initials)}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
};

const caseIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#dc2626;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 14],
});

const caseLine = (c: OpsCase) =>
    `<div style="margin-top:6px;padding:6px;border-radius:6px;background:#f8fafc">
       <a href="#/openbooking/${c._id}" style="font-weight:600">${esc(c.fileNumber || 'Case')}</a>
       <span style="color:${STATUS_COLORS[c.status] || '#334155'};font-weight:600"> · ${esc(c.status)}</span>
       <div style="color:#64748b">${esc(formatMinutes(c.minutesInStatus))} in status${c.delayed ? ' <b style="color:#dc2626">(delayed)</b>' : ''}</div>
       ${c.pickup.address ? `<div style="color:#64748b">From: ${esc(c.pickup.address)}</div>` : ''}
     </div>`;

const popupHtml = (p: OpsPerson) => `
  <div style="min-width:210px;font:13px system-ui">
    <div style="font-weight:700">${esc(p.name)} <span style="color:#64748b;font-weight:400">· ${p.type === 'provider' ? 'Provider' : 'Driver'}</span></div>
    ${p.phone ? `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ''}
    <div style="color:#64748b">Last GPS: ${p.minutesSinceSeen === null ? 'never' : `${esc(formatMinutes(p.minutesSinceSeen))} ago`}${p.lastSeenApprox ? ' (approx.)' : ''}</div>
    ${p.activeCases.length ? p.activeCases.map(caseLine).join('') : '<div style="margin-top:6px;color:#16a34a">Free — no open case</div>'}
  </div>`;

const LiveMap: React.FC<{ data: LiveData | null; liveTick: number }> = ({ data, liveTick }) => {
    const mapEl = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const markers = useRef<Map<string, L.Marker>>(new Map());
    const caseLayer = useRef<L.LayerGroup | null>(null);
    const fitted = useRef(false);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [showUnassigned, setShowUnassigned] = useState(true);

    const people = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data?.people || [])
            .filter((p) => {
                if (filter === 'busy') return p.busy;
                if (filter === 'free') return !p.busy;
                if (filter === 'stale') return p.gpsStale;
                if (filter === 'drivers') return p.type === 'driver';
                if (filter === 'providers') return p.type === 'provider';
                return true;
            })
            .filter((p) => !q || p.name?.toLowerCase().includes(q) || p.phone?.includes(q) || p.activeCases.some((c) => c.fileNumber.toLowerCase().includes(q)))
            .sort((a, b) => Number(b.busy) - Number(a.busy) || Number(b.online) - Number(a.online) || (a.name || '').localeCompare(b.name || ''));
    }, [data, filter, search]);

    // create map once
    useEffect(() => {
        if (!mapEl.current || map.current) return;
        map.current = L.map(mapEl.current, { zoomControl: true }).setView(KERALA_CENTER, 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map.current);
        caseLayer.current = L.layerGroup().addTo(map.current);
        return () => {
            map.current?.remove();
            map.current = null;
            markers.current.clear();
        };
    }, []);

    // sync person markers
    useEffect(() => {
        if (!map.current) return;
        const visible = new Set(people.filter((p) => p.point).map((p) => `${p.type}:${p._id}`));
        markers.current.forEach((m, key) => {
            if (!visible.has(key)) {
                m.remove();
                markers.current.delete(key);
            }
        });
        people.forEach((p) => {
            if (!p.point) return;
            const key = `${p.type}:${p._id}`;
            const existing = markers.current.get(key);
            if (existing) {
                existing.setLatLng([p.point.lat, p.point.lng]).setIcon(personIcon(p)).setPopupContent(popupHtml(p));
            } else {
                const m = L.marker([p.point.lat, p.point.lng], { icon: personIcon(p), title: p.name }).bindPopup(popupHtml(p)).addTo(map.current!);
                markers.current.set(key, m);
            }
        });
        if (!fitted.current && visible.size) {
            const pts = people.filter((p) => p.point).map((p) => [p.point!.lat, p.point!.lng] as L.LatLngTuple);
            map.current.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 12 });
            fitted.current = true;
        }
    }, [people, liveTick]);

    // unassigned case pickup pins
    useEffect(() => {
        if (!caseLayer.current) return;
        caseLayer.current.clearLayers();
        if (!showUnassigned) return;
        (data?.unassignedCases || []).forEach((c) => {
            if (!c.pickup.point) return;
            L.marker([c.pickup.point.lat, c.pickup.point.lng], { icon: caseIcon, title: c.fileNumber })
                .bindPopup(`<div style="font:13px system-ui;min-width:190px"><b>Unassigned</b>${caseLine(c)}<a href="#/add-booking/${c._id}">Assign driver →</a></div>`)
                .addTo(caseLayer.current!);
        });
    }, [data, showUnassigned]);

    const focus = (p: OpsPerson) => {
        if (!p.point || !map.current) return;
        map.current.flyTo([p.point.lat, p.point.lng], 14, { duration: 0.6 });
        markers.current.get(`${p.type}:${p._id}`)?.openPopup();
    };

    const FILTERS: { key: Filter; label: string; count?: number }[] = [
        { key: 'all', label: 'All' },
        { key: 'busy', label: 'On a case', count: data?.counts.busy },
        { key: 'free', label: 'Free' },
        { key: 'stale', label: 'No GPS', count: data?.counts.gpsStale },
        { key: 'drivers', label: 'Drivers', count: data?.counts.drivers },
        { key: 'providers', label: 'Providers', count: data?.counts.providers },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
            <div className="panel flex max-h-[70vh] flex-col p-3 lg:max-h-[calc(100vh-260px)]">
                <input className="form-input mb-2" placeholder="Search name, phone or case ID" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="mb-2 flex flex-wrap gap-1">
                    {FILTERS.map((f) => (
                        <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-outline-primary'}`}>
                            {f.label}
                            {typeof f.count === 'number' ? ` (${f.count})` : ''}
                        </button>
                    ))}
                </div>
                <label className="mb-2 inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" className="form-checkbox" checked={showUnassigned} onChange={(e) => setShowUnassigned(e.target.checked)} />
                    Show unassigned cases on map ({data?.unassignedCases.length || 0})
                </label>
                <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
                    {people.length === 0 && <p className="py-6 text-center text-sm text-white-dark">No one matches.</p>}
                    {people.map((p) => (
                        <button
                            type="button"
                            key={`${p.type}:${p._id}`}
                            onClick={() => focus(p)}
                            className="w-full rounded-md border border-transparent p-2 text-left hover:border-primary/40 hover:bg-primary/5 disabled:cursor-default"
                            title={p.point ? 'Show on map' : 'No GPS position yet'}
                        >
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: FRESH_COLORS[freshness(p)] }} />
                                <span className="truncate font-semibold">{p.name}</span>
                                <span className="ml-auto shrink-0 text-[11px] text-white-dark">{p.type === 'provider' ? 'Provider' : 'Driver'}</span>
                            </div>
                            <div className="pl-[18px] text-xs text-white-dark">
                                {p.point ? `GPS ${p.minutesSinceSeen === null ? '—' : `${formatMinutes(p.minutesSinceSeen)} ago`}` : 'No GPS yet'}
                                {p.gpsStale && <span className="ml-1 font-semibold text-danger">· not updating</span>}
                            </div>
                            {p.activeCases.map((c) => (
                                <div key={c._id} className="mt-1 pl-[18px] text-xs">
                                    <Link to={`/openbooking/${c._id}`} className="font-semibold text-primary" onClick={(e) => e.stopPropagation()}>
                                        {c.fileNumber || 'Case'}
                                    </Link>{' '}
                                    <span style={{ color: STATUS_COLORS[c.status] }}>{c.status}</span>
                                    <span className={c.delayed ? 'font-semibold text-danger' : 'text-white-dark'}> · {formatMinutes(c.minutesInStatus)}</span>
                                </div>
                            ))}
                        </button>
                    ))}
                </div>
            </div>
            <div className="panel relative p-0">
                <div ref={mapEl} className="h-[60vh] w-full rounded-md lg:h-[calc(100vh-260px)]" style={{ minHeight: 420 }} />
                <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-md bg-white/90 px-3 py-2 text-xs shadow dark:bg-black/70">
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FRESH_COLORS.online }} /> GPS in last {data?.settings.onlineMinutes ?? 15} min</div>
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FRESH_COLORS.offline }} /> Older position</div>
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FRESH_COLORS.stale }} /> On a case, GPS not updating</div>
                    <div className="mt-1 text-white-dark">● driver ■ provider · ring = current case status</div>
                </div>
            </div>
        </div>
    );
};

export default LiveMap;
