// // services/archiveService.js
// const mongoose = require('mongoose');
// const Booking = require('../Model/booking');
// const BookingArchive = require('../Model/bookingArchive');

// class ArchiveService {
//     /**
//      * Calculate cutoff date based on "3 months before" logic
//      * Current month = January: exclude Oct, Nov, Dec, archive everything before Oct 1st
//      */
//     static calculateCutoffDate(months = 3) {
//         const currentDate = new Date();
//         const currentMonth = currentDate.getMonth(); // 0 = January
//         const currentYear = currentDate.getFullYear();
        
//         let cutoffDate;
        
//         if (currentMonth === 0) {
//             // January: archive everything before October 1st of previous year
//             cutoffDate = new Date(currentYear - 1, 8, 1); // September 1st (8 = September, 0-indexed)
//         } else {
//             // Other months: archive everything before (current month - months)
//             cutoffDate = new Date(currentYear, currentMonth - months, 1);
//         }
        
//         cutoffDate.setHours(0, 0, 0, 0);
//         return cutoffDate;
//     }
    
//     /**
//      * Archive only PaymentWork bookings older than cutoff date
//      */
//     static async archiveOldBookings(months = 3, batchSize = 1000) {
//         try {
//             console.log(`=== Starting archive for PaymentWork bookings ===`);
            
//             // Calculate correct cutoff date
//             const cutoffDate = this.calculateCutoffDate(months);
            
//             console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
//             console.log(`Current date: ${new Date().toISOString()}`);
//             console.log(`Archiving bookings created before: ${cutoffDate.toLocaleDateString()}`);
            
//             // Build query for PaymentWork bookings older than cutoff
//             const query = {
//                 workType: 'PaymentWork',
//                 $or: [
//                     { archived: { $exists: false } },
//                     { archived: false },
//                     { archived: null }
//                 ],
//                 createdAt: { $lt: cutoffDate }
//             };
            
//             console.log('Archive query:', JSON.stringify(query, null, 2));
            
//             // Count how many match the criteria
//             const countToArchive = await Booking.countDocuments(query);
//             console.log(`Found ${countToArchive} PaymentWork bookings to archive`);
            
//             if (countToArchive === 0) {
//                 return {
//                     success: true,
//                     archivedCount: 0,
//                     message: 'No PaymentWork bookings found to archive'
//                 };
//             }
            
//             // Archive in batches
//             let archivedCount = 0;
//             let processedCount = 0;
            
//             while (processedCount < countToArchive) {
//                 // Get batch
//                 const batch = await Booking.find(query)
//                     .sort({ createdAt: 1 })
//                     .skip(processedCount)
//                     .limit(batchSize)
//                     .lean();
                
//                 if (batch.length === 0) break;
                
//                 console.log(`Processing batch of ${batch.length} bookings...`);
                
//                 // Prepare archive documents
//                 const archiveDocs = batch.map(booking => {
//                     const archiveDoc = { 
//                         ...booking,
//                         originalId: booking._id,
//                         archiveDate: new Date(),
//                         archived: true
//                     };
//                     delete archiveDoc._id;
//                     return archiveDoc;
//                 });
                
//                 // Insert into archive collection
//                 await BookingArchive.insertMany(archiveDocs, { ordered: false });
                
//                 // Update originals
//                 const bookingIds = batch.map(b => b._id);
//                 await Booking.updateMany(
//                     { _id: { $in: bookingIds } },
//                     { 
//                         $set: { 
//                             archived: true,
//                             archivedAt: new Date()
//                         }
//                     }
//                 );
                
//                 archivedCount += batch.length;
//                 processedCount += batch.length;
                
//                 console.log(`Archived batch: ${batch.length} (Total: ${archivedCount})`);
                
//                 // Add small delay to prevent overwhelming the database
//                 await new Promise(resolve => setTimeout(resolve, 100));
//             }
            
//             return {
//                 success: true,
//                 archivedCount,
//                 message: `Successfully archived ${archivedCount} PaymentWork bookings created before ${cutoffDate.toLocaleDateString()}`
//             };
            
