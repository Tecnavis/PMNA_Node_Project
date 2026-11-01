/**
 * Who is making the current request, available anywhere in that request's code
 * (e.g. Mongoose hooks) without passing it around. Set by Middileware/jwt.js.
 */
const { AsyncLocalStorage } = require('async_hooks');

const store = new AsyncLocalStorage();

/** Remember the logged-in user for the rest of this request. */
exports.setUser = (decoded) => {
    try {
        store.enterWith({ user: decoded || null });
    } catch {
        /* never break a request over this */
    }
};

/** { role, id, name } of the logged-in user, or null (system jobs, public calls). */
exports.currentActor = () => {
    const u = store.getStore()?.user;
    if (!u) return null;
    const role = u.role || u.user?.role || null;
    const name = u.name || u.user?.name || null;
    return { role, id: u.id ? String(u.id) : null, name };
};

/** Run fn with a fixed actor (used by tests and background jobs). */
exports.runAs = (decoded, fn) => store.run({ user: decoded || null }, fn);
