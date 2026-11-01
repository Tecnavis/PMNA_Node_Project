/**
 * Evening summary for the owner, sent on WhatsApp.
 *
 *   OWNER_WHATSAPP           who receives it: 10-digit numbers, comma separated (required to send)
 *   SUMMARY_CRON             when (India time, cron format; default "0 21 * * *" = 9 PM daily)
 *   WA_SUMMARY_TEMPLATE      name of an approved WhatsApp template with ONE body variable {{1}}.
 *                            Needed because WhatsApp only delivers free text within 24 hours of the
 *                            owner's last message to the business number. Without a template the
 *                            plain-text message is tried (works if the owner messaged recently).
 *   WA_SUMMARY_TEMPLATE_LANG template language code (default "en")
 */
const Booking = require('../Model/booking');

const istDay = (dateStr) => {
    const d = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const start = new Date(`${d}T00:00:00+05:30`);
    return { date: d, start, end: new Date(start.getTime() + 86400000) };
};
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const OPEN = ['Booking Added', 'called to customer', 'Order Received', 'On the way to pickup location', 'Vehicle Picked', 'Vehicle Confirmed', 'On the way to dropoff location', 'Vehicle Dropped'];

async function build(dateStr) {
    const { date, start, end } = istDay(dateStr);
    const inDay = { $gte: start, $lt: end };
    const changed = { $or: [{ statusChangedAt: inDay }, { statusChangedAt: { $exists: false }, updatedAt: inDay }] };
    const CustomerRating = require('../Model/customerRating');
    const LoginEvent = require('../Model/loginEvent');

    const [created, completedRows, cancelled, openNow, cashPending, amountAgg, ratings, failedLogins, board] = await Promise.all([
        Booking.countDocuments({ createdAt: inDay, _includeHidden: true }),
        Booking.find({ status: 'Order Completed', ...changed, _includeHidden: true }).select('driver provider totalAmount').populate('driver', 'name').populate('provider', 'name').lean(),
        Booking.countDocuments({ status: { $in: ['Cancelled', 'Rejected'] }, ...changed, _includeHidden: true }),
        Booking.countDocuments({ status: { $in: OPEN }, _includeHidden: true }),
        Booking.aggregate([{ $match: { cashPending: true } }, { $group: { _id: null, n: { $sum: 1 }, amount: { $sum: { $ifNull: ['$totalAmount', 0] } } } }]),
        Booking.aggregate([{ $match: { createdAt: inDay } }, { $group: { _id: null, amount: { $sum: { $ifNull: ['$totalAmount', 0] } } } }]),
        CustomerRating.aggregate([{ $match: { at: inDay } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 }, low: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } } } }]),
        LoginEvent.countDocuments({ at: inDay, success: false, reason: { $in: ['wrong-password', 'unknown-user', 'otp-wrong'] } }),
        delayedNow(),
    ]);

    const top = {};
    for (const b of completedRows) {
        const who = b.driver || b.provider;
        if (!who) continue;
        top[who._id] = top[who._id] || { name: who.name || '—', n: 0 };
        top[who._id].n++;
    }
    const topList = Object.values(top).sort((a, z) => z.n - a.n).slice(0, 3);
    const r = ratings[0];
    const data = {
        date,
        created,
        completed: completedRows.length,
        cancelled,
        openNow,
        delayedNow: board,
        bookedValue: amountAgg[0]?.amount || 0,
        cashPendingCases: cashPending[0]?.n || 0,
        cashPendingAmount: cashPending[0]?.amount || 0,
        ratingAvg: r ? Math.round(r.avg * 10) / 10 : null,
        ratingCount: r?.n || 0,
        lowRatings: r?.low || 0,
        failedLogins,
        topDrivers: topList,
    };
    const day = new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const lines = [
        `RSA Kerala — ${day}`,
        `Bookings: ${created} new · ${data.completed} completed · ${cancelled} cancelled`,
        `Booked value: ${inr(data.bookedValue)}`,
        `Open now: ${openNow}${data.delayedNow ? ` (${data.delayedNow} delayed)` : ''}`,
        `Cash pending: ${data.cashPendingCases} cases · ${inr(data.cashPendingAmount)}`,
        data.ratingCount ? `Customer rating: ${data.ratingAvg}★ from ${data.ratingCount}${data.lowRatings ? ` · ${data.lowRatings} low` : ''}` : null,
        topList.length ? `Top drivers: ${topList.map((t) => `${t.name} (${t.n})`).join(', ')}` : null,
        failedLogins >= 5 ? `⚠ ${failedLogins} failed admin logins today` : null,
    ].filter(Boolean);
    return { data, text: lines.join('\n') };
}

async function delayedNow() {
    try {
        const { _internals } = require('../Controller/operations');
        const limits = { ..._internals.DEFAULT_DELAY_MINUTES, ...JSON.parse(process.env.OPS_DELAY_MINUTES || '{}') };
        const open = await Booking.find({ status: { $in: OPEN }, _includeHidden: true }).select('status statusChangedAt updatedAt createdAt').lean();
        return open.filter((b) => {
            const since = new Date(b.statusChangedAt || b.updatedAt || b.createdAt).getTime();
            const lim = limits[b.status];
            return lim && (Date.now() - since) / 60000 > lim;
        }).length;
    } catch {
        return 0;
    }
}

const recipients = () => String(process.env.OWNER_WHATSAPP || '').split(',').map((s) => s.replace(/\D/g, '').slice(-10)).filter((s) => s.length === 10);

async function send(dateStr) {
    const wa = require('./whatsapp');
    const to = recipients();
    if (!to.length) return { ok: false, reason: 'Set OWNER_WHATSAPP on the server (10-digit numbers, comma separated).' };
    if (!wa.enabled()) return { ok: false, reason: 'WhatsApp is not set up on the server (WA_TOKEN / WA_PHONE_NUMBER_ID).' };
    const { text } = await build(dateStr);
    const tpl = process.env.WA_SUMMARY_TEMPLATE;
    const results = [];
    for (const n of to) {
        const r = tpl ? await wa.template(`91${n}`, tpl, process.env.WA_SUMMARY_TEMPLATE_LANG || 'en', [text]) : await wa.text(`91${n}`, text);
        results.push({ to: `••••••${n.slice(-4)}`, ok: !!r?.ok, via: tpl ? 'template' : 'text' });
    }
    return { ok: results.every((r) => r.ok), results, text };
}

module.exports = { build, send, recipients };
