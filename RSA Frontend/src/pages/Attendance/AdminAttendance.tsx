import React, { useEffect, useState } from 'react';
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import Swal from "sweetalert2";
import { axiosInstance } from '../../config/axiosConfig';
import { DataTable } from 'mantine-datatable';
import { User } from '../Staff/Staff';
import { dateFormate, formattedTime, isSameDay } from '../../utils/dateUtils';
import { AttendanceRecord } from './StaffAttendance';
import { MONTHS_NUMBER, YEARS_FOR_FILTER } from '../Reports/constant';
import Dropdown from '../../components/Dropdown';
import { useSelector } from 'react-redux';
import { IRootState } from '../../store';

interface AdminAttendanceRecord {
    records: AttendanceRecord[];
    date: string;
}

interface Location {
    latitude: number | null;
    longitude: number | null;
}

type AttendanceStatus = "NotCheckIn" | "checkIn" | "FullDay";

const AdminAttendance = () => {
    const [attendanceRecords, setAttendanceRecords] = useState<AdminAttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [staffs, setStaffs] = useState<User[]>([]);
    const [attendanceStatus, setAttendanceStatus] = useState<Record<string, AttendanceStatus>>({});
    // state for filter attendance 
    const today = new Date()
    const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;


    const cols = [
        {
            accessor: 'staff.name',
            title: 'Staff Name',
        },
        {
            title: 'Check-in Time',
            accessor: 'checkIn',
            render: (record: AttendanceRecord) => record.checkIn
                ? `${dateFormate(String(record.checkIn))} at ${formattedTime(String(record.checkIn))}`
                : "N/A"
        },
        {
            title: 'Check-in Location',
            accessor: 'checkInLocation',
            render: (record: AttendanceRecord) =>
                record.checkInLocation
                    ? (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.checkInLocation)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                        >
                            {record.checkInLocation}
                        </a>
                    )
                    : "N/A"
        },
        {
            title: 'Check-out Time',
            accessor: 'checkOut',
            render: (record: AttendanceRecord) => record.checkOut
                ? `${dateFormate(String(record.checkOut))} at ${formattedTime(String(record.checkOut))}`
                : "N/A"
        },
        {
            title: 'Check-out Location',
            accessor: 'checkOutLocation',
            render: (record: AttendanceRecord) =>
                record.checkOutLocation
                    ? (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.checkOutLocation)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                        >
                            {record.checkOutLocation}
                        </a>
                    )
                    : "N/A"
        },
    ];

    const fetchAttendanceRecords = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get('/attendance/', {
                params: {
                    year: selectedYear,
                    month: selectedMonth,
                }
            });
            setAttendanceRecords(res.data.data);
            return res.data.data;
        } catch (error) {
            console.error('Error fetching attendance records:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStaffsData = async () => {
        try {
            const res = await axiosInstance.get('/staff');
            setStaffs(res.data);
            return res.data;
        } catch (error: any) {
            console.error('Error fetching staff data:', error.message);
            throw error;
        }
    };

    const getLocations = (): Promise<Location> => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }),
                (error) => {
                    console.error("Geolocation error:", error.message);
                    reject(error);
                },
                { enableHighAccuracy: true }
            );
        });
    };

    const calculateAttendanceStatus = (staffList: User[], records: AdminAttendanceRecord[]) => {
        const today = new Date();
        const statusMap: Record<string, AttendanceStatus> = {};

        staffList.forEach((staff) => {
            let status: AttendanceStatus = "NotCheckIn";

            // Find all records for this staff member for today
            const todayRecords = records.flatMap(dayRecord =>
                dayRecord.records.filter(record =>
                    record.staff._id === staff._id &&
                    isSameDay(new Date(record.createdAt), today)
                )
            );

            if (todayRecords.length > 0) {
                const latestRecord = todayRecords[todayRecords.length - 1];
                if (latestRecord.checkIn && latestRecord.checkOut) {
                    status = "FullDay";
                } else if (latestRecord.checkIn) {
                    status = "checkIn";
                }
            }

            statusMap[staff._id] = status;
        });

        return statusMap;
    };

    const handleCheckIn = async (staffId: string) => {
        try {
            const { latitude, longitude } = await getLocations();
            if (!latitude || !longitude) {
                throw new Error("Location not available");
            }

            await axiosInstance.post(`/attendance/admin-check-in/${staffId}`, {
                checkInLocation: `${latitude}, ${longitude}`
            });

            Swal.fire({
                title: "Success!",
                text: "Check-in recorded successfully",
                icon: "success",
                confirmButtonText: "OK",
            });

            await refreshData();
        } catch (error: any) {
            Swal.fire({
                title: "Error!",
                text: error.response?.data?.message || "Check-in failed",
                icon: "error",
                confirmButtonText: "OK",
            });
        }
    };

    const handleCheckOut = async (staffId: string) => {
        try {
            const { latitude, longitude } = await getLocations();
            if (!latitude || !longitude) {
                throw new Error("Location not available");
            }

            await axiosInstance.patch(`/attendance/${staffId}`, {
                checkOutLocation: `${latitude}, ${longitude}`
            });

            Swal.fire({
                title: "Success!",
                text: "Check-out recorded successfully",
                icon: "success",
                confirmButtonText: "OK",
            });

            await refreshData();
        } catch (error: any) {
            Swal.fire({
                title: "Error!",
                text: error.response?.data?.message || "Check-out failed",
                icon: "error",
                confirmButtonText: "OK",
            });
        }
    };

    const refreshData = async () => {
        try {
            const [staffData, recordsData] = await Promise.all([
                fetchStaffsData(),
                fetchAttendanceRecords()
            ]);
            const newStatus = calculateAttendanceStatus(staffData, recordsData);
            setAttendanceStatus(newStatus);
        } catch (error) {
            console.error("Error refreshing data:", error);
        }
    };

    const handleYear = (year: number) => setSelectedYear(year)
    const handleMonth = (month: number) => setSelectedMonth(month)

    useEffect(() => {
        refreshData();
    }, []);

    const renderStaffCard = (staff: User) => {
        const status = attendanceStatus[staff._id] || "NotCheckIn";

        const buttonConfig = {
            "NotCheckIn": {
                text: "Check In",
                className: "btn-primary",
                onClick: () => handleCheckIn(staff._id),
                disabled: false,
                showIcon: true
            },
            "checkIn": {
                text: "Check Out",
                className: "bg-green-500 text-white",
                onClick: () => handleCheckOut(staff._id),
                disabled: false,
                showIcon: true
            },
            "FullDay": {
                text: "Attendance Complete",
                className: "bg-gray-400 text-white cursor-not-allowed",
                onClick: () => { },
                disabled: true,
                showIcon: false
            }
        }[status];

        return (
            <div key={staff._id} className="w-full shadow-lg rounded-lg border border-white-light p-5">
                <div className="text-center flex flex-col items-center gap-1">
                    <h5 className="text-[17px] font-semibold mb-2">{staff.name || "N/A"}</h5>
                    <div className='flex items-center gap-2'>
                        <span className='font-bold text-gray-700'>Role:</span>
                        <span>{staff.role?.name || "N/A"}</span>
                    </div>
                    <button
                        onClick={buttonConfig.onClick}
                        className={`btn ${buttonConfig.className} my-2 flex items-center justify-center`}
                        disabled={buttonConfig.disabled}
                    >
                        {buttonConfig.text}
                        {buttonConfig.showIcon && (
                            <IoIosCheckmarkCircleOutline className="text-primary bg-white rounded-full mx-1" />
                        )}
                    </button>
                </div>
            </div>
        );
    };

    useEffect(() => {
        fetchAttendanceRecords()
    }, [selectedMonth, selectedYear])

    return (
        <main className='flex flex-col justify-center items-center gap-5 pt-5 px-3'>
            <div className='flex justify-between'>
                <h2 className='text-3xl font-bold text-gray-700 text-center mb-10'>Attendance Records</h2>
            </div>

            <div className='w-full'>
                <div className="mb-5 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-5 gap-3">
                    {staffs.map(renderStaffCard)}
                </div>
            </div>
            <div className='flex items-center justify-end w-full'>
                <div className="inline-flex mb-5 mr-2">
                    <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">{MONTHS_NUMBER[selectedMonth]}</button>
                    <div className="dropdown">
                        <Dropdown
                            placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                            btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light h-full"
                            button={<span className="sr-only">Filter by Month:</span>}
                        >
                            <ul className="!min-w-[170px]">
                                {Object.entries(MONTHS_NUMBER).map(([key, month]) => (
                                    <li key={key}>
                                        <button
                                            onClick={() => handleMonth(Number(key))} // Convert key to a number
                                            type="button"
                                            aria-label={`Select ${month}`} // Improves accessibility
                                        >
                                            {month}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Dropdown>
                    </div>
                </div>
                <div className="inline-flex mb-5 dropdown">
                    <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">{selectedYear}</button>
                    <Dropdown
                        placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                        btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light "
                        button={<span className="sr-only">All Years</span>}
                    >
                        <ul className="!min-w-[170px]">
                            {
                                YEARS_FOR_FILTER.map((year: number, index: number) => (
                                    <li key={index}>
                                        <button
                                            type="button"
                                            onClick={() => handleYear(year)}
                                        >
                                            {year}
                                        </button>
                                    </li>
                                ))
                            }
                        </ul>
                    </Dropdown>
                </div>
            </div>
            {/* Date wise staff's attendance records */}
            <div className='w-full'>
                {attendanceRecords.length < 1 ? (
                    <span className='text-center'>No attendance records</span>
                )
                    : (
                        attendanceRecords.map((attendance, index) => (
                            <React.Fragment key={index}>
                                <h2 className='text-xl font-bold text-gray-700 text-center bg-gray-200 py-2 rounded-lg'>
                                    {attendance.date}
                                </h2>
                                <div className='bg-white w-full shadow-[4px_6px_10px_-3px_#bfc9d4] rounded-lg border p-5 mt-1'>
                                    <DataTable
                                        fetching={isLoading}
                                        withColumnBorders
                                        highlightOnHover
                                        withBorder
                                        styles={{
                                            header: {
                                                fontWeight: 'bold',
                                                color: '#37415'
                                            }
                                        }}
                                        striped
                                        minHeight={300}
                                        columns={cols}
                                        records={attendance.records ?? []}
                                    />
                                </div>
                            </React.Fragment>
                        )))}
            </div>
        </main>
    );
};

export default AdminAttendance;