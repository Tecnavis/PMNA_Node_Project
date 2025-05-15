const Verification = require('../Model/verification')

exports.setVerifiedShowroomsThisMonth = async (showrooms) => {
    if (!Array.isArray(showrooms) || showrooms.length === 0) {
        return showrooms;
    }

    const currentStartDate = new Date();
    currentStartDate.setDate(1);
    currentStartDate.setHours(0, 0, 0, 0);

    const showroomIds = showrooms.map(s => s._id);

    // Single query to get all verifications for these showrooms this month
    const verifications = await Verification.find({
        verificationDate: { $gte: currentStartDate },
        showroom: { $in: showroomIds }
    }).select('showroom -_id').lean();

    const verifiedShowroomIds = new Set(verifications.map(v => v.showroom.toString()));

    return showrooms.map(showroom => ({
        ...showroom.toObject ? showroom.toObject() : showroom,
        currentMonthVerified: verifiedShowroomIds.has(showroom._id.toString())
    }));
};