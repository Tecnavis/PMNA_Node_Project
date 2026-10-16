/**
 * WhatsApp booking bot (Meta WhatsApp Cloud API).
 * Customer messages the RSA WhatsApp number → guided steps → booking lands in the office as "Booking Added".
 * Status updates are sent back automatically (services/customerNotify.js).
 *
 * Server settings:  WA_TOKEN, WA_PHONE_NUMBER_ID, WA_VERIFY_TOKEN, WA_APP_SECRET, SUPPORT_PHONE
 */
const crypto = require('crypto');
const WaSession = require('../Model/waSession');
const Customer = require('../Model/customer');
const Booking = require('../Model/booking');
const wa = require('../services/whatsapp');
const { createCustomerBooking, normalisePhone, PROBLEMS, STEP_TEXT } = require('../services/customerBooking');

const seen = new Map(); // message id → time (Meta may deliver twice)
const helpline = () => process.env.SUPPORT_PHONE || '';

/** GET /whatsapp/webhook — Meta's one-time verification */
exports.verify = (req, res) => {
    const ok = req.query['hub.mode'] === 'subscribe' && process.env.WA_VERIFY_TOKEN && req.query['hub.verify_token'] === process.env.WA_VERIFY_TOKEN;
    if (ok) return res.status(200).send(String(req.query['hub.challenge'] || ''));
    return res.sendStatus(403);
};

function signatureOk(req) {
    const secret = process.env.WA_APP_SECRET;
    if (!secret) return true; // not configured yet (set it in production!)
    const sig = String(req.headers['x-hub-signature-256'] || '');
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.body || Buffer.alloc(0)).digest('hex');
    return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/** POST /whatsapp/webhook (raw body) */
exports.receive = async (req, res) => {
    if (!signatureOk(req)) return res.sendStatus(401);
    res.sendStatus(200); // answer Meta at once, work after
    let payload;
    try { payload = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {})); } catch { return; }
    for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
            const v = change.value || {};
            const profile = v.contacts?.[0]?.profile?.name || '';
            for (const m of v.messages || []) {
                if (seen.has(m.id)) continue;
                seen.set(m.id, Date.now());
                if (seen.size > 5000) for (const [k, t] of seen) if (Date.now() - t > 3600000) seen.delete(k);
                handle(m, profile).catch((e) => console.error('[wa-bot]', e.message));
            }
        }
    }
};

/** what the customer sent, in one shape */
function readMessage(m) {
    if (m.type === 'text') return { kind: 'text', text: String(m.text?.body || '').trim() };
    if (m.type === 'interactive') {
        const r = m.interactive?.button_reply || m.interactive?.list_reply;
        return { kind: 'choice', id: r?.id || '', text: r?.title || '' };
    }
    if (m.type === 'button') return { kind: 'choice', id: m.button?.payload || '', text: m.button?.text || '' };
    if (m.type === 'location') return { kind: 'location', lat: m.location?.latitude, lng: m.location?.longitude, text: [m.location?.name, m.location?.address].filter(Boolean).join(', ') };
    return { kind: 'other', text: '' };
}

const MENU = (to, name) => wa.buttons(to,
    `Hello${name ? ' ' + name.split(' ')[0] : ''} 👋\nWelcome to *RSA Kerala* — 24×7 roadside assistance & towing.\nHow can we help?`,
    [{ id: 'book', title: '🚛 Book tow truck' }, { id: 'track', title: '📍 Track booking' }, { id: 'call', title: '📞 Call us' }]);

async function save(session, step, data) {
    session.step = step;
    session.data = { ...(session.data || {}), ...(data || {}) };
    session.markModified('data');
    session.updatedAt = new Date();
    await session.save();
}

