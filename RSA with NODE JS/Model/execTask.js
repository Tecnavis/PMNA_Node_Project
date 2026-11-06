const mongoose = require('mongoose');

/**
 * Work given to a marketing executive by admin or staff.
 *   visit     – visit one showroom (done automatically when the visit is recorded in the app)
 *   onboard   – add new showrooms (target = how many; done automatically when that many are added)
 *   follow-up – any other job about a showroom (marked done by the executive with a note)
 *   other     – free text job
 */
const TYPES = ['visit', 'onboard', 'follow-up', 'other'];
const STATUSES = ['open', 'done', 'cancelled'];

const execTaskSchema = new mongoose.Schema(
    {
        executive: { type: mongoose.Schema.Types.ObjectId, ref: 'Executive', required: true, index: true },
        type: { type: String, enum: TYPES, default: 'visit' },
        showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', default: null, index: true },
        title: { type: String, trim: true, maxLength: 200, default: '' },
        notes: { type: String, trim: true, maxLength: 2000, default: '' },
        area: { type: String, trim: true, maxLength: 200, default: '' }, // onboard: where to find new showrooms
        target: { type: Number, min: 1, max: 500, default: 1 }, // onboard: how many new showrooms
        dueDate: { type: Date, default: null, index: true },
        priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
        status: { type: String, enum: STATUSES, default: 'open', index: true },
        assignedBy: {
            id: { type: mongoose.Schema.Types.ObjectId, default: null },
            role: { type: String, default: '' },
            name: { type: String, default: '' },
        },
        completedAt: { type: Date, default: null },
        completedBy: { type: String, default: '' }, // 'executive' | 'auto' | admin/staff name
        completionNote: { type: String, trim: true, maxLength: 2000, default: '' },
        verification: { type: mongoose.Schema.Types.ObjectId, ref: 'Verification', default: null },
        addedShowrooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Showroom' }], // onboard progress
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

execTaskSchema.index({ executive: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('ExecTask', execTaskSchema);
module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;
