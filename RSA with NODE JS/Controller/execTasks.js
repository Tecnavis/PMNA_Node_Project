/**
 * Admin website: give showrooms and tasks to marketing executives, and report on their work.
 * Admin and staff only (staff can be blocked with the "executives.assign" permission for changes).
 *
 *   GET    /exec-tasks/executives                      executives with their numbers
 *   GET    /exec-tasks/showrooms?search&executive&scope&page&limit
 *   POST   /exec-tasks/assign      { executiveId, showroomIds[], visitTask, dueDate, notes, priority }
 *   POST   /exec-tasks/unassign    { showroomIds[] }
 *   GET    /exec-tasks?executive&status&type&search&page&limit
 *   POST   /exec-tasks             { executiveId, type, showroomId | showroomIds[], title, notes, area, target, dueDate, priority }
 *   PATCH  /exec-tasks/:id         { title, notes, dueDate, priority, status, note }
 *   DELETE /exec-tasks/:id         cancel (kept for history)
 *   GET    /exec-tasks/report/summary?from&to&executive
 *   GET    /exec-tasks/report/visits?from&to&executive&page&limit
 *   GET    /exec-tasks/report/new-showrooms?from&to&executive&page&limit
 */
const mongoose = require('mongoose');
const Executive = require('../Model/executive');
const Showroom = require('../Model/showroom');
const Booking = require('../Model/booking');
const Verification = require('../Model/verification');
const ExecTask = require('../Model/execTask');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { ownerFilter, responsibleId, actorOf, oid } = require('../services/execWork');
const { defaultTitle } = require('./execApp');
const { haversineKm, parseLatLng } = require('../utils/eta');

const bad = (res, message) => res.status(400).json({ success: false, message });
const isId = (v) => mongoose.isValidObjectId(v);
const esc = (q) => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);

/** 'YYYY-MM-DD' (India time) range → [start, endExclusive]. Default: this month so far. */
function range(q) {
    const ok = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
    const today = ymd(new Date());
    const from = ok(q.from) ? q.from : `${today.slice(0, 8)}01`;
    const to = ok(q.to) ? q.to : today;
    const start = new Date(`${from}T00:00:00+05:30`);
    const end = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86400000);
    return { from, to, start, end };
}

