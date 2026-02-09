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
    
    // Universal link
    const universalLink = `/staff/showroom/${showroom._id}`;
    
    // NEW: Download flow link for QR codes
    const downloadFlowUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/app/download-flow/${showroom._id}`;
    
    // Download links for different platforms
    const downloadLinks = {
        android: 'https://play.google.com/store/apps/details?id=com.yourcompany.rsastaff',
        ios: 'https://apps.apple.com/app/idYOUR_APP_ID',
        apkDirect: 'https://your-server.com/apps/rsa-staff-app.apk'
    };
    
    return {
        webLink,
        mobileDeepLink,
        universalLink,
        qrData: downloadFlowUrl, // Use download flow for QR codes
        downloadFlowUrl, // Add download flow URL
        downloadLinks // Add download links object
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