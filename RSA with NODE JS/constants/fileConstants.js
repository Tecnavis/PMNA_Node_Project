const allowedImageMimeTypes = [
    "image/jpg",
    "image/png",
    "image/jpeg",
    "image/webp",
];

const maxFileSize = 10 * 1024 * 1024; // 10MB (enforced in config/multer.js via MEDIA_MAX_UPLOAD_MB)

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

