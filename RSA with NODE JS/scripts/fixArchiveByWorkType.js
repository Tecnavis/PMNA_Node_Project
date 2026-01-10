// // scripts/fixArchiveByWorkType.js
// const mongoose = require('mongoose');
// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });

// function calculateCutoffDate() {
//     const currentDate = new Date();
//     const currentMonth = currentDate.getMonth(); // 0 = January
//     const currentYear = currentDate.getFullYear();
    
//     let cutoffDate;
    
//     if (currentMonth === 0) {
//         // January: archive everything before October 1st of previous year
//         cutoffDate = new Date(currentYear - 1, 8, 1); // September 1st
//     } else {
//         // Other months: archive everything before (current month - 3)
//         cutoffDate = new Date(currentYear, currentMonth - 3, 1);
//     }
    
//     cutoffDate.setHours(0, 0, 0, 0);
//     return cutoffDate;
// }

// async function fixArchiveByWorkType() {
//     console.log('🚀 Fixing archive by workType...');
    
//     try {
//         const mongoUri = process.env.MONGO_URI;
//         await mongoose.connect(mongoUri);
//         console.log('✅ Connected to MongoDB');
        
//         const Booking = require('../Model/booking');
//         const BookingArchive = require('../Model/bookingArchive');
        
//         console.log('\n📊 Current Statistics:');
        
//         // Calculate correct cutoff date
//         const cutoffDate = calculateCutoffDate();
        
//         console.log(`Current month: ${new Date().toLocaleString('default', { month: 'long' })}`);
//         console.log(`Cutoff date (archive everything before): ${cutoffDate.toISOString()}`);
//         console.log(`Explanation: Only PaymentWork bookings created before this date will be archived`);
        
//         // 1. Find non-PaymentWork bookings in archive that should be restored
//         const nonPaymentWorkInArchive = await BookingArchive.find({
//             workType: { $ne: 'PaymentWork' }
//         }).limit(10).lean();
        
//         console.log(`\nNon-PaymentWork bookings in archive: ${nonPaymentWorkInArchive.length}`);
        
//         if (nonPaymentWorkInArchive.length > 0) {
//             console.log('Restoring non-PaymentWork bookings...');
            
//             // Restore them in batches
//             const batchSize = 50;
//             for (let i = 0; i < nonPaymentWorkInArchive.length; i += batchSize) {
//                 const batch = nonPaymentWorkInArchive.slice(i, i + batchSize);
                
//                 for (const archive of batch) {
//                     const booking = {
//                         ...archive,
//                         _id: archive.originalId || archive._id,
//                         archived: false,
//                         archivedAt: null
//                     };
//                     delete booking.originalId;
//                     delete booking.archiveDate;
                    
//                     await Booking.updateOne(
//                         { _id: booking._id },
//                         { $set: booking },
//                         { upsert: true }
//                     );
                    
//                     await BookingArchive.deleteOne({ _id: archive._id });
//                 }
                
//                 console.log(`Restored batch ${Math.floor(i/batchSize) + 1}: ${Math.min(batchSize, batch.length)} bookings`);
//             }
            
//             console.log('✅ Restored non-PaymentWork bookings');
//         }
        
//         // 2. Find PaymentWork bookings older than cutoff that should be archived
//         const paymentWorkToArchive = await Booking.find({
//             workType: 'PaymentWork',
//             $or: [
//                 { archived: { $exists: false } },
//                 { archived: false },
//                 { archived: null }
//             ],
//             createdAt: { $lt: cutoffDate }
//         }).limit(10).lean();
        
//         console.log(`\nPaymentWork bookings to archive: ${paymentWorkToArchive.length}`);
        
//         if (paymentWorkToArchive.length > 0) {
//             console.log('Archiving PaymentWork bookings...');
            
//             // Archive in batches
//             const batchSize = 50;
//             for (let i = 0; i < paymentWorkToArchive.length; i += batchSize) {
//                 const batch = paymentWorkToArchive.slice(i, i + batchSize);
                
//                 for (const booking of batch) {
//                     const archiveDoc = {
//                         ...booking,
//                         originalId: booking._id,
//                         archiveDate: new Date(),
//                         archived: true
//                     };
//                     delete archiveDoc._id;
                    
//                     await BookingArchive.create(archiveDoc);
                    
//                     await Booking.updateOne(
//                         { _id: booking._id },
//                         { 
//                             $set: { 
//                                 archived: true,
//                                 archivedAt: new Date()
//                             }
//                         }
//                     );
//                 }
                
//                 console.log(`Archived batch ${Math.floor(i/batchSize) + 1}: ${Math.min(batchSize, batch.length)} bookings`);
//             }
            
//             console.log('✅ Archived PaymentWork bookings');
//         }
        
//         // Final stats
//         console.log('\n🎉 Final Statistics:');
        
//         const finalStats = await Promise.all([
//             Booking.countDocuments({ workType: 'PaymentWork', archived: false }),
//             BookingArchive.countDocuments({ workType: 'PaymentWork' }),
//             BookingArchive.countDocuments({ workType: { $ne: 'PaymentWork' } }),
//             Booking.countDocuments({
//                 workType: 'PaymentWork',
//                 archived: false,
//                 createdAt: { $lt: cutoffDate }
//             })
//         ]);
        
//         console.log('PaymentWork bookings (active):', finalStats[0]);
//         console.log('PaymentWork bookings (archived):', finalStats[1]);
//         console.log('Non-PaymentWork bookings (in archive - should be 0):', finalStats[2]);
//         console.log('PaymentWork bookings older than cutoff still active:', finalStats[3]);
        
//         if (finalStats[2] > 0) {
//             console.log(`\n⚠️  WARNING: ${finalStats[2]} non-PaymentWork bookings still in archive!`);
//             console.log('   Run the restore script again or use API endpoint.');
//         }
        
//         await mongoose.disconnect();
//         console.log('\n✅ Fix completed!');
        
//     } catch (error) {
//         console.error('❌ Fix failed:', error);
//         process.exit(1);
//     }
// }

// fixArchiveByWorkType();