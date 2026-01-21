// services/archiveService.js - ENHANCED FINAL VERSION
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
            const currentDate = new Date();
            
            console.log(`Current date: ${currentDate.toISOString()}`);
            console.log(`Current month: ${currentDate.toLocaleString('default', { month: 'long' })}`);
            console.log(`Cutoff date (archive everything before): ${cutoffDate.toISOString()}`);
            console.log(`Explanation: If January, only PaymentWork bookings created before ${cutoffDate.toLocaleDateString()} (September and older) will be archived`);
            
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
            
            // Get sample for verification
            const sample = await Booking.find(query)
                .limit(3)
                .select('fileNumber workType createdAt')
                .lean();
            
            console.log('Sample bookings to archive:');
            sample.forEach(b => {
                console.log(`  - ${b.fileNumber}: ${b.workType}, created: ${b.createdAt}`);
            });
            
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
     * Restore ALL non-PaymentWork bookings from archive back to Booking collection
     */
    static async restoreNonPaymentWorkBookings(batchSize = 1000) {
        try {
            console.log('=== Restoring ALL non-PaymentWork bookings from archive ===');
            
            // Find non-PaymentWork bookings in archive (like RSAWork, ServiceWork, etc.)
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
            
            // Get sample for verification
            const sample = await BookingArchive.find(query)
                .limit(3)
                .select('fileNumber workType createdAt pickupTime')
                .lean();
            
            console.log('Sample bookings to restore:');
            sample.forEach(b => {
                console.log(`  - ${b.fileNumber}: ${b.workType}, created: ${b.createdAt}, pickup: ${b.pickupTime}`);
            });
            
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
                    try {
                        // Determine correct dates (fix corrupted 2026 dates)
                        let correctCreatedAt = archive.createdAt;
                        let correctUpdatedAt = archive.updatedAt;
                        
                        // Fix corrupted dates (created in 2026 but pickup in earlier year)
                        if (archive.createdAt && archive.createdAt.getFullYear() >= 2026) {
                            // Priority 1: Use pickupTime if available and older
                            if (archive.pickupTime && archive.pickupTime.getFullYear() < 2026) {
                                correctCreatedAt = archive.pickupTime;
                                correctUpdatedAt = archive.pickupTime;
                            }
                            // Priority 2: Use dropoffTime
                            else if (archive.dropoffTime && archive.dropoffTime.getFullYear() < 2026) {
                                correctCreatedAt = archive.dropoffTime;
                                correctUpdatedAt = archive.dropoffTime;
                            }
                            // Priority 3: Use verifiedAt
                            else if (archive.verifiedAt && archive.verifiedAt.getFullYear() < 2026) {
                                correctCreatedAt = archive.verifiedAt;
                                correctUpdatedAt = archive.verifiedAt;
                            }
                            // Fallback: use pickupTime minus 1 hour
                            else if (archive.pickupTime) {
                                correctCreatedAt = new Date(archive.pickupTime);
                                correctCreatedAt.setHours(correctCreatedAt.getHours() - 1);
                                correctUpdatedAt = correctCreatedAt;
                            }
                        }
                        
                        const bookingDoc = { 
                            ...archive,
                            _id: archive.originalId || archive._id,
                            createdAt: correctCreatedAt,
                            updatedAt: correctUpdatedAt,
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
                        
                    } catch (error) {
                        console.error(`Error restoring ${archive.fileNumber || 'unknown'}:`, error.message);
                    }
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
            console.log('=== Starting COMPLETE cleanup and archive process ===');
            
            // Step 1: Restore non-PaymentWork bookings (RSAWork, etc.)
            console.log('\nStep 1: Restoring non-PaymentWork bookings...');
            const restoreResult = await this.restoreNonPaymentWorkBookings(batchSize);
            
            if (!restoreResult.success) {
                console.error('❌ Failed to restore non-PaymentWork bookings');
                return restoreResult;
            }
            
            console.log(`✅ Restored ${restoreResult.restoredCount} non-PaymentWork bookings`);
            
            // Step 2: Archive PaymentWork bookings
            console.log('\nStep 2: Archiving PaymentWork bookings...');
            const archiveResult = await this.archivePaymentWorkBookings(batchSize);
            
            if (!archiveResult.success) {
                console.error('❌ Failed to archive PaymentWork bookings');
                return archiveResult;
            }
            
            console.log(`✅ Archived ${archiveResult.archivedCount} PaymentWork bookings`);
            
            return {
                success: true,
                restoredCount: restoreResult.restoredCount,
                archivedCount: archiveResult.archivedCount,
                message: `COMPLETE: Restored ${restoreResult.restoredCount} non-PaymentWork bookings and archived ${archiveResult.archivedCount} PaymentWork bookings`
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
     * Get detailed statistics
     */
    static async getArchiveStats() {
        try {
            const cutoffDate = this.calculateCutoffDate();
            const currentDate = new Date();
            
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
                BookingArchive.countDocuments({ workType: 'PaymentWork' }),
                
                // Total active bookings
                Booking.countDocuments({ archived: { $ne: true } }),
                
                // Total archived in Booking collection
                Booking.countDocuments({ archived: true })
            ]);
            
            return {
                currentDate: currentDate.toISOString(),
                currentMonth: currentDate.toLocaleString('default', { month: 'long' }),
                cutoffDate: cutoffDate.toISOString(),
                paymentWorkToArchive: stats[0],
                nonPaymentWorkToRestore: stats[1],
                paymentWorkAlreadyArchived: stats[2],
                activeBookings: stats[3],
                archivedInBookingCollection: stats[4],
                explanation: `If current month is ${currentDate.toLocaleString('default', { month: 'long' })}, only PaymentWork bookings created before ${cutoffDate.toLocaleDateString()} will be archived. Non-PaymentWork bookings will be restored.`
            };
            
        } catch (error) {
            console.error('Stats error:', error);
            return { error: error.message };
        }
    }
}

module.exports = ArchiveService;