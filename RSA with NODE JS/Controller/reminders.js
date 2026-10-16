/**
 * Reminders + "My work" for the admin website (Admin and Staff logins).
 */
const mongoose = require('mongoose');
const Reminder = require('../Model/reminder');
const Staff = require('../Model/staff');
const Booking = require('../Model/booking');
const StaffDailyWork = require('../Model/staffDailyWork');
const StaffWorkAssignment = require('../Model/staffWorkAssignment');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { BadRequestError, NotFoundError } = require('../Middileware/errorHandler');

const myId = (req) => String(req.user.id || req.user._id || '');
const roleOf = (req) => req.user?.role || req.user?.user?.role || '';
const isAdmin = (req) => roleOf(req) === 'Admin';
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

async function nameOf(req) {
    if (isAdmin(req)) return 'Admin';
    const s = await Staff.findById(myId(req)).select('name').lean();
    return s?.name || 'Staff';
}

/** what this user may see/change */
const visibleTo = (req) => (isAdmin(req) && req.query.scope === 'all' ? {} : { $or: [{ createdBy: myId(req) }, { assignedTo: myId(req) }] });

function nextDue(date, repeat) {
    const d = new Date(date);
    if (repeat === 'daily') d.setDate(d.getDate() + 1);
    else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
    else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
    else return null;
    return d;
}

async function cleanInput(req, body, partial) {
    const out = {};
    if (!partial || body.title !== undefined) {
        const t = String(body.title || '').trim();
        if (!t) throw new BadRequestError('Write what to remember.');
        out.title = t.slice(0, 200);
    }
    if (body.note !== undefined) out.note = String(body.note || '').slice(0, 2000);
    if (!partial || body.dueAt !== undefined) {
        const d = new Date(body.dueAt);
        if (isNaN(d)) throw new BadRequestError('Choose a valid date and time.');
        out.dueAt = d;
    }
    if (body.repeat !== undefined) out.repeat = ['none', 'daily', 'weekly', 'monthly'].includes(body.repeat) ? body.repeat : 'none';
    if (body.priority !== undefined) out.priority = body.priority === 'high' ? 'high' : 'normal';
    if (body.fileNumber !== undefined || body.booking !== undefined) {
        out.booking = undefined;
        out.fileNumber = String(body.fileNumber || '').trim() || undefined;
        if (isId(body.booking)) {
            out.booking = body.booking;
        } else if (out.fileNumber) {
            const b = await Booking.findOne({ fileNumber: out.fileNumber, _includeHidden: true }).select('_id fileNumber').lean();
            if (b) out.booking = b._id;
        }
    }
    if (body.assignedTo !== undefined) {
        if (!body.assignedTo || String(body.assignedTo) === myId(req)) {
            out.assignedTo = undefined;
            out.assignedToName = undefined;
        } else {
            if (!isId(body.assignedTo)) throw new BadRequestError('Choose a staff member.');
            const s = await Staff.findById(body.assignedTo).select('name').lean();
            if (!s) throw new BadRequestError('Staff member not found.');
            out.assignedTo = s._id;
            out.assignedToName = s.name;
        }
    }
    return out;
}

/** GET /reminders?status=open|done|all&scope=all (admin) */
exports.list = asyncErrorHandler(async (req, res) => {
    const f = visibleTo(req);
    const status = req.query.status || 'open';
    if (status === 'open') f.done = false;
    if (status === 'done') f.done = true;
    const rows = await Reminder.find(f).sort(status === 'done' ? { doneAt: -1 } : { dueAt: 1 }).limit(500).lean();
    res.json({ success: true, data: rows });
});

/** POST /reminders */
exports.create = asyncErrorHandler(async (req, res) => {
    const data = await cleanInput(req, req.body || {}, false);
    if (data.assignedTo && !isAdmin(req)) {
        // staff can also hand a reminder to a colleague — keep who made it
    }
    const r = await Reminder.create({ ...data, createdBy: myId(req), createdByName: await nameOf(req), createdByRole: roleOf(req) });
    res.status(201).json({ success: true, data: r });
});

async function findMine(req) {
    if (!isId(req.params.id)) throw new BadRequestError('Invalid reminder');
    const r = await Reminder.findOne({ _id: req.params.id, ...(isAdmin(req) ? {} : visibleTo(req)) });
    if (!r) throw new NotFoundError('Reminder not found');
    return r;
}

/** PUT /reminders/:id */
exports.update = asyncErrorHandler(async (req, res) => {
    const r = await findMine(req);
    Object.assign(r, await cleanInput(req, req.body || {}, true));
    await r.save();
    res.json({ success: true, data: r });
});