//         } catch (error) {
//             console.error('Archive error:', error);
//             return {
//                 success: false,
//                 archivedCount: 0,
//                 error: error.message,
//                 stack: error.stack
//             };
//         }
//     }
    
//     /**
//      * Restore non-PaymentWork bookings from archive back to Booking collection
//      */
//     static async restoreNonPaymentWorkBookings(batchSize = 1000) {
//         try {
//             console.log('=== Restoring non-PaymentWork bookings from archive ===');
            
//             // Find non-PaymentWork bookings in archive
//             const query = {
//                 workType: { $ne: 'PaymentWork' }
//             };
            
//             const countToRestore = await BookingArchive.countDocuments(query);
//             console.log(`Found ${countToRestore} non-PaymentWork bookings to restore`);
            
//             if (countToRestore === 0) {
//                 return {
//                     success: true,
//                     restoredCount: 0,
//                     message: 'No non-PaymentWork bookings found in archive'
//                 };
//             }
            
//             // Restore in batches
//             let restoredCount = 0;
//             let processedCount = 0;
            
//             while (processedCount < countToRestore) {
//                 // Get batch from archive
//                 const batch = await BookingArchive.find(query)
//                     .sort({ archiveDate: 1 })
//                     .skip(processedCount)
//                     .limit(batchSize)
//                     .lean();
                
//                 if (batch.length === 0) break;
                
//                 console.log(`Processing restoration batch of ${batch.length} bookings...`);
                
//                 // Prepare documents for Booking collection
//                 const bookingDocs = batch.map(archive => {
//                     const bookingDoc = { 
//                         ...archive,
//                         _id: archive.originalId || archive._id,
//                         archived: false,
//                         archivedAt: null
//                     };
//                     // Remove archive-specific fields
//                     delete bookingDoc.originalId;
//                     delete bookingDoc.archiveDate;
//                     return bookingDoc;
//                 });
                
//                 // Insert into Booking collection
//                 // Using bulk operations to handle duplicates
//                 const bulkOps = bookingDocs.map(doc => ({
//                     updateOne: {
//                         filter: { _id: doc._id },
//                         update: { $set: doc },
//                         upsert: true
//                     }
//                 }));
                
//                 if (bulkOps.length > 0) {
//                     await Booking.bulkWrite(bulkOps, { ordered: false });
//                 }
                
//                 // Remove from archive
//                 const archiveIds = batch.map(a => a._id);
//                 await BookingArchive.deleteMany({ _id: { $in: archiveIds } });
                
//                 restoredCount += batch.length;
//                 processedCount += batch.length;
                
//                 console.log(`Restored batch: ${batch.length} (Total: ${restoredCount})`);
                
//                 await new Promise(resolve => setTimeout(resolve, 100));
//             }
            
//             return {
//                 success: true,
//                 restoredCount,
//                 message: `Successfully restored ${restoredCount} non-PaymentWork bookings to Booking collection`
//             };
            
//         } catch (error) {
//             console.error('Restore error:', error);
//             return {
//                 success: false,
//                 restoredCount: 0,
//                 error: error.message,
//                 stack: error.stack
//             };
//         }
//     }
    
//     /**
//      * Combined operation: Restore non-PaymentWork, then archive PaymentWork
//      */
//     static async cleanAndArchive(months = 3, batchSize = 1000) {
//         try {
//             console.log('=== Starting combined cleanup and archive ===');
            
//             // Step 1: Restore non-PaymentWork bookings
//             const restoreResult = await this.restoreNonPaymentWorkBookings(batchSize);
            
//             if (!restoreResult.success) {
//                 return restoreResult;
//             }
            
//             // Step 2: Archive PaymentWork bookings
//             const archiveResult = await this.archiveOldBookings(months, batchSize);
            
