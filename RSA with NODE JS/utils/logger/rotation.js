const { createStream } = require('rotating-file-stream');
const path = require('path');

const rotationStream = createStream('app.log', {
    size: '10M', // Rotate every 10 MegaBytes written
    interval: '1d', // Rotate daily
    compress: 'gzip', // Compress rotated files
    path: path.join(__dirname, '../../../logs'),
});

module.exports = rotationStream;