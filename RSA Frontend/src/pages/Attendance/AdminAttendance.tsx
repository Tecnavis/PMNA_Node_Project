import React, { useEffect, useState } from 'react';
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { CiLogout } from "react-icons/ci";
import Swal from "sweetalert2";
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { DataTable } from 'mantine-datatable';
import { User } from '../Staff/Staff';
import { dateFormate, formattedTime, isSameDay } from '../../utils/dateUtils';
import { AttendanceRecord } from './StaffAttendance'

interface AdminAttendanceRecord {
    records: Array<AttendanceRecord>;
    date: string
}

interface Location {
    latitude: number | null,
    longitude: number | null
}
interface AdminAttendance {
    attendanceStatus: Record<string, boolean>;
}

function AdminAttendance() {
    const [attendanceRecords, setAttendanceRecords] = useState<AdminAttendanceRecord[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [staffs, setStaffs] = useState<User[]>([]);
    const [location, setLocation] = useState<Location>({ latitude: null, longitude: null });
    const [attendanceStatus, setAttendanceStatus] = useState<Record<string, string>>({});

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
            const res = axiosInstance.get(`/attendance/`);
            const data = (await res).data
            setAttendanceRecords(data.data)
        } catch (error) {
            console.error(error, 'error fetching the attendance records.')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchStaffsData = async () => {
        try {
            const res = await axiosInstance.get(`/staff`)
            setStaffs(res.data)
            fetchAttendanceRecors(res?.data?._id || '')
            calculateAttendanceStatus(staffs)
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
    const handleCheckIn = async (id: string) => {
        try {
            const { latitude, longitude } = await getLocations();

            if (!latitude || !longitude) {
                throw new Error("Location not available");
            }

            const res = await axiosInstance.post(`/attendance/admin-check-in/${id}`, {
                checkInLocation: `${latitude}, ${longitude}`
            });

            Swal.fire({
                title: "Check-in Successful!",
                text: "Your attendance has been recorded.",
                icon: "success",
                confirmButtonText: "OK",
            });
            setAttendanceStatus((prev) => ({
                ...prev,
                [id]: "checkIn"
            }));
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

    const handleCheckOut = async (id: string) => {
        try {
            const { latitude, longitude } = await getLocations();
            if (!latitude || !longitude) {
                throw new Error("Location not available");
            }

            const res = await axiosInstance.patch(`/attendance/${id}`, {
                checkOutLocation: `${latitude}, ${longitude}`
            });

            Swal.fire({
                title: "Check-out Successful!",
                text: "Your attendance has been recorded.",
                icon: "success",
                confirmButtonText: "OK",
            });
            setAttendanceStatus((prev) => ({
                ...prev,
                [id]: "FullDay"
            }));
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

    const calculateAttendanceStatus = async (data: User[]) => {
        try {
            data?.forEach((staff) => {
                const todayRecord = attendanceRecords.find((rec) =>
                    rec?.records?.some((record: AttendanceRecord) =>
                        record?.staff?._id === staff?._id && isSameDay(new Date(record.createdAt), new Date())
                    )
                );

                let status = "NotCheckIn"; // Default status

                if (todayRecord) {
                    const record = todayRecord.records.find((r) => r?.staff?._id === staff?._id);
                    if (record?.checkIn) {
                        status = record.checkOut ? "FullDay" : "checkIn";
                    }
                }

                setAttendanceStatus((prev) => ({
                    ...prev,
                    [staff._id]: status,
                }));
            });
        } catch (error) {
            console.error("❌ Error in calculateAttendanceStatus:", error);
        }
    };


    useEffect(() => {
        fetchStaffsData()
    }, [])
    useEffect(() => {
        if (staffs.length > 0 && attendanceRecords.length > 0) {
            calculateAttendanceStatus(staffs);
        }
    }, [attendanceRecords, staffs]);

    return <main className='flex flex-col justify-center items-center gap-5 pt-5 px-3'>
        <div>
            <h2 className='text-3xl font-bold text-gray-700'>Attendance Records</h2>
        </div>
        <div className='w-full'>
            <div className="mb-5 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-5 gap-3">
                {staffs?.map((staff) => {
                    const status = attendanceStatus[staff._id] || "NotCheckIn"; // Extracted from state

                    // Determine button state and function
                    let buttonText = "Check In";
                    let onClickHandler = () => handleCheckIn(staff._id);
                    let buttonClass = "btn-primary";

                    if (status === "checkIn") {
                        buttonText = "Check Out";
                        onClickHandler = () => handleCheckOut(staff._id);
                        buttonClass = "bg-green-500 text-white";
                    } else if (status === "FullDay") {
                        buttonText = "Checked In";
                        onClickHandler = () => Promise.resolve();
                        buttonClass = "bg-gray-400 text-white cursor-not-allowed";
                    }

                    return (
                        <div key={staff._id} className="w-full shadow-lg rounded-lg border border-white-light dark:border-[#1b2e4b] dark:bg-[#191e3a] p-5">
                            <div className="text-center flex flex-col items-center gap-1">
                                <h5 className="text-[17px] font-semibold mb-2">{staff?.name || "N/A"}</h5>
                                <div className='flex items-center gap-2'>
                                    <span className='font-bold text-gray-700'>Role:</span>
                                    <span>{staff?.role.name || "N/A"}</span>
                                </div>
                                <button
                                    onClick={onClickHandler}
                                    className={`btn ${buttonClass} my-2 flex items-center justify-center`}
                                    disabled={status === "FullDay"} // Disable when full day
                                >
                                    {buttonText}
                                    <IoIosCheckmarkCircleOutline className="text-primary bg-white rounded-full mx-1" />
                                </button>
                            </div>
                        </div>
                    );
                })}

            </div>
        </div>
        {/* Date wise staff's attendance records */}
        <div className='w-full '>
            {attendanceRecords.map((attendance, index) => (<>
                <h2 className='text-xl font-bold text-gray-700 text-center bg-gray-200 py-2 rounded-lg'>{attendance.date}</h2>
                <div className='bg-white w-full shadow-[4px_6px_10px_-3px_#bfc9d4] rounded-lg border  dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none p-5 mt-1'>
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
            </>))}
        </div>
    </main>;
}

export default AdminAttendance