//             return {
//                 success: archiveResult.success,
//                 restoredCount: restoreResult.restoredCount,
//                 archivedCount: archiveResult.archivedCount,
//                 message: `Restored ${restoreResult.restoredCount} non-PaymentWork bookings and archived ${archiveResult.archivedCount} PaymentWork bookings`
//             };
            
//         } catch (error) {
//             console.error('Clean and archive error:', error);
//             return {
//                 success: false,
//                 restoredCount: 0,
//                 archivedCount: 0,
//                 error: error.message
//             };
//         }
//     }
    
//     /**
//      * Get statistics for debugging
//      */
//     static async getArchiveStats() {
//         try {
//             const currentDate = new Date();
//             const cutoffDate = this.calculateCutoffDate(3);
            
//             const stats = await Promise.all([
//                 // Total PaymentWork bookings
//                 Booking.countDocuments({ workType: 'PaymentWork' }),
                
//                 // PaymentWork bookings older than cutoff
//                 Booking.countDocuments({
//                     workType: 'PaymentWork',
//                     $or: [
//                         { archived: { $exists: false } },
//                         { archived: false },
//                         { archived: null }
//                     ],
//                     createdAt: { $lt: cutoffDate }
//                 }),
                
//                 // Non-PaymentWork bookings in archive
//                 BookingArchive.countDocuments({ workType: { $ne: 'PaymentWork' } }),
                
//                 // PaymentWork bookings in archive
//                 BookingArchive.countDocuments({ workType: 'PaymentWork' })
//             ]);
            
//             return {
//                 totalPaymentWork: stats[0],
//                 paymentWorkToArchive: stats[1],
//                 nonPaymentWorkInArchive: stats[2],
//                 paymentWorkInArchive: stats[3],
//                 cutoffDate: cutoffDate,
//                 explanation: `If current month is January, bookings created before ${cutoffDate.toLocaleDateString()} (September and older) will be archived`
//             };
            
//         } catch (error) {
//             console.error('Stats error:', error);
//             return { error: error.message };
//         }
//     }
    
//     /**
//      * Debug archive query
//      */
//     static async debugArchiveQuery(months = 3, limit = 10) {
//         try {
//             const cutoffDate = this.calculateCutoffDate(months);
            
//             const sampleBookings = await Booking.find({
//                 workType: 'PaymentWork',
//                 $or: [
//                     { archived: { $exists: false } },
//                     { archived: false },
//                     { archived: null }
//                 ],
//                 createdAt: { $lt: cutoffDate }
//             })
//             .limit(limit)
//             .select('fileNumber workType createdAt archived archivedAt')
//             .sort({ createdAt: 1 })
//             .lean();
            
//             return {
//                 cutoffDate: cutoffDate.toISOString(),
//                 sampleCount: sampleBookings.length,
//                 sampleBookings,
//                 queryExplanation: `PaymentWork bookings created before ${cutoffDate.toLocaleDateString()} will be archived`
//             };
            
//         } catch (error) {
//             console.error('Debug error:', error);
//             return { error: error.message };
//         }
//     }
    
//     /**
//      * Verify archive status
//      */
//     static async verifyArchive() {
//         try {
//             const cutoffDate = this.calculateCutoffDate(3);
            
//             const [paymentWorkBeforeCutoff, paymentWorkArchived, nonPaymentWorkArchived] = await Promise.all([
//                 Booking.countDocuments({
//                     workType: 'PaymentWork',
//                     $or: [
//                         { archived: { $exists: false } },
//                         { archived: false },
//                         { archived: null }
//                     ],
//                     createdAt: { $lt: cutoffDate }
//                 }),
//                 BookingArchive.countDocuments({ workType: 'PaymentWork' }),
//                 BookingArchive.countDocuments({ workType: { $ne: 'PaymentWork' } })
//             ]);
            
//             return {
//                 cutoffDate: cutoffDate.toISOString(),
//                 paymentWorkBeforeCutoff,
//                 paymentWorkArchived,
//                 nonPaymentWorkArchived,
//                 verification: nonPaymentWorkArchived === 0 ? 
//                     '✅ All non-PaymentWork bookings have been restored' : 
//                     `⚠️ ${nonPaymentWorkArchived} non-PaymentWork bookings still in archive`
//             };
            
