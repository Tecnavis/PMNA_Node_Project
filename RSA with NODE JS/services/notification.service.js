const { messaging } = require('../config/firebase.config');

class NotificationService {
    static async sendNotification(notificationData) {
        const { token, title, body, sound = 'alert' } = notificationData;

        if (!token) {
            console.warn('No FCM token provided');
            return { success: false, error: 'No token provided' };
        }

        const message = {
            token,
            notification: { title, body },
            android: {
                priority: "high",
                notification: {
                    sound: sound,
                    channelId: "high_importance_channel",
                },
            },
            apns: {
                headers: { "apns-priority": "10" },
                payload: {
                    aps: {
                        sound: sound,
                        "content-available": 1,
                    },
                },
            },
        };

        try {
            const response = await messaging.send(message);
            console.log('Successfully sent message:', response);
            return { success: true, messageId: response };
        } catch (error) {
            console.error('Error sending message:', error);

            // Handle specific error cases
            if (error.code === 'messaging/registration-token-not-registered') {
                // Token is no longer valid - you should remove it from your database
                console.warn('FCM token no longer valid:', token);
                return {
                    success: false,
                    error: 'Token not registered',
                    code: error.code,
                    invalidToken: token // Flag this token for cleanup
                };
            }

            throw error;
        }
    }
}

module.exports = NotificationService;