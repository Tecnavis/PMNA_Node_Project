const admin = require('firebase-admin');
require('dotenv').config();

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
}

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

const firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'rsapmna-de966',
});

module.exports = {
    messaging: firebaseApp.messaging(),
    admin
};
