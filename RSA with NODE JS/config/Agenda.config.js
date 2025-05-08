const Agenda = require('agenda');
const activateBooking = require('../jobs/bookingJobs/activateBooking');
const initAgenda = async () => {
    const agenda = new Agenda({
        db: {
            address: process.env.MONGO_URI,
            collection: 'agendaJobs'
        },
        processEvery: '30 seconds',
    });

    activateBooking(agenda)

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

    return agenda;
};

module.exports = initAgenda;