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
        let showroomPoints = await Point.findOne();
        if (!showroomPoints) {
            showroomPoints = await Point.create({}); // first run: start with zeros
        }

        return res.status(200).json({
            success: true,
            message: 'Showroom booking points retrieved successfully.',
            bookingPointsForShowroom: showroomPoints.showRoomBookingPoint,
            bookingPointsForShowroomStaff: showroomPoints.showRoomStaffBookingPoint,
            bookingPoints: showroomPoints.bookingPoint,
            driverBookingPoint: showroomPoints.driverBookingPoint || 0,
            executiveBookingPoint: showroomPoints.executiveBookingPoint || 0,
            executiveVisitPoint: showroomPoints.executiveVisitPoint || 0,
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
        const { showroomBookingPoints, showroomStaffBookingPoints, driverBookingPoint, executiveBookingPoint, executiveVisitPoint } = req.body;

        // Create an update object dynamically
        const updateData = {};
        const clean = (v) => {
            const n = Number(v);
            return Number.isFinite(n) && n >= 0 ? n : null;
        };
        if (showroomBookingPoints !== undefined) {
            if (clean(showroomBookingPoints) === null) return res.status(400).json({ message: 'Showroom points must be 0 or more.' });
            updateData.showRoomBookingPoint = clean(showroomBookingPoints);
        }
        if (showroomStaffBookingPoints !== undefined) {
            if (clean(showroomStaffBookingPoints) === null) return res.status(400).json({ message: 'Showroom staff points must be 0 or more.' });
            updateData.showRoomStaffBookingPoint = clean(showroomStaffBookingPoints);
        }

        for (const [key, value, label] of [
            ['driverBookingPoint', driverBookingPoint, 'Driver'],
            ['executiveBookingPoint', executiveBookingPoint, 'Executive booking'],
            ['executiveVisitPoint', executiveVisitPoint, 'Executive visit'],
        ]) {
            if (value === undefined) continue;
            if (clean(value) === null) return res.status(400).json({ message: `${label} points must be 0 or more.` });
            updateData[key] = clean(value);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No valid fields provided for update." });
        }

        // Find and update showroom booking points
        // upsert: works even if the settings record was never created
        const point = await Point.findOneAndUpdate({}, { $set: updateData }, { new: true, upsert: true });

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