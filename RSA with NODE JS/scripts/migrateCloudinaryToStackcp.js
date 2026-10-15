#!/usr/bin/env node
/**
 * Cloudinary → StackCP media migration.
 *
 *   node scripts/migrateCloudinaryToStackcp.js inventory            # what's on Cloudinary, per folder
 *   node scripts/migrateCloudinaryToStackcp.js copy                 # copy every image to StackCP (safe to re-run)
 *   node scripts/migrateCloudinaryToStackcp.js copy-from-db         # same, but finds images via MongoDB (when Cloudinary's API is blocked)
 *   node scripts/migrateCloudinaryToStackcp.js verify               # every image referenced in MongoDB loads from StackCP?
 *   node scripts/migrateCloudinaryToStackcp.js rewrite-db           # DRY RUN: show full Cloudinary URLs that would change
 *   node scripts/migrateCloudinaryToStackcp.js rewrite-db --apply   # write the changes (saves a rollback file)
 *   node scripts/migrateCloudinaryToStackcp.js rollback --file=migration-logs/rewrite-....json
 *
 * Options: --concurrency=4  --limit=N (copy only, for a trial run)  --optimize (copy: recompress like new uploads)
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

async function pool(items, worker, concurrency = CONCURRENCY) {
    let index = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (index < items.length) {
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
async function listCloudinaryImages() {
    const all = [];
    let cursor;
    do {
        const qs = new URLSearchParams({ max_results: '500' });
        if (cursor) qs.set('next_cursor', cursor);
        const url = `https://api.cloudinary.com/v1_1/${process.env.CLOUD_NAME}/resources/image/upload?${qs}`;
        const res = await fetch(url, { headers: cloudinaryAuthHeader() });
        if (!res.ok) throw new Error(`Cloudinary Admin API ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const page = await res.json();
        all.push(...page.resources);
        cursor = page.next_cursor;
        process.stdout.write(`\r  listed ${all.length} assets...`);
    } while (cursor);
    process.stdout.write('\n');
    return all;
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

async function copy() {
    requireEnv('CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET', 'MEDIA_API_URL', 'MEDIA_PUBLIC_URL', 'MEDIA_SECRET');
    const optimize = flag('optimize');
    const processImage = optimize ? require('../config/multer').processImage : null;
    let resources = await listCloudinaryImages();
    const limit = Number(option('limit', 0));
    if (limit) resources = resources.slice(0, limit);

    const log = openLog('copy', 'public_id,format,bytes,status,key,error');
    const counts = { copied: 0, skipped: 0, unsupported: 0, failed: 0 };
    let done = 0;

    await pool(resources, async (r) => {
        const t = targetFor(r);
        try {
            if (!t.supported) {
                counts.unsupported++;
                log.row(r.public_id, r.format, r.bytes, 'unsupported-folder', '', `folder "${t.folder}"`);
                return;
            }
            const res = await fetch(r.secure_url, { signal: AbortSignal.timeout(60000) });
            if (!res.ok) throw new Error(`download ${res.status}`);
            let buffer = Buffer.from(await res.arrayBuffer());
            let mimetype = res.headers.get('content-type') || `image/${r.format}`;
            if (optimize) ({ buffer, mimetype } = await processImage(buffer, mimetype));

            const out = await media.uploadBuffer(buffer, { folder: t.folder, name: t.name, mimetype, ifExists: 'skip' });
            out.skipped ? counts.skipped++ : counts.copied++;
            log.row(r.public_id, r.format, r.bytes, out.skipped ? 'already-there' : 'copied', out.key, '');
        } catch (err) {
            counts.failed++;
            log.row(r.public_id, r.format, r.bytes, 'FAILED', '', err.message);
        } finally {
            progress(++done, resources.length, `copied ${counts.copied}, skipped ${counts.skipped}, failed ${counts.failed}`);
        }
    });

    console.log(counts);
    console.log(`Log: ${log.file}`);
    if (counts.failed) console.log('Re-run "copy" to retry failures — already-copied files are skipped.');
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
    const refs = new Map(); // url -> first place it was seen
    for await (const { collection, doc } of everyDocument(db)) {
        walkStrings(doc, (value, p) => {
            const url = mediaUrlForStoredValue(value);
            if (url && !refs.has(url)) refs.set(url, `${collection}/${doc._id}/${p}`);
        });
    }
    console.log(`Checking ${refs.size} distinct image references against StackCP...`);
    const log = openLog('verify', 'url,status,first_seen_at');
    let missing = 0, done = 0;
    await pool([...refs.entries()], async ([url, where]) => {
        let status;
        try {
            const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
            status = res.status;
        } catch (err) { status = `error: ${err.message}`; }
        if (status !== 200) { missing++; log.row(url, status, where); }
        progress(++done, refs.size, `missing ${missing}`);
    }, Math.max(CONCURRENCY, 8));
    console.log(missing ? `${missing} references do NOT load — see ${log.file}` : 'All referenced images load from StackCP ✔');
    await mongoose.disconnect();
    process.exitCode = missing ? 2 : 0;
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
