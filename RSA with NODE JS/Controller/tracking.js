/**
 * Public customer tracking (no login): the page at /t/:token and its data at /t/:token/data.
 */
const path = require('path');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const tracking = require('../services/tracking');

exports.page = (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex');
    res.set('Referrer-Policy', 'no-referrer');
    res.sendFile(path.join(__dirname, '..', 'public', 'track', 'index.html'));
};

exports.data = asyncErrorHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex');
    const view = await tracking.publicView(req.params.token);
    if (view.closed) return res.status(view.closed === 'not-found' ? 404 : 410).json({ closed: view.closed });
    res.json(view);
});
