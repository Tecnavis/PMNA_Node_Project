// // scripts/forceArchiveAllOld.js
// const mongoose = require('mongoose');
// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });

// async function forceArchiveAllOld() {
//     console.log('🚀 Force archiving ALL old bookings...');
    
//     try {
//         const mongoUri = process.env.MONGO_URI;
//         await mongoose.connect(mongoUri);
//         console.log('✅ Connected to MongoDB');
        
//         const Booking = require('../Model/booking');
//         const BookingArchive = require('../Model/bookingArchive');
        
//         // Calculate 3 months ago
//         const cutoffDate = new Date();
//         cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        
//         console.log(`\n📅 Archiving bookings before: ${cutoffDate.toISOString()}`);
        
//         // Find ALL not-archived bookings older than cutoff
//         const bookingsToArchive = await Booking.find({
//             $or: [
//                 { archived: false },
//                 { archived: { $exists: false } }
//             ],
//             createdAt: { $lt: cutoffDate }
//         })
//         .sort({ createdAt: 1 })
//         .lean();
        
//         console.log(`Found ${bookingsToArchive.length} bookings to archive`);
        
//         if (bookingsToArchive.length === 0) {
//             console.log('✅ No bookings to archive');
//             await mongoose.disconnect();
//             return;
//         }
        
//         // Process in batches
//         const batchSize = 100;
//         let archivedCount = 0;
        
//         for (let i = 0; i < bookingsToArchive.length; i += batchSize) {
//             const batch = bookingsToArchive.slice(i, i + batchSize);
            
//             // Prepare archive docs
//             const archiveDocs = batch.map(booking => {
//                 const archiveDoc = { 
//                     ...booking,
//                     originalId: booking._id,
//                     archiveDate: new Date(),
//                     archived: true
//                 };
//                 delete archiveDoc._id;
//                 return archiveDoc;
//             });
            
//             // Insert into archive
//             await BookingArchive.insertMany(archiveDocs, { ordered: false });
            
//             // Update originals
//             const batchIds = batch.map(b => b._id);
//             await Booking.updateMany(
//                 { _id: { $in: batchIds } },
//                 { 
//                     $set: { 
//                         archived: true,
//                         archivedAt: new Date()
//                     }
//                 }
//             );
            
//             archivedCount += batch.length;
//             console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Archived ${batch.length} (Total: ${archivedCount})`);
            
//             // Small delay
//             await new Promise(resolve => setTimeout(resolve, 50));
//         }
        
//         // Verify
//         const remainingOld = await Booking.countDocuments({
//             $or: [
//                 { archived: false },
//                 { archived: { $exists: false } }
//             ],
//             createdAt: { $lt: cutoffDate }
//         });
        
//         console.log('\n🎉 FORCE ARCHIVE COMPLETE!');
//         console.log(`📊 Results:`);
//         console.log(`  - Archived: ${archivedCount} bookings`);
//         console.log(`  - Still not archived (should be 0): ${remainingOld}`);
        
//         if (remainingOld > 0) {
//             console.log(`\n❌ ${remainingOld} bookings still not archived!`);
//             console.log('Checking what they are...');
            
//             const problemBookings = await Booking.find({
//                 $or: [
//                     { archived: false },
//                     { archived: { $exists: false } }
//                 ],
//                 createdAt: { $lt: cutoffDate }
//             })
//             .limit(5)
//             .select('fileNumber createdAt archived')
//             .lean();
            
//             problemBookings.forEach(b => {
//                 console.log(`  - ${b.fileNumber}: ${b.createdAt}, archived=${b.archived}`);
//             });
//         }
        
//         await mongoose.disconnect();
//         console.log('\n✅ Force archive completed!');
        
//     } catch (error) {
//         console.error('❌ Force archive failed:', error);
//         process.exit(1);
//     }
// }

// forceArchiveAllOld();