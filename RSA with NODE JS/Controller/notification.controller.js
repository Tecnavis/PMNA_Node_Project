const NotificationService = require('../services/notification.service');

class NotificationController {
    static async sendNotification(req, res, next) {
        try {
            const result = await NotificationService.sendNotification(req.body);
            res.status(200).json({
                success: true,
                message: 'Notification sent successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = NotificationController;