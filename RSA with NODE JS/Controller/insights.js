/**
 * Admin-website reports added in Nov 2026 (read only, except "send summary now").
 *   GET  /insights/scorecard?from=YYYY-MM-DD&to=YYYY-MM-DD   driver/provider performance (default last 30 days)
 *   GET  /insights/daily-summary?date=YYYY-MM-DD             the owner's evening summary (preview)
 *   POST /insights/daily-summary/send { date }               send it on WhatsApp now (admin only)
 */
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

const dayStart = (d) => new Date(`${d}T00:00:00+05:30`);
const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

exports.scorecard = asyncErrorHandler(async (req, res) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const to = isDay(req.query.to) ? new Date(dayStart(req.query.to).getTime() + 86400000) : new Date(dayStart(today).getTime() + 86400000);
    const from = isDay(req.query.from) ? dayStart(req.query.from) : new Date(to.getTime() - 30 * 86400000);
    if (to - from > 370 * 86400000) return res.status(400).json({ message: 'Choose a period of up to a year' });
    const result = await require('../services/scorecard').build({ from, to });
    res.json({ success: true, ...result });
});

exports.dailySummary = asyncErrorHandler(async (req, res) => {
    const s = require('../services/dailySummary');
    const r = await s.build(isDay(req.query.date) ? req.query.date : undefined);
    res.json({
        success: true,
        ...r,
        sending: {
            recipients: s.recipients().map((n) => `••••••${n.slice(-4)}`),
            whatsapp: require('../services/whatsapp').enabled(),
            template: process.env.WA_SUMMARY_TEMPLATE || null,
            schedule: process.env.SUMMARY_CRON || '0 21 * * *',
        },
    });
});

exports.sendSummary = asyncErrorHandler(async (req, res) => {
    const r = await require('../services/dailySummary').send(isDay(req.body?.date) ? req.body.date : undefined);
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r, message: r.ok ? 'Summary sent' : r.reason || 'Some messages could not be delivered' });
});
