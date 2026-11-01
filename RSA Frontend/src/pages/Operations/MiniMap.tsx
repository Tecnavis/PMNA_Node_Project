import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LiveData, OpsPerson, STATUS_COLORS } from './opsApi';
import { addBaseLayer } from '../../utils/mapTiles';

/** Small read-only map for the dashboard: every driver/provider with a GPS position. */
const KERALA_CENTER: L.LatLngExpression = [10.35, 76.3];
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const dot = (p: OpsPerson) => {
    const delayed = p.activeCases.some((c) => c.delayed);
    const bg = p.gpsStale || delayed ? '#ef4444' : p.busy ? '#111318' : '#9aa0ae';
    const ring = p.busy ? STATUS_COLORS[p.activeCases[0]?.status] || '#5b4cf0' : '#ffffff';
    const initials = (p.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${bg};color:#fff;font:600 9px/24px Inter,system-ui;text-align:center;border:2px solid #fff;box-shadow:0 0 0 2px ${ring}55,0 2px 6px rgba(0,0,0,.25)">${esc(initials)}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

const MiniMap: React.FC<{ data: LiveData | null; height?: number }> = ({ data, height = 260 }) => {
    const el = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const layer = useRef<L.LayerGroup | null>(null);
    const fitted = useRef(false);

    useEffect(() => {
        if (!el.current || map.current) return;
        map.current = L.map(el.current, { zoomControl: false, scrollWheelZoom: false }).setView(KERALA_CENTER, 7);
        map.current.attributionControl.setPrefix(false);
        const removeBase = addBaseLayer(map.current);
        L.control.zoom({ position: 'topright' }).addTo(map.current);
        layer.current = L.layerGroup().addTo(map.current);
        return () => {
            removeBase();
            map.current?.remove();
            map.current = null;
        };
    }, []);

    useEffect(() => {
        if (!map.current || !layer.current) return;
        layer.current.clearLayers();
        const people = (data?.people || []).filter((p) => p.point);
        people.forEach((p) => {
            L.marker([p.point!.lat, p.point!.lng], { icon: dot(p), title: p.name })
                .bindTooltip(`${esc(p.name)}${p.activeCases[0] ? ` · ${esc(p.activeCases[0].fileNumber)}` : ' · free'}`, { direction: 'top', offset: [0, -10] })
                .addTo(layer.current!);
        });
        if (!fitted.current && people.length) {
            map.current.fitBounds(L.latLngBounds(people.map((p) => [p.point!.lat, p.point!.lng] as L.LatLngTuple)).pad(0.25), { maxZoom: 11 });
            fitted.current = true;
        }
    }, [data]);

    return <div ref={el} className="w-full" style={{ height }} />;
};

export default MiniMap;
