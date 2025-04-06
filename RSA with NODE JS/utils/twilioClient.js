const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_SERVICE_SID
} = process.env;
const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
    lazyLoading: true
});

module.exports = client