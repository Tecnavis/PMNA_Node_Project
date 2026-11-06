/**
 * Who looks after a showroom, and the executive tasks that close themselves.
 *
 * A showroom is looked after by `assignedExecutive` when admin / staff set one,
 * otherwise by the executive who added it (`addedBy`). `addedBy` is never changed,
 * so "new showrooms added" in the reports always credits the person who found it.
 */
const mongoose = require('mongoose');

const oid = (v) => (v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v)));

/** Mongo filter: showrooms this executive looks after. */
const ownerFilter = (execId) => {
    const id = oid(execId);
    return { $or: [{ assignedExecutive: id }, { assignedExecutive: null, addedBy: id }] };
};

/** The executive id that looks after this showroom (or null). */
const responsibleId = (s) => (s?.assignedExecutive || s?.addedBy || null);

/** { id, role, name } of the logged-in admin / staff / executive. */
function actorOf(req) {
    const u = req.user || {};
    return {
        id: mongoose.isValidObjectId(u.id || u._id) ? oid(u.id || u._id) : null,
        role: String(u.user?.role || u.role || ''),
        name: String(u.user?.name || u.name || ''),
    };
}

/** Visit saved → close that executive's open "visit" tasks for the showroom. */
async function onVisitRecorded(verification) {
    try {
        const ExecTask = require('../Model/execTask');
        await ExecTask.updateMany(
            { executive: verification.executive, showroom: verification.showroom, type: 'visit', status: 'open' },
            { $set: { status: 'done', completedAt: new Date(), completedBy: 'auto', verification: verification._id, completionNote: 'Visit recorded in the app' } }
        );
    } catch (e) {
        console.error('[exec tasks] visit auto-complete', e.message);
    }
}

/** New showroom added by an executive → counts towards their oldest open "add showrooms" task. */
async function onShowroomAdded(showroom) {
    try {
        if (!showroom?.addedBy) return;
        const ExecTask = require('../Model/execTask');
        const task = await ExecTask.findOne({ executive: showroom.addedBy, type: 'onboard', status: 'open' }).sort({ dueDate: 1, createdAt: 1 });
        if (!task) return;
        if (!task.addedShowrooms.some((x) => String(x) === String(showroom._id))) task.addedShowrooms.push(showroom._id);
        if (task.addedShowrooms.length >= (task.target || 1)) {
            task.status = 'done';
            task.completedAt = new Date();
            task.completedBy = 'auto';
            task.completionNote = `${task.addedShowrooms.length} new showroom${task.addedShowrooms.length === 1 ? '' : 's'} added`;
        }
        await task.save();
    } catch (e) {
        console.error('[exec tasks] onboard progress', e.message);
    }
}

module.exports = { ownerFilter, responsibleId, actorOf, onVisitRecorded, onShowroomAdded, oid };
