const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_SERVICE_SID
} = process.env;
const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
    lazyLoading: true
});
async function checkVerifiedNumbers() {
    try {
        const callerIds = await client.outgoingCallerIds.list();
        console.log('Verified Numbers:', callerIds.map(caller => caller.phoneNumber));
    } catch (error) {
        console.error('Error fetching verified numbers:', error.message);
    }
}

checkVerifiedNumbers();
module.exports = client