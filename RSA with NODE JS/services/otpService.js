const twilioClient = require('../utils/twilioClient');
const OtpModel = require('../Model/otp');
const { generateOtp } = require('../utils/generateOtp');

// Send OTP to user phonenumber 
exports.sendOtp = async (countryCode = '+91', phoneNumber) => {
    try {
        const otp = generateOtp();
        const toPhone = `${countryCode}${phoneNumber}`;

        // New code resets the wrong-attempt counter and the 5-minute timer (updatedAt)
        await OtpModel.findOneAndUpdate(
            { phoneNumber: toPhone },
            { otp, attempts: 0 },
            { upsert: true, new: true }
        );

        // Send SMS via Twilio
        const response = await twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWLIO_NUMBER,
            to: toPhone,
        });

        // Don't log or return the Twilio response — its body contains the OTP itself
        console.log(`OTP sent to ...${String(phoneNumber).slice(-4)} (sid ${response?.sid || 'n/a'})`);

        return {
            message: "OTP sent successfully",
            success: true,
        };
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
        const toPhone = `${countryCode}${phoneNumber}`;
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

