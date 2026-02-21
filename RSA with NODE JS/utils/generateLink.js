// In utils/generateLink.js
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
    
    // Download flow link for QR codes
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const downloadFlowUrl = `${backendUrl}/app/download-flow/${showroom._id}`;
    
    // FIXED: Direct APK download link - use /downloads/ NOT /apps/
    const apkDownloadUrl = `${backendUrl}/downloads/rsa-staff.apk`;
    
    return {
        webLink,
        mobileDeepLink,
        universalLink,
        qrData: downloadFlowUrl, // Use download flow for QR codes
        downloadFlowUrl,
        apkDownloadUrl
    };
};