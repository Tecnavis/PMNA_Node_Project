import L from 'leaflet';

/**
 * Map background for the admin live maps (dashboard mini map, Live operations).
 *
 * Uses Ola Maps (the same account and key as the distance lookups: VITE_REACT_APP_API_KEY,
 * or VITE_OLA_MAPS_KEY if you want a separate key for maps). Ola's map is a vector style,
 * drawn with MapLibre inside the Leaflet map, so markers and pop-ups work as before.
 * Without a key, or if Ola fails to load, it falls back to standard OpenStreetMap tiles (no key needed).
 * Attribution stays visible on the map in both cases.
 */
const OLA_KEY = String(import.meta.env.VITE_OLA_MAPS_KEY || import.meta.env.VITE_REACT_APP_API_KEY || '').trim();
const OLA_STYLE = String(import.meta.env.VITE_OLA_MAPS_STYLE || 'default-light-standard').trim();

const osmLayer = () =>
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

/** Every Ola request (style, tiles, fonts, icons) needs the key on the URL. */
const withKey = (url: string) => {
    if (!/^https:\/\/api\.olamaps\.io\//.test(url) || /[?&]api_key=/.test(url)) return { url };
    return { url: `${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(OLA_KEY)}` };
};

/** Adds the base map to a Leaflet map. Returns a function that removes it. */
export function addBaseLayer(map: L.Map): () => void {
    let layer: L.Layer | null = null;
    let cancelled = false;
    const useOsm = () => {
        if (cancelled) return;
        if (layer) map.removeLayer(layer);
        layer = osmLayer().addTo(map);
    };

    if (!OLA_KEY) {
        useOsm();
    } else {
        Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
            .then(async ([maplibre]) => {
                (window as any).maplibregl = (maplibre as any).default || maplibre;
                await import('@maplibre/maplibre-gl-leaflet');
                if (cancelled) return;
                const factory = (L as any).maplibreGL;
                if (typeof factory !== 'function') return useOsm();
                const gl = factory({
                    style: `https://api.olamaps.io/tiles/vector/v1/styles/${OLA_STYLE}/style.json`,
                    transformRequest: withKey,
                    attributionControl: false,
                });
                layer = gl.addTo(map);
                map.attributionControl?.addAttribution('&copy; <a href="https://maps.olakrutrim.com/" target="_blank" rel="noreferrer">Ola Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
                // if Ola refuses the key (or the account is out of free allowance), show OSM instead of a blank map
                const glMap = gl.getMaplibreMap?.();
                let failures = 0;
                glMap?.on('error', (e: any) => {
                    const status = e?.error?.status;
                    if (status === 401 || status === 403 || status === 429 || ++failures > 20) {
                        console.warn('[map] Ola Maps unavailable, using OpenStreetMap', status || '');
                        useOsm();
                    }
                });
            })
            .catch(() => useOsm());
    }

    return () => {
        cancelled = true;
        if (layer) map.removeLayer(layer);
    };
}