async function track(to, phone) {
    const rows = await Booking.find({ mob1: phone, _includeHidden: true }).select('fileNumber status customerVehicleNumber createdAt').sort({ createdAt: -1 }).limit(3).lean();
    if (!rows.length) return wa.text(to, 'We could not find a booking for this number. Reply *BOOK* to book a tow truck.');
    const lines = rows.map((b) => `• *${b.customerVehicleNumber || b.fileNumber}* — ${STEP_TEXT[b.status] || b.status}\n  ID ${b.fileNumber}, ${new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
    return wa.text(to, `Your recent bookings:\n${lines.join('\n')}${helpline() ? `\n\nNeed help? Call ${helpline()}` : ''}`);
}

async function handle(m, profileName) {
    const to = m.from;                      // e.g. 919847012345
    const phone = normalisePhone(to);
    const msg = readMessage(m);
    const lower = (msg.text || '').toLowerCase();
    let session = await WaSession.findOne({ phone: to });
    if (!session) session = new WaSession({ phone: to, step: 'start', data: {} });
    const customer = await Customer.findOne({ phone }).lean();
    const name = customer?.name || session.data?.name || profileName || '';

    // global words
    if (['hi', 'hello', 'menu', 'start', 'hai', 'helo'].includes(lower) || (msg.kind === 'text' && session.step === 'start' && !['book', 'track', 'status'].includes(lower))) {
        await save(session, 'menu', { name });
        return MENU(to, name);
    }
    if (['cancel', 'stop', 'restart'].includes(lower)) {
        await save(session, 'menu', {});
        return wa.text(to, 'Okay, cancelled. Send *Hi* any time to start again.');
    }
    if (msg.id === 'call' || lower === 'call') return wa.text(to, helpline() ? `📞 Call us any time: ${helpline()}` : 'Our team will call you shortly.');
    if (msg.id === 'track' || ['track', 'status'].includes(lower)) { await save(session, 'menu'); return track(to, phone); }

    if (msg.id === 'book' || lower === 'book') {
        const saved = (customer?.vehicles || []).slice(-2);
        await save(session, 'vehicle', { name, vehicleNumber: '', problem: '', pickup: null, dropoff: null });
        if (saved.length) {
            return wa.buttons(to, 'Which vehicle needs help? Tap one, or type the vehicle number.', [
                ...saved.map((v) => ({ id: `veh:${v.number}`, title: v.number })),
                { id: 'veh:other', title: 'Another vehicle' },
            ]);
        }
        return wa.text(to, '🚗 Please type the *vehicle number* (for example KL07AB1234).');
    }

    switch (session.step) {
        case 'vehicle': {
            let number = msg.id?.startsWith('veh:') ? msg.id.slice(4) : msg.text;
            if (number === 'other') return wa.text(to, 'Please type the *vehicle number* (for example KL07AB1234).');
            number = String(number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (number.length < 4 || number.length > 13) return wa.text(to, 'That does not look like a vehicle number. Please type it like *KL07AB1234*.');
            await save(session, 'problem', { vehicleNumber: number });
            return wa.list(to, `Vehicle *${number}*. What happened?`, 'Choose problem', PROBLEMS.map((p, i) => ({ id: `prob:${i}`, title: p.slice(0, 24) })));
        }
        case 'problem': {
            const idx = msg.id?.startsWith('prob:') ? Number(msg.id.slice(5)) : -1;
            const problem = idx >= 0 ? PROBLEMS[idx] : msg.text;
            if (!problem) return wa.text(to, 'Please choose the problem from the list, or type it.');
            await save(session, 'pickup', { problem: String(problem).slice(0, 80) });
            return wa.askLocation(to, '📍 Where is the vehicle now? Tap *Send location* (or 📎 → Location). You can also type the address and a landmark.');
        }
        case 'pickup': {
            if (msg.kind === 'location') {
                await save(session, 'dropoff', { pickup: { lat: msg.lat, lng: msg.lng, address: msg.text || '' } });
            } else if (msg.text && msg.text.length >= 5) {
                await save(session, 'dropoff', { pickup: { address: msg.text } });
            } else {
                return wa.askLocation(to, 'Please share the location of the vehicle, or type the full address with a landmark.');
            }
            return wa.buttons(to, '🏁 Where should we take the vehicle? Type the workshop / showroom name and place, or share a location.', [{ id: 'drop:skip', title: 'Not sure yet' }]);
        }
        case 'dropoff': {
            let dropoff = null;
            if (msg.id === 'drop:skip' || lower === 'skip') dropoff = { address: '' };
            else if (msg.kind === 'location') dropoff = { lat: msg.lat, lng: msg.lng, address: msg.text || '' };
            else if (msg.text && msg.text.length >= 3) dropoff = { address: msg.text };
            if (!dropoff) return wa.text(to, 'Please type where the vehicle should go, or tap *Not sure yet*.');
            await save(session, 'confirm', { dropoff });
            const d = session.data;
            const where = (p) => (p?.address ? p.address : p?.lat ? 'Shared location' : '—');
            return wa.buttons(to,
                `Please check your booking:\n\n👤 ${d.name || 'Customer'} (${phone})\n🚗 ${d.vehicleNumber}\n⚠️ ${d.problem}\n📍 From: ${where(d.pickup)}\n🏁 To: ${where(d.dropoff) === '—' ? 'to be decided' : where(d.dropoff)}\n\nOur team will call you to confirm the charges.`,
                [{ id: 'confirm', title: '✅ Confirm' }, { id: 'book', title: '✏️ Start again' }, { id: 'abort', title: '❌ Cancel' }]);
        }
        case 'confirm': {
            if (msg.id === 'abort') { await save(session, 'menu', {}); return wa.text(to, 'Booking cancelled. Send *Hi* any time.'); }
            if (msg.id !== 'confirm' && lower !== 'yes' && lower !== 'confirm') return wa.text(to, 'Tap *Confirm* to book, or *Cancel*.');
            const d = session.data;
            try {
                let cust = await Customer.findOne({ phone });
                if (!cust) cust = await Customer.create({ phone, name: d.name || undefined });
                if (d.vehicleNumber && !cust.vehicles.some((v) => v.number === d.vehicleNumber)) { cust.vehicles.push({ number: d.vehicleNumber }); await cust.save(); }
                const b = await createCustomerBooking({
                    source: 'whatsapp', customerId: cust._id, name: d.name, phone, vehicleNumber: d.vehicleNumber,
                    problem: d.problem, pickup: d.pickup, dropoff: d.dropoff,
                });
                await save(session, 'menu', { lastBooking: b.fileNumber });
                return wa.text(to, `✅ Booking received!\nBooking ID: *${b.fileNumber}*\n\nOur team will call you in a few minutes. You'll get updates here.${helpline() ? `\nUrgent? Call ${helpline()}` : ''}\n\nReply *TRACK* any time to see the status.`);
            } catch (e) {
                console.error('[wa-bot] booking failed', e.message);
                return wa.text(to, `Sorry, we couldn't save the booking${e.status ? `: ${e.message}` : ''}. ${helpline() ? `Please call ${helpline()}.` : 'Please try again.'}`);
            }
        }
        default:
            await save(session, 'menu', { name });
            return MENU(to, name);
    }
}

exports._test = { readMessage, handle };
