const mongoose = require('mongoose');

const NotesSchema = new mongoose.Schema({
    note: {
        type: String,
        required: true
    },
    writtenBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // refPath: "role",
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "Booking",
    },
    role: {
        type: String,
        required: true
    }
}, { timestamps: true })

module.exports = mongoose.model('Notes', NotesSchema)