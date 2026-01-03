const mongoose = require('mongoose');
const Booking = require('../Model/booking');
const BookingArchive = require('../Model/bookingArchive');

class ArchiveService {
   static async ensureArchivedField() {
    try {
        console.log('Ensuring all bookings have archived field...');
        
        const result = await Booking.updateMany(
            { archived: { $exists: false } },
            { $set: { archived: false } },
            { upsert: false }
        );
        
        console.log(`Ensured archived field exists for ${result.modifiedCount} documents`);
        return result;
    } catch (error) {
        console.error('Error ensuring archived field:', error);
        throw error;
    }
}

// services/archiveService.js - UPDATED
static async archiveOldBookings(months = 3, batchSize = 500) {
    // First ensure archived field exists
    await this.ensureArchivedField();
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    console.log(`=== ARCHIVE PROCESS STARTING ===`);
    console.log(`Current date: ${new Date().toISOString()}`);
    console.log(`Cutoff date (${months} months ago): ${cutoffDate.toISOString()}`);
    
    let archivedCount = 0;
    let batchNumber = 1;
    
    try {
        while (true) {
            // ✅ CRITICAL FIX: Query bookings OLDER than cutoff
            const bookingsToArchive = await Booking.find({
                archived: false, // Only not archived
                createdAt: { $lt: cutoffDate } // OLDER than cutoff (not newer!)
            })
            .limit(batchSize)
            .sort({ createdAt: 1 }) // Archive oldest first
            .lean();
            
            console.log(`Batch ${batchNumber}: Found ${bookingsToArchive.length} bookings to archive`);
            
            if (bookingsToArchive.length === 0) {
                console.log('✅ No more bookings to archive');
                break;
            }
            
            // Log first booking for debugging
            if (batchNumber === 1 && bookingsToArchive.length > 0) {
                console.log('Sample booking being archived:', {
                    fileNumber: bookingsToArchive[0].fileNumber,
                    createdAt: bookingsToArchive[0].createdAt,
                    daysOld: Math.floor((new Date() - new Date(bookingsToArchive[0].createdAt)) / (1000 * 60 * 60 * 24))
                });
            }
            
            // Prepare archive documents
            const archiveDocs = bookingsToArchive.map(booking => {
                const archiveDoc = { 
                    ...booking,
                    originalId: booking._id,
                    archiveDate: new Date(),
                    archived: true
                };
                delete archiveDoc._id;
                return archiveDoc;
            });
            
            // Insert into archive
            try {
                await BookingArchive.insertMany(archiveDocs, { ordered: false });
                console.log(`✅ Inserted ${archiveDocs.length} into booking_archive`);
            } catch (insertError) {
                console.error('Insert error:', insertError.message);
            }
            
            // Update original bookings
            const bookingIds = bookingsToArchive.map(b => b._id);
            const updateResult = await Booking.updateMany(
                { _id: { $in: bookingIds } },
                { 
                    $set: { 
                        archived: true,
                        archivedAt: new Date()
                    }
                }
            );
            
            console.log(`✅ Updated ${updateResult.modifiedCount} original bookings`);
            
            archivedCount += bookingsToArchive.length;
            console.log(`📊 Batch ${batchNumber} complete: Total archived ${archivedCount}`);
            
            batchNumber++;
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`=== ARCHIVE PROCESS COMPLETED ===`);
        console.log(`🎉 Successfully archived ${archivedCount} bookings`);
        
        return { 
            success: true, 
            archivedCount, 
            message: `Archived ${archivedCount} bookings older than ${months} months` 
        };
        
    } catch (error) {
        console.error('❌ Archive error:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}
    
    /**
     * DEBUG: Check what bookings would be archived
     */
    static async debugArchiveQuery(months = 3, limit = 10) {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        
        console.log(`=== DEBUG ARCHIVE QUERY ===`);
        console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
        console.log(`Months back: ${months}`);
        
        const query = {
            $and: [
                { 
                    $or: [
                        { archived: { $exists: false } },
                        { archived: false },
                        { archived: null }
                    ]
                },
                { 
                    createdAt: { $lt: cutoffDate } 
                },
                {
                    $or: [
                        { archivedAt: { $exists: false } },
                        { archivedAt: null }
                    ]
                }
            ]
        };
        
        console.log('Query being executed:', JSON.stringify(query, null, 2));
        
        // Count total matching documents
        const totalCount = await Booking.countDocuments(query);
        console.log(`Total bookings matching criteria: ${totalCount}`);
        
        // Get sample of what would be archived
        const sampleBookings = await Booking.find(query)
            .limit(limit)
            .select('fileNumber createdAt archived archivedAt status')
            .sort({ createdAt: 1 })
            .lean();
        
        console.log(`Sample of ${sampleBookings.length} bookings that would be archived:`);
        sampleBookings.forEach((booking, index) => {
            console.log(`${index + 1}. ${booking.fileNumber} - Created: ${booking.createdAt} - Archived: ${booking.archived} - Status: ${booking.status}`);
        });
        
        // Check oldest booking
        const oldestBooking = await Booking.findOne(query)
            .sort({ createdAt: 1 })
            .select('fileNumber createdAt')
            .lean();
            
        if (oldestBooking) {
            console.log(`Oldest booking to archive: ${oldestBooking.fileNumber} from ${oldestBooking.createdAt}`);
        }
        
        return {
            totalCount,
            sampleBookings,
            oldestBooking,
            cutoffDate,
            query
        };
    }
    
    /**
     * Verify archive status
     */
    static async verifyArchive() {
        console.log(`=== VERIFYING ARCHIVE STATUS ===`);
        
        // Check counts
        const [activeCount, archivedCount, totalArchived] = await Promise.all([
            Booking.countDocuments({ archived: { $ne: true } }),
            Booking.countDocuments({ archived: true }),
            BookingArchive.countDocuments()
        ]);
        
        console.log(`Active bookings (archived != true): ${activeCount}`);
        console.log(`Archived bookings (archived == true): ${archivedCount}`);
        console.log(`Total in archive collection: ${totalArchived}`);
        
        // Check for inconsistencies
        const inconsistentArchives = await Booking.find({
            archived: true,
            archivedAt: { $exists: false }
        }).limit(5).select('fileNumber').lean();
        
        if (inconsistentArchives.length > 0) {
            console.log(`Found ${inconsistentArchives.length} bookings marked archived but missing archivedAt`);
        }
        
        // Check archive collection for missing originalId
        const missingOriginalId = await BookingArchive.find({
            originalId: { $exists: false }
        }).limit(5).select('fileNumber').lean();
        
        if (missingOriginalId.length > 0) {
            console.log(`Found ${missingOriginalId.length} archive entries missing originalId`);
        }
        
        return {
            activeCount,
            archivedCount,
            totalArchived,
            inconsistentArchives: inconsistentArchives.length,
            missingOriginalId: missingOriginalId.length
        };
    }
    
    /**
     * Get archive statistics
     */
    static async getArchiveStats() {
        try {
            const [activeCount, archivedCount, archiveSize] = await Promise.all([
                Booking.countDocuments({ archived: { $ne: true } }),
                BookingArchive.countDocuments(),
                BookingArchive.estimatedDocumentCount()
            ]);
            
            const oldestActive = await Booking.findOne({ archived: { $ne: true } })
                .sort({ createdAt: 1 })
                .select('createdAt fileNumber')
                .lean();
            
            const newestArchived = await BookingArchive.findOne()
                .sort({ archiveDate: -1 })
                .select('archiveDate fileNumber')
                .lean();
            
            return {
                activeBookings: activeCount,
                archivedBookings: archivedCount,
                archiveSize,
                oldestActiveDate: oldestActive?.createdAt,
                oldestActiveFile: oldestActive?.fileNumber,
                latestArchiveDate: newestArchived?.archiveDate,
                latestArchivedFile: newestArchived?.fileNumber
            };
        } catch (error) {
            console.error('Error getting archive stats:', error);
            throw error;
        }
    }
    
    /**
     * Search in both active and archived bookings
     */
    static async searchBookings(searchCriteria, includeArchived = false) {
        try {
            // Always search active bookings first
            const activeQuery = { archived: { $ne: true }, ...searchCriteria };
            const activeResults = await Booking.find(activeQuery)
                .limit(100)
                .populate('driver provider company showroom')
                .lean();
            
            if (!includeArchived || activeResults.length >= 100) {
                return activeResults;
            }
            
            // If needed, search archived too
            const limitRemaining = 100 - activeResults.length;
            const archivedResults = await BookingArchive.find(searchCriteria)
                .limit(limitRemaining)
                .lean();
            
            // Mark archived results
            const markedArchived = archivedResults.map(doc => ({
                ...doc,
                archived: true,
                fromArchive: true
            }));
            
            return [...activeResults, ...markedArchived];
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }
    // services/archiveService.js - Add this method
static async hybridSearch(searchParams, options = {}) {
    const { includeArchived = false, limit = 50, page = 1 } = options;
    
    // Base query for active bookings
    let activeQuery = { archived: { $ne: true } };
    
    // Apply search params to active query
    Object.assign(activeQuery, searchParams);
    
    const skip = (page - 1) * limit;
    
    // Get active bookings
    const activeBookings = await Booking.find(activeQuery)
        .skip(skip)
        .limit(limit)
        .populate('driver provider company showroom')
        .lean();
    
    let results = activeBookings;
    let total = await Booking.countDocuments(activeQuery);
    
    // If including archived and we need more results
    if (includeArchived && activeBookings.length < limit) {
        const remainingLimit = limit - activeBookings.length;
        const archiveQuery = searchParams; // Same search params
        
        const archivedBookings = await BookingArchive.find(archiveQuery)
            .limit(remainingLimit)
            .lean();
        
        // Mark archived results
        const markedArchived = archivedBookings.map(doc => ({
            ...doc,
            archived: true,
            fromArchive: true
        }));
        
        results = [...activeBookings, ...markedArchived];
        const archivedCount = await BookingArchive.countDocuments(archiveQuery);
        total += archivedCount;
    }
    
    return {
        results,
        total,
        page,
        limit,
        hasArchived: results.some(r => r.archived),
        totalPages: Math.ceil(total / limit)
    };
}
// Add to services/archiveService.js
static async moveArchivedToArchive(batchSize = 500) {
    console.log('🚀 Starting to move archived bookings to archive collection...');
    
    let movedCount = 0;
    let batchNumber = 1;
    
    try {
        while (true) {
            // Find bookings marked as archived
            const archivedBookings = await Booking.find({
                archived: true,
                archivedAt: { $ne: null } // Only those properly archived
            })
            .limit(batchSize)
            .lean();
            
            console.log(`Batch ${batchNumber}: Found ${archivedBookings.length} archived bookings to move`);
            
            if (archivedBookings.length === 0) {
                console.log('✅ No more archived bookings to move');
                break;
            }
            
            // Check if already in archive
            const bookingIds = archivedBookings.map(b => b._id);
            const existingInArchive = await BookingArchive.find({
                originalId: { $in: bookingIds }
            }).select('originalId').lean();
            
            const existingIds = new Set(existingInArchive.map(b => b.originalId.toString()));
            
            // Filter out already archived
            const toMove = archivedBookings.filter(b => !existingIds.has(b._id.toString()));
            
            if (toMove.length === 0) {
                console.log(`All ${archivedBookings.length} bookings already in archive`);
                
                // Still delete from original if needed
                await Booking.deleteMany({ _id: { $in: bookingIds } });
                console.log(`Deleted ${archivedBookings.length} from original collection`);
                
                movedCount += archivedBookings.length;
                continue;
            }
            
            console.log(`Moving ${toMove.length} bookings to archive...`);
            
            // Prepare documents for archive
            const archiveDocs = toMove.map(booking => {
                const archiveDoc = { 
                    ...booking,
                    originalId: booking._id,
                    archiveDate: booking.archivedAt || new Date()
                };
                delete archiveDoc._id; // Let MongoDB create new _id
                return archiveDoc;
            });
            
            // Insert into archive
            try {
                await BookingArchive.insertMany(archiveDocs, { ordered: false });
                console.log(`✅ Inserted ${archiveDocs.length} into booking_archive`);
            } catch (insertError) {
                console.error('Insert error:', insertError.message);
                // Continue with next batch
            }
            
            // DELETE from original collection
            const idsToDelete = toMove.map(b => b._id);
            const deleteResult = await Booking.deleteMany({ _id: { $in: idsToDelete } });
            
            console.log(`🗑️  Deleted ${deleteResult.deletedCount} from bookings collection`);
            
            movedCount += toMove.length;
            console.log(`📊 Batch ${batchNumber} complete: Total moved ${movedCount}`);
            
            batchNumber++;
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`=== MOVE COMPLETED ===`);
        console.log(`🎉 Successfully moved ${movedCount} archived bookings to archive collection`);
        
        // Verify
        const remainingArchived = await Booking.countDocuments({ archived: true });
        const totalInArchive = await BookingArchive.countDocuments();
        
        console.log(`📊 Final counts:`);
        console.log(`  - Still in bookings (archived=true): ${remainingArchived}`);
        console.log(`  - Total in booking_archive: ${totalInArchive}`);
        
        return { 
            success: true, 
            movedCount, 
            message: `Moved ${movedCount} archived bookings to archive collection` 
        };
        
    } catch (error) {
        console.error('❌ Move failed:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Archive and Move in one operation
 */
static async archiveAndMoveOldBookings(months = 3, batchSize = 500) {
    console.log(`🚀 Starting archive AND move process...`);
    
    // Step 1: Archive old bookings
    const archiveResult = await this.archiveOldBookings(months, batchSize);
    
    if (!archiveResult.success) {
        return archiveResult;
    }
    
    console.log(`📊 Archive completed: ${archiveResult.archivedCount} bookings archived`);
    
    // Step 2: Move archived bookings to archive collection
    const moveResult = await this.moveArchivedToArchive(batchSize);
    
    if (!moveResult.success) {
        return moveResult;
    }
    
    console.log(`📊 Move completed: ${moveResult.movedCount} bookings moved`);
    
    return {
        success: true,
        archivedCount: archiveResult.archivedCount,
        movedCount: moveResult.movedCount,
        message: `Archived ${archiveResult.archivedCount} and moved ${moveResult.movedCount} bookings to archive`
    };
}
}

module.exports = ArchiveService;
// -------------------------------------------------------------