const mongoose = require('mongoose');

const LeavesSchema = new mongoose.Schema({
    leaveDate: { type: Date },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
},
    { timestamps: true } // Correct placement of timestamps
);

module.exports = mongoose.model('Leaves', LeavesSchema);
