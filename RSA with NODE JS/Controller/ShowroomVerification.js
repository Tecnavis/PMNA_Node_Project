const Showroom = require('../Model/showroom');
const Verification = require('../Model/verification');
const Executive = require('../Model/executive');

const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const LoggerFactory = require('../utils/logger/LoggerFactory');

const { StatusCodes } = require('http-status-codes');
const { USER_TYPES } = require('../constants/fileConstants');
const { NotFoundError, BadRequestError } = require('../Middileware/errorHandler');

function distanceMeters(lat1, lng1, lat2, lng2) {
    const r = (d) => (d * Math.PI) / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// Controller method to get verifications by showroom ID
exports.getVerificationsByShowroomId = asyncErrorHandler(async (req, res) => {
    const logger = LoggerFactory.createChildLogger({
        route: '/verification/showroom/:id',
        handler: 'getVerificationsByShowroomId',
    });

    const { id } = req.params;
    
    logger.info('Fetching verifications for showroom', { showroomId: id });

    // Find all verifications for this showroom
    const verifications = await Verification.find({ showroom: id })
        .populate('executive', 'name email phone')
        .populate('showroom', 'name location address')
        .populate('verificationAddedBy.user', 'name email')
        .sort({ verificationDate: -1 });

    if (!verifications || verifications.length === 0) {
        throw new NotFoundError('No verifications found for this showroom');
    }

    logger.info('Verifications fetched successfully', { 
        showroomId: id, 
        count: verifications.length 
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        data: verifications,
        message: "Verifications fetched successfully"
    });
});
// Controller for verify monthly showroom check by Marketing Executive or (admin, staff);
exports.verifyMonthlyVerification = asyncErrorHandler(async (req, res) => {

    const logger = LoggerFactory.createChildLogger({
        route: '/showroom/verification',
        handler: 'verifyMonthlyVerification',
    });

    const requestInfo = {
        showroomId: req.body.showroomId,
        doneBy: req.user?.id || 'unknown',
        ip: req.ip || 'unknown'
    };

    logger.info('Starting monthly showroom verification process', requestInfo);

    const {
        userType = USER_TYPES.MARKETING_EXEC,
        showroomId,
        accuracy,
    } = req.body;

    const longitude = parseFloat(req.body.longitude);
    const latitude = parseFloat(req.body.latitude);

    if (!req.file) {
        throw new BadRequestError('A photo of the showroom is required for the visit.');
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        throw new BadRequestError('Live location is required for the visit.');
    }
    const image = req.file.path;

    const showroom = await Showroom.findById(showroomId);
    if (!showroom) {
        throw new NotFoundError('Showroom Not found')
    };

    // An executive may only verify their own showrooms (admin / staff may verify any).
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'executive' && String(showroom.addedBy || '') !== String(req.user?.id || req.user?._id || '')) {
        return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'This showroom is not assigned to you.' });
    }

    const executive = await Executive.findById(showroom.addedBy);
    if (!executive) {
        throw new NotFoundError('Executive Not found')
    };

    // Must be at the showroom (when the showroom has a saved location).
    const saved = String(showroom.latitudeAndLongitude || '').split(',').map((x) => parseFloat(x));
    const maxDistance = Number(process.env.VISIT_MAX_DISTANCE_M) || 500;
    if (saved.length === 2 && saved.every(Number.isFinite) && !(saved[0] === 0 && saved[1] === 0)) {
        const distance = distanceMeters(saved[0], saved[1], latitude, longitude);
        if (distance > maxDistance) {
            throw new BadRequestError(`You are about ${Math.round(distance)} m from the showroom. Please verify at the showroom.`);
        }
    }

    // Calendar month in India time
    const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
    const currentMonthStart = new Date(`${ym}-01T00:00:00+05:30`);

    const existingVerification = await Verification.findOne({
        showroom: showroomId,
        executive: executive._id,
        verificationDate: { $gte: currentMonthStart }
    });

    if (existingVerification) {
        throw new BadRequestError("This showroom was already verified this month.")
    }

    const newVerification = new Verification({
        showroom: showroomId,
        executive: executive._id,
        geoTag: {
            coordinates: [longitude, latitude]
        },
        accuracy,
        image,
        verificationAddedBy: {
            user: req.user?.id || req.user?._id,
            userType
        }
    })

    await newVerification.save();

    logger.info('Showroom verification record created successfully', {
        ...requestInfo,
        verificationId: newVerification._id
    });

    return res.status(StatusCodes.CREATED).json({
        success: true,
        data: newVerification,
        message: "Verification added success"
    });
})