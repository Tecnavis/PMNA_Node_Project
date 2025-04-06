const Attendance = require('../Model/attendance');
const { isSameDay, getMonthDateRange } = require('../utils/dateUtils');

//Controller for checkin staff
exports.checkIn = async (req, res) => {
    const { checkInLocation } = req.body
    const { id } = req.user
    try {

        if (!checkInLocation || !id) {
            return res.status(400).json({
                message: 'Staff ID and check-in location are required.'
            })
        }
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0); // Ensure UTC start time

        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        const isAlreadyCheckIn = await Attendance.findOne({
            staff: id,
            createdAt: { $gte: startOfDay, $lt: endOfDay }
        })

        console.log(isAlreadyCheckIn)
        if (isAlreadyCheckIn && isAlreadyCheckIn.length) {
            //This statments for checking already in checkIn
            const targetDate = new Date();
            const dbDate = new Date(isAlreadyCheckIn[0].createdAt);

            if (
                dbDate.getFullYear() === targetDate.getFullYear() &&
                dbDate.getMonth() === targetDate.getMonth() &&
                dbDate.getDate() === targetDate.getDate()
            ) {
                return res.status(400).json({
                    message: 'Staff already in checkIn.'
                })
            }
        }

        const attendance = await Attendance.create({
            staff: id,
            checkInLocation
        })
        res.status(201).json({
            message: "Check in successfull"
        })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}

exports.checkOut = async (req, res) => {
    const { checkOutLocation } = req.body;
    const { id } = req.params;

    try {
        if (!checkOutLocation || !id) {
            return res.status(400).json({ message: "Staff ID and check-out location are required." });
        }

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0); // Ensure UTC start time

        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Find today's attendance record for the staff member
        const todayAttendance = await Attendance.findOne({
            staff: id,
            createdAt: { $gte: startOfDay, $lt: endOfDay }
        })
        console.log(todayAttendance, "for  checkout")
        // Ensure attendance exists and is from today
        if (!todayAttendance || !isSameDay(new Date(todayAttendance.createdAt), new Date())) {
            return res.status(404).json({ message: "No attendance record found for today." });
        }

        // Ensure check-out is after check-in
        if (todayAttendance.checkOut) {
            return res.status(400).json({ message: "Check-out already recorded." });
        }

        // Update check-out details
        todayAttendance.checkOutLocation = checkOutLocation;
        todayAttendance.checkOut = new Date();

        await todayAttendance.save();

        return res.status(200).json({
            message: "Check-out successful",
            attendance: todayAttendance
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
};
// Controller: Get full staff attendance
exports.getAllStaffAttendance = async (req, res) => {
    const { month, year } = req.query
    const { startDate, endDate } = getMonthDateRange(month, year)
    try {

        const attendanceRecords = await Attendance.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: "staffs", // Ensure it matches your actual collection name
                    localField: "staff",
                    foreignField: "_id",
                    as: "staffDetails"
                }
            },
            {
                $unwind: "$staffDetails"
            },
            {
                $project: {
                    date: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
                    checkIn: 1,
                    checkOut: 1,
                    checkInLocation: 1,
                    checkOutLocation: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    staff: {
                        _id: "$staffDetails._id",
                        name: "$staffDetails.name",
                        email: "$staffDetails.email",
                        department: "$staffDetails.department",
                    }
                }
            },
            {
                $group: {
                    _id: "$date",
                    records: { $push: "$$ROOT" } // Group records under the same date
                }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    records: 1
                }
            },
            { $sort: { date: -1 } } // Sort records by date descending
        ]);

        return res.status(200).json({
            message: "Successfully fetched all attendance",
            data: attendanceRecords
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        });
    }
};

//Controller get full  attendance for staff
exports.getAttendanceForStaff = async (req, res) => {
    const { id } = req.params
    const { month, year } = req.query
    const { startDate, endDate } = getMonthDateRange(month, year)
    try {

        const attendance = await Attendance.find(
            {
                staff: id,
                createdAt: { $gte: startDate, $lte: endDate }
            }).sort({ createdAt: -1 })
            .populate('staff');

        return res.status(200).json({
            message: "Successfully fetched attendances",
            data: attendance
        })

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}

//Controller for admin checkin for staff 
exports.adminCheckInForStaff = async (req, res) => {
    const { checkInLocation } = req.body
    const { id } = req.params
    try {

        if (!checkInLocation || !id) {
            return res.status(400).json({
                message: 'Staff ID and check-in location are required.'
            })
        }

        const isAlreadyCheckIn = await Attendance.find({
            staff: id,
        }).sort({ createdAt: -1 }).limit(1)
        console.log(isAlreadyCheckIn);
        if (isAlreadyCheckIn && isAlreadyCheckIn.length) {
            //This statments for checking already in checkIn
            const targetDate = new Date();
            const dbDate = new Date(isAlreadyCheckIn[0].checkIn);

            if (
                dbDate.getFullYear() === targetDate.getFullYear() &&
                dbDate.getMonth() === targetDate.getMonth() &&
                dbDate.getDate() === targetDate.getDate()
            ) {
                return res.status(400).json({
                    message: 'Staff already in checkIn.'
                })
            }
        }

        const attendance = await Attendance.create({
            staff: id,
            checkInLocation
        })
        res.status(201).json({
            message: "Check in successfull"
        })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}