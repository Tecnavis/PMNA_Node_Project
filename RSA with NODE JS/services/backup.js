/**
 * Data backups: every collection as compressed JSON (MongoDB Extended JSON, so ids and dates restore
 * exactly) plus an Excel workbook of the period's bookings and expenses for people to read.
 * Stored privately on the media server (stackcp-media/public_html/api/backup.php keeps them outside
 * the web folder). Uses the same MEDIA_API_URL / MEDIA_SECRET as image uploads.
 *
 *   BACKUP_CRON   when the automatic backup runs (India time; default "15 3 1 * *" = 1st of the month, 3:15 AM)
 *   BACKUP_KEEP   how many backup sets to keep on the server (default 12, minimum 3)
 *
 * Reading only: a backup never changes any data.
 */
const crypto = require('crypto');
const zlib = require('zlib');
const mongoose = require('mongoose');

const SKIP = new Set(['agendaJobs', 'otps', 'sessions']);
const PART_DOCS = Number(process.env.BACKUP_PART_DOCS || 40000);

function cfg() {
    const apiUrl = (process.env.MEDIA_API_URL || '').replace(/\/+$/, '');
    const secret = process.env.MEDIA_SECRET || '';
    if (!apiUrl || secret.length < 32) throw new Error('Backups need MEDIA_API_URL and MEDIA_SECRET (same as image uploads)');
    return { url: `${apiUrl}/backup.php`, secret };
}
function sign(secret, action, name, sha = '') {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = crypto.createHmac('sha256', secret).update(`${ts}\nbackup-${action}\nbackups\n${name}\n${sha}`).digest('hex');
    return { 'X-Media-Timestamp': ts, 'X-Media-Signature': sig };
}
async function call(action, fields = {}, fileBuf = null) {
    const { url, secret } = cfg();
    const name = fields.set && fields.file ? `${fields.set}/${fields.file}` : '';
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const form = new FormData();
            form.append('action', action);
            Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
            const sha = fileBuf ? crypto.createHash('sha256').update(fileBuf).digest('hex') : '';
            if (fileBuf) form.append('data', new Blob([fileBuf], { type: 'application/octet-stream' }), fields.file);
            const res = await fetch(url, { method: 'POST', headers: sign(secret, action, name, sha), body: form, signal: AbortSignal.timeout(action === 'put' ? 180000 : 30000) });
            if (action === 'get') {
                if (!res.ok) throw new Error(`Media server answered ${res.status}`);
                return res;
            }
            const body = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
            if (res.ok && body.ok) return body;
            lastErr = new Error(body.error || `HTTP ${res.status}`);
            if (res.status >= 400 && res.status < 500) break;
        } catch (e) {
            lastErr = e;
        }
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
    throw lastErr;
}

