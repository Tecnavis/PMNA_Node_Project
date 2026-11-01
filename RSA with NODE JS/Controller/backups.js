/**
 * Admin only: data backups.
 *   GET  /backups                     backup sets on the media server + recent runs
 *   POST /backups/run                 back up now (runs in the background)
 *   GET  /backups/:set/:file          download one file
 */
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const backup = require('../services/backup');
const BackupRun = require('../Model/backupRun');

let running = false;

exports.list = asyncErrorHandler(async (req, res) => {
    const runs = await BackupRun.find({}).sort({ at: -1 }).limit(15).lean();
    let sets = [];
    let error = '';
    try {
        sets = await backup.list();
    } catch (e) {
        error = e.message;
    }
    res.json({ success: true, running, sets, runs, error, schedule: process.env.BACKUP_CRON || '15 3 1 * *', keep: Math.max(3, Number(process.env.BACKUP_KEEP || 12)) });
});

exports.run = asyncErrorHandler(async (req, res) => {
    if (running) return res.status(409).json({ message: 'A backup is already running' });
    running = true;
    const by = req.user?.user?.name || req.user?.name || 'admin';
    backup.run({ reason: 'manual', by }).finally(() => { running = false; });
    res.status(202).json({ success: true, message: 'Backup started. It takes a few minutes; refresh to see it.' });
});

exports.download = asyncErrorHandler(async (req, res) => {
    const { set, file } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}-\d{4}(-[a-z0-9]{1,16})?$/.test(set) || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}\.(json\.gz|xlsx)$/.test(file)) {
        return res.status(400).json({ message: 'Invalid name' });
    }
    const r = await backup.download(set, file);
    res.setHeader('Content-Type', file.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${set}-${file}"`);
    const len = r.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    const { Readable } = require('stream');
    Readable.fromWeb(r.body).pipe(res);
});