//         } catch (error) {
//             console.error('Verify error:', error);
//             return { error: error.message };
//         }
//     }
//     // Add this method to services/archiveService.js
// static async moveAlreadyArchivedBookings(batchSize = 1000) {
//     try {
//         console.log('=== Moving already archived bookings from Booking to BookingArchive ===');
        
//         // Find bookings that are marked as archived but still in Booking collection
//         const query = {
//             archived: true,
//             archivedAt: { $exists: true, $ne: null }
//         };
        
//         const countToMove = await Booking.countDocuments(query);
//         console.log(`Found ${countToMove} already-archived bookings to move`);
        
//         if (countToMove === 0) {
//             return {
//                 success: true,
//                 movedCount: 0,
//                 message: 'No already-archived bookings found to move'
//             };
//         }
        
//         // Move in batches
//         let movedCount = 0;
//         let processedCount = 0;
        
//         while (processedCount < countToMove) {
//             // Get batch
//             const batch = await Booking.find(query)
//                 .sort({ archivedAt: 1 })
//                 .skip(processedCount)
//                 .limit(batchSize)
//                 .lean();
            
//             if (batch.length === 0) break;
            
//             console.log(`Processing move batch of ${batch.length} bookings...`);
            
//             // Check which bookings already exist in archive to avoid duplicates
//             const bookingIds = batch.map(b => b._id);
//             const existingInArchive = await BookingArchive.find({
//                 originalId: { $in: bookingIds }
//             }).select('originalId').lean();
            
//             const existingIds = new Set(existingInArchive.map(a => a.originalId.toString()));
            
//             // Filter out bookings that already exist in archive
//             const toMove = batch.filter(b => !existingIds.has(b._id.toString()));
            
//             if (toMove.length === 0) {
//                 console.log('All bookings in this batch already exist in archive, deleting from Booking...');
                
//                 // Delete from Booking since they already exist in archive
//                 await Booking.deleteMany({ _id: { $in: bookingIds } });
                
//                 movedCount += batch.length;
//                 processedCount += batch.length;
//                 console.log(`Deleted batch: ${batch.length} (Total moved: ${movedCount})`);
//                 continue;
//             }
            
//             console.log(`Moving ${toMove.length} unique bookings...`);
            
//             // Prepare archive documents
//             const archiveDocs = toMove.map(booking => {
//                 const archiveDoc = { 
//                     ...booking,
//                     originalId: booking._id,
//                     archiveDate: booking.archivedAt || new Date()
//                 };
//                 delete archiveDoc._id;
//                 return archiveDoc;
//             });
            
//             // Insert into archive collection
//             await BookingArchive.insertMany(archiveDocs, { ordered: false });
            
//             // Delete from original Booking collection
//             const toMoveIds = toMove.map(b => b._id);
//             await Booking.deleteMany({ _id: { $in: toMoveIds } });
            
//             movedCount += toMove.length;
//             processedCount += batch.length;
            
//             console.log(`Moved batch: ${toMove.length} (Total: ${movedCount})`);
            
//             // Add small delay
//             await new Promise(resolve => setTimeout(resolve, 100));
//         }
        
//         return {
//             success: true,
//             movedCount,
//             message: `Successfully moved ${movedCount} already-archived bookings to archive collection`
//         };
        
//     } catch (error) {
//         console.error('Move already archived error:', error);
//         return {
//             success: false,
//             movedCount: 0,
//             error: error.message,
//             stack: error.stack
//         };
//     }
// }
// }

// module.exports = ArchiveService;
// services/archiveService.js
const mongoose = require('mongoose');
const Booking = require('../Model/booking');
const BookingArchive = require('../Model/bookingArchive');

