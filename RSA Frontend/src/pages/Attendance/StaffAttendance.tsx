import React, { useEffect, useState } from 'react';
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { CiLogout } from "react-icons/ci";
import Swal from "sweetalert2";
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { DataTable } from 'mantine-datatable';
import { User } from '../Staff/Staff';
import { dateFormate, formattedTime, isSameDay } from '../../utils/dateUtils';
import { useSelector } from 'react-redux';
import { IRootState } from '../../store';
import Dropdown from '../../components/Dropdown';
import { MONTHS, MONTHS_NUMBER, YEARS_FOR_FILTER } from '../Reports/constant';
import { CLOUD_IMAGE } from '../../constants/status';


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

export interface Location {
    latitude: number | null,
    longitude: number | null
}
const StaffAttendance = () => {

    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<string>('showCheckIn')
    const [staff, setStaff] = useState<User | null>(null);
    const [location, setLocation] = useState<Location>({ latitude: null, longitude: null });
    // state for filter attendance 
    const today = new Date()
    const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())
    
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;
    
    // Attendance table data's structure 
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
            render: (record: AttendanceRecord) =>
                record.checkInLocation
                    ? (
                        <span
                        >
                            {record.checkInLocation}
                        </span>
                    )
                    : "N/A"
        },
        {
            title: 'Check-out Time',
            accessor: 'checkOut',
            render: (record: AttendanceRecord) => record.checkOut ? `${dateFormate("" + record.checkOut)} at ${formattedTime("" + record.checkOut)}` : "N/A"
        },
        {
            title: 'Check-out Location',
            accessor: 'checkOutLocation',
            render: (record: AttendanceRecord) =>
                record.checkOutLocation
                    ? (
                        <span >
                            {record.checkOutLocation}
                        </span>
                    )
                    : "N/A"
        },
    ]

    // to find the current status of staff is present or not
    const findStatus = (records: AttendanceRecord[]) => {
        if (!records.length) {
            setStatus('showCheckIn'); // No records, default to check-in
            return;
        }

        // Get today's attendance record
        const todayRecord = records.find(record =>
            isSameDay(new Date(record.createdAt), new Date())
        );

        if (!todayRecord) {
            setStatus('showCheckIn'); // No check-in today
        } else if (todayRecord.checkIn && !todayRecord.checkOut) {
            setStatus('checkOut'); // Checked in, but not out
        } else if (todayRecord.checkIn && todayRecord.checkOut) {
            setStatus('showpresent'); // Checked in and out
        }
    };

    //Fetch this staff attendace records
    const fetchAttendanceRecors = async (id?: string) => {
        setIsLoading(true)
        try {
            if (staff?._id || id) {
                const res = axiosInstance.get(`/attendance/${staff?._id ? staff?._id : id}`, {
                    params: {
                        year: selectedYear,
                        month: selectedMonth,
                    }
                });
                const data = (await res).data
                setAttendanceRecords(data.data)
            }
        } catch (error) {
            console.error(error, 'error fetching the attendance records.')
        } finally {
            setIsLoading(false)
        }
    }

    //Fetch this staffs records
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
    
            const locationName = await getLocationName(latitude, longitude);
    
            await axiosInstance.post(`/attendance/`, {
                checkInLocation: locationName
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
    
    // handle checkout attendance
    const handleCheckOut = async () => {
        try {
            const { latitude, longitude } = await getLocations();
    
            if (!latitude || !longitude) {
                throw new Error("Location not available");
            }
    
            const locationName = await getLocationName(latitude, longitude);
    
            await axiosInstance.patch(`/attendance/${staff?._id}`, {
                checkOutLocation: locationName
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
    

    // status base attendance udpdate 
    const handleAttendance = async () => {
        if (status === 'checkOut') {
            await handleCheckOut();
        } else if (status === 'showCheckIn') {
            await handleCheckIn();
        }
    };

    const handleYear = (year: number) => setSelectedYear(year)
    const handleMonth = (month: number) => setSelectedMonth(month)

    useEffect(() => {
        fetchStaffData()
    }, [])

    useEffect(() => {
        findStatus(attendanceRecords);
    }, [attendanceRecords]);

    useEffect(() => {
        fetchAttendanceRecors(staff?._id)
    }, [selectedMonth, selectedYear])
    const getLocationName = async (lat: number, lon: number): Promise<string> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
            );
            const data = await response.json();
            return data.display_name || `${lat}, ${lon}`;
        } catch (error) {
            console.error("Error fetching location name:", error);
            return `${lat}, ${lon}`;
        }
    };
    
    return <main className='flex flex-col justify-center items-center gap-5 pt-5 px-3'>
        <div>
            <h2 className='text-3xl font-bold text-gray-700'>Attendance</h2>
        </div>
        <div className='w-full'>
            <div className="mb-5 flex items-center justify-center w-full">
                <div className="w-full shadow-[4px_6px_10px_-3px_#bfc9d4] rounded-lg border border-white-light dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none p-5">
                    <div className="text-center flex flex-col items-center justify-center gap-1">
                        <div className="mb-5 w-20 h-20 rounded-full overflow-hidden mx-auto border border-blue-500">
                            <img src={`${CLOUD_IMAGE}${staff?.image}`} alt="profile" className="w-full h-full object-cover" />
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
                            onClick={status === 'showpresent' ? undefined : handleAttendance}
                            disabled={status === 'showpresent'}
                            className={`btn ${status === 'checkOut'
                                ? 'bg-green-500 text-white'
                                : status === 'showpresent'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'btn-primary'
                                } my-2 flex items-center justify-center`}
                        >
                            {status === 'checkOut'
                                ? "Check Out"
                                : status === 'showpresent'
                                    ? "Attended"
                                    : "Check In"
                            }
                            {status !== 'showpresent' && (
                                <IoIosCheckmarkCircleOutline className="text-primary bg-white rounded-full mx-1" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className='w-full '>
            <div className='flex justify-between'>
                <h2 className='text-3xl font-bold text-gray-700 text-center mb-10'>Attendance Records</h2>
                <div>
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
                                <li><button type="button">All Years</button></li>
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
            </div>
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