const gzip = (text) => new Promise((resolve, reject) => zlib.gzip(Buffer.from(text, 'utf8'), { level: 9 }, (e, b) => (e ? reject(e) : resolve(b))));
const setId = (suffix) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}${suffix ? `-${suffix}` : ''}`;
};

/** One collection → one or more .json.gz files (one JSON document per line). */
async function dumpCollection(db, name, set) {
    const { EJSON } = mongoose.mongo.BSON;
    const files = [];
    let part = 1;
    let lines = [];
    let count = 0;
    const flush = async () => {
        if (!lines.length && files.length) return;
        const file = `${name}${part > 1 || count > PART_DOCS ? `.part${part}` : ''}.json.gz`;
        const buf = await gzip(lines.join('\n'));
        await call('put', { set, file }, buf);
        files.push({ file, docs: lines.length, bytes: buf.length });
        lines = [];
        part++;
    };
    for await (const doc of db.collection(name).find({})) {
        lines.push(EJSON.stringify(doc, { relaxed: false }));
        count++;
        if (lines.length >= PART_DOCS) await flush();
    }
    if (lines.length || !files.length) await flush();
    return files;
}

/** Excel workbook for people: bookings and expenses of one month. */
async function monthWorkbook(monthStart, monthEnd) {
    const XLSX = require('xlsx');
    const Booking = require('../Model/booking');
    const wb = XLSX.utils.book_new();
    const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '');
    const bookings = await Booking.find({ createdAt: { $gte: monthStart, $lt: monthEnd }, _includeHidden: true })
        .select('fileNumber createdAt status workType customerName mob1 customerVehicleNumber location dropoffLocation totalDistence totalAmount receivedAmount driverSalary cashPending verified driver provider showroom company serviceType')
        .populate('driver', 'name').populate('provider', 'name').populate('showroom', 'name').populate('company', 'name').populate('serviceType', 'serviceName')
        .sort({ createdAt: 1 }).lean();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bookings.map((b) => ({
        'File number': b.fileNumber || '', Date: fmt(b.createdAt), Status: b.status || '', 'Work type': b.workType || '',
        Customer: b.customerName || '', Phone: b.mob1 || '', Vehicle: b.customerVehicleNumber || '',
        From: b.location || '', To: b.dropoffLocation || '', 'Distance (km)': b.totalDistence ?? '',
        'Service type': b.serviceType?.serviceName || '', Driver: b.driver?.name || b.provider?.name || '',
        Showroom: b.showroom?.name || '', Company: b.company?.name || '',
        'Total amount': b.totalAmount ?? '', Received: b.receivedAmount ?? '', 'Driver salary': b.driverSalary ?? '',
        'Cash pending': b.cashPending ? 'Yes' : '', Verified: b.verified ? 'Yes' : '',
    }))), 'Bookings');
    const sheetFor = async (modelPath, label, map) => {
        try {
            const M = require(modelPath);
            const rows = await M.find({ createdAt: { $gte: monthStart, $lt: monthEnd } }).sort({ createdAt: 1 }).lean();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(map)), label);
        } catch (e) {
            console.error(`[backup] ${label} sheet`, e.message);
        }
    };
    await sheetFor('../Model/expense', 'Driver expenses', (e) => ({ Date: fmt(e.createdAt), Amount: e.amount ?? '', Type: e.type || '', Description: e.description || '', Status: e.status || (e.approve ? 'approved' : '') }));
    await sheetFor('../Model/dieselExpense', 'Diesel', (e) => ({ Date: fmt(e.createdAt), Amount: e.amount ?? '', Vehicle: e.vehicleNumber || '', Description: e.description || '', Status: e.status || '' }));
    await sheetFor('../Model/companyExpense', 'Company expenses', (e) => ({ Date: fmt(e.createdAt), Title: e.title || '', Category: e.category || '', Amount: e.amount ?? '', Status: e.status || '' }));
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/** Run a full backup now. */
async function run({ reason = 'manual', by } = {}) {
    const BackupRun = require('../Model/backupRun');
    const set = setId(reason === 'monthly' ? '' : 'manual');
    const started = Date.now();
    const files = [];
    try {
        cfg();
        const db = mongoose.connection.db;
        const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !SKIP.has(n) && !n.startsWith('system.')).sort();
        for (const n of names) files.push(...(await dumpCollection(db, n, set)).map((f) => ({ ...f, collection: n })));

        // readable Excel: the previous month for the monthly run, this month so far for a manual one
        const now = new Date();
        const ist = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(now); // YYYY-MM
        let [y, m] = ist.split('-').map(Number);
        if (reason === 'monthly') { m -= 1; if (m === 0) { m = 12; y -= 1; } }
        const mStart = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00+05:30`);
        const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
        const mEnd = new Date(`${next}-01T00:00:00+05:30`);
        const xbuf = await monthWorkbook(mStart, mEnd);
        const xname = `export-${y}-${String(m).padStart(2, '0')}.xlsx`;
        await call('put', { set, file: xname }, xbuf);
        files.push({ file: xname, bytes: xbuf.length, collection: 'excel' });

        await call('prune', { keep: Math.max(3, Number(process.env.BACKUP_KEEP || 12)) }).catch((e) => console.error('[backup] prune', e.message));
        const bytes = files.reduce((s, f) => s + (f.bytes || 0), 0);
        await BackupRun.create({ set, reason, ok: true, files: files.length, bytes, seconds: Math.round((Date.now() - started) / 1000), by: by || 'system' });
        return { ok: true, name: set, files: files.length, bytes };
    } catch (e) {
        await BackupRun.create({ set, reason, ok: false, error: e.message, files: files.length, seconds: Math.round((Date.now() - started) / 1000), by: by || 'system' }).catch(() => undefined);
        return { ok: false, name: set, error: e.message };
    }
}

const list = async () => (await call('list')).sets || [];
const download = (set, file) => call('get', { set, file });

module.exports = { run, list, download, setId };
