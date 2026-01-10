// // scripts/moveAllArchivedBookings.js
// const mongoose = require('mongoose');
// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });

// async function moveAllArchivedBookings() {
//     console.log('🚀 Moving ALL archived bookings from Booking to BookingArchive...');
    
//     try {
//         const mongoUri = process.env.MONGO_URI;
//         await mongoose.connect(mongoUri);
//         console.log('✅ Connected to MongoDB');
        
//         const Booking = require('../Model/booking');
//         const BookingArchive = require('../Model/bookingArchive');
        
//         // Count archived bookings
//         const archivedCount = await Booking.countDocuments({ archived: true });
//         console.log(`\n📊 Found ${archivedCount} archived bookings in Booking collection`);
        
//         if (archivedCount === 0) {
//             console.log('✅ No archived bookings to move');
//             await mongoose.disconnect();
//             return;
//         }
        
//         // Process in batches
//         const batchSize = 500;
//         let totalMoved = 0;
//         let totalDeleted = 0;
//         let page = 0;
        
//         while (true) {
//             const skip = page * batchSize;
            
//             // Get a batch of archived bookings
//             const batch = await Booking.find({ archived: true })
//                 .sort({ archivedAt: 1 })
//                 .skip(skip)
//                 .limit(batchSize)
//                 .lean();
            
//             if (batch.length === 0) break;
            
//             console.log(`\n📦 Processing batch ${page + 1} (${batch.length} bookings)...`);
            
//             // Check which already exist in archive
//             const bookingIds = batch.map(b => b._id);
//             const existingInArchive = await BookingArchive.find({
//                 originalId: { $in: bookingIds }
//             }).select('originalId').lean();
            
//             const existingIds = new Set(existingInArchive.map(a => a.originalId.toString()));
            
//             // Separate into new archives and duplicates
//             const newArchives = [];
//             const duplicateIds = [];
            
//             batch.forEach(booking => {
//                 if (existingIds.has(booking._id.toString())) {
//                     duplicateIds.push(booking._id);
//                 } else {
//                     newArchives.push({
//                         ...booking,
//                         originalId: booking._id,
//                         archiveDate: booking.archivedAt || new Date()
//                     });
//                 }
//             });
            
//             // Add new archives
//             if (newArchives.length > 0) {
//                 const archiveDocs = newArchives.map(doc => {
//                     delete doc._id;
//                     return doc;
//                 });
                
//                 await BookingArchive.insertMany(archiveDocs, { ordered: false });
//                 totalMoved += newArchives.length;
//                 console.log(`✅ Added ${newArchives.length} new archives`);
//             }
            
//             // Delete all from Booking (both new and duplicates)
//             await Booking.deleteMany({ _id: { $in: bookingIds } });
//             totalDeleted += batch.length;
//             console.log(`🗑️  Deleted ${batch.length} from Booking collection`);
            
//             page++;
            
//             // Small delay
//             await new Promise(resolve => setTimeout(resolve, 50));
//         }
        
//         console.log('\n🎉 COMPLETE!');
//         console.log(`📊 Summary:`);
//         console.log(`  - Moved to archive: ${totalMoved} bookings`);
//         console.log(`  - Deleted from Booking: ${totalDeleted} bookings`);
//         console.log(`  - Skipped duplicates: ${totalDeleted - totalMoved} bookings`);
        
//         // Final counts
//         const finalArchived = await Booking.countDocuments({ archived: true });
//         const finalInArchive = await BookingArchive.countDocuments();
        
//         console.log(`\n📈 Final counts:`);
//         console.log(`  - Archived in Booking: ${finalArchived} (should be 0)`);
//         console.log(`  - Total in Archive: ${finalInArchive}`);
        
//         if (finalArchived > 0) {
//             console.log(`\n⚠️  ${finalArchived} bookings still marked as archived in Booking collection!`);
//             console.log(`   They may not have archivedAt field set.`);
//         }
        
//         await mongoose.disconnect();
//         console.log('\n✅ Migration completed!');
        
//     } catch (error) {
//         console.error('❌ Error:', error);
//         process.exit(1);
//     }
// }

// moveAllArchivedBookings();