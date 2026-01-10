// // scripts/checkOldBookings.js
// const mongoose = require('mongoose');
// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });

// async function checkOldBookings() {
//     console.log('🔍 Checking for old bookings that should be archived...');
    
//     try {
//         const mongoUri =process.env.MONGO_URI;
//         await mongoose.connect(mongoUri);
//         console.log('✅ Connected to MongoDB');
        
//         const Booking = require('../Model/booking');
        
//         // Calculate 3 months ago
//         const cutoffDate = new Date();
//         cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        
//         console.log('\n📅 Date Calculation:');
//         console.log(`Today: ${new Date().toISOString()}`);
//         console.log(`3 months ago: ${cutoffDate.toISOString()}`);
        
//         // Find ALL bookings older than cutoff
//         const oldBookings = await Booking.find({
//             createdAt: { $lt: cutoffDate }
//         })
//         .select('fileNumber createdAt archived archivedAt status')
//         .sort({ createdAt: 1 })
//         .lean();
        
//         console.log(`\n📊 Found ${oldBookings.length} bookings older than ${cutoffDate.toISOString()}`);
        
//         // Group by archived status
//         const archivedTrue = oldBookings.filter(b => b.archived === true);
//         const archivedFalse = oldBookings.filter(b => b.archived === false);
//         const archivedUndefined = oldBookings.filter(b => b.archived === undefined);
        
//         console.log(`\n📈 Status of old bookings:`);
//         console.log(`  - archived=true: ${archivedTrue.length}`);
//         console.log(`  - archived=false: ${archivedFalse.length} ⚠️ SHOULD BE ARCHIVED!`);
//         console.log(`  - archived=undefined: ${archivedUndefined.length}`);
        
//         if (archivedFalse.length > 0) {
//             console.log('\n❌ PROBLEM: These bookings should be archived but are not:');
//             archivedFalse.slice(0, 10).forEach((b, i) => {
//                 const daysOld = Math.floor((new Date() - new Date(b.createdAt)) / (1000 * 60 * 60 * 24));
//                 console.log(`${i+1}. ${b.fileNumber}`);
//                 console.log(`   Created: ${b.createdAt.toISOString()}`);
//                 console.log(`   Days old: ${daysOld}`);
//                 console.log(`   Status: ${b.status}`);
//                 console.log(`   Archived: ${b.archived}`);
//                 console.log('');
//             });
            
//             if (archivedFalse.length > 10) {
//                 console.log(`... and ${archivedFalse.length - 10} more`);
//             }
//         }
        
//         // Test query that SHOULD work
//         console.log('\n🧪 Testing the archive query...');
//         const testQuery = {
//             archived: false,
//             createdAt: { $lt: cutoffDate }
//         };
        
//         const shouldArchive = await Booking.find(testQuery).limit(5).lean();
//         console.log(`Query: archived=false AND createdAt < ${cutoffDate.toISOString()}`);
//         console.log(`Returns: ${shouldArchive.length} documents`);
        
//         if (shouldArchive.length > 0) {
//             console.log('First result:', {
//                 fileNumber: shouldArchive[0].fileNumber,
//                 createdAt: shouldArchive[0].createdAt,
//                 archived: shouldArchive[0].archived
//             });
//         }
        
//         // Manual fix for specific booking
//         console.log('\n🔧 Manual fix for PMNA-1755834051624 (Aug 22, 2025):');
//         const specificBooking = await Booking.findOne({ 
//             fileNumber: 'PMNA-1755834051624' 
//         });
        
//         if (specificBooking) {
//             console.log('Found booking:', {
//                 fileNumber: specificBooking.fileNumber,
//                 createdAt: specificBooking.createdAt,
//                 archived: specificBooking.archived,
//                 shouldBeArchived: specificBooking.createdAt < cutoffDate
//             });
            
//             // Manual archive
//             specificBooking.archived = true;
//             specificBooking.archivedAt = new Date();
//             await specificBooking.save();
//             console.log('✅ Manually archived this booking');
//         }
        
//         await mongoose.disconnect();
//         console.log('\n✅ Check completed');
        
//     } catch (error) {
//         console.error('❌ Check failed:', error);
//     }
// }

// checkOldBookings();