/** PATCH /reminders/:id/done  { done: true|false } — repeating reminders roll on to the next date */
exports.setDone = asyncErrorHandler(async (req, res) => {
    const r = await findMine(req);
    const done = req.body?.done !== false;
    if (done && !r.done) {
        r.done = true;
        r.doneAt = new Date();
        r.doneByName = await nameOf(req);
        await r.save();
        const due = nextDue(r.dueAt, r.repeat);
        let next = null;
        if (due) {
            // never schedule the next one in the past
            let d = due;
            while (d < new Date()) d = nextDue(d, r.repeat);
            next = await Reminder.create({
                title: r.title, note: r.note, dueAt: d, repeat: r.repeat, priority: r.priority, booking: r.booking, fileNumber: r.fileNumber,
                assignedTo: r.assignedTo, assignedToName: r.assignedToName, createdBy: r.createdBy, createdByName: r.createdByName, createdByRole: r.createdByRole,
            });
        }
        return res.json({ success: true, data: r, next });
    }
    if (!done && r.done) {
        r.done = false;
        r.doneAt = undefined;
        r.doneByName = undefined;
        await r.save();
    }
    res.json({ success: true, data: r });
});

/** PATCH /reminders/:id/snooze { minutes } */
exports.snooze = asyncErrorHandler(async (req, res) => {
    const r = await findMine(req);
    const minutes = Math.min(Math.max(parseInt(req.body?.minutes, 10) || 60, 5), 60 * 24 * 7);
    r.dueAt = new Date(Date.now() + minutes * 60000);
    await r.save();
    res.json({ success: true, data: r });
});

/** DELETE /reminders/:id */
exports.remove = asyncErrorHandler(async (req, res) => {
    const r = await findMine(req);
    await r.deleteOne();
    res.json({ success: true });
});

/**
 * GET /me/home — everything the dashboard needs for the logged-in person:
 * today's assigned tasks, open reminders, and their own pending items.
 */
exports.home = asyncErrorHandler(async (req, res) => {
    const id = myId(req);
    const staffMode = !isAdmin(req) && isId(id);
    const now = new Date();

    // Today's tasks (from the Staff tasks templates). Created on first open if a template exists.
    let work = null;
    if (staffMode) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // same day rule as the existing work module
        work = await StaffDailyWork.findOne({ staff: id, date: { $gte: today } }).lean();
        if (!work) {
            const template = await StaffWorkAssignment.findOne({ staff: id, isActive: true }).lean();
            if (template && template.dailyTasks?.length) {
                try {
                    const created = await StaffDailyWork.create({
                        staff: id,
                        staffType: template.staffType,
                        date: today,
                        works: template.dailyTasks.map((t, i) => ({
                            taskName: t.taskName, status: 'pending', count: t.requiresCount ? 0 : null, time: t.estimatedTime || '', priority: t.priority || i + 1, remarks: '',
                        })),
                        totalTasks: template.dailyTasks.length,
                        completedTasks: 0,
                        pendingTasks: template.dailyTasks.length,
                    });
                    work = created.toObject();
                } catch (e) {
                    // another tab created it at the same moment
                    work = await StaffDailyWork.findOne({ staff: id, date: { $gte: today } }).lean();
                }
            }
        }
    }

    const [reminders, me, myOpenBookings, myUnverified] = await Promise.all([
        Reminder.find({ done: false, $or: [{ createdBy: id }, { assignedTo: id }] }).sort({ dueAt: 1 }).limit(100).lean(),
        staffMode ? Staff.findById(id).select('name cashInHand').lean() : null,
        isId(id)
            ? Booking.find({ createdBy: id, status: { $nin: ['Order Completed', 'Cancelled', 'Rejected'] }, _includeHidden: true })
                .select('fileNumber status customerName customerVehicleNumber createdAt pickupDate').sort({ createdAt: -1 }).limit(20).lean()
            : [],
        isId(id)
            ? Booking.countDocuments({ createdBy: id, status: 'Order Completed', verified: { $ne: true }, _includeHidden: true })
            : 0,
    ]);

    res.json({
        success: true,
        name: me?.name || (isAdmin(req) ? 'Admin' : ''),
        work: work
            ? { _id: work._id, date: work.date, works: work.works || [], total: (work.works || []).length, completed: (work.works || []).filter((w) => w.status === 'completed').length }
            : null,
        reminders,
        overdue: reminders.filter((r) => new Date(r.dueAt) < now).length,
        dueToday: reminders.filter((r) => new Date(r.dueAt) - now < 24 * 3600000).length,
        cashInHand: me?.cashInHand || 0,
        myOpenBookings,
        myUnverifiedCompleted: myUnverified,
    });
});

/** GET /me/staff — names for the "assign to" box */
exports.staffNames = asyncErrorHandler(async (req, res) => {
    const rows = await Staff.find().select('name').sort({ name: 1 }).lean();
    res.json({ success: true, data: rows.map((s) => ({ _id: s._id, name: s.name })) });
});

exports._test = { nextDue };
