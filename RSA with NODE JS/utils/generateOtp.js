const crypto = require('crypto');

// 6-digit OTP from a cryptographically secure source
exports.generateOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};
