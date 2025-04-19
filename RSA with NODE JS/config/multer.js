const multer = require('multer');

// Set up Multer storage
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images'); // Change to your desired directory
    },
    filename: function (req, file, cb) {
        const fileExtension = file.originalname.split('.').pop();
        const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + fileExtension;
        cb(null, uniqueFilename);
    }
  });

  var upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'|| file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG files are allowed.'));
        }
    }
  });

  module.exports = upload;