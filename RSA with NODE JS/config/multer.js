/**
 * Image upload middleware — StackCP media storage (replaces multer-storage-cloudinary).
 *
 * Same API as before, so routes don't change:
 *   upload.single('image')        upload.array('images', 6)
 *
 * With a placement (see config/mediaPlacement.js) files are organised by date / case:
 *   upload.array('images', 6, bookingPhotos('pickup'))
 *     → bookings/2026/10/15/RSA-1234/pickup-20261015-143210-k3f9q2.jpg
 *
 * After it runs, each file has:
 *   file.filename  what controllers save in MongoDB:
 *                    "bookings/2026/10/15/RSA-1234/pickup-….jpg"   (with a placement)
 *                    "<id>.jpg"                                    (no placement → uploads/, old style)
 *   file.path      full public URL  ← executive / verification / admin QR save this
 *   file.key       path on StackCP
 *
 * Images are auto-rotated, shrunk to max 1600px and re-encoded (JPEG q80, PNG stays PNG
 * so QR codes stay crisp) before upload — phone photos drop from ~5 MB to ~300 KB.
 */
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const { BadRequestError } = require('../Middileware/errorHandler');
const { allowedImageMimeTypes } = require('../constants/fileConstants');
const media = require('../services/mediaStorage');
const { stamp, resolve } = require('./mediaPlacement');

// Keep libvips memory low on small Render instances.
sharp.cache(false);
sharp.concurrency(1);

const MAX_UPLOAD_BYTES = Number(process.env.MEDIA_MAX_UPLOAD_MB || 10) * 1024 * 1024;
const MAX_DIMENSION = Number(process.env.MEDIA_MAX_DIMENSION || 1600);
const JPEG_QUALITY = Number(process.env.MEDIA_JPEG_QUALITY || 80);

const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 10 },
    fileFilter(req, file, cb) {
        if (allowedImageMimeTypes.includes(file.mimetype)) return cb(null, true);
        cb(new BadRequestError('Invalid file type', [{
            field: file.fieldname,
            message: 'Only JPEG, JPG, PNG and WebP images are allowed',
        }]));
    },
});

function legacyName() {
    // Same shape as the old Cloudinary public_ids: <timestamp>-<9 digits>
    return `${Date.now()}-${crypto.randomInt(100000000, 1000000000)}`;
}

/** "pickup-20261015-143210-k3f9q2" — readable, sorts by time, never collides */
function organisedName(prefix) {
    const rand = crypto.randomBytes(4).toString('hex').slice(0, 6);
    const clean = String(prefix || 'image').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^[^A-Za-z0-9]+/, '').slice(0, 90) || 'image';
    return `${clean}-${stamp()}-${rand}`;
}

async function resolveTarget(req, placement, index) {
    if (!placement) return { folder: 'uploads', name: legacyName() };
    const folder = await resolve(placement.folder, req);
    const name = organisedName(await resolve(placement.prefix, req, index));
    if (!media.isValidFolder(folder)) throw new BadRequestError(`Invalid storage folder: ${folder}`);
    return { folder, name };
}

async function processImage(buffer, mimetype) {
    let pipeline;
    try {
        pipeline = sharp(buffer, { failOn: 'none' })
            .rotate() // apply EXIF orientation from phone cameras
            .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });
    } catch (err) {
        throw new BadRequestError('Could not read image');
    }

    try {
        if (mimetype === 'image/png') {
            return { buffer: await pipeline.png({ compressionLevel: 9 }).toBuffer(), mimetype: 'image/png' };
        }
        return {
            buffer: await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer(),
            mimetype: 'image/jpeg',
        };
    } catch (err) {
        throw new BadRequestError('Uploaded file is not a valid image');
    }
}

async function storeFile(file, req, placement, index) {
    const processed = await processImage(file.buffer, file.mimetype);
    const { folder, name } = await resolveTarget(req, placement, index);
    const result = await media.uploadBuffer(processed.buffer, {
        folder,
        name,
        mimetype: processed.mimetype,
    });

    // uploads/ keeps the old bare-name format; organised folders store the full key
    file.filename = folder === 'uploads' ? `${name}.${result.ext}` : result.key;
    file.path = result.url;
    file.key = result.key;
    file.size = processed.buffer.length;
    file.mimetype = processed.mimetype;
    file.buffer = undefined; // release memory early
    return file;
}

/** Push every received file to StackCP; if any fails, remove the ones that succeeded. */
const pushToMediaStorage = (placement) => (req, res, next) => {
    const files = req.file ? [req.file] : (Array.isArray(req.files) ? req.files : []);
    if (!files.length) return next();

    Promise.allSettled(files.map((file, index) => storeFile(file, req, placement, index))).then(async results => {
        const failed = results.find(r => r.status === 'rejected');
        if (!failed) return next();

        await Promise.all(results
            .filter(r => r.status === 'fulfilled')
            .map(r => media.deleteStoredImage(r.value.key)));
        next(failed.reason);
    });
};

function toHttpError(err) {
    if (err instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE: `Each image must be smaller than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`,
            LIMIT_FILE_COUNT: 'Too many files',
            LIMIT_UNEXPECTED_FILE: `Unexpected file field "${err.field}" or too many files`,
        };
        return new BadRequestError(messages[err.code] || err.message);
    }
    return err;
}

function wrap(multerMiddleware) {
    return (req, res, next) => multerMiddleware(req, res, err => (err ? next(toHttpError(err)) : next()));
}

/** Best-effort removal of an image by whatever value the DB holds. Never throws. */
const deleteImage = (value) => media.deleteStoredImage(value);

module.exports = {
    /** upload.single('image', placement?) */
    single: (fieldName, placement) => [wrap(memoryUpload.single(fieldName)), pushToMediaStorage(placement)],
    /** upload.array('images', 6, placement?) */
    array: (fieldName, maxCount, placement) => [wrap(memoryUpload.array(fieldName, maxCount)), pushToMediaStorage(placement)],
    deleteImage,
    // Old name kept so existing imports keep working (it was silently undefined before).
    deleteCloudinaryImage: deleteImage,
    processImage,
};
