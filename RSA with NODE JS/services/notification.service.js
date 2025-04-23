const { messaging } = require('../config/firebase.config');

class NotificationService {
    static async sendNotification(notificationData) {
        const { token, title, body, sound = 'default' } = notificationData;

        const message = {
            token,
            notification: { title, body },
            android: {
                priority: "high",
                notification: {
                    sound,
                    channelId: "high_importance_channel",
                },
            },
            apns: {
                headers: { "apns-priority": "10" },
                payload: {
                    aps: {
                        sound,
                        "content-available": 1,
                    },
                },
            },
        };

        try {
            const response = await messaging.send(message);
            return { success: true, messageId: response };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = NotificationService;