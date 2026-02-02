// utils/generateLink.js - Updated version without authService dependency
exports.generateShowRoomLink = (showroom) => {
    // For web dashboard (React) - using your existing web dashboard URL
    const webBaseUrl = `https://showroomstaff.rsakerala.com`;
    const webQueryParams = new URLSearchParams({
        id: showroom.id,
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
    const mobileDeepLink = `rsastaff://signIn?showroomId=${showroom.id}&name=${encodeURIComponent(showroom.name)}&location=${encodeURIComponent(showroom.location)}&image=${showroom.image || ''}&helpline=${showroom.helpline || ''}&phone=${showroom.phone || ''}&state=${showroom.state || ''}&district=${showroom.district || ''}`;
    
    return {
        webLink,        // For React dashboard
        mobileDeepLink, // For Flutter app
        qrData: mobileDeepLink // For QR code generation
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