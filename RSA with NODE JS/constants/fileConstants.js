const allowedImageMimeTypes = [
    "image/jpg",
    "image/png",
    "image/jpeg",
];

const maxFileSize = 5 * 1024 * 1024; // 5MB

const USER_TYPES = Object.freeze({
    ADMIN: 'Admin',
    STAFF: 'Staff',
    MARKETING_EXEC: 'MarketingExecutive',
    SHOWROOM: 'Showroom',
    SHOWROOM_STAFF: 'ShowroomStaff'
});

module.exports = {
    allowedImageMimeTypes,
    maxFileSize,
    USER_TYPES
};

