const twilioClient = require('../utils/twilioClient');
const OtpModel = require('../Model/otp');
const { generateOtp } = require('../utils/generateOtp');

const whatsapp = require('./whatsapp');

// same key for sending and checking, whatever spaces or +91 the app sent
const toE164 = (cc, phone) => `${cc}${String(phone ?? '').replace(/\D/g, '').slice(-10)}`;

function reviewCodeFor(toPhone) {
    const raw = String(process.env.REVIEW_LOGIN_OTPS || '').trim();
    if (!raw) return null;
    const want = toPhone.slice(-10);
    for (const pair of raw.split(',')) {
        const [phone, code] = pair.split(':').map((x) => String(x || '').trim());
        if (phone && /^\d{4,6}$/.test(code) && phone.replace(/\D/g, '').slice(-10) === want) return code;
    }
    return null;
}

const SEND_TIMEOUT_MS = Number(process.env.OTP_SEND_TIMEOUT_MS || 15000);
const withTimeout = (p, ms, label) => Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(`${label} did not answer in ${ms / 1000}s`), { code: 'TIMEOUT' })), ms)),
]);

// Twilio error codes seen for Indian numbers, turned into words the app can show
const twilioWords = (e) => {
    switch (Number(e?.code)) {
        case 21608: return 'SMS account is in trial mode and this number is not verified in Twilio';
        case 21408: return 'SMS to India is not enabled on the Twilio account (Geo permissions)';
        case 21211: case 21614: return 'This phone number cannot receive SMS';
        case 21610: return 'This number has blocked SMS from us (replied STOP)';
        case 20003: return 'SMS account login (Twilio SID / token) is wrong on the server';
        case 21606: case 21659: case 21212: return 'The SMS sender number (TWLIO_NUMBER) on the server is not valid for this send';
        case 30007: case 30008: return 'The mobile network filtered the SMS (India DLT registration needed)';
        default: return e?.message || 'SMS could not be sent';
    }
};

const smsReady = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWLIO_NUMBER);

async function viaSms(toPhone, otp) {
    if (!smsReady()) return { ok: false, why: 'SMS is not set up on the server' };
    try {
        const r = await withTimeout(twilioClient.messages.create({
            body: process.env.OTP_SMS_TEXT ? process.env.OTP_SMS_TEXT.replace('{otp}', otp) : `Your OTP is ${otp}`,
            from: process.env.TWLIO_NUMBER,
            to: toPhone,
        }), SEND_TIMEOUT_MS, 'SMS service');
        return { ok: true, id: r?.sid };
    } catch (e) {
        console.error(`[otp] SMS failed to ...${toPhone.slice(-4)}: code=${e?.code || '-'} ${e?.message || e}`);
        return { ok: false, why: twilioWords(e) };
    }
}

// WhatsApp "Authentication" template with a copy-code button (set WA_OTP_TEMPLATE to its name)
async function viaWhatsapp(toPhone, otp) {
    const name = process.env.WA_OTP_TEMPLATE;
    if (!name || !whatsapp.enabled()) return { ok: false, skipped: true };
    const r = await withTimeout(whatsapp.send(toPhone.replace(/^\+/, ''), {
        type: 'template',
        template: {
            name,
            language: { code: process.env.WA_OTP_TEMPLATE_LANG || 'en' },
            components: [
                { type: 'body', parameters: [{ type: 'text', text: otp }] },
                { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
            ],
        },
    }), SEND_TIMEOUT_MS, 'WhatsApp').catch(() => ({ ok: false }));
    return r?.ok ? { ok: true, id: r.id } : { ok: false, why: 'WhatsApp code could not be sent' };
}

// Send OTP to user phonenumber: by SMS, and also on WhatsApp when WA_OTP_TEMPLATE is set.
// Succeeds when either one is accepted, and never waits longer than OTP_SEND_TIMEOUT_MS.
exports.sendOtp = async (countryCode = '+91', phoneNumber) => {
    try {
        const toPhone = toE164(countryCode, phoneNumber);
        // Google Play review: REVIEW_LOGIN_OTPS="9000000001:482913,9000000002:771204" gives those numbers a fixed code
        // (no SMS is sent). Leave it unset in normal use.
        const review = reviewCodeFor(toPhone);
        const otp = review || generateOtp();

        // New code resets the wrong-attempt counter and the 5-minute timer (updatedAt)
        await OtpModel.findOneAndUpdate(
            { phoneNumber: toPhone },
            { otp, attempts: 0 },
            { upsert: true, new: true }
        );

        if (review) {
            console.log(`[otp] review login for ...${toPhone.slice(-4)} (no SMS sent)`);
            return { message: 'OTP sent', success: true, channels: ['review'] };
        }

        const [sms, wa] = await Promise.all([viaSms(toPhone, otp), viaWhatsapp(toPhone, otp)]);
        const by = [sms.ok && 'SMS', wa.ok && 'WhatsApp'].filter(Boolean);

        // Don't log or return the message itself — it contains the OTP
        console.log(`[otp] to ...${toPhone.slice(-4)}: sms=${sms.ok ? sms.id : 'no'} whatsapp=${wa.ok ? wa.id : wa.skipped ? 'off' : 'no'}`);

        if (!by.length) {
            return { message: `OTP could not be sent: ${sms.why}${wa.skipped ? '' : `; ${wa.why}`}`, success: false };
        }
        return { message: `OTP sent by ${by.join(' and ')}`, success: true, channels: by };
    } catch (error) {
        console.error("Error sending OTP:", error);
        return {
            message: error.message,
            success: false,
        };
    }
};
// Verify user OTP 
exports.verifyOtp = async (countryCode = '+91', phoneNumber, otp) => {
    try {
        const toPhone = toE164(countryCode, phoneNumber);
        const invalid = { message: "Invalid or expired OTP", success: false };
        const record = await OtpModel.findOne({ phoneNumber: toPhone });
        if (!record) return invalid;

        // Codes are valid for OTP_VALID_MINUTES (default 5) after they were sent
        const validMs = Number(process.env.OTP_VALID_MINUTES || 5) * 60 * 1000;
        const sentAt = new Date(record.updatedAt || record.createdAt || 0).getTime();
        if (Date.now() - sentAt > validMs) {
            await OtpModel.deleteOne({ _id: record._id });
            return { message: "OTP expired, please request a new one", success: false };
        }

        if (String(record.otp) !== String(otp ?? '').trim()) {
            // After OTP_MAX_ATTEMPTS (default 5) wrong guesses the code is cancelled
            const attempts = (record.attempts || 0) + 1;
            if (attempts >= Number(process.env.OTP_MAX_ATTEMPTS || 5)) {
                await OtpModel.deleteOne({ _id: record._id });
                return { message: "Too many wrong attempts, please request a new OTP", success: false };
            }
            await OtpModel.updateOne({ _id: record._id }, { $set: { attempts } }, { timestamps: false });
            return invalid;
        }

        await OtpModel.deleteOne({ _id: record._id });

        return {
            message: "OTP verified successfully",
            otp: record,
            success: true,
        };
    } catch (error) {
        console.error('Error verifying OTP:', error.message);
        return {
            message: error.message,
            success: false,
        };
    }
};

