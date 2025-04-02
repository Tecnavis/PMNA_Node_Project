import React, { useEffect, useState } from 'react';
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { CiLogout } from "react-icons/ci";
import Swal from "sweetalert2";
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { DataTable } from 'mantine-datatable';
import { User } from '../Staff/Staff';
import { dateFormate, formattedTime, isSameDay } from '../../utils/dateUtils';


export interface AttendanceRecord {
    readonly _id: string;
    staff: User;
    checkInLocation: string;
    checkOutLocation?: string;
    checkIn: Date;
    checkOut?: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

interface Location {
    latitude: number | null,
    longitude: number | null
}
const StaffAttendance = () => {

    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [staff, setStaff] = useState<User | null>(null);
    const [location, setLocation] = useState<Location>({ latitude: null, longitude: null });

    const cols = [
        {
            accessor: 'staff.name',
            title: 'Staff Name',
        },
        {
            title: 'Check-in Time',
            accessor: 'checkIn',
            render: (record: AttendanceRecord) => `${dateFormate("" + record.checkIn)} at ${formattedTime("" + record.checkIn)}`
        },
        {
            title: 'Check-in Location',
            accessor: 'checkInLocation',
        },
        {
            title: 'Check-out Time',
            accessor: 'checkOut',
            render: (record: AttendanceRecord) => record.checkOut ? `${dateFormate("" + record.checkOut)} at ${formattedTime("" + record.checkOut)}` : "N/A"
        },
        {
            title: 'Check-out Location',
            accessor: 'checkOutLocation',
            render: (record: AttendanceRecord) => record.checkOutLocation || "N/A"
        },
    ]

    //Fetch this staff attendace records
    const fetchAttendanceRecors = async (id?: string) => {
        setIsLoading(true)
        try {
            if (staff?._id || id) {

                const res = axiosInstance.get(`/attendance/${staff?._id ? staff?._id : id}`);
                const data = (await res).data
                setAttendanceRecords(data.data)
            }
        } catch (error) {
            console.error(error, 'error fetching the attendance records.')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchStaffData = async () => {
        try {
            const res = await axiosInstance.get(`/staff/id`)
            setStaff(res.data)
            fetchAttendanceRecors(res?.data?._id || '')
        } catch (error: any) {
            console.error(error.message, 'error fetching staff data')
        }
    }

    //fetch user acutal location for checkin and checkout
    const getLocations = (): Promise<Location> => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    setLocation((prev) => ({
                        ...prev,
                        latitude,
                        longitude
                    }));

                    resolve({ latitude, longitude });
                },
                (error) => {
                    console.error("Geolocation error:", error.message);
                    reject(error);
                },
                { enableHighAccuracy: true }
            );
        });
    };

    //update today attendance as check-in
    const handleCheckIn = async () => {
        try {
            const { latitude, longitude } = await getLocations();

            if (!latitude || !longitude) {
                throw new Error("Location not available");
            }

            const res = await axiosInstance.post(`/attendance/`, {
                checkInLocation: `${latitude}, ${longitude}`
            });

            Swal.fire({
                title: "Check-in Successful!",
                text: "Your attendance has been recorded.",
                icon: "success",
                confirmButtonText: "OK",
            });

            fetchAttendanceRecors();
        } catch (error: any) {
            console.error(error.message);

            Swal.fire({
                title: "Error!",
                text: error.response?.data?.message || "Something went wrong!",
                icon: "error",
                confirmButtonText: "OK",
            });
        }
    };

    const handleCheckOut = async () => {
        try {
            const { latitude, longitude } = await getLocations();
            if (!latitude || !longitude) {
                throw new Error("Location not available");
            }

            const res = await axiosInstance.patch(`/attendance/${attendanceRecords[0]._id}`, {
                checkOutLocation: `${latitude}, ${longitude}`
            });

            Swal.fire({
                title: "Check-out Successful!",
                text: "Your attendance has been recorded.",
                icon: "success",
                confirmButtonText: "OK",
            });

            fetchAttendanceRecors();
        } catch (error: any) {
            console.error(error.message);

            Swal.fire({
                title: "Error!",
                text: error.response?.data?.message || "Something went wrong!",
                icon: "error",
                confirmButtonText: "OK",
            });
        }
    };

    const hasCheckedInToday = attendanceRecords.some(record =>
        isSameDay(new Date(record.createdAt), new Date()) && record.checkIn
    );
    const hasCheckedOutToday = attendanceRecords.some(record =>
        isSameDay(new Date(record.createdAt), new Date()) && record.checkOut
    );

    const handleAttendance = async () => {
        if (hasCheckedInToday && !hasCheckedOutToday) {
            await handleCheckOut();
        } else if (!hasCheckedInToday) {
            await handleCheckIn();
        }
    };

    useEffect(() => {
        fetchStaffData()
    }, [])

    return <main className='flex flex-col justify-center items-center gap-5 pt-5 px-3'>
        <div>
            <h2 className='text-3xl font-bold text-gray-700'>Attendance</h2>
        </div>
        <div className='w-full'>
            <div className="mb-5 flex items-center justify-center w-full">
                <div className="w-full shadow-[4px_6px_10px_-3px_#bfc9d4] rounded-lg border border-white-light dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none p-5">
                    <div className="text-center flex flex-col items-center justify-center gap-1">
                        <div className="mb-5 w-20 h-20 rounded-full overflow-hidden mx-auto border border-blue-500">
                            <img src={`${BASE_URL}/images/${staff?.image}`} alt="profile" className="w-full h-full object-cover" />
                        </div>
                        <h5 className=" text-[17px] font-semibold mb-2">{staff?.name}</h5>
                        <div className='flex items-center justify-center gap-2'>
                            <span className='font-bold text-gray-700 text-start'>Email:</span>
                            <span>{staff?.email}</span>
                        </div>
                        <div className='flex items-center justify-center gap-2'>
                            <span className='font-bold text-gray-700 text-start'>Phone:</span>
                            <span>{staff?.phone}</span>
                        </div>
                        <div className='flex items-center justify-center gap-2'>
                            <span className='font-bold text-gray-700'>Role:</span>
                            <span>{staff?.role.name}</span>
                        </div>
                        <div className='flex items-center justify-center gap-2'>
                            <span className='font-bold text-gray-700'>Staff Role:</span>
                            <span>{staff?.role.name}</span>
                        </div>
                        <div className='flex items-center justify-center gap-2'>
                            <span className='font-bold text-gray-700'>Address:</span>
                            <span>{staff?.address}</span>
                        </div>
                        <button
                            onClick={handleAttendance}
                            className={`btn ${hasCheckedInToday && !hasCheckedOutToday ? 'bg-green-500 text-white' : 'btn-primary'} my-2 flex items-center justify-center`}
                        >
                            {hasCheckedInToday && !hasCheckedOutToday ? "Check Out" : "Check In"}
                            <IoIosCheckmarkCircleOutline className="text-primary bg-white rounded-full mx-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className='w-full '>
            <h2 className='text-3xl font-bold text-gray-700 text-center mb-10'>Attendance Records</h2>
            <div className='bg-white w-full shadow-[4px_6px_10px_-3px_#bfc9d4] rounded-lg border  dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none p-5 mt-3'>
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
                    records={attendanceRecords ?? []}
                />
            </div>
        </div>
    </main>;
}


export default StaffAttendance;