const twilioClient = require('../utils/twilioClient');
const OtpModel = require('../Model/otp');
const { generateOtp } = require('../utils/generateOtp');

// Send OTP to user phonenumber 
exports.sendOtp = async (countryCode = '+91', phoneNumber) => {
    try {
        const otp = generateOtp();
        const toPhone = `${countryCode}${phoneNumber}`;

        await OtpModel.findOneAndUpdate(
            { phoneNumber: toPhone },
            { otp },
            { upsert: true, new: true }
        );

        // Send SMS via Twilio
        const response = await twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWLIO_NUMBER,
            to: toPhone,
        });

        console.log("Twilio Response:", response);

        return {
            message: "OTP sent successfully",
            otp: response,
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
        const record = await OtpModel.findOne({ phoneNumber: toPhone, otp });

        if (!record) {
            return {
                message: "Invalid or expired OTP",
                success: false,
            };
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

