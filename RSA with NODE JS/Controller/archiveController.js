// controllers/archiveController.js
const ArchiveService = require('../services/archiveService');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const Booking = require('../Model/booking'); // ADD THIS
const Driver = require('../Model/driver'); // ADD THIS
const Provider = require('../Model/provider'); // ADD THIS
const mongoose = require('mongoose');

const BookingArchive = require('../Model/bookingArchive'); // ADD THIS
exports.archiveOldData = asyncErrorHandler(async (req, res) => {
    const { months = 3, batchSize = 1000 } = req.body;
    
    if (months < 1) {
        return res.status(400).json({
            success: false,
            message: 'Months must be at least 1'
        });
    }

    const result = await ArchiveService.archiveOldBookings(months, batchSize);
    
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
// controllers/archiveController.js - Simplified version
exports.getArchivedBookings = asyncErrorHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            sortBy = 'archiveDate',
            sortOrder = 'desc',
            startDate,
            endDate,
            status,
            workType,
            serviceType
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build search query
        let query = {};

        // Date range filter
        if (startDate || endDate) {
            query.archiveDate = {};
            if (startDate) {
                query.archiveDate.$gte = new Date(startDate);
            }
            if (endDate) {
                query.archiveDate.$lte = new Date(endDate);
            }
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Work type filter
        if (workType) {
            query.workType = workType;
        }

        // Service type filter
        if (serviceType) {
            query.serviceType = serviceType;
        }

        // Text search across multiple fields
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            
            // First, find drivers matching the search
            const drivers = await Driver.find({
                $or: [
                    { name: searchRegex },
                    { phone: searchRegex }
                ]
            }).select('_id').lean();
            
            const driverIds = drivers.map(d => d._id);
             // Also check if search matches provider names
            const providers = await Provider.find({
                $or: [
                    { name: searchRegex },
                    { companyName: searchRegex }
                ]
            }).select('_id').lean();
            
            const providerIds = providers.map(p => p._id);
            
            
            // Build search query
            query.$or = [
                { fileNumber: searchRegex },
                { customerName: searchRegex },
                { customerVehicleNumber: searchRegex },
                { location: searchRegex },
                { dropoffLocation: searchRegex },
                { mob1: searchRegex },
                { mob2: searchRegex },
                     { 'company.name': searchRegex },
                { driver: { $in: driverIds } },
                { provider: { $in: providerIds } }
            ];
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Get total count for pagination
        const total = await BookingArchive.countDocuments(query);

        // IMPORTANT: First get the raw data without population to see what's stored
        const rawBookings = await BookingArchive.find(query)
            .select('fileNumber driver provider dummyDriverName dummyProviderName')
            .limit(5)
            .lean();
            
        console.log('=== DEBUG: Raw booking data (first 5) ===');
        rawBookings.forEach((booking, index) => {
            console.log(`Booking ${index + 1}:`, {
                fileNumber: booking.fileNumber,
                driver: booking.driver,
                provider: booking.provider,
                dummyDriverName: booking.dummyDriverName,
                dummyProviderName: booking.dummyProviderName,
                driverType: typeof booking.driver,
                driverIsObjectId: booking.driver instanceof mongoose.Types.ObjectId
            });
        });
        console.log('=== END DEBUG ===');

        // Now fetch with population
        const bookings = await BookingArchive.find(query)
            .populate({
                path: 'serviceType',
                select: 'serviceName'
            })
            .populate({
                path: 'driver',
                select: 'name phone',
                model: 'Driver',
                                options: { allowNull: true } // Allow null if driver doesn't exist

            })
            .populate({
                path: 'provider',
                select: 'name companyName phone',
                model: 'Provider',
                                options: { allowNull: true } // Allow null if provider doesn't exist

            })
            .populate({
                path: 'company',
                select: 'name'
            })
            .populate({
                path: 'showroom',
                select: 'name'
                 })
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();

        // After population, check if drivers are still null and fallback to dummy fields
        const processedBookings = bookings.map(booking => {
            // If driver population failed but we have dummyDriverName, preserve it
            if (!booking.driver && booking.dummyDriverName) {
                booking.driver = {
                    name: booking.dummyDriverName,
                    phone: booking.dummyDriverPhone || '-'
                };
            }
            
            // If provider population failed but we have dummyProviderName, preserve it
            if (!booking.provider && booking.dummyProviderName) {
                booking.provider = {
                    name: booking.dummyProviderName,
                    companyName: booking.dummyProviderCompany || '-',
                    phone: booking.dummyProviderPhone || '-'
                };
            }
            
            return booking;
        });

        console.log(`Found ${processedBookings.length} archived bookings`);
        if (processedBookings.length > 0) {
            console.log('First booking after processing:', {
                fileNumber: processedBookings[0].fileNumber,
                driver: processedBookings[0].driver,
                provider: processedBookings[0].provider,
                dummyDriverName: processedBookings[0].dummyDriverName
            });
        }
        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.status(200).json({
            success: true,
            data: {
                bookings: processedBookings, // Send processed bookings
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    hasNextPage,
                    hasPrevPage
                },
                filters: {
                    search,
                    startDate,
                    endDate,
                    status,
                    workType,
                    serviceType
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

// Helper function to get filter options
const getFilterOptions = async () => {
    const [statuses, workTypes, serviceTypes] = await Promise.all([
        BookingArchive.distinct('status'),
        BookingArchive.distinct('workType'),
        BookingArchive.distinct('serviceType')
    ]);

    return {
        statuses: statuses.filter(Boolean),
        workTypes: workTypes.filter(Boolean),
        serviceTypes: serviceTypes.filter(Boolean)
    };
};

exports.getArchiveStats = asyncErrorHandler(async (req, res) => {
    const [activeCount, archivedCount] = await Promise.all([
        Booking.countDocuments({ archived: { $ne: true } }),
        BookingArchive.countDocuments()
    ]);

    const oldestActive = await Booking.findOne({ archived: { $ne: true } })
        .sort({ createdAt: 1 })
        .select('createdAt');
    
    res.status(200).json({
        success: true,
        data: {
            activeBookings: activeCount,
            archivedBookings: archivedCount,
            oldestActiveDate: oldestActive?.createdAt,
            totalStorage: activeCount + archivedCount
        }
    });
});
// controllers/archiveController.js - ADD THESE METHODS
exports.debugArchiveQuery = asyncErrorHandler(async (req, res) => {
    const { months = 3, limit = 10 } = req.query;
    
    const debugInfo = await ArchiveService.debugArchiveQuery(
        parseInt(months), 
        parseInt(limit)
    );
    
    res.status(200).json({
        success: true,
        ...debugInfo
    });
});

exports.verifyArchiveStatus = asyncErrorHandler(async (req, res) => {
    const verification = await ArchiveService.verifyArchive();
    
    res.status(200).json({
        success: true,
        ...verification
    });
});

exports.forceArchiveBatch = asyncErrorHandler(async (req, res) => {
    const { months = 3, batchSize = 100 } = req.body;
    
    console.log(`=== FORCE ARCHIVE BATCH ===`);
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    // Get a specific batch to debug
    const bookingsToArchive = await Booking.find({
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
    })
    .limit(batchSize)
    .lean();
    
    if (bookingsToArchive.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No bookings found to archive',
            found: 0
        });
    }
    
    // Try to archive just this batch
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
    
    try {
        // Insert into archive
        await BookingArchive.insertMany(archiveDocs, { ordered: false });
        
        // Update originals
        const bookingIds = bookingsToArchive.map(b => b._id);
        await Booking.updateMany(
            { _id: { $in: bookingIds } },
            { 
                $set: { 
                    archived: true,
                    archivedAt: new Date()
                }
            }
        );
        
        res.status(200).json({
            success: true,
            message: `Force archived ${bookingsToArchive.length} bookings`,
            archived: bookingsToArchive.length,
            sample: bookingsToArchive.slice(0, 3).map(b => ({
                fileNumber: b.fileNumber,
                createdAt: b.createdAt,
                status: b.status
            }))
        });
        
    } catch (error) {
        console.error('Force archive error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});
// Add to controllers/archiveController.js
exports.moveArchivedBookings = asyncErrorHandler(async (req, res) => {
    const { batchSize = 500 } = req.body;
    
    const result = await ArchiveService.moveArchivedToArchive(batchSize);
    
    if (result.success) {
        res.status(200).json({
            success: true,
            movedCount: result.movedCount,
            message: result.message
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Move failed',
            error: result.error
        });
    }
});

exports.archiveAndMove = asyncErrorHandler(async (req, res) => {
    const { months = 3, batchSize = 500 } = req.body;
    
    const result = await ArchiveService.archiveAndMoveOldBookings(months, batchSize);
    
    if (result.success) {
        res.status(200).json({
            success: true,
            archivedCount: result.archivedCount,
            movedCount: result.movedCount,
            message: result.message
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Archive and move failed',
            error: result.error
        });
    }
});

exports.getMigrationStats = asyncErrorHandler(async (req, res) => {
    const [activeCount, archivedCount, archiveCount] = await Promise.all([
        Booking.countDocuments({ archived: { $ne: true } }),
        Booking.countDocuments({ archived: true }),
        BookingArchive.countDocuments()
    ]);
    
    // Find duplicate entries (same originalId in both collections)
    const duplicateEntries = await BookingArchive.aggregate([
        {
            $group: {
                _id: "$originalId",
                count: { $sum: 1 }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ]);
    
    res.status(200).json({
        success: true,
        data: {
            activeBookings: activeCount,
            archivedInOriginal: archivedCount,
            inArchiveCollection: archiveCount,
            totalBookings: activeCount + archivedCount + archiveCount,
            duplicateEntries: duplicateEntries.length,
            canMove: archivedCount > 0
        }
    });
});
// ------------------------------------------------------------------