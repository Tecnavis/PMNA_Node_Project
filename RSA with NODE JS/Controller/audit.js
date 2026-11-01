/**
 * Admin only: login history and staff activity log.
 *   GET /audit/logins?page&limit&search&result=ok|failed&from&to
 *   GET /audit/activity?page&limit&search&category&actor&from&to
 */
const LoginEvent = require('../Model/loginEvent');
const ActivityLog = require('../Model/activityLog');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const paging = (q) => {
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 25, 1), 200);
    const page = Math.max(parseInt(q.page, 10) || 1, 1);
    return { limit, page, skip: (page - 1) * limit };
};
const dateRange = (q) => {
    const r = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.from || '')) r.$gte = new Date(`${q.from}T00:00:00+05:30`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.to || '')) r.$lt = new Date(new Date(`${q.to}T00:00:00+05:30`).getTime() + 86400000);
    return Object.keys(r).length ? r : null;
};

exports.logins = asyncErrorHandler(async (req, res) => {
    const { limit, page, skip } = paging(req.query);
    const f = {};
    if (req.query.result === 'ok') f.success = true;
    if (req.query.result === 'failed') f.success = false;
    const at = dateRange(req.query);
    if (at) f.at = at;
    if (req.query.search) {
        const re = new RegExp(esc(String(req.query.search).slice(0, 60)), 'i');
        f.$or = [{ name: re }, { login: re }, { ip: re }, { device: re }];
    }
    const [rows, total, failed24h] = await Promise.all([
        LoginEvent.find(f).sort({ at: -1 }).skip(skip).limit(limit).lean(),
        LoginEvent.countDocuments(f),
        LoginEvent.countDocuments({ success: false, reason: { $in: ['wrong-password', 'unknown-user', 'otp-wrong'] }, at: { $gte: new Date(Date.now() - 86400000) } }),
    ]);
    res.json({ success: true, rows, total, page, limit, failed24h });
});

exports.activity = asyncErrorHandler(async (req, res) => {
    const { limit, page, skip } = paging(req.query);
    const f = {};
    if (req.query.category) f.category = String(req.query.category);
    if (req.query.actor) f['actor.id'] = String(req.query.actor);
    const at = dateRange(req.query);
    if (at) f.at = at;
    if (req.query.search) {
        const re = new RegExp(esc(String(req.query.search).slice(0, 60)), 'i');
        f.$or = [{ 'actor.name': re }, { action: re }, { path: re }, { targetId: re }];
    }
    const [rows, total, people] = await Promise.all([
        ActivityLog.find(f).sort({ at: -1 }).skip(skip).limit(limit).lean(),
        ActivityLog.countDocuments(f),
        ActivityLog.aggregate([{ $match: { at: { $gte: new Date(Date.now() - 30 * 86400000) } } }, { $group: { _id: '$actor.id', name: { $last: '$actor.name' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 100 }]),
    ]);
    res.json({ success: true, rows, total, page, limit, people: people.map((p) => ({ id: p._id, name: p.name || 'Admin', count: p.n })) });
});
