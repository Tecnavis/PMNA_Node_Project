const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// Cloudinary storage config
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads', // Optional folder in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png'],
        public_id: (req, file) => {
            const fileExtension = file.originalname.split('.').pop();
            return Date.now() + '-' + Math.round(Math.random() * 1E9); // Cloudinary will add the extension
        },
    },
});

// Custom multer middleware to simulate diskStorage 'filename' behavior
const customMulter = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG files are allowed.'));
        }
    },
});

// Patch `filename` field so controller logic remains unchanged
function patchFilenameField(req, res, next) {
    if (req.file) {
        req.file.filename = req.file.path.split('/').pop(); // simulate old filename field
    }
    if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
            file.filename = file.path.split('/').pop(); // simulate old filename field
        });
    }
    next();
}

module.exports = {
    single: (fieldName) => [customMulter.single(fieldName), patchFilenameField],
    array: (fieldName, maxCount) => [customMulter.array(fieldName, maxCount), patchFilenameField],
};
