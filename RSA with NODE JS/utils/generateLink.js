// utils/generateLink.js
exports.generateShowRoomLink = (showroom) => {
    // For web dashboard (React)
    const webBaseUrl = process.env.STAFF_DASHBOARD_URL || 'https://showroomstaff.rsakerala.com';
    const webQueryParams = new URLSearchParams({
        id: showroom._id,
        name: showroom.name,
        location: showroom.location,
        image: showroom.image || '',
        helpline: showroom.helpline || '',
        phone: showroom.phone || '',
        state: showroom.state || '',
        district: showroom.district || '',
    }).toString();
    
    const webLink = `${webBaseUrl}/auth/cover-register?${webQueryParams}`;
    
    // For mobile app (Flutter) - Deep link
    const mobileDeepLink = `rsastaff://signIn?showroomId=${showroom._id}&name=${encodeURIComponent(showroom.name)}&location=${encodeURIComponent(showroom.location)}&image=${showroom.image || ''}&helpline=${showroom.helpline || ''}&phone=${showroom.phone || ''}&state=${showroom.state || ''}&district=${showroom.district || ''}`;
    
    // Universal link - use relative path since frontend already has backendUrl
    const universalLink = `/staff/showroom/${showroom._id}`;
    
    return {
        webLink,
        mobileDeepLink,
        universalLink,
        qrData: mobileDeepLink // Use mobile deep link for QR codes
    };
};

// Generate staff-specific link with token
exports.generateStaffLoginLink = async (staffId, showroomId) => {
    // Generate a simple token (you can use JWT if needed)
    const token = require('crypto').randomBytes(32).toString('hex');
    
    return {
        webLink: `https://showroomstaff.rsakerala.com/staff/login?token=${token}`,
        mobileDeepLink: `rsastaff://dashboard?staffId=${staffId}&showroomId=${showroomId}&token=${token}`,
        token: token
    };
};