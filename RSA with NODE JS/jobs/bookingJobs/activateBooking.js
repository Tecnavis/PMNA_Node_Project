// src/jobs/bookingJobs/activateBooking.js
const Booking = require('../../Model/booking');
const NotificationService = require('../../services/notification.service');

module.exports = (agenda) => {
    agenda.define('activate booking', async (job) => {
        const { bookingId } = job.attrs.data;

        try {
            const booking = await Booking.findOne({ _id: bookingId, _includeHidden: true })
                .populate('driver')
                .populate('provider'); // populate both

            if (!booking) {
                console.error(`Booking with ID ${bookingId} not found`);
                return;
            }

            const receiver = booking.driver || booking.provider;
            if (receiver && receiver.fcmToken) {
                const notificationResult = await NotificationService.sendNotification({
                    token: receiver.fcmToken,
                    title: "New Booking Notification",
                    body: `New case ${booking.fileNumber || ''} assigned to you${booking.location ? ` · Pickup: ${String(booking.location).slice(0, 80)}` : ''}`,
                    sound: 'alert'
                });

                if (notificationResult.error === 'Token not registered') {
                    console.warn(`User ${receiver._id} has invalid FCM token`);
                }
            } else {
                console.warn(`No FCM token found for booking ${bookingId}`);
            }

            console.log(`Booking ${bookingId} activated`);

        } catch (error) {
            console.error(`Error activating booking ${bookingId}:`, error);
            throw error;
        }
    });
};