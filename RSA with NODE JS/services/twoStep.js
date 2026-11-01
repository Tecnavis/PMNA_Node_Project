/**
 * Two-step login for the admin website (opt-in).
 *
 *   TWO_STEP_LOGIN=on          switch it on (default off — logins work exactly as before)
 *   TWO_STEP_ROLES             staff role names that need a code (default "secondary admin"; comma separated)
 *   ADMIN_OTP_PHONE            10-digit mobile that receives the admin login code
 *   TWO_STEP_VALID_MINUTES     how long a code works (default 5)
 *
 * After the right password, a 6-digit code is sent by SMS (Twilio, same sender as the app OTPs),
 * or by WhatsApp when SMS fails and WhatsApp is set up. The login finishes only with that code.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const OtpModel = require('../Model/otp');
const { generateOtp } = require('../utils/generateOtp');

const on = () => ['on', 'true', '1', 'yes'].includes(String(process.env.TWO_STEP_LOGIN || '').toLowerCase());
const roles = () => String(process.env.TWO_STEP_ROLES || 'secondary admin').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const validMs = () => Number(process.env.TWO_STEP_VALID_MINUTES || 5) * 60000;
const tenDigits = (p) => String(p || '').replace(/\D/g, '').slice(-10);

/** Does this login need a code? */
function required(kind, roleName) {
    if (!on()) return false;
    if (kind === 'admin') return true;
    return roles().includes(String(roleName || '').trim().toLowerCase());
}

const slot = (kind, id) => `2fa:${kind}:${id}`; // never clashes with the app OTP records (keyed by phone number)
const hash = (code) => crypto.createHmac('sha256', String(process.env.JWT_SECRET || '')).update(String(code)).digest('hex');

async function deliver(phone, code) {
    const body = `RSA Kerala admin login code: ${code}. Valid ${Math.round(validMs() / 60000)} minutes. Don't share it.`;
    try {
        const twilio = require('../utils/twilioClient');
        await twilio.messages.create({ body, from: process.env.TWLIO_NUMBER, to: `+91${phone}` });
        return 'sms';
    } catch (e) {
        console.error('[twoStep] SMS failed:', e.message);
    }
    try {
        const wa = require('./whatsapp');
        if (wa.enabled()) {
            const r = await wa.text(`91${phone}`, body);
            if (r?.ok) return 'whatsapp';
        }
    } catch (e) {
        console.error('[twoStep] WhatsApp failed:', e.message);
    }
    return null;
}

/** Send a code; returns { challenge, phoneHint, channel } or { error }. */
async function start({ kind, id, phone }) {
    const ph = tenDigits(kind === 'admin' ? process.env.ADMIN_OTP_PHONE || phone : phone);
    if (ph.length !== 10) return { error: 'No mobile number is set up to receive the login code. Ask the admin (or set ADMIN_OTP_PHONE on the server).' };
    const code = generateOtp();
    await OtpModel.findOneAndUpdate({ phoneNumber: slot(kind, id) }, { otp: hash(code), attempts: 0 }, { upsert: true, new: true });
    const channel = await deliver(ph, code);
    if (!channel) return { error: 'Could not send the login code right now. Please try again in a minute.' };
    const challenge = jwt.sign({ p: '2fa', k: kind, id: String(id) }, process.env.JWT_SECRET, { expiresIn: Math.round(validMs() / 1000) });
    return { challenge, phoneHint: `••••••${ph.slice(-4)}`, channel };
}

/** Check a code; returns { kind, id } or { error }. */
async function verify(challenge, code) {
    let c;
    try {
        c = jwt.verify(String(challenge || ''), process.env.JWT_SECRET);
    } catch {
        return { error: 'The code has expired. Please log in again.' };
    }
    if (c?.p !== '2fa' || !c.id) return { error: 'Invalid request' };
    const rec = await OtpModel.findOne({ phoneNumber: slot(c.k, c.id) });
    if (!rec) return { error: 'The code has expired. Please log in again.' };
    if (Date.now() - new Date(rec.updatedAt || rec.createdAt).getTime() > validMs()) {
        await OtpModel.deleteOne({ _id: rec._id });
        return { error: 'The code has expired. Please log in again.' };
    }
    if (rec.otp !== hash(String(code || '').trim())) {
        const attempts = (rec.attempts || 0) + 1;
        if (attempts >= 5) {
            await OtpModel.deleteOne({ _id: rec._id });
            return { error: 'Too many wrong codes. Please log in again.' };
        }
        await OtpModel.updateOne({ _id: rec._id }, { $set: { attempts } }, { timestamps: false });
        return { error: 'Wrong code', wrong: true };
    }
    await OtpModel.deleteOne({ _id: rec._id });
    return { kind: c.k, id: c.id };
}

module.exports = { required, start, verify, on };
