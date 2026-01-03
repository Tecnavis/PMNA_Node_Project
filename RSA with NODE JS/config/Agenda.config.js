const Agenda = require('agenda');
const activateBooking = require('../jobs/bookingJobs/activateBooking');
const ArchiveService = require('../services/archiveService');

const initAgenda = async () => {
    const agenda = new Agenda({
        db: {
            address: process.env.MONGO_URI,
            collection: 'agendaJobs'
        },
        processEvery: '30 seconds',
    });

    activateBooking(agenda)
 // ADD ARCHIVE JOB HERE
    agenda.define('archive old bookings', async (job) => {
        console.log('🚀 Running automated archive job...');
        try {
            const result = await ArchiveService.archiveOldBookings(3, 1000);
            console.log('✅ Archive job completed:', result.message);
        } catch (error) {
            console.error('❌ Archive job failed:', error);
        }
    });
    agenda.on('fail', (err, job) => {
        console.error(`Job failed with error: ${err.message}`, job.attrs);
    });

    agenda.on('start', job => {
        console.log(`Job ${job.attrs.name} started at ${new Date().toISOString()}`);
    });

    agenda.on('complete', job => {
        console.log(`Job ${job.attrs.name} completed at ${new Date().toISOString()}`);
    });
    await agenda.start();
  // Update config/Agenda.config.js
agenda.define('archive and move old bookings', async (job) => {
    console.log('🚀 Running automated archive AND move job...');
    try {
        // Use the new combined method
        const result = await ArchiveService.archiveAndMoveOldBookings(3, 1000);
        console.log('✅ Archive and move job completed:', result.message);
    } catch (error) {
        console.error('❌ Archive and move job failed:', error);
    }
});

// Update the schedule
await agenda.every('0 2 * * *', 'archive and move old bookings');
    console.log('📅 Archive job scheduled to run daily at 2 AM');
    
    return agenda;
};

module.exports = initAgenda;
// --------------------------------------------------------------