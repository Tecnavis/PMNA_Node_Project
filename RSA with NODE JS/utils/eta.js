/**
 * Rough road distance and drive time from straight-line distance — no paid maps API needed.
 *   OPS_ROAD_FACTOR   road km per straight-line km (default 1.35, Kerala roads)
 *   OPS_AVG_SPEED_KMH average truck speed incl. traffic (default 32)
 */
const R = 6371;
const toRad = (d) => (d * Math.PI) / 180;

function haversineKm(a, b) {
    if (!a || !b) return null;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function roadEstimate(from, to) {
    const straight = haversineKm(from, to);
    if (straight === null) return null;
    const factor = Number(process.env.OPS_ROAD_FACTOR || 1.35);
    const speed = Number(process.env.OPS_AVG_SPEED_KMH || 32);
    const km = straight * factor;
    return { km: Math.round(km * 10) / 10, minutes: Math.max(1, Math.round((km / speed) * 60)) };
}

function parseLatLng(value) {
    if (!value || typeof value !== 'string') return null;
    const [lat, lng] = value.split(',').map((x) => parseFloat(String(x).trim()));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
}

// Which leg the vehicle is on for a status: heading to the customer, or carrying the vehicle to the drop.
const TO_PICKUP = ['Order Received', 'On the way to pickup location'];
const TO_DROP = ['Vehicle Picked', 'Vehicle Confirmed', 'On the way to dropoff location'];
const legFor = (status) => (TO_PICKUP.includes(status) ? 'pickup' : TO_DROP.includes(status) ? 'drop' : null);

module.exports = { haversineKm, roadEstimate, parseLatLng, legFor, TO_PICKUP, TO_DROP };