class ArchiveService {
    /**
     * Calculate cutoff date: if January, exclude Oct/Nov/Dec
     * Archive everything before October (September and older)
     */
    static calculateCutoffDate() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth(); // 0 = January
        const currentYear = currentDate.getFullYear();
        
        let cutoffDate;
        
        if (currentMonth === 0) {
            // January: archive everything before October 1st of previous year
            cutoffDate = new Date(currentYear - 1, 8, 1); // September 1st
        } else {
            // Other months: archive everything before (current month - 3)
            cutoffDate = new Date(currentYear, currentMonth - 3, 1);
        }
        
        cutoffDate.setHours(0, 0, 0, 0);
        return cutoffDate;
    }
    
    /**
     * Archive only PaymentWork bookings older than cutoff date
     */
    static async archivePaymentWorkBookings(batchSize = 1000) {
        try {
            console.log('=== Archiving PaymentWork bookings older than 3 months ===');
            
            // Calculate cutoff date
            const cutoffDate = this.calculateCutoffDate();
            
            console.log(`Current month: ${new Date().toLocaleString('default', { month: 'long' })}`);
            console.log(`Cutoff date (archive everything before): ${cutoffDate.toISOString()}`);
            console.log(`Only archiving: workType = "PaymentWork"`);
            
            // Find PaymentWork bookings older than cutoff that are not archived
            const query = {
                workType: 'PaymentWork',
                $or: [
                    { archived: { $exists: false } },
                    { archived: false },
                    { archived: null }
                ],
                createdAt: { $lt: cutoffDate }
            };
            
            const countToArchive = await Booking.countDocuments(query);
            console.log(`Found ${countToArchive} PaymentWork bookings to archive`);
            
            if (countToArchive === 0) {
                return {
                    success: true,
                    archivedCount: 0,
                    message: 'No PaymentWork bookings found to archive'
                };
            }
            
            // Archive in batches
            let archivedCount = 0;
            let processedCount = 0;
            
            while (processedCount < countToArchive) {
                const batch = await Booking.find(query)
                    .sort({ createdAt: 1 })
                    .skip(processedCount)
                    .limit(batchSize)
                    .lean();
                
                if (batch.length === 0) break;
                
                console.log(`Processing batch of ${batch.length} bookings...`);
                
                // Copy to archive collection
                const archiveDocs = batch.map(booking => {
                    const archiveDoc = { 
                        ...booking,
                        originalId: booking._id,
                        archiveDate: new Date(),
                        archived: true
                    };
                    delete archiveDoc._id;
                    return archiveDoc;
                });
                
                await BookingArchive.insertMany(archiveDocs, { ordered: false });
                
                // Update original bookings
                const bookingIds = batch.map(b => b._id);
                await Booking.updateMany(
                    { _id: { $in: bookingIds } },
                    { 
                        $set: { 
                            archived: true,
                            archivedAt: new Date()
                        }
                    }
                );
                
                archivedCount += batch.length;
                processedCount += batch.length;
                
                console.log(`Archived batch: ${batch.length} (Total: ${archivedCount})`);
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return {
                success: true,
                archivedCount,
                message: `Archived ${archivedCount} PaymentWork bookings created before ${cutoffDate.toLocaleDateString()}`
            };
            
        } catch (error) {
            console.error('Archive error:', error);
            return {
                success: false,
                archivedCount: 0,
                error: error.message
            };
        }
    }
    
    /**
     * Restore non-PaymentWork bookings from archive back to Booking collection
     */
    static async restoreNonPaymentWorkBookings(batchSize = 1000) {
        try {
            console.log('=== Restoring non-PaymentWork bookings from archive ===');
            
            // Find non-PaymentWork bookings in archive (like RSAWork)
            const query = {
                workType: { $ne: 'PaymentWork' }
            };
            
            const countToRestore = await BookingArchive.countDocuments(query);
            console.log(`Found ${countToRestore} non-PaymentWork bookings to restore`);
            
            if (countToRestore === 0) {
                return {
                    success: true,
                    restoredCount: 0,
                    message: 'No non-PaymentWork bookings found in archive'
                };
            }
            
            // Restore in batches
            let restoredCount = 0;
            let processedCount = 0;
            
            while (processedCount < countToRestore) {
                const batch = await BookingArchive.find(query)
                    .sort({ archiveDate: 1 })
                    .skip(processedCount)
                    .limit(batchSize)
                    .lean();
                
                if (batch.length === 0) break;
                
                console.log(`Processing restoration batch of ${batch.length} bookings...`);
                
                // Restore to Booking collection
                for (const archive of batch) {
                    const bookingDoc = { 
                        ...archive,
                        _id: archive.originalId || archive._id,
                        archived: false,
                        archivedAt: null
                    };
                    delete bookingDoc.originalId;
                    delete bookingDoc.archiveDate;
                    
                    // Insert or update in Booking collection
                    await Booking.updateOne(
                        { _id: bookingDoc._id },
                        { $set: bookingDoc },
                        { upsert: true }
                    );
                    
                    // Delete from archive
                    await BookingArchive.deleteOne({ _id: archive._id });
                }
                
                restoredCount += batch.length;
                processedCount += batch.length;
                
                console.log(`Restored batch: ${batch.length} (Total: ${restoredCount})`);
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return {
                success: true,
                restoredCount,
                message: `Restored ${restoredCount} non-PaymentWork bookings to Booking collection`
            };
            
        } catch (error) {
            console.error('Restore error:', error);
            return {
                success: false,
                restoredCount: 0,
                error: error.message
            };
        }
    }
    
    /**
     * Combined operation: First restore non-PaymentWork, then archive PaymentWork
     */
    static async cleanAndArchive(batchSize = 1000) {
        try {
            console.log('=== Starting cleanup and archive process ===');
            
            // Step 1: Restore non-PaymentWork bookings
            console.log('\nStep 1: Restoring non-PaymentWork bookings...');
            const restoreResult = await this.restoreNonPaymentWorkBookings(batchSize);
            
            if (!restoreResult.success) {
                return restoreResult;
            }
            
            // Step 2: Archive PaymentWork bookings
            console.log('\nStep 2: Archiving PaymentWork bookings...');
            const archiveResult = await this.archivePaymentWorkBookings(batchSize);
            
            return {
                success: archiveResult.success,
                restoredCount: restoreResult.restoredCount,
                archivedCount: archiveResult.archivedCount,
                message: `Restored ${restoreResult.restoredCount} non-PaymentWork bookings and archived ${archiveResult.archivedCount} PaymentWork bookings`
            };
            
        } catch (error) {
            console.error('Clean and archive error:', error);
            return {
                success: false,
                restoredCount: 0,
                archivedCount: 0,
                error: error.message
            };
        }
    }
    
    /**
     * Get statistics
     */
    static async getArchiveStats() {
        try {
            const cutoffDate = this.calculateCutoffDate();
            
            const stats = await Promise.all([
                // PaymentWork bookings older than cutoff that should be archived
                Booking.countDocuments({
                    workType: 'PaymentWork',
                    $or: [
                        { archived: { $exists: false } },
                        { archived: false }
                    ],
                    createdAt: { $lt: cutoffDate }
                }),
                
                // Non-PaymentWork bookings in archive that should be restored
                BookingArchive.countDocuments({ workType: { $ne: 'PaymentWork' } }),
                
                // PaymentWork bookings already in archive
                BookingArchive.countDocuments({ workType: 'PaymentWork' })
            ]);
            
            return {
                paymentWorkToArchive: stats[0],
                nonPaymentWorkToRestore: stats[1],
                paymentWorkAlreadyArchived: stats[2],
                cutoffDate: cutoffDate.toISOString(),
                explanation: `If current month is January, only PaymentWork bookings created before ${cutoffDate.toLocaleDateString()} (September and older) will be archived`
            };
            
        } catch (error) {
            console.error('Stats error:', error);
            return { error: error.message };
        }
    }
}

module.exports = ArchiveService;