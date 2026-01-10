// // controllers/archiveController.js
// const ArchiveService = require('../services/archiveService');
// const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
// const Booking = require('../Model/booking');
// const Driver = require('../Model/driver');
// const Provider = require('../Model/provider');
// const mongoose = require('mongoose');
// const BookingArchive = require('../Model/bookingArchive');

// /**
//  * Main archive function - handles both PaymentWork archiving and non-PaymentWork restoration
//  */
// exports.archiveOldData = asyncErrorHandler(async (req, res) => {
//     const { months = 3, batchSize = 1000 } = req.body;
    
//     if (months < 1) {
//         return res.status(400).json({
//             success: false,
//             message: 'Months must be at least 1'
//         });
//     }

//     // Use the cleanAndArchive method by default
//     const result = await ArchiveService.cleanAndArchive(months, batchSize);
    
//     if (result.success) {
//         res.status(200).json({
//             success: true,
//             restoredCount: result.restoredCount,
//             archivedCount: result.archivedCount,
//             message: result.message
//         });
//     } else {
//         res.status(500).json({
//             success: false,
//             message: 'Archive failed',
//             error: result.error
//         });
//     }
// });

// /**
//  * Get archived bookings with filtering
//  */
// exports.getArchivedBookings = asyncErrorHandler(async (req, res) => {
//     try {
//         const {
//             page = 1,
//             limit = 20,
//             search = '',
//             sortBy = 'archiveDate',
//             sortOrder = 'desc',
//             startDate,
//             endDate,
//             status,
//             workType,
//             serviceType
//         } = req.query;

//         const pageNum = parseInt(page);
//         const limitNum = parseInt(limit);
//         const skip = (pageNum - 1) * limitNum;

//         // Build search query
//         let query = {};

//         // Date range filter
//         if (startDate || endDate) {
//             query.archiveDate = {};
//             if (startDate) {
//                 query.archiveDate.$gte = new Date(startDate);
//             }
//             if (endDate) {
//                 query.archiveDate.$lte = new Date(endDate);
//             }
//         }

//         // Status filter
//         if (status) {
//             query.status = status;
//         }

//         // Work type filter
//         if (workType) {
//             query.workType = workType;
//         }

//         // Service type filter
//         if (serviceType) {
//             query.serviceType = serviceType;
//         }

//         // Text search across multiple fields
//         if (search) {
//             const searchRegex = new RegExp(search, 'i');
            
//             // First, find drivers matching the search
//             const drivers = await Driver.find({
//                 $or: [
//                     { name: searchRegex },
//                     { phone: searchRegex }
//                 ]
//             }).select('_id').lean();
            
//             const driverIds = drivers.map(d => d._id);
            
//             // Also check if search matches provider names
//             const providers = await Provider.find({
//                 $or: [
//                     { name: searchRegex },
//                     { companyName: searchRegex }
//                 ]
//             }).select('_id').lean();
            
//             const providerIds = providers.map(p => p._id);
            
//             // Build search query
//             query.$or = [
//                 { fileNumber: searchRegex },
//                 { customerName: searchRegex },
//                 { customerVehicleNumber: searchRegex },
//                 { location: searchRegex },
//                 { dropoffLocation: searchRegex },
//                 { mob1: searchRegex },
//                 { mob2: searchRegex },
//                 { 'company.name': searchRegex },
//                 { driver: { $in: driverIds } },
//                 { provider: { $in: providerIds } }
//             ];
//         }

//         // Build sort object
//         const sort = {};
//         sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

//         // Get total count for pagination
//         const total = await BookingArchive.countDocuments(query);

//         // Fetch with population
//         const bookings = await BookingArchive.find(query)
//             .populate({
//                 path: 'serviceType',
//                 select: 'serviceName'
//             })
//             .populate({
//                 path: 'driver',
//                 select: 'name phone',
//                 model: 'Driver',
//                 options: { allowNull: true }
//             })
//             .populate({
//                 path: 'provider',
//                 select: 'name companyName phone',
//                 model: 'Provider',
//                 options: { allowNull: true }
//             })
//             .populate({
//                 path: 'company',
//                 select: 'name'
//             })
//             .populate({
//                 path: 'showroom',
//                 select: 'name'
//             })
//             .select('+pickupImages +dropoffImages')
//             .sort(sort)
//             .skip(skip)
//             .limit(limitNum)
//             .lean();

//         // After population, check if drivers are still null and fallback to dummy fields
//         const processedBookings = bookings.map(booking => {
//             // If driver population failed but we have dummyDriverName, preserve it
//             if (!booking.driver && booking.dummyDriverName) {
//                 booking.driver = {
//                     name: booking.dummyDriverName,
//                     phone: booking.dummyDriverPhone || '-'
//                 };
//             }
            
//             // If provider population failed but we have dummyProviderName, preserve it
//             if (!booking.provider && booking.dummyProviderName) {
//                 booking.provider = {
//                     name: booking.dummyProviderName,
//                     companyName: booking.dummyProviderCompany || '-',
//                     phone: booking.dummyProviderPhone || '-'
//                 };
//             }
            
//             return booking;
//         });

//         console.log(`Found ${processedBookings.length} archived bookings`);
        
//         // Calculate pagination metadata
//         const totalPages = Math.ceil(total / limitNum);
//         const hasNextPage = pageNum < totalPages;
//         const hasPrevPage = pageNum > 1;

//         res.status(200).json({
//             success: true,
//             data: {
//                 bookings: processedBookings,
//                 pagination: {
//                     total,
//                     page: pageNum,
//                     limit: limitNum,
//                     totalPages,
//                     hasNextPage,
//                     hasPrevPage
//                 },
//                 filters: {
//                     search,
//                     startDate,
//                     endDate,
//                     status,
//                     workType,
//                     serviceType
//                 }
//             }
//         });

//     } catch (error) {
//         console.error('Error fetching archived bookings:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch archived bookings',
//             error: error.message
//         });
//     }
// });

// /**
//  * Get archive statistics by work type
//  */
// exports.getArchiveStatsByWorkType = asyncErrorHandler(async (req, res) => {
//     const { months = 3 } = req.query;
    
//     // Calculate cutoff date: everything before October if current month is January
//     const currentDate = new Date();
//     const currentMonth = currentDate.getMonth(); // 0 = January, 11 = December
//     const currentYear = currentDate.getFullYear();
    
//     // Create cutoff date
//     let cutoffDate;
    
//     if (currentMonth === 0) { // January
//         cutoffDate = new Date(currentYear - 1, 8, 1); // September 1st
//     } else {
//         cutoffDate = new Date();
//         cutoffDate.setMonth(cutoffDate.getMonth() - months);
//         cutoffDate.setDate(1);
//         cutoffDate.setHours(0, 0, 0, 0);
//     }
    
//     console.log(`Current month: ${currentMonth + 1}`);
//     console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
    
//     // Get statistics by workType
//     const statsByWorkType = await Booking.aggregate([
//         {
//             $match: {
//                 createdAt: { $lt: cutoffDate },
//                 $or: [
//                     { archived: { $exists: false } },
//                     { archived: false },
//                     { archived: null }
//                 ]
//             }
//         },
//         {
//             $group: {
//                 _id: "$workType",
//                 count: { $sum: 1 },
//                 oldest: { $min: "$createdAt" },
//                 newest: { $max: "$createdAt" }
//             }
//         },
//         {
//             $sort: { count: -1 }
//         }
//     ]);
    
//     // Get PaymentWork specific stats
//     const paymentWorkStats = await Booking.aggregate([
//         {
//             $match: {
//                 workType: "PaymentWork",
//                 createdAt: { $lt: cutoffDate },
//                 $or: [
//                     { archived: { $exists: false } },
//                     { archived: false },
//                     { archived: null }
//                 ]
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 count: { $sum: 1 },
//                 oldest: { $min: "$createdAt" },
//                 newest: { $max: "$createdAt" }
//             }
//         }
//     ]);
    
//     res.status(200).json({
//         success: true,
//         data: {
//             cutoffDate: cutoffDate.toISOString(),
//             currentMonth: currentDate.toLocaleString('default', { month: 'long' }),
//             monthsExcluded: getExcludedMonths(currentMonth),
//             statsByWorkType,
//             paymentWorkStats: paymentWorkStats[0] || { count: 0 },
//             explanation: `Only bookings with workType 'PaymentWork' and created before ${cutoffDate.toLocaleDateString()} will be archived`
//         }
//     });
// });

// /**
//  * Helper function to determine which months are excluded
//  */
// function getExcludedMonths(currentMonth) {
//     const months = [
//         'January', 'February', 'March', 'April', 'May', 'June',
//         'July', 'August', 'September', 'October', 'November', 'December'
//     ];
    
//     if (currentMonth === 0) { // January
//         return ['October', 'November', 'December'];
//     } else {
//         // For other months, exclude current month and previous 2 months
//         const excluded = [];
//         for (let i = 0; i < 3; i++) {
//             let monthIndex = currentMonth - i;
//             if (monthIndex < 0) monthIndex += 12;
//             excluded.push(months[monthIndex]);
//         }
//         return excluded;
//     }
// }

// /**
//  * Get basic archive statistics
//  */
// exports.getArchiveStats = asyncErrorHandler(async (req, res) => {
//     const [activeCount, archivedCount] = await Promise.all([
//         Booking.countDocuments({ archived: { $ne: true } }),
//         BookingArchive.countDocuments()
//     ]);

//     const oldestActive = await Booking.findOne({ archived: { $ne: true } })
//         .sort({ createdAt: 1 })
//         .select('createdAt');
    
//     res.status(200).json({
//         success: true,
//         data: {
//             activeBookings: activeCount,
//             archivedBookings: archivedCount,
//             oldestActiveDate: oldestActive?.createdAt,
//             totalStorage: activeCount + archivedCount
//         }
//     });
// });

// /**
//  * Debug archive query
//  */
// exports.debugArchiveQuery = asyncErrorHandler(async (req, res) => {
//     const { months = 3, limit = 10 } = req.query;
    
//     const debugInfo = await ArchiveService.debugArchiveQuery(
//         parseInt(months), 
//         parseInt(limit)
//     );
    
//     res.status(200).json({
//         success: true,
//         ...debugInfo
//     });
// });

// /**
//  * Verify archive status
//  */
// exports.verifyArchiveStatus = asyncErrorHandler(async (req, res) => {
//     const verification = await ArchiveService.verifyArchive();
    
//     res.status(200).json({
//         success: true,
//         ...verification
//     });
// });

// /**
//  * Force archive batch (PaymentWork only)
//  */
// exports.forceArchiveBatch = asyncErrorHandler(async (req, res) => {
//     const { months = 3, batchSize = 100 } = req.body;
    
//     console.log(`=== FORCE ARCHIVE BATCH (PaymentWork only) ===`);
    
//     // Calculate correct cutoff date
//     const currentDate = new Date();
//     const currentMonth = currentDate.getMonth();
//     let cutoffDate;
    
//     if (currentMonth === 0) { // January
//         cutoffDate = new Date(currentDate.getFullYear() - 1, 8, 1); // September 1st
//     } else {
//         cutoffDate = new Date();
//         cutoffDate.setMonth(cutoffDate.getMonth() - months);
//         cutoffDate.setDate(1);
//         cutoffDate.setHours(0, 0, 0, 0);
//     }
    
//     console.log(`Current month: ${currentMonth + 1}`);
//     console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
    
//     // Get a specific batch to debug - ONLY PaymentWork
//     const bookingsToArchive = await Booking.find({
//         $and: [
//             { 
//                 workType: "PaymentWork"
//             },
//             { 
//                 $or: [
//                     { archived: { $exists: false } },
//                     { archived: false },
//                     { archived: null }
//                 ]
//             },
//             { 
//                 createdAt: { $lt: cutoffDate } 
//             },
//             {
//                 $or: [
//                     { archivedAt: { $exists: false } },
//                     { archivedAt: null }
//                 ]
//             }
//         ]
//     })
//     .limit(batchSize)
//     .lean();
    
//     if (bookingsToArchive.length === 0) {
//         return res.status(200).json({
//             success: true,
//             message: 'No PaymentWork bookings found to archive',
//             found: 0
//         });
//     }
    
//     // Try to archive just this batch
//     const archiveDocs = bookingsToArchive.map(booking => {
//         const archiveDoc = { 
//             ...booking,
//             originalId: booking._id,
//             archiveDate: new Date(),
//             archived: true
//         };
//         delete archiveDoc._id;
//         return archiveDoc;
//     });
    
//     try {
//         // Insert into archive
//         await BookingArchive.insertMany(archiveDocs, { ordered: false });
        
//         // Update originals
//         const bookingIds = bookingsToArchive.map(b => b._id);
//         await Booking.updateMany(
//             { _id: { $in: bookingIds } },
//             { 
//                 $set: { 
//                     archived: true,
//                     archivedAt: new Date()
//                 }
//             }
//         );
        
//         res.status(200).json({
//             success: true,
//             message: `Force archived ${bookingsToArchive.length} PaymentWork bookings`,
//             archived: bookingsToArchive.length,
//             sample: bookingsToArchive.slice(0, 3).map(b => ({
//                 fileNumber: b.fileNumber,
//                 createdAt: b.createdAt,
//                 workType: b.workType,
//                 status: b.status
//             }))
//         });
        
//     } catch (error) {
//         console.error('Force archive error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message,
//             stack: error.stack
//         });
//     }
// });

// /**
//  * Move archived bookings
//  */
// exports.moveArchivedBookings = asyncErrorHandler(async (req, res) => {
//     const { batchSize = 500 } = req.body;
    
//     const result = await ArchiveService.moveArchivedToArchive(batchSize);
    
//     if (result.success) {
//         res.status(200).json({
//             success: true,
//             movedCount: result.movedCount,
//             message: result.message
//         });
//     } else {
//         res.status(500).json({
//             success: false,
//             message: 'Move failed',
//             error: result.error
//         });
//     }
// });

// /**
//  * Archive and move
//  */
// exports.archiveAndMove = asyncErrorHandler(async (req, res) => {
//     const { months = 3, batchSize = 500 } = req.body;
    
//     const result = await ArchiveService.archiveAndMoveOldBookings(months, batchSize);
    
//     if (result.success) {
//         res.status(200).json({
//             success: true,
//             archivedCount: result.archivedCount,
//             movedCount: result.movedCount,
//             message: result.message
//         });
//     } else {
//         res.status(500).json({
//             success: false,
//             message: 'Archive and move failed',
//             error: result.error
//         });
//     }
// });

// /**
//  * Get migration statistics
//  */
// exports.getMigrationStats = asyncErrorHandler(async (req, res) => {
//     const [activeCount, archivedCount, archiveCount] = await Promise.all([
//         Booking.countDocuments({ archived: { $ne: true } }),
//         Booking.countDocuments({ archived: true }),
//         BookingArchive.countDocuments()
//     ]);
    
//     // Find duplicate entries (same originalId in both collections)
//     const duplicateEntries = await BookingArchive.aggregate([
//         {
//             $group: {
//                 _id: "$originalId",
//                 count: { $sum: 1 }
//             }
//         },
//         {
//             $match: {
//                 count: { $gt: 1 }
//             }
//         }
//     ]);
    
//     res.status(200).json({
//         success: true,
//         data: {
//             activeBookings: activeCount,
//             archivedInOriginal: archivedCount,
//             inArchiveCollection: archiveCount,
//             totalBookings: activeCount + archivedCount + archiveCount,
//             duplicateEntries: duplicateEntries.length,
//             canMove: archivedCount > 0
//         }
//     });
// });

// /**
//  * Archive only PaymentWork bookings older than specified months
//  */
// exports.archivePaymentWorkBookings = asyncErrorHandler(async (req, res) => {
//     const { months = 3, batchSize = 1000 } = req.body;
    
//     if (months < 1) {
//         return res.status(400).json({
//             success: false,
//             message: 'Months must be at least 1'
//         });
//     }

//     const result = await ArchiveService.archiveOldBookings(months, batchSize);
    
//     if (result.success) {
//         res.status(200).json({
//             success: true,
//             archivedCount: result.archivedCount,
//             message: result.message
//         });
//     } else {
//         res.status(500).json({
//             success: false,
//             message: 'Archive failed',
//             error: result.error
//         });
//     }
// });

// /**
//  * Restore non-PaymentWork bookings from archive
//  */
// exports.restoreNonPaymentWorkBookings = asyncErrorHandler(async (req, res) => {
//     const { batchSize = 1000 } = req.body;
    
//     const result = await ArchiveService.restoreNonPaymentWorkBookings(batchSize);
    
//     if (result.success) {
//         res.status(200).json({
//             success: true,
//             restoredCount: result.restoredCount,
//             message: result.message
//         });
//     } else {
//         res.status(500).json({
//             success: false,
//             message: 'Restore failed',
//             error: result.error
//         });
//     }
// });

// /**
//  * Combined operation: Restore non-PaymentWork and archive PaymentWork
//  */
// exports.cleanAndArchive = asyncErrorHandler(async (req, res) => {
//     const { months = 3, batchSize = 1000 } = req.body;
    
//     const result = await ArchiveService.cleanAndArchive(months, batchSize);
    
//     if (result.success) {
//         res.status(200).json({
//             success: true,
//             restoredCount: result.restoredCount,
//             archivedCount: result.archivedCount,
//             message: result.message
//         });
//     } else {
//         res.status(500).json({
//             success: false,
//             message: 'Clean and archive failed',
//             error: result.error
//         });
//     }
// });

// /**
//  * Get detailed archive statistics
//  */
// exports.getDetailedStats = asyncErrorHandler(async (req, res) => {
//     const stats = await ArchiveService.getArchiveStats();
    
//     if (stats.error) {
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to get stats',
//             error: stats.error
//         });
//     }
    
//     res.status(200).json({
//         success: true,
//         data: stats
//     });
// });
// exports.moveAlreadyArchivedBookings = asyncErrorHandler(async (req, res) => {
//     const { batchSize = 1000 } = req.body;
    
//     const result = await ArchiveService.moveAlreadyArchivedBookings(batchSize);
    
//     if (result.success) {
//         res.status(200).json({
//             success: true,
//             movedCount: result.movedCount,
//             message: result.message
//         });
//     } else {
//         res.status(500).json({
//             success: false,
//             message: 'Move already archived failed',
//             error: result.error
//         });
//     }
// });
// controllers/archiveController.js
const ArchiveService = require('../services/archiveService');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const Booking = require('../Model/booking');
const BookingArchive = require('../Model/bookingArchive');

/**
 * Main endpoint: Restore non-PaymentWork, then archive PaymentWork
 */
exports.cleanAndArchive = asyncErrorHandler(async (req, res) => {
    const { batchSize = 1000 } = req.body;
    
    const result = await ArchiveService.cleanAndArchive(batchSize);
    
    if (result.success) {
        res.status(200).json({
            success: true,
            restoredCount: result.restoredCount,
            archivedCount: result.archivedCount,
            message: result.message
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Clean and archive failed',
            error: result.error
        });
    }
});

/**
 * Archive only PaymentWork bookings
 */
exports.archivePaymentWorkBookings = asyncErrorHandler(async (req, res) => {
    const { batchSize = 1000 } = req.body;
    
    const result = await ArchiveService.archivePaymentWorkBookings(batchSize);
    
    if (result.success) {
        res.status(200).json({
            success: true,
            archivedCount: result.archivedCount,
            message: result.message
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Archive failed',
            error: result.error
        });
    }
});

/**
 * Restore non-PaymentWork bookings
 */
exports.restoreNonPaymentWorkBookings = asyncErrorHandler(async (req, res) => {
    const { batchSize = 1000 } = req.body;
    
    const result = await ArchiveService.restoreNonPaymentWorkBookings(batchSize);
    
    if (result.success) {
        res.status(200).json({
            success: true,
            restoredCount: result.restoredCount,
            message: result.message
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Restore failed',
            error: result.error
        });
    }
});

/**
 * Get statistics
 */
exports.getArchiveStats = asyncErrorHandler(async (req, res) => {
    const stats = await ArchiveService.getArchiveStats();
    
    if (stats.error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to get stats',
            error: stats.error
        });
    }
    
    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get archived bookings for viewing
 */
exports.getArchivedBookings = asyncErrorHandler(async (req, res) => {
    try {
        const { page = 1, limit = 20, workType, search = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let query = {};
        
        if (workType) {
            query.workType = workType;
        }
        
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { fileNumber: searchRegex },
                { customerName: searchRegex },
                { customerVehicleNumber: searchRegex }
            ];
        }

        const total = await BookingArchive.countDocuments(query);
        
        const bookings = await BookingArchive.find(query)
            .sort({ archiveDate: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalPages = Math.ceil(total / limitNum);
        
        res.status(200).json({
            success: true,
            data: {
                bookings,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages
                }
            }
        });

    } catch (error) {
        console.error('Error fetching archived bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch archived bookings',
            error: error.message
        });
    }
});