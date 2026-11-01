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
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

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
        map.current = L.map(mapEl.current, { zoomControl: false }).setView(KERALA_CENTER, 8);
        L.control.zoom({ position: 'topright' }).addTo(map.current);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
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
                m.on('click', () => setSelectedKey(key));
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

    const keyOf = (p: OpsPerson) => `${p.type}:${p._id}`;
    // the map gets narrower/wider when the details panel opens or closes
    useEffect(() => {
        const t = window.setTimeout(() => map.current?.invalidateSize(), 60);
        return () => window.clearTimeout(t);
    }, [selectedKey]);
    const selected = useMemo(() => (data?.people || []).find((p) => keyOf(p) === selectedKey) || null, [data, selectedKey]);
    const steps = ['Booking Added', 'called to customer', 'Order Received', 'On the way to pickup location', 'Vehicle Picked', 'Vehicle Confirmed', 'On the way to dropoff location', 'Vehicle Dropped'];
    const progressOf = (p: OpsPerson) => {
        const c = p.activeCases[0];
        if (!c) return 0;
        const i = steps.indexOf(c.status);
        return i < 0 ? 0 : Math.round(((i + 1) / steps.length) * 100);
    };

    const focus = (p: OpsPerson) => {
        setSelectedKey(keyOf(p));
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

    const initials = (n: string) => (n || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const gpsText = (p: OpsPerson) => (p.point ? (p.minutesSinceSeen === null ? 'GPS —' : p.minutesSinceSeen === 0 ? 'GPS now' : `GPS ${formatMinutes(p.minutesSinceSeen)} ago`) : 'No GPS yet');
    const H = 'lg:h-[calc(100vh-250px)]';

    return (
        <div className={`grid grid-cols-1 gap-4 ${selected ? 'xl:grid-cols-[320px_1fr_340px]' : 'lg:grid-cols-[320px_1fr]'}`}>
            {/* On the road */}
            <div className={`panel flex max-h-[70vh] flex-col !p-4 ${H} lg:max-h-none`}>
                <div className="mb-3">
                    <div className="text-base font-semibold">On the road</div>
                    <div className="text-xs text-[#8a90a2]">
                        {data?.counts.withLocation ?? 0} with GPS · {data?.counts.busy ?? 0} on a case · updated {data ? new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '…'}
                    </div>
                </div>
                <input className="form-input mb-3" placeholder="Search name, phone or case ID" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {FILTERS.map((f) => (
                        <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`ui-chip ${filter === f.key ? 'ui-chip-active' : ''}`}>
                            {filter === f.key && '✓ '}
                            {f.label}
                            {typeof f.count === 'number' && <span className={filter === f.key ? 'text-white/60' : 'text-[#8a90a2]'}>{f.count}</span>}
                        </button>
                    ))}
                </div>
                <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
                    {people.length === 0 && <p className="py-6 text-center text-sm text-white-dark">No one matches.</p>}
                    {people.map((p) => {
                        const c = p.activeCases[0];
                        const isSel = selectedKey === keyOf(p);
                        const late = p.activeCases.some((x) => x.delayed);
                        return (
                            <button
                                type="button"
                                key={keyOf(p)}
                                onClick={() => focus(p)}
                                className={`w-full rounded-2xl border p-3 text-left transition ${isSel ? 'border-brand/40 bg-brand-soft ring-2 ring-brand/10 dark:bg-brand/10' : 'border-[#eceef2] bg-white hover:border-[#c9cdd8] dark:border-[#1b2e4b] dark:bg-black'}`}
                                title={p.point ? 'Show on map' : 'No GPS position yet'}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-xs font-semibold dark:bg-[#1a2941]">
                                        {initials(p.name)}
                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-black" style={{ background: FRESH_COLORS[freshness(p)] }} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold">{p.name}</div>
                                        <div className="truncate text-xs text-[#8a90a2]">
                                            {p.type === 'provider' ? 'Provider' : 'Driver'}
                                            {c ? ` · ${c.fileNumber || 'Case'}` : ''}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right text-xs">
                                        <div className={p.gpsStale ? 'font-semibold text-danger' : 'text-[#5d6375]'}>{gpsText(p)}</div>
                                        {c && <div className={late ? 'font-semibold text-danger' : 'text-[#8a90a2]'}>{formatMinutes(c.minutesInStatus)}</div>}
                                    </div>
                                </div>
                                {c ? (
                                    <>
                                        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                                            <span className="inline-flex items-center gap-1 truncate rounded-full px-2 py-0.5 font-semibold" style={{ color: STATUS_COLORS[c.status], background: `${STATUS_COLORS[c.status] || '#5b4cf0'}14` }}>
                                                {late ? 'Delayed · ' : c.atRisk ? 'At risk · ' : ''}
                                                {c.status}
                                            </span>
                                            {p.activeCases.length > 1 && <span className="text-[#8a90a2]">+{p.activeCases.length - 1} more</span>}
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef0f3] dark:bg-[#1a2941]">
                                                <div className={`h-full rounded-full ${late ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${progressOf(p)}%` }} />
                                            </div>
                                            <span className="w-8 text-right text-[11px] tabular-nums text-[#8a90a2]">{progressOf(p)}%</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-2 text-xs font-semibold text-success">Free · no open case</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Map */}
            <div className="panel relative overflow-hidden !p-0">
                <div ref={mapEl} className={`h-[60vh] w-full ${H}`} style={{ minHeight: 420 }} />
                <div className="absolute left-3 right-14 top-3 z-[400] flex flex-wrap gap-1.5">
                    {FILTERS.slice(0, 4).map((f) => (
                        <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`ui-chip shadow-sm ${filter === f.key ? 'ui-chip-active' : ''}`}>
                            {filter === f.key && '✓ '}
                            {f.label}
                            {typeof f.count === 'number' && <span className={filter === f.key ? 'text-white/60' : 'text-[#8a90a2]'}>{f.count}</span>}
                        </button>
                    ))}
                    <button type="button" onClick={() => setShowUnassigned((v) => !v)} className={`ui-chip shadow-sm ${showUnassigned ? 'ui-chip-active' : ''}`}>
                        {showUnassigned && '✓ '}Unassigned <span className={showUnassigned ? 'text-white/60' : 'text-[#8a90a2]'}>{data?.unassignedCases.length || 0}</span>
                    </button>
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full bg-white px-4 py-2 text-xs shadow-sm dark:bg-black">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FRESH_COLORS.online }} /> GPS in last {data?.settings.onlineMinutes ?? 15} min</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FRESH_COLORS.offline }} /> Older</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FRESH_COLORS.stale }} /> On a case, GPS not updating</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-[#dc2626]" /> Unassigned pickup</span>
                </div>
            </div>

            {/* Selected person */}
            {selected && (
                <div className={`panel flex flex-col !p-4 ${H} overflow-y-auto`}>
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: FRESH_COLORS[freshness(selected)] }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: FRESH_COLORS[freshness(selected)] }} />
                                {freshness(selected) === 'online' ? 'Live' : freshness(selected) === 'stale' ? 'GPS not updating' : 'Offline'} · {gpsText(selected)}
                            </div>
                            <div className="mt-1 text-xl font-medium tracking-tight">{selected.name}</div>
                            <div className="text-xs text-[#8a90a2]">{selected.type === 'provider' ? 'Provider' : 'Driver'}{selected.company ? ` · ${selected.company}` : ''}</div>
                        </div>
                        <button type="button" className="text-xl leading-none text-[#8a90a2] hover:text-black" onClick={() => setSelectedKey(null)} aria-label="Close">×</button>
                    </div>

                    <div className="mt-3 flex gap-2">
                        {selected.phone && <a href={`tel:${selected.phone}`} className="btn btn-dark btn-sm flex-1">📞 Call {selected.phone}</a>}
                        {selected.phone && <a href={`https://wa.me/${selected.phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`} target="_blank" rel="noreferrer" className="btn btn-outline-dark btn-sm">WhatsApp</a>}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="ui-soft p-3">
                            <div className="ui-eyebrow">Open cases</div>
                            <div className="ui-num mt-1 text-3xl">{selected.activeCases.length}</div>
                        </div>
                        <div className="ui-soft p-3">
                            <div className="ui-eyebrow">Last GPS</div>
                            <div className={`mt-1 text-lg font-medium ${selected.gpsStale ? 'text-danger' : ''}`}>{selected.minutesSinceSeen === null ? '—' : selected.minutesSinceSeen === 0 ? 'Now' : `${formatMinutes(selected.minutesSinceSeen)} ago`}</div>
                            {selected.lastSeenApprox && <div className="text-[11px] text-[#8a90a2]">approximate</div>}
                        </div>
                    </div>

                    {selected.activeCases.length === 0 && <p className="mt-4 rounded-2xl bg-success/10 p-3 text-sm font-semibold text-success">Free — can take a new case.</p>}

                    {selected.activeCases.map((c) => {
                        const idx = steps.indexOf(c.status);
                        return (
                            <div key={c._id} className={`mt-4 rounded-2xl border p-3 ${c.delayed ? 'border-danger/30 bg-danger/5' : 'border-primary/20 bg-[#f4f2ff] dark:bg-primary/10'}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <Link to={`/openbooking/${c._id}`} className="font-semibold text-primary">{c.fileNumber || 'Case'}</Link>
                                    <span className={`text-xs font-semibold ${c.delayed ? 'text-danger' : 'text-[#5d6375]'}`}>{formatMinutes(c.minutesInStatus)} in status</span>
                                </div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: STATUS_COLORS[c.status] }}>
                                    {c.delayed ? 'Delayed · ' : ''}
                                    {c.status}
                                </div>
                                {c.eta && (
                                    <div className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-xs ${c.atRisk || c.delayed ? 'bg-brand-light text-brand' : 'bg-white text-[#3b4153] dark:bg-black dark:text-white-dark'}`}>
                                        <span>
                                            <b>ETA {new Date(c.eta.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</b> to {c.eta.to === 'pickup' ? 'customer' : 'drop-off'}
                                        </span>
                                        <span>{c.eta.km} km · {formatMinutes(c.eta.minutes)}{c.atRisk ? ' · at risk' : ''}</span>
                                    </div>
                                )}
                                <div className="mt-2 flex gap-1">
                                    {steps.map((st, i) => (
                                        <span key={st} title={st} className={`h-1.5 flex-1 rounded-full ${i < idx ? 'bg-[#111318] dark:bg-white' : i === idx ? (c.delayed ? 'bg-danger' : 'bg-primary') : 'bg-white dark:bg-black'}`} />
                                    ))}
                                </div>
                                <div className="mt-3 space-y-1.5 text-xs">
                                    {c.pickup.address && (
                                        <div className="flex gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#111318] dark:bg-white" /><span className="text-[#3b4153] dark:text-white-dark">{c.pickup.address}</span></div>
                                    )}
                                    {c.dropoff.address && (
                                        <div className="flex gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full border-2 border-primary" /><span className="text-[#3b4153] dark:text-white-dark">{c.dropoff.address}</span></div>
                                    )}
                                </div>
                                {(c.customerName || c.vehicleNumber) && (
                                    <div className="mt-2 text-xs text-[#8a90a2]">
                                        {c.customerName}
                                        {c.customerPhone ? ` · ${c.customerPhone}` : ''}
                                        {c.vehicleNumber ? ` · ${c.vehicleNumber}` : ''}
                                    </div>
                                )}
                                <Link to={`/openbooking/${c._id}`} className="btn btn-outline-dark btn-sm mt-3 w-full">View booking</Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LiveMap;
