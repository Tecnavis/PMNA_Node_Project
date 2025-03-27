const Notes = require("../Model/notes");

exports.addBookingNote = async (req, res) => {
    try {
        const { note, role, writtenBy } = req.body
        const { id } = req.params

        const newNote = await Notes.create({
            note,
            writtenBy: req.user.id,
            role,
            booking : id
        });
        console.log(newNote)
        if (newNote) {
            return res.status(201).json({
                message: "Note created successfully",
                data: newNote.note
            })
        }
    } catch (error) {
        console.error(error.message)
        return res.status(500).json(error.message)
    }
}

exports.getNotesForBooking = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: "Booking ID is required" });
        }

        const notes = await Notes.find({ booking: id });

        if (notes.length === 0) {
            return res.status(404).json({ message: "No notes found for this booking" });
        }

        return res.status(200).json({
            message: "Notes fetched successfully",
            data: notes
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
