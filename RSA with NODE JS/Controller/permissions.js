/**
 * Staff permissions management (admin only) and "my permissions" for the logged-in user.
 *   GET /permissions/me             what the logged-in admin-website user may do
 *   GET /permissions/actions        action keys and their labels
 *   GET /permissions/roles          roles with their permissions and how many staff use each
 *   PUT /permissions/roles/:id      { permissions: { key: true|false } }  (keys left out = default)
 *   GET /permissions/staff          staff with role and their own permission changes
 *   PUT /permissions/staff/:id      { permissions: { key: true|false } }
 */
const mongoose = require('mongoose');
const Role = require('../Model/role');
const Staff = require('../Model/staff');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const permissions = require('../services/permissions');

const roleOf = (req) => req.user?.role || req.user?.user?.role;

exports.me = asyncErrorHandler(async (req, res) => {
    const role = roleOf(req);
    if (role === 'Admin') return res.json({ success: true, isAdmin: true, role: 'admin', permissions: {} });
    if (role !== 'Staff') return res.status(403).json({ message: 'Not an admin website login' });
    const p = await permissions.forStaff(req.user.id);
    if (!p) return res.status(404).json({ message: 'Staff not found' });
    res.json({ success: true, isAdmin: false, role: p.role?.name || '', roleId: p.role?._id || null, permissions: p.merged });
});

exports.actions = (req, res) => res.json({ success: true, actions: permissions.ACTIONS });

exports.roles = asyncErrorHandler(async (req, res) => {
    const [roles, counts] = await Promise.all([
        Role.find({}).select('name permissions').sort({ name: 1 }).lean(),
        Staff.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    ]);
    const n = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({ success: true, roles: roles.map((r) => ({ _id: r._id, name: r.name, permissions: permissions.clean(r.permissions), staffCount: n[String(r._id)] || 0 })) });
});

exports.saveRole = asyncErrorHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Role not found' });
    const clean = permissions.clean(req.body?.permissions);
    const r = await Role.findByIdAndUpdate(req.params.id, { $set: { permissions: clean } }, { new: true }).select('name permissions').lean();
    if (!r) return res.status(404).json({ message: 'Role not found' });
    permissions.forget();
    console.log(`[permissions] role "${r.name}" updated by ${req.user?.user?.name || req.user?.name || 'admin'}: ${Object.keys(clean).length} setting(s)`);
    res.json({ success: true, role: { _id: r._id, name: r.name, permissions: clean } });
});

exports.staff = asyncErrorHandler(async (req, res) => {
    const list = await Staff.find({}).select('name userName phone role permissions').populate('role', 'name').sort({ name: 1 }).lean();
    res.json({
        success: true,
        staff: list.map((s) => ({ _id: s._id, name: s.name, userName: s.userName, phone: s.phone, role: s.role ? { _id: s.role._id, name: s.role.name } : null, permissions: permissions.clean(s.permissions) })),
    });
});

exports.saveStaff = asyncErrorHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Staff not found' });
    const clean = permissions.clean(req.body?.permissions);
    // only touch the permissions field: the rest of the staff record is left exactly as it is
    const s = await Staff.findByIdAndUpdate(req.params.id, { $set: { permissions: clean } }, { new: true }).select('name permissions').lean();
    if (!s) return res.status(404).json({ message: 'Staff not found' });
    permissions.forget(req.params.id);
    console.log(`[permissions] staff "${s.name}" updated by ${req.user?.user?.name || req.user?.name || 'admin'}: ${Object.keys(clean).length} setting(s)`);
    res.json({ success: true, staff: { _id: s._id, name: s.name, permissions: clean } });
});
