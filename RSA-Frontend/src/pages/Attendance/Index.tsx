import React from 'react';
import AdminAttendance from '../../pages/Attendance/AdminAttendance';
import StaffAttendance from '../../pages/Attendance/StaffAttendance';

const AttendanceRoute = () => {
    const role = localStorage.getItem('role');
    return role === 'admin' || role === '' ? <AdminAttendance /> : <StaffAttendance />;
};

export default AttendanceRoute;
