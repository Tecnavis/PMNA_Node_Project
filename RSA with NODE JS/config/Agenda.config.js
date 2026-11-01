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
// Every night: closed bookings older than a year → Old Bookings (copy + hide, nothing deleted)
agenda.define('archive and move old bookings', async () => {
    try {
        const result = await require('../services/oneYearArchive').run();
        console.log('✅ One-year archive:', result.message);
    } catch (error) {
        console.error('❌ One-year archive failed:', error.message);
    }
});

await agenda.every('30 2 * * *', 'archive and move old bookings', {}, { timezone: 'Asia/Kolkata' });
    console.log('📅 Old-booking archive scheduled daily at 2:30 AM India time');

    // Owner's evening summary on WhatsApp (only sends when OWNER_WHATSAPP and WhatsApp are set up)
    agenda.define('daily owner summary', async () => {
        try {
            const r = await require('../services/dailySummary').send();
            console.log(r.ok ? '✅ Daily summary sent' : `ℹ️ Daily summary not sent: ${r.reason || 'delivery failed'}`);
        } catch (error) {
            console.error('❌ Daily summary failed:', error.message);
        }
    });
    await agenda.every(process.env.SUMMARY_CRON || '0 21 * * *', 'daily owner summary', {}, { timezone: 'Asia/Kolkata' });

    // Monthly data backup to the media server (1st of every month, 3:15 AM)
    agenda.define('monthly data backup', async () => {
        try {
            const r = await require('../services/backup').run({ reason: 'monthly' });
            console.log(r.ok ? `✅ Monthly backup saved: ${r.name}` : `❌ Monthly backup failed: ${r.error}`);
        } catch (error) {
            console.error('❌ Monthly backup failed:', error.message);
        }
    });
    await agenda.every(process.env.BACKUP_CRON || '15 3 1 * *', 'monthly data backup', {}, { timezone: 'Asia/Kolkata' });
    
    return agenda;
};

module.exports = initAgenda;
// --------------------------------------------------------------