/** End of the due day in India time (a task due "today" is overdue only after midnight). */
function dueAt(value) {
    if (!value) return null;
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T23:59:59+05:30`);
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

const page = (q, def = 25) => {
    const limit = Math.min(200, Math.max(1, parseInt(q.limit, 10) || def));
    const p = Math.max(1, parseInt(q.page, 10) || 1);
    return { limit, page: p, skip: (p - 1) * limit };
};

/** { id: date } — the newest (or oldest) `dateField` per id; one small indexed lookup each (ids are a page or the executives). */
async function edgeDates(Model, field, ids, dateField, dir = -1, options = {}) {
    const rows = await Promise.all(ids.map((id) => {
        const q = Model.findOne({ [field]: id }).select(dateField).sort({ [dateField]: dir }).lean();
        return (options.includeHidden ? q.setOptions({ _includeHidden: true }) : q).then((d) => [String(id), d ? d[dateField] : null]);
    }));
    return Object.fromEntries(rows.filter(([, d]) => d));
}

async function execNames(ids) {
    const list = await Executive.find(ids ? { _id: { $in: ids } } : {}).select('name phone userName image').lean();
    return new Map(list.map((e) => [String(e._id), e]));
}

function shapeTask(t, names) {
    const e = names.get(String(t.executive));
    return {
        _id: t._id,
        executive: { _id: t.executive, name: e?.name || '(removed)', phone: e?.phone || '' },
        type: t.type,
        title: t.title || defaultTitle(t),
        notes: t.notes || '',
        area: t.area || '',
        target: t.target || 1,
        progress: (t.addedShowrooms || []).length,
        dueDate: t.dueDate,
        overdue: t.status === 'open' && !!t.dueDate && new Date(t.dueDate).getTime() < Date.now(),
        priority: t.priority,
        status: t.status,
        assignedBy: t.assignedBy?.name || t.assignedBy?.role || '',
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        completedBy: t.completedBy,
        completionNote: t.completionNote || '',
        showroom: t.showroom && t.showroom._id ? { _id: t.showroom._id, name: t.showroom.name, code: t.showroom.showroomId, district: t.showroom.district || '' } : null,
    };
}

// ---------------------------------------------------------------- executives

exports.executives = asyncErrorHandler(async (req, res) => {
    const [execs, showrooms, open, overdue] = await Promise.all([
        Executive.find().select('name phone userName image').sort({ name: 1 }).lean(),
        Showroom.find().select('addedBy assignedExecutive').lean(),
        ExecTask.aggregate([{ $match: { status: 'open' } }, { $group: { _id: '$executive', n: { $sum: 1 } } }]),
        ExecTask.aggregate([{ $match: { status: 'open', dueDate: { $lt: new Date() } } }, { $group: { _id: '$executive', n: { $sum: 1 } } }]),
    ]);
    const count = {};
    for (const s of showrooms) {
        const r = responsibleId(s);
        if (r) count[String(r)] = (count[String(r)] || 0) + 1;
    }
    const m = (rows) => Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
    const o = m(open);
    const od = m(overdue);
    res.json({
        success: true,
        data: execs.map((e) => ({ _id: e._id, name: e.name, phone: e.phone, userName: e.userName, image: e.image || null, showrooms: count[String(e._id)] || 0, openTasks: o[String(e._id)] || 0, overdueTasks: od[String(e._id)] || 0 })),
        unassignedShowrooms: showrooms.filter((s) => !responsibleId(s)).length,
    });
});

// ---------------------------------------------------------------- showrooms + assignment

exports.showrooms = asyncErrorHandler(async (req, res) => {
    const { limit, page: p, skip } = page(req.query, 30);
    const and = [];
    const q = String(req.query.search || '').trim();
    if (q) {
        const rx = new RegExp(esc(q), 'i');
        and.push({ $or: [{ name: rx }, { location: rx }, { district: rx }, { showroomId: rx }, { phone: rx }] });
    }
    const scope = String(req.query.scope || 'all');
    if (isId(req.query.executive) && scope === 'mine') and.push(ownerFilter(req.query.executive));
    if (scope === 'unassigned') and.push({ assignedExecutive: null, addedBy: null });
    const filter = and.length ? { $and: and } : {};
    const [total, list] = await Promise.all([
        Showroom.countDocuments(filter),
        Showroom.find(filter).select('name showroomId location district phone addedBy assignedExecutive assignedAt createdAt').sort({ name: 1 }).skip(skip).limit(limit).lean(),
    ]);
    const ids = list.map((s) => s._id);
    const [names, lastVisits] = await Promise.all([
        execNames(),
        edgeDates(Verification, 'showroom', ids, 'verificationDate'),
    ]);
    const lv = lastVisits;
    res.json({
        success: true,
        total,
        page: p,
        pages: Math.max(1, Math.ceil(total / limit)),
        data: list.map((s) => {
            const r = responsibleId(s);
            return {
                _id: s._id,
                name: s.name,
                code: s.showroomId,
                location: s.location,
                district: s.district || '',
                phone: s.phone || '',
                lookedAfterBy: r ? { _id: r, name: names.get(String(r))?.name || '(removed)', how: s.assignedExecutive ? 'assigned' : 'added' } : null,
                addedBy: s.addedBy ? { _id: s.addedBy, name: names.get(String(s.addedBy))?.name || '(removed)' } : null,
                assignedAt: s.assignedAt,
                lastVisitAt: lv[String(s._id)] || null,
            };
        }),
    });
});

exports.assign = asyncErrorHandler(async (req, res) => {
    const { executiveId, showroomIds, visitTask, notes, priority } = req.body || {};
    if (!isId(executiveId)) return bad(res, 'Choose an executive');
    const ids = (Array.isArray(showroomIds) ? showroomIds : []).filter(isId);
    if (!ids.length) return bad(res, 'Choose at least one showroom');
    if (ids.length > 500) return bad(res, 'Up to 500 showrooms at a time');
    const exec = await Executive.findById(executiveId).select('name').lean();
    if (!exec) return bad(res, 'Executive not found');
    const due = dueAt(req.body?.dueDate);
    if (due === undefined) return bad(res, 'Due date is not valid');
    const by = actorOf(req);

    const r = await Showroom.updateMany(
        { _id: { $in: ids } },
        { $set: { assignedExecutive: oid(executiveId), assignedAt: new Date(), assignedBy: by } }
    );

    let tasksCreated = 0;
    if (visitTask) {
        const existing = await ExecTask.find({ executive: executiveId, showroom: { $in: ids }, type: 'visit', status: 'open' }).select('showroom').lean();
        const have = new Set(existing.map((t) => String(t.showroom)));
        const docs = ids.filter((id) => !have.has(String(id))).map((id) => ({
            executive: executiveId, type: 'visit', showroom: id, notes: String(notes || '').slice(0, 2000), dueDate: due, priority: priority === 'high' ? 'high' : 'normal', assignedBy: by,
        }));
        if (docs.length) tasksCreated = (await ExecTask.insertMany(docs)).length;
    }
    res.json({ success: true, message: `${r.modifiedCount ?? r.nModified ?? ids.length} showroom(s) now with ${exec.name}${tasksCreated ? `, ${tasksCreated} visit task(s) created` : ''}`, assigned: ids.length, tasksCreated });
});

exports.unassign = asyncErrorHandler(async (req, res) => {
    const ids = (Array.isArray(req.body?.showroomIds) ? req.body.showroomIds : []).filter(isId);
    if (!ids.length) return bad(res, 'Choose at least one showroom');
    const r = await Showroom.updateMany({ _id: { $in: ids } }, { $set: { assignedExecutive: null, assignedAt: null, assignedBy: { id: null, role: '', name: '' } } });
    res.json({ success: true, message: `${r.modifiedCount ?? ids.length} showroom(s) back with the executive who added them` });
});

// ---------------------------------------------------------------- tasks

exports.list = asyncErrorHandler(async (req, res) => {
    const { limit, page: p, skip } = page(req.query, 25);
    const filter = {};
    if (isId(req.query.executive)) filter.executive = oid(req.query.executive);
    if (['visit', 'onboard', 'follow-up', 'other'].includes(req.query.type)) filter.type = req.query.type;
    const status = String(req.query.status || 'open');
    if (status === 'overdue') Object.assign(filter, { status: 'open', dueDate: { $lt: new Date() } });
    else if (['open', 'done', 'cancelled'].includes(status)) filter.status = status;
    const q = String(req.query.search || '').trim();
    if (q) {
        const rx = new RegExp(esc(q), 'i');
        const srs = await Showroom.find({ $or: [{ name: rx }, { showroomId: rx }, { district: rx }] }).select('_id').limit(500).lean();
        filter.$or = [{ title: rx }, { notes: rx }, { area: rx }, { showroom: { $in: srs.map((s) => s._id) } }];
    }
    const sort = status === 'done' ? { completedAt: -1 } : status === 'cancelled' ? { cancelledAt: -1 } : { dueDate: 1, createdAt: -1 };
    const [total, list, counts] = await Promise.all([
        ExecTask.countDocuments(filter),
        ExecTask.find(filter).populate('showroom', 'name showroomId district').sort(sort).skip(skip).limit(limit).lean(),
        (async () => {
            const base = isId(req.query.executive) ? { executive: oid(req.query.executive) } : {};
            const [open, overdue, done, cancelled] = await Promise.all([
                ExecTask.countDocuments({ ...base, status: 'open' }),
                ExecTask.countDocuments({ ...base, status: 'open', dueDate: { $lt: new Date() } }),
                ExecTask.countDocuments({ ...base, status: 'done' }),
                ExecTask.countDocuments({ ...base, status: 'cancelled' }),
            ]);
            return { open, overdue, done, cancelled };
        })(),
    ]);
    const names = await execNames([...new Set(list.map((t) => String(t.executive)))]);
    const c = counts;
    res.json({ success: true, total, page: p, pages: Math.max(1, Math.ceil(total / limit)), counts: c, data: list.map((t) => shapeTask(t, names)) });
});

exports.create = asyncErrorHandler(async (req, res) => {
    const b = req.body || {};
    if (!isId(b.executiveId)) return bad(res, 'Choose an executive');
    const type = ['visit', 'onboard', 'follow-up', 'other'].includes(b.type) ? b.type : 'visit';
    const exec = await Executive.findById(b.executiveId).select('name').lean();
    if (!exec) return bad(res, 'Executive not found');
    const due = dueAt(b.dueDate);
    if (due === undefined) return bad(res, 'Due date is not valid');
    const showroomIds = [...new Set([...(Array.isArray(b.showroomIds) ? b.showroomIds : []), b.showroomId].filter(isId).map(String))];
    if ((type === 'visit' || type === 'follow-up') && !showroomIds.length) return bad(res, 'Choose the showroom for this task');
    if (type === 'other' && !String(b.title || '').trim()) return bad(res, 'Write what needs to be done');
    if (showroomIds.length) {
        const found = await Showroom.countDocuments({ _id: { $in: showroomIds } });
        if (found !== showroomIds.length) return bad(res, 'Showroom not found');
    }
    const base = {
        executive: b.executiveId,
        type,
        title: String(b.title || '').trim().slice(0, 200),
        notes: String(b.notes || '').trim().slice(0, 2000),
        area: String(b.area || '').trim().slice(0, 200),
        target: type === 'onboard' ? Math.min(500, Math.max(1, parseInt(b.target, 10) || 1)) : 1,
        dueDate: due,
        priority: b.priority === 'high' ? 'high' : 'normal',
        assignedBy: actorOf(req),
    };
    const docs = type === 'onboard' || type === 'other' ? [{ ...base, showroom: showroomIds[0] || null }] : showroomIds.map((id) => ({ ...base, showroom: id }));
    const created = await ExecTask.insertMany(docs);
    res.status(201).json({ success: true, message: `${created.length} task${created.length === 1 ? '' : 's'} given to ${exec.name}`, ids: created.map((t) => t._id) });
});

exports.update = asyncErrorHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Task not found' });
    const t = await ExecTask.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Task not found' });
    const b = req.body || {};
    if (b.title !== undefined) t.title = String(b.title).trim().slice(0, 200);
    if (b.notes !== undefined) t.notes = String(b.notes).trim().slice(0, 2000);
    if (b.priority !== undefined) t.priority = b.priority === 'high' ? 'high' : 'normal';
    if (b.target !== undefined && t.type === 'onboard') t.target = Math.min(500, Math.max(1, parseInt(b.target, 10) || 1));
    if (b.dueDate !== undefined) {
        const d = dueAt(b.dueDate);
        if (d === undefined) return bad(res, 'Due date is not valid');
        t.dueDate = d;
    }
    if (b.status !== undefined && b.status !== t.status) {
        const by = actorOf(req).name || 'office';
        if (b.status === 'done') Object.assign(t, { status: 'done', completedAt: new Date(), completedBy: by, completionNote: String(b.note || 'Closed by the office').slice(0, 2000) });
        else if (b.status === 'cancelled') Object.assign(t, { status: 'cancelled', cancelledAt: new Date() });
        else if (b.status === 'open') Object.assign(t, { status: 'open', completedAt: null, completedBy: '', completionNote: '', cancelledAt: null });
        else return bad(res, 'Unknown status');
    }
    await t.save();
    res.json({ success: true, message: 'Task updated' });
});

exports.cancel = asyncErrorHandler(async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Task not found' });
    const r = await ExecTask.updateOne({ _id: req.params.id, status: 'open' }, { $set: { status: 'cancelled', cancelledAt: new Date() } });
    if (!r.matchedCount && !r.n) return bad(res, 'Only open tasks can be cancelled');
    res.json({ success: true, message: 'Task cancelled' });
});

// ---------------------------------------------------------------- reports

exports.reportSummary = asyncErrorHandler(async (req, res) => {
    const { from, to, start, end } = range(req.query);
    const one = isId(req.query.executive) ? oid(req.query.executive) : null;
    const [execs, showrooms] = await Promise.all([
        Executive.find(one ? { _id: one } : {}).select('name phone').sort({ name: 1 }).lean(),
        Showroom.find().select('addedBy assignedExecutive createdAt').lean(),
    ]);
    const execIds = execs.map((e) => e._id);
    const responsible = {}; // exec -> [showroomIds]
    for (const s of showrooms) {
        const r = String(responsibleId(s) || '');
        if (r) (responsible[r] = responsible[r] || []).push(s._id);
    }
    const allMine = execIds.flatMap((id) => responsible[String(id)] || []);
    const now = new Date();
    const [visits, visitedPairs, lastVisit, added, bookings, created, doneRows, openRows] = await Promise.all([
        Verification.aggregate([{ $match: { executive: { $in: execIds }, verificationDate: { $gte: start, $lt: end } } }, { $group: { _id: '$executive', n: { $sum: 1 } } }]),
        Verification.aggregate([{ $match: { executive: { $in: execIds }, verificationDate: { $gte: start, $lt: end } } }, { $group: { _id: { e: '$executive', s: '$showroom' } } }]),
        edgeDates(Verification, 'executive', execIds, 'verificationDate'),
        Showroom.aggregate([{ $match: { addedBy: { $in: execIds }, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: '$addedBy', n: { $sum: 1 } } }]),
        allMine.length
            ? Booking.aggregate([{ $match: { showroom: { $in: allMine }, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: '$showroom', n: { $sum: 1 } } }]).option({ _includeHidden: true })
            : [],
        ExecTask.aggregate([{ $match: { executive: { $in: execIds }, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: '$executive', n: { $sum: 1 } } }]),
        ExecTask.find({ executive: { $in: execIds }, status: 'done', completedAt: { $gte: start, $lt: end } }).select('executive dueDate completedAt').lean(),
        ExecTask.find({ executive: { $in: execIds }, status: 'open' }).select('executive dueDate').lean(),
    ]);
    const m = (rows, k = 'n') => Object.fromEntries(rows.map((r) => [String(r._id), r[k]]));
    const v = m(visits);
    const lv = lastVisit;
    const ad = m(added);
    const cr = m(created);
    const bk = m(bookings);
    const visitedBy = {};
    for (const r of visitedPairs) (visitedBy[String(r._id.e)] = visitedBy[String(r._id.e)] || new Set()).add(String(r._id.s));

    const rows = execs.map((e) => {
        const id = String(e._id);
        const mine = responsible[id] || [];
        const mineSet = new Set(mine.map(String));
        const visited = visitedBy[id] || new Set();
        const visitedMine = [...visited].filter((s) => mineSet.has(s)).length;
        const done = doneRows.filter((t) => String(t.executive) === id);
        const open = openRows.filter((t) => String(t.executive) === id);
        return {
            _id: e._id,
            name: e.name,
            phone: e.phone,
            showrooms: mine.length,
            visits: v[id] || 0,
            showroomsVisited: visited.size,
            coverage: mine.length ? Math.round((visitedMine / mine.length) * 100) : null,
            notVisited: Math.max(0, mine.length - visitedMine),
            newShowrooms: ad[id] || 0,
            bookings: mine.reduce((sum, s) => sum + (bk[String(s)] || 0), 0),
            tasksGiven: cr[id] || 0,
            tasksDone: done.length,
            tasksDoneOnTime: done.filter((t) => !t.dueDate || new Date(t.completedAt) <= new Date(t.dueDate)).length,
            openTasks: open.length,
            overdueTasks: open.filter((t) => t.dueDate && new Date(t.dueDate) < now).length,
            lastVisitAt: lv[id] || null,
        };
    });
    const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
    res.json({
        success: true,
        from,
        to,
        data: rows,
        totals: {
            executives: rows.length,
            showrooms: sum('showrooms'),
            visits: sum('visits'),
            showroomsVisited: sum('showroomsVisited'),
            newShowrooms: sum('newShowrooms'),
            bookings: sum('bookings'),
            tasksGiven: sum('tasksGiven'),
            tasksDone: sum('tasksDone'),
            openTasks: sum('openTasks'),
            overdueTasks: sum('overdueTasks'),
        },
    });
});

exports.reportVisits = asyncErrorHandler(async (req, res) => {
    const { from, to, start, end } = range(req.query);
    const { limit, page: p, skip } = page(req.query, 50);
    const filter = { verificationDate: { $gte: start, $lt: end } };
    if (isId(req.query.executive)) filter.executive = oid(req.query.executive);
    const [total, list] = await Promise.all([
        Verification.countDocuments(filter),
        Verification.find(filter).select('showroom executive verificationDate geoTag accuracy image verificationAddedBy').sort({ verificationDate: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const [names, srs] = await Promise.all([
        execNames([...new Set(list.map((x) => String(x.executive)))]),
        Showroom.find({ _id: { $in: list.map((x) => x.showroom) } }).select('name showroomId district location latitudeAndLongitude').lean(),
    ]);
    const sm = new Map(srs.map((s) => [String(s._id), s]));
    res.json({
        success: true,
        from,
        to,
        total,
        page: p,
        pages: Math.max(1, Math.ceil(total / limit)),
        data: list.map((x) => {
            const s = sm.get(String(x.showroom));
            const at = x.geoTag?.coordinates?.length === 2 ? { lat: x.geoTag.coordinates[1], lng: x.geoTag.coordinates[0] } : null;
            const saved = parseLatLng(s?.latitudeAndLongitude);
            const km = at && saved ? haversineKm(saved, at) : null;
            return {
                _id: x._id,
                at: x.verificationDate,
                executive: { _id: x.executive, name: names.get(String(x.executive))?.name || '(removed)' },
                showroom: s ? { _id: s._id, name: s.name, code: s.showroomId, district: s.district || '', location: s.location || '' } : null,
                image: x.image || null,
                accuracy: x.accuracy ?? null,
                point: at,
                distanceM: km === null ? null : Math.round(km * 1000),
                recordedBy: x.verificationAddedBy?.userType || '',
            };
        }),
    });
});

exports.reportNewShowrooms = asyncErrorHandler(async (req, res) => {
    const { from, to, start, end } = range(req.query);
    const { limit, page: p, skip } = page(req.query, 50);
    const filter = { createdAt: { $gte: start, $lt: end }, addedBy: { $ne: null } };
    if (isId(req.query.executive)) filter.addedBy = oid(req.query.executive);
    const [total, list] = await Promise.all([
        Showroom.countDocuments(filter),
        Showroom.find(filter).select('name showroomId location district phone addedBy assignedExecutive createdAt image').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const ids = list.map((s) => s._id);
    const [names, bookings, visits] = await Promise.all([
        execNames(),
        ids.length ? Booking.aggregate([{ $match: { showroom: { $in: ids } } }, { $group: { _id: '$showroom', n: { $sum: 1 } } }]).option({ _includeHidden: true }) : [],
        ids.length ? Verification.aggregate([{ $match: { showroom: { $in: ids } } }, { $group: { _id: '$showroom', n: { $sum: 1 } } }]) : [],
    ]);
    const bk = new Map(bookings.map((r) => [String(r._id), r]));
    const firstBooking = await edgeDates(Booking, 'showroom', ids.filter((id) => bk.has(String(id))), 'createdAt', 1, { includeHidden: true });
    const vs = new Map(visits.map((r) => [String(r._id), r.n]));
    res.json({
        success: true,
        from,
        to,
        total,
        page: p,
        pages: Math.max(1, Math.ceil(total / limit)),
        data: list.map((s) => ({
            _id: s._id,
            name: s.name,
            code: s.showroomId,
            district: s.district || '',
            location: s.location || '',
            phone: s.phone || '',
            createdAt: s.createdAt,
            addedBy: { _id: s.addedBy, name: names.get(String(s.addedBy))?.name || '(removed)' },
            lookedAfterBy: s.assignedExecutive ? names.get(String(s.assignedExecutive))?.name || '(removed)' : null,
            bookings: bk.get(String(s._id))?.n || 0,
            firstBookingAt: firstBooking[String(s._id)] || null,
            visits: vs.get(String(s._id)) || 0,
        })),
    });
});
