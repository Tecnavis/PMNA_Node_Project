const Point = require("../Model/points")


exports.updatePoint = async (req, res) => {
    try {
        const { point } = req.body;
        const { id } = req.query;

        const pointData = await Point.findById(id);
        if (!pointData) return res.status(404).json({ error: 'Point not found' });

        pointData.bookingPoint = point

        await pointData.save();
        res.status(200).json(pointData);
    } catch (error) {
        console.error('Error updating point:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getPoint = async (req, res) => {
    try {
        const pointData = await Point.findOne();
        if (!pointData) return res.status(404).json({ error: 'Point not found' });
        res.status(200).json({ point: pointData });
    } catch (error) {
        console.error('Error updating driver:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Showroom Booking Points
exports.getShowroomBookingPoints = async (req, res) => {
    try {

        // Find showroom by showroomId
        const showroomPoints = await Point.findOne();

        if (!showroomPoints) {
            return res.status(404).json({ message: 'ShowroomPoints not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Showroom booking points retrieved successfully.',
            bookingPointsForShowroom: showroomPoints.showRoomBookingPoint,
            bookingPointsForShowroomStaff: showroomPoints.showRoomStaffBookingPoint,
            bookingPoints: showroomPoints.bookingPoint,
            _id: showroomPoints._id
        });
    } catch (error) {
        console.error('Error fetching booking points:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve showroom booking points.',
            error: error.message,
        });
    }
};

// Update Showroom Booking Points
exports.updateShowroomBookingPoints = async (req, res) => {
    try {
        const { showroomBookingPoints, showroomStaffBookingPoints } = req.body;

        // Create an update object dynamically
        const updateData = {};
        if (showroomBookingPoints !== undefined) updateData.showRoomBookingPoint = showroomBookingPoints;
        if (showroomStaffBookingPoints !== undefined) updateData.showRoomStaffBookingPoint = showroomStaffBookingPoints;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No valid fields provided for update." });
        }

        // Find and update showroom booking points
        const point = await Point.updateOne({},
            { $set: updateData },
            { new: true }
        );

        if (!point) {
            return res.status(404).json({ message: "Showroom not found." });
        }

        return res.status(200).json({
            success: true,
            message: "Showroom booking points updated successfully.",
            updatedData: point,
        });
    } catch (error) {
        console.error("Error updating booking points:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update showroom booking points.",
            error: error.message,
        });
    }
};