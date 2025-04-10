const twilioClient = require('../utils/twilioClient');

// Send OTP to user phonenumber 
exports.sendOtp = async (countryCode = '+91', phoneNumber) => {
    try {
        console.log(`Sending OTP to: ${countryCode}${phoneNumber}`);

        const otpResponse = await twilioClient.verify.v2
            .services(process.env.TWILIO_SERVICE_SID)
            .verifications.create({
                to: `${countryCode}${phoneNumber}`,
                channel: 'sms'
            });

        console.log("Twilio Response:", otpResponse);

        return {
            message: "OTP sent successfully",
            otp: otpResponse,
            success: true,
        }
    } catch (error) {
        console.log('error sending otp', error.message);
        return {
            message: error.message,
            success: false,
        }
    }
}

// Verify user OTP 
exports.verifyOtp = async (countryCode = '+91', phoneNumber, otp) => {
    try {
        console.log(`Verifying OTP for: ${countryCode}${phoneNumber}`);

        const verificationResponse = await twilioClient.verify.v2 // ✅ Use v2
            .services(process.env.TWILIO_SERVICE_SID)
            .verificationChecks.create({
                to: `${countryCode}${phoneNumber}`,
                code: otp
            });

        console.log("OTP Verification Response:", verificationResponse);
        return {
            message: "OTP verified successfully",
            otp: verificationResponse,
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

