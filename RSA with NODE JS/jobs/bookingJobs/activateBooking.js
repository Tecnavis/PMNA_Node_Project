// src/jobs/bookingJobs/activateBooking.js
const Booking = require('../../Model/booking');
const NotificationService = require('../../services/notification.service');

module.exports = (agenda) => {
    agenda.define('activate booking', async (job) => {
        const { bookingId } = job.attrs.data;

        try {
            const booking = await Booking.findById(bookingId)
                .populate('driver')
                .populate('provider');

            if (!booking) {
                console.error(`Booking with ID ${bookingId} not found`);
                return;
            }

            // Update booking status from scheduled to active
            if (booking.status === 'scheduled') {
                booking.status = 'active';
                booking.isScheduled = false;
                booking.scheduledActivationTime = null;
                await booking.save();
                
                console.log(`Booking ${booking.fileNumber} activated from scheduled state`);

                // Send notification
                const receiver = booking.driver || booking.provider;
                if (receiver && receiver.fcmToken) {
                    const notificationResult = await NotificationService.sendNotification({
                        token: receiver.fcmToken,
                        title: "New Booking Notification",
                        body: 'A new booking has been assigned to you.',
                        sound: 'alert'
                    });

                    if (notificationResult.error === 'Token not registered') {
                        console.warn(`User ${receiver._id} has invalid FCM token`);
                    }
                } else {
                    console.warn(`No FCM token found for booking ${bookingId}`);
                }

                // Emit socket event for the activated booking
                const populatedBooking = await Booking.findById(bookingId)
                    .populate('baselocation company driver provider')
                    .lean();

                if (populatedBooking) {
                    // Make sure you have access to io instance
                    // You might need to pass io to this function or use a global instance
                    if (global.io) {
                        global.io.emit("newChanges", {
                            type: 'bookingActivated',
                            bookingId: bookingId,
                            booking: populatedBooking,
                        });
                    }
                }
            } else {
                console.log(`Booking ${bookingId} is already active or in different state`);
            }

        } catch (error) {
            console.error(`Error activating booking ${bookingId}:`, error);
            throw error;
        }
    });
};