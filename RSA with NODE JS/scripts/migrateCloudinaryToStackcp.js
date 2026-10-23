#!/usr/bin/env node
/**
 * Cloudinary → StackCP media migration.
 *
 *   node scripts/migrateCloudinaryToStackcp.js inventory            # what's on Cloudinary, per folder
 *   node scripts/migrateCloudinaryToStackcp.js copy                 # copy every image to StackCP (safe to re-run)
 *   node scripts/migrateCloudinaryToStackcp.js copy-from-db         # same, but finds images via MongoDB (when Cloudinary's API is blocked)
 *   node scripts/migrateCloudinaryToStackcp.js verify               # every image referenced in MongoDB loads from StackCP? (explains any that don't)
 *   node scripts/migrateCloudinaryToStackcp.js copy-from-db --from=migration-logs/verify-....csv   # copy just the ones verify found missing
 *   node scripts/migrateCloudinaryToStackcp.js rewrite-db           # DRY RUN: show full Cloudinary URLs that would change
 *   node scripts/migrateCloudinaryToStackcp.js rewrite-db --apply   # write the changes (saves a rollback file)
 *   node scripts/migrateCloudinaryToStackcp.js rollback --file=migration-logs/rewrite-....json
 *
 * Options: --concurrency=4  --limit=N (copy only, for a trial run)  --optimize (copy: recompress like new uploads)
 *          --fresh (list Cloudinary again instead of resuming / reusing migration-logs/cloudinary-list.json)
 *          --recheck (copy: ignore earlier copy logs and check every image again)
 *
 * Env (.env): MONGO_URI, CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET,
 *             MEDIA_API_URL, MEDIA_PUBLIC_URL, MEDIA_SECRET
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const media = require('../services/mediaStorage');

const command = process.argv[2];
const flag = (name) => process.argv.slice(2).includes(`--${name}`);
const option = (name, fallback) => {
    const hit = process.argv.slice(2).find(a => a.startsWith(`--${name}=`));
    return hit ? hit.split('=').slice(1).join('=') : fallback;
};
const CONCURRENCY = Number(option('concurrency', 4));
const LOG_DIR = path.join(__dirname, '..', 'migration-logs');
const SKIP_COLLECTIONS = new Set(['agendaJobs', 'otps']);

// Values that look like images we manage (see services/mediaStorage.parseStoredValue)
const BARE_ID_RE = /^\d{13}-\d{1,10}(\.(jpe?g|png|webp))?$/i;
const FOLDER_KEY_RE = /^(uploads|company-expenses|bookings|expenses|diesel-expenses|profiles|vehicles|verifications|rewards|admin)(\/[A-Za-z0-9][A-Za-z0-9_-]*){1,6}(\.(jpe?g|png|webp))?$/i;

// ---------------------------------------------------------------- helpers
function requireEnv(...names) {
    const missing = names.filter(n => !process.env[n]);
    if (missing.length) {
        console.error(`Missing env: ${missing.join(', ')}`);
        process.exit(1);
    }
}

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function openLog(name, header) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const file = path.join(LOG_DIR, `${name}-${timestamp()}.csv`);
    fs.writeFileSync(file, header + '\n');
    const csv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return { file, row: (...cols) => fs.appendFileSync(file, cols.map(csv).join(',') + '\n') };
}

async function pool(items, worker, concurrency = CONCURRENCY, shouldStop = () => false) {
    let index = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (index < items.length && !shouldStop()) {
            const i = index++;
            await worker(items[i], i);
        }
    });
    await Promise.all(runners);
}

function progress(done, total, extra = '') {
    if (done === total || done % 25 === 0) {
        process.stdout.write(`\r  ${done}/${total} ${extra}        `);
        if (done === total) process.stdout.write('\n');
    }
}

function cloudinaryAuthHeader() {
    const token = Buffer.from(`${process.env.CLOUD_API_KEY}:${process.env.CLOUD_API_SECRET}`).toString('base64');
    return { Authorization: `Basic ${token}` };
}

/** All image assets of type "upload" via the Cloudinary Admin API (500 per page). */
const LIST_CACHE = path.join(LOG_DIR, 'cloudinary-list.json');
const LIST_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // a finished list is reused for 12 hours

function saveListCache(state) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const tmp = LIST_CACHE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, LIST_CACHE); // never leaves a half-written file behind
}

function loadListCache() {
    try { return JSON.parse(fs.readFileSync(LIST_CACHE, 'utf8')); } catch { return null; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// One page of the Admin API, retried on dropped connections, timeouts, 429 and 5xx.
async function fetchListPage(url, attempts = 8) {
    for (let attempt = 1; ; attempt++) {
        try {
            const res = await fetch(url, { headers: cloudinaryAuthHeader(), signal: AbortSignal.timeout(60000) });
            if (res.ok) return await res.json();
            const body = (await res.text()).slice(0, 300);
            const retryable = res.status === 429 || res.status >= 500;
            if (!retryable || attempt >= attempts) throw Object.assign(new Error(`Cloudinary Admin API ${res.status}: ${body}`), { final: true });
            const wait = res.status === 429 ? 60000 : Math.min(30000, 2000 * 2 ** (attempt - 1));
            process.stdout.write(`\n  Cloudinary answered ${res.status}, retrying in ${Math.round(wait / 1000)}s (try ${attempt + 1}/${attempts})...`);
            await sleep(wait);
        } catch (err) {
            if (err.final || attempt >= attempts) throw err;
            const wait = Math.min(30000, 2000 * 2 ** (attempt - 1));
            const why = err.cause?.code || err.name || err.message;
            process.stdout.write(`\n  connection problem (${why}), retrying in ${Math.round(wait / 1000)}s (try ${attempt + 1}/${attempts})...`);
            await sleep(wait);
        }
    }
}

// Lists every image in Cloudinary. Progress is saved after each page to
// migration-logs/cloudinary-list.json, so if the connection drops, running the
// command again carries on from the same place. --fresh starts over.
async function listCloudinaryImages() {
    let state = flag('fresh') ? null : loadListCache();
    if (state && state.cloud !== process.env.CLOUD_NAME) state = null;
    if (state?.complete) {
        const age = Date.now() - new Date(state.finishedAt).getTime();
        if (age < LIST_CACHE_MAX_AGE_MS) {
            console.log(`  using saved list of ${state.resources.length} images from ${state.finishedAt} (add --fresh to list again)`);
            return state.resources;
        }
        state = null;
    }
    if (state && !state.complete) {
        console.log(`  resuming saved listing: ${state.resources.length} images listed so far`);
    } else {
        state = { cloud: process.env.CLOUD_NAME, startedAt: new Date().toISOString(), cursor: null, resources: [], complete: false };
    }
    do {
        const qs = new URLSearchParams({ max_results: '500' });
        if (state.cursor) qs.set('next_cursor', state.cursor);
        const url = `https://api.cloudinary.com/v1_1/${process.env.CLOUD_NAME}/resources/image/upload?${qs}`;
        const page = await fetchListPage(url);
        for (const r of page.resources || []) {
            state.resources.push({ public_id: r.public_id, format: r.format, bytes: r.bytes, secure_url: r.secure_url });
        }
        state.cursor = page.next_cursor || null;
        if (!state.cursor) {
            state.complete = true;
            state.finishedAt = new Date().toISOString();
        }
        saveListCache(state);
        process.stdout.write(`\r  listed ${state.resources.length} assets...`);
    } while (state.cursor);
    process.stdout.write('\n');
    return state.resources;
}

function targetFor(resource) {
    const parts = resource.public_id.split('/');
    const name = parts.pop();
    const folder = parts.join('/') || '(root)';
    return { folder, name, supported: media.ALLOWED_FOLDERS.includes(folder) && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(name) };
}

/** Walk any Mongo document, calling fn(value, dottedPath) for every string. */
function walkStrings(value, fn, pathSoFar = '') {
    if (typeof value === 'string') return fn(value, pathSoFar);
    if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return;
    const entries = Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value);
    for (const [k, v] of entries) {
        if (pathSoFar === '' && k === '_id') continue;
        walkStrings(v, fn, pathSoFar ? `${pathSoFar}.${k}` : String(k));
    }
}

function cloudinaryUrlToMedia(value) {
    if (typeof value !== 'string' || !value.includes('res.cloudinary.com/')) return null;
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.hostname !== 'res.cloudinary.com') return null;
    const segs = url.pathname.split('/').filter(Boolean);
    if (segs[0] !== process.env.CLOUD_NAME) return null;
    const uploadIdx = segs.indexOf('upload');
    if (uploadIdx === -1) return null;
    let rest = segs.slice(uploadIdx + 1);
    const v = rest.findIndex(s => /^v\d+$/.test(s));
    if (v !== -1) rest = rest.slice(v + 1);
    const key = rest.join('/');
    if (!FOLDER_KEY_RE.test(key)) return null;
    return media.publicUrlFor(key);
}

/** Public StackCP URL for any stored image value, or null if it isn't one of ours. */
function mediaUrlForStoredValue(value) {
    if (typeof value !== 'string') return null;
    const v = value.trim();
    if (BARE_ID_RE.test(v)) return media.publicUrlFor(`uploads/${v}`);
    if (FOLDER_KEY_RE.test(v)) return media.publicUrlFor(v);
    const fromCloudinary = cloudinaryUrlToMedia(v);
    if (fromCloudinary) return fromCloudinary;
    const base = (process.env.MEDIA_PUBLIC_URL || '').replace(/\/+$/, '');
    if (base && v.startsWith(base + '/')) return v;
    return null;
}

async function connectMongo() {
    requireEnv('MONGO_URI');
    await mongoose.connect(process.env.MONGO_URI);
    return mongoose.connection.db;
}

async function* everyDocument(db) {
    const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
        .map(c => c.name)
        .filter(n => !SKIP_COLLECTIONS.has(n) && !n.startsWith('system.'));
    for (const name of collections) {
        const cursor = db.collection(name).find({}).batchSize(500);
        for await (const doc of cursor) yield { collection: name, doc };
    }
}

// ---------------------------------------------------------------- commands
async function inventory() {
    requireEnv('CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET');
    const resources = await listCloudinaryImages();
    const byFolder = {};
    for (const r of resources) {
        const t = targetFor(r);
        byFolder[t.folder] ??= { count: 0, bytes: 0, formats: {}, supported: t.supported };
        byFolder[t.folder].count++;
        byFolder[t.folder].bytes += r.bytes || 0;
        byFolder[t.folder].formats[r.format] = (byFolder[t.folder].formats[r.format] || 0) + 1;
    }
    console.table(Object.fromEntries(Object.entries(byFolder).map(([f, s]) => [f, {
        images: s.count,
        sizeMB: (s.bytes / 1048576).toFixed(1),
        formats: Object.entries(s.formats).map(([k, v]) => `${k}:${v}`).join(' '),
        willCopy: s.supported ? 'yes' : 'NO (folder not allowed on StackCP)',
    }])));
    const total = resources.reduce((a, r) => a + (r.bytes || 0), 0);
    console.log(`Total: ${resources.length} images, ${(total / 1048576).toFixed(1)} MB`);
}

// Images already copied, read from earlier copy-*.csv logs (so a restart skips them with no network at all).
function loadCopiedIds() {
    const done = new Set();
    let files = [];
    try { files = fs.readdirSync(LOG_DIR).filter(f => /^copy-.*\.csv$/.test(f)); } catch { return done; }
    for (const f of files) {
        const lines = fs.readFileSync(path.join(LOG_DIR, f), 'utf8').split('\n');
        for (const line of lines) {
            const m = line.match(/^"((?:[^"]|"")*)","(?:[^"]|"")*","(?:[^"]|"")*","(copied|already-there)"/);
            if (m) done.add(m[1].replace(/""/g, '"'));
        }
    }
    return done;
}

// Cheap check before downloading: is the file already served by StackCP? (.htaccess serves it without the extension)
async function existsOnMedia(t) {
    const base = String(process.env.MEDIA_PUBLIC_URL || '').replace(/\/+$/, '');
    try {
        const r = await fetch(`${base}/${t.folder}/${t.name}`, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
        // only trust a real image answer (a 200 'not found' page must not count as copied)
        return r.ok && /^image\//i.test(r.headers.get('content-type') || '');
    } catch {
        return false;
    }
}

async function copy() {
    requireEnv('CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET', 'MEDIA_API_URL', 'MEDIA_PUBLIC_URL', 'MEDIA_SECRET');
    const optimize = flag('optimize');
    const processImage = optimize ? require('../config/multer').processImage : null;
    let resources = await listCloudinaryImages();
    const limit = Number(option('limit', 0));
    if (limit) resources = resources.slice(0, limit);

    const already = flag('recheck') ? new Set() : loadCopiedIds();
    let alreadyCount = 0;
    if (already.size) {
        const before = resources.length;
        resources = resources.filter(r => !already.has(r.public_id));
        alreadyCount = before - resources.length;
        console.log(`  ${before - resources.length} already copied in earlier runs (from migration-logs) - skipping them. ${resources.length} to go.`);
    }
    const log = openLog('copy', 'public_id,format,bytes,status,key,error');
    const counts = { copied: 0, skipped: alreadyCount, unsupported: 0, failed: 0, retried: 0 };
    let done = 0;
    const reasons = {};
    let inARow = 0;
    let stopped = null;
    const STOP_AFTER = Number(option('stop-after', 25)); // consecutive failures before giving up
    let pauseUntil = 0;
    const networkPause = async () => { const w = pauseUntil - Date.now(); if (w > 0) await sleep(w); };

    await pool(resources, async (r) => {
        const t = targetFor(r);
        try {
            if (!t.supported) {
                counts.unsupported++;
                log.row(r.public_id, r.format, r.bytes, 'unsupported-folder', '', `folder "${t.folder}"`);
                return;
            }
            if (await existsOnMedia(t)) {
                counts.skipped++;
                log.row(r.public_id, r.format, r.bytes, 'already-there', `${t.folder}/${t.name}`, '');
                inARow = 0;
                return;
            }
            // Network trouble (timeouts, resets, 5xx, 429) is retried a few times before the image counts as failed.
            const RETRYABLE = /timeout|aborted|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|UND_ERR|socket|fetch failed|HTTP 5\d\d|HTTP 429|unreachable|Media server error \(5/i;
            const tries = Number(option('retries', 3)) + 1;
            for (let attempt = 1; ; attempt++) {
                let stage = 'download from Cloudinary';
                try {
                    await networkPause();
                    const res = await fetch(r.secure_url, { signal: AbortSignal.timeout(60000) });
                    if (!res.ok) throw new Error(`HTTP ${res.status}${res.headers.get('x-cld-error') ? ' ' + res.headers.get('x-cld-error') : ''}`);
                    let buffer = Buffer.from(await res.arrayBuffer());
                    let mimetype = res.headers.get('content-type') || `image/${r.format}`;
                    if (optimize) { stage = 'optimize'; ({ buffer, mimetype } = await processImage(buffer, mimetype)); }
                    stage = 'upload to StackCP';
                    const out = await media.uploadBuffer(buffer, { folder: t.folder, name: t.name, mimetype, ifExists: 'skip' });
                    out.skipped ? counts.skipped++ : counts.copied++;
                    log.row(r.public_id, r.format, r.bytes, out.skipped ? 'already-there' : 'copied', out.key, '');
                    inARow = 0;
                    break;
                } catch (err) {
                    const why = `${stage}: ${[err.message, err.cause?.code, err.cause?.message].filter(Boolean).join(' / ')}`;
                    if (attempt < tries && RETRYABLE.test(why)) {
                        counts.retried++;
                        await sleep(Math.min(30000, 3000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 1000));
                        continue;
                    }
                    throw new Error(attempt > 1 ? `${why} (after ${attempt} tries)` : why);
                }
            }
        } catch (err) {
            counts.failed++;
            log.row(r.public_id, r.format, r.bytes, 'FAILED', '', err.message);
            const key = err.message.slice(0, 200);
            if (!reasons[key]) process.stdout.write(`\n  FAILED ${r.public_id} -> ${err.message}\n`);
            reasons[key] = (reasons[key] || 0) + 1;
            if (++inARow >= STOP_AFTER && !stopped) stopped = `${inARow} images failed in a row`;
            else if (inARow % 5 === 0 && !stopped) {
                process.stdout.write(`\n  ${inARow} failures in a row - pausing 60s for the connection to recover...\n`);
                pauseUntil = Date.now() + 60000;
            }
        } finally {
            progress(++done, resources.length, `copied ${counts.copied}, skipped ${counts.skipped}, failed ${counts.failed}`);
        }
    }, CONCURRENCY, () => !!stopped);

    if (stopped) console.log(`\n  STOPPED: ${stopped}. Fix the problem below, then run the same command again.`);
    if (Object.keys(reasons).length) {
        console.log('  Failure reasons:');
        for (const [k, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 5)) console.log(`   ${n} x ${k}`);
    }
    console.log(counts);
    console.log(`Log: ${log.file}`);
    if (counts.failed) console.log('Re-run "copy" (without --fresh) to retry the failures - already-copied images are skipped instantly.');
}

/**
 * copy-from-db: for when the Cloudinary Admin API is blocked (e.g. "disabled account").
 * Reads every image value stored in MongoDB and downloads it straight from its public
 * Cloudinary delivery URL. Only needs CLOUD_NAME (no API key). Skips images already on StackCP.
 */
function cloudinarySourceFor(value) {
    const v = String(value).trim();
    const base = `https://res.cloudinary.com/${process.env.CLOUD_NAME}/image/upload`;
    let key; // folder/name(.ext) as on Cloudinary
    if (/^https?:\/\//i.test(v)) {
        if (!cloudinaryUrlToMedia(v)) return null;       // not one of our Cloudinary images
        const segs = new URL(v).pathname.split('/').filter(Boolean);
        let rest = segs.slice(segs.indexOf('upload') + 1);
        const ver = rest.findIndex(x => /^v\d+$/.test(x));
        if (ver !== -1) rest = rest.slice(ver + 1);
        key = rest.join('/');
        return { source: v, ...splitKey(key) };
    }
    if (BARE_ID_RE.test(v)) key = `uploads/${v}`;
    else if (/^company-expenses\/[A-Za-z0-9][A-Za-z0-9_-]*(\.(jpe?g|png|webp))?$/i.test(v)) key = v;
    else return null;                                     // new StackCP-style values: nothing to copy
    return { source: `${base}/${key}`, ...splitKey(key) };
}

function splitKey(key) {
    const parts = key.split('/');
    const file = parts.pop();
    return { folder: parts.join('/') || 'uploads', name: file.replace(/\.(jpe?g|png|webp)$/i, '') };
}

async function copyFromDb() {
    requireEnv('CLOUD_NAME', 'MEDIA_API_URL', 'MEDIA_PUBLIC_URL', 'MEDIA_SECRET');
    const db = await connectMongo();
    const targets = new Map(); // folder/name -> { source, folder, name, where }
    for await (const { collection, doc } of everyDocument(db)) {
        walkStrings(doc, (value, p) => {
            const t = cloudinarySourceFor(value);
            if (t && !targets.has(`${t.folder}/${t.name}`)) targets.set(`${t.folder}/${t.name}`, { ...t, where: `${collection}/${doc._id}/${p}` });
        });
    }
    let list = [...targets.values()];
    const fromFile = option('from');
    if (fromFile) {
        // only the references a verify run reported as missing (column 1 = StackCP url)
        if (!fs.existsSync(fromFile)) { console.error(`--from file not found: ${fromFile}`); process.exit(1); }
        const wanted = new Set(fs.readFileSync(fromFile, 'utf8').split(/\r?\n/).slice(1)
            .map(line => (line.match(/^"((?:[^"]|"")*)"/) || [])[1]).filter(Boolean).map(u => u.replace(/""/g, '"')));
        const base = process.env.MEDIA_PUBLIC_URL.replace(/\/+$/, '');
        const noExt = new Set([...wanted].map(u => u.replace(/\.(jpe?g|png|webp)$/i, '')));
        list = list.filter(t => noExt.has(`${base}/${t.folder}/${t.name}`));
        console.log(`--from: ${wanted.size} missing references listed, ${list.length} of them can be fetched from Cloudinary.`);
    }
    const limit = Number(option('limit', 0));
    if (limit) list = list.slice(0, limit);
    console.log(`Found ${targets.size} Cloudinary images referenced in the database${limit ? ` (doing ${list.length})` : ''}.`);

    const base = process.env.MEDIA_PUBLIC_URL.replace(/\/+$/, '');
    const log = openLog('copy-from-db', 'source,status,key,error,referenced_at');
    const counts = { copied: 0, alreadyThere: 0, notOnCloudinary: 0, failed: 0 };
    let done = 0, blockedByCloudinary = 0;

    await pool(list, async (t) => {
        try {
            const head = await fetch(`${base}/${t.folder}/${t.name}`, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
            if (head.status === 200) { counts.alreadyThere++; log.row(t.source, 'already-there', `${t.folder}/${t.name}`, '', t.where); return; }

            const res = await fetch(t.source, { signal: AbortSignal.timeout(60000) });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) blockedByCloudinary++;
                const missing = res.status === 404;
                missing ? counts.notOnCloudinary++ : counts.failed++;
                log.row(t.source, missing ? 'not-on-cloudinary' : 'FAILED', '', `download ${res.status}`, t.where);
                return;
            }
            const buffer = Buffer.from(await res.arrayBuffer());
            const out = await media.uploadBuffer(buffer, {
                folder: t.folder, name: t.name, ifExists: 'skip',
                mimetype: res.headers.get('content-type') || 'image/jpeg',
            });
            out.skipped ? counts.alreadyThere++ : counts.copied++;
            log.row(t.source, out.skipped ? 'already-there' : 'copied', out.key, '', t.where);
        } catch (err) {
            counts.failed++;
            log.row(t.source, 'FAILED', '', err.message, t.where);
        } finally {
            progress(++done, list.length, `copied ${counts.copied}, already ${counts.alreadyThere}, failed ${counts.failed}`);
        }
    });

    console.log(counts);
    console.log(`Log: ${log.file}`);
    if (blockedByCloudinary && blockedByCloudinary >= Math.max(1, (counts.failed + counts.notOnCloudinary) * 0.9)) {
        console.log('\nCloudinary is refusing to deliver the images (401/403) — the account is blocked for delivery too.');
        console.log('Log in to cloudinary.com to see why it was disabled (usually the free-plan limit). Once images open again, re-run this command.');
    } else if (counts.failed) {
        console.log('Re-run "copy-from-db" to retry — images already on StackCP are skipped.');
    }
    await mongoose.disconnect();
}

async function verify() {
    requireEnv('MEDIA_PUBLIC_URL');
    const db = await connectMongo();
    const refs = new Map(); // url -> { where, value }
    for await (const { collection, doc } of everyDocument(db)) {
        walkStrings(doc, (value, p) => {
            const url = mediaUrlForStoredValue(value);
            if (url && !refs.has(url)) refs.set(url, { where: `${collection}/${doc._id}/${p}`, value });
        });
    }
    console.log(`Checking ${refs.size} distinct image references against StackCP...`);
    const missingList = [];
    let done = 0;
    await pool([...refs.entries()], async ([url, ref]) => {
        let status;
        try {
            const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
            status = res.status;
        } catch (err) { status = `error: ${err.message}`; }
        if (status !== 200) missingList.push({ url, status, ...ref });
        progress(++done, refs.size, `missing ${missingList.length}`);
    }, Math.max(CONCURRENCY, 8));

    if (!missingList.length) {
        console.log('All referenced images load from StackCP ✔');
        await mongoose.disconnect();
        return;
    }

    // Why is each one missing? Check whether Cloudinary still has it.
    console.log(`\n${missingList.length} references do not load from StackCP. Checking why...`);
    const log = openLog('verify', 'url,status,reason,stored_value,cloudinary_source,first_seen_at');
    const reasons = {};   // reason -> count
    const byPlace = {};   // "collection field" -> { reason: count }
    done = 0;
    await pool(missingList, async (m) => {
        let reason;
        const src = process.env.CLOUD_NAME ? cloudinarySourceFor(m.value) : null;
        if (typeof m.status === 'string') reason = 'check-failed';              // timeout / network: re-run verify
        else if (!src) reason = 'never-uploaded';                                // new-style key, file never reached StackCP
        else {
            let cs;
            try {
                const res = await fetch(src.source, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
                cs = res.status;
            } catch { cs = 0; }
            reason = cs === 200 ? 'on-cloudinary-not-copied' : cs === 404 ? 'missing-on-cloudinary-too' : cs === 401 || cs === 403 ? 'cloudinary-refused' : 'check-failed';
        }
        m.reason = reason;
        reasons[reason] = (reasons[reason] || 0) + 1;
        const [collection, , ...field] = m.where.split('/');
        const place = `${collection} ${field.join('/').replace(/\.\d+(?=\.|$)/g, '[]')}`;
        (byPlace[place] = byPlace[place] || {})[reason] = (byPlace[place][reason] || 0) + 1;
        log.row(m.url, m.status, reason, m.value, src ? src.source : '', m.where);
        progress(++done, missingList.length, 'checked');
    }, Math.max(CONCURRENCY, 8));

    const explain = {
        'on-cloudinary-not-copied': 'still on Cloudinary → fix: copy-from-db --from=<this log>',
        'missing-on-cloudinary-too': 'not on Cloudinary either → was already broken before the move (nothing lost)',
        'never-uploaded': 'new-style upload whose file never reached StackCP (upload failed in the app)',
        'cloudinary-refused': 'Cloudinary refused (401/403) → cannot tell; check the Cloudinary account',
        'check-failed': 'network/timeout while checking → just run verify again',
    };
    console.log('\nWhy they are missing:');
    for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(6)}  ${r.padEnd(26)} ${explain[r]}`);
    console.log('\nWhere they are used (top 15):');
    Object.entries(byPlace)
        .map(([place, r]) => [place, Object.values(r).reduce((a, b) => a + b, 0), r])
        .sort((a, b) => b[1] - a[1]).slice(0, 15)
        .forEach(([place, n, r]) => console.log(`  ${String(n).padStart(6)}  ${place}  ${JSON.stringify(r)}`));
    console.log(`\nDetails: ${log.file}`);
    if (reasons['on-cloudinary-not-copied']) console.log(`Next: node scripts/migrateCloudinaryToStackcp.js copy-from-db --from="${log.file}"`);
    await mongoose.disconnect();
    process.exitCode = 2;
}

async function rewriteDb() {
    requireEnv('CLOUD_NAME', 'MEDIA_PUBLIC_URL');
    const apply = flag('apply');
    const db = await connectMongo();
    const changes = [];
    const perCollection = {};

    for await (const { collection, doc } of everyDocument(db)) {
        const set = {};
        walkStrings(doc, (value, p) => {
            const next = cloudinaryUrlToMedia(value);
            if (next && next !== value) {
                set[p] = next;
                changes.push({ collection, _id: doc._id, path: p, old: value, new: next });
            }
        });
        if (Object.keys(set).length) {
            perCollection[collection] = (perCollection[collection] || 0) + Object.keys(set).length;
            if (apply) await db.collection(collection).updateOne({ _id: doc._id }, { $set: set });
        }
    }

    console.table(perCollection);
    changes.slice(0, 5).forEach(c => console.log(`  ${c.collection}.${c.path}\n    ${c.old}\n  → ${c.new}`));
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const file = path.join(LOG_DIR, `rewrite-${apply ? 'applied' : 'dryrun'}-${timestamp()}.json`);
    fs.writeFileSync(file, JSON.stringify(changes, null, 1));
    console.log(`${changes.length} field(s) ${apply ? 'UPDATED' : 'would change (dry run — add --apply)'}. Details: ${file}`);
    await mongoose.disconnect();
}

async function rollback() {
    const file = option('file');
    if (!file || !fs.existsSync(file)) { console.error('Usage: rollback --file=migration-logs/rewrite-applied-....json'); process.exit(1); }
    const db = await connectMongo();
    const changes = JSON.parse(fs.readFileSync(file, 'utf8'));
    let restored = 0;
    for (const c of changes) {
        const id = mongoose.Types.ObjectId.isValid(c._id) ? new mongoose.Types.ObjectId(c._id) : c._id;
        const r = await db.collection(c.collection).updateOne({ _id: id, [c.path]: c.new }, { $set: { [c.path]: c.old } });
        restored += r.modifiedCount;
    }
    console.log(`Restored ${restored}/${changes.length} field(s).`);
    await mongoose.disconnect();
}

const commands = { inventory, copy, 'copy-from-db': copyFromDb, verify, 'rewrite-db': rewriteDb, rollback };

if (require.main === module) {
    if (!commands[command]) {
        console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
        process.exit(1);
    }
    commands[command]().catch(err => {
        console.error('\nMigration error:', err);
        process.exit(1);
    });
}

module.exports = { commands, cloudinarySourceFor, cloudinaryUrlToMedia, mediaUrlForStoredValue, targetFor, walkStrings };