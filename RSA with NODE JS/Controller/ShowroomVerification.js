const Showroom = require('../Model/showroom');
const Verification = require('../Model/verification');
const Executive = require('../Model/executive');

const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const LoggerFactory = require('../utils/logger/LoggerFactory');

const { StatusCodes } = require('http-status-codes');
const { USER_TYPES } = require('../constants/fileConstants');
const { NotFoundError, BadRequestError } = require('../Middileware/errorHandler');
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

    const image = req.file.path;

    const showroom = await Showroom.findById(showroomId);
    if (!showroom) {
        throw new NotFoundError('Showroom Not found')
    };

    const executive = await Executive.findById(showroom.addedBy);
    if (!executive) {
        throw new NotFoundError('Executive Not found')
    };

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

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