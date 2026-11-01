/**
 * Driver / provider performance over a period (read only).
 *
 * Per person: cases, completed, cancelled, average time to reach the customer (booking → pickup photos),
 * late pickups, customer rating, cash still pending, amount handled, and an overall score (0–100):
 *   completion 30% · on-time pickup 30% · customer rating 25% · cash settled 15%
 * (when nobody rated yet, the rating share is spread over the others).
 *   SCORE_LATE_PICKUP_MINUTES  pickup slower than this counts as late (default 90)
 */
const Booking = require('../Model/booking');
const CustomerRating = require('../Model/customerRating');

const lateLimit = () => Number(process.env.SCORE_LATE_PICKUP_MINUTES || 90);

async function build({ from, to }) {
    const LATE = lateLimit() * 60000;
    const rows = await Booking.aggregate([
        { $match: { createdAt: { $gte: from, $lt: to }, $or: [{ driver: { $ne: null } }, { provider: { $ne: null } }] } },
        {
            $project: {
                who: { $ifNull: ['$driver', '$provider'] },
                kind: { $cond: [{ $ifNull: ['$driver', false] }, 'driver', 'provider'] },
                status: 1,
                cashPending: 1,
                totalAmount: 1,
                toPickup: {
                    $cond: [
                        { $and: [{ $eq: [{ $type: '$pickupTime' }, 'date'] }, { $gt: ['$pickupTime', '$createdAt'] }] },
                        {
                            $subtract: [
                                '$pickupTime',
                                // scheduled cases count from the planned pickup time, others from booking time
                                { $cond: [{ $and: [{ $eq: [{ $type: '$pickupDate' }, 'date'] }, { $gt: ['$pickupDate', '$createdAt'] }, { $lt: ['$pickupDate', '$pickupTime'] }] }, '$pickupDate', '$createdAt'] },
                            ],
                        },
                        null,
                    ],
                },
            },
        },
        {
            $group: {
                _id: { who: '$who', kind: '$kind' },
                cases: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'Order Completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Rejected']] }, 1, 0] } },
                cashPending: { $sum: { $cond: ['$cashPending', 1, 0] } },
                amount: { $sum: { $ifNull: ['$totalAmount', 0] } },
                pickupSum: { $sum: { $cond: [{ $and: [{ $ne: ['$toPickup', null] }, { $gt: ['$toPickup', 0] }, { $lt: ['$toPickup', 24 * 3600000] }] }, '$toPickup', 0] } },
                pickupN: { $sum: { $cond: [{ $and: [{ $ne: ['$toPickup', null] }, { $gt: ['$toPickup', 0] }, { $lt: ['$toPickup', 24 * 3600000] }] }, 1, 0] } },
                late: { $sum: { $cond: [{ $and: [{ $ne: ['$toPickup', null] }, { $gt: ['$toPickup', LATE] }, { $lt: ['$toPickup', 24 * 3600000] }] }, 1, 0] } },
            },
        },
    ]);

    const ratings = await CustomerRating.aggregate([
        { $match: { at: { $gte: from, $lt: to } } },
        { $project: { who: { $ifNull: ['$driver', '$provider'] }, rating: 1 } },
        { $group: { _id: '$who', avg: { $avg: '$rating' }, n: { $sum: 1 }, low: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } } } },
    ]);
    const rate = Object.fromEntries(ratings.map((r) => [String(r._id), r]));

    const ids = rows.map((r) => r._id.who);
    const [drivers, providers] = await Promise.all([
        require('../Model/driver').find({ _id: { $in: ids } }).select('name phone').lean(),
        require('../Model/provider').find({ _id: { $in: ids } }).select('name phone').lean(),
    ]);
    const person = Object.fromEntries([...drivers, ...providers].map((p) => [String(p._id), p]));

    const people = rows
        .map((r) => {
            const id = String(r._id.who);
            const rt = rate[id];
            const closed = r.completed + r.cancelled;
            const completionRate = closed ? r.completed / closed : r.cases ? r.completed / r.cases : 0;
            const onTimeRate = r.pickupN ? 1 - r.late / r.pickupN : null;
            const ratingScore = rt ? (rt.avg - 1) / 4 : null;
            const cashRate = r.completed ? 1 - Math.min(1, r.cashPending / r.completed) : 1;
            const parts = [
                [completionRate, 30],
                [onTimeRate, 30],
                [ratingScore, 25],
                [cashRate, 15],
            ].filter(([v]) => v !== null);
            const weight = parts.reduce((s, [, w]) => s + w, 0);
            const score = weight ? Math.round((parts.reduce((s, [v, w]) => s + v * w, 0) / weight) * 100) : null;
            return {
                _id: id,
                kind: r._id.kind,
                name: person[id]?.name || '—',
                phone: person[id]?.phone || '',
                cases: r.cases,
                completed: r.completed,
                cancelled: r.cancelled,
                completionRate: Math.round(completionRate * 100),
                avgMinutesToPickup: r.pickupN ? Math.round(r.pickupSum / r.pickupN / 60000) : null,
                pickupsMeasured: r.pickupN,
                latePickups: r.late,
                onTimeRate: onTimeRate === null ? null : Math.round(onTimeRate * 100),
                rating: rt ? Math.round(rt.avg * 10) / 10 : null,
                ratings: rt?.n || 0,
                lowRatings: rt?.low || 0,
                cashPending: r.cashPending,
                amount: r.amount,
                score,
            };
        })
        .sort((a, z) => (z.score ?? -1) - (a.score ?? -1) || z.cases - a.cases);

    return { from, to, latePickupMinutes: lateLimit(), people };
}

module.exports = { build };
