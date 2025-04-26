import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../store';
import ReactApexChart from 'react-apexcharts';
import { setPageTitle } from '../store/themeConfigSlice';
import axios from 'axios';
import { dateFormate } from '../utils/dateUtils';
import Swal from "sweetalert2";
import { VehicleRecord } from './VehicleDetails/VehicleCompliance';
import { BASE_URL } from '../config/axiosConfig';
import { ROLES } from '../constants/roles';

interface Record {
    type: string,
    expiryDate: string,
    vehicleNumber: string,
}

const Index = () => {

    const [blink, setBlink] = useState<boolean>(false);
    const [role, setRole] = useState<string>('');
    const [expiredRecords, setExpiredRecords] = useState<Record[]>([]);
    const [exceededRecords, setExceededRecords] = useState<VehicleRecord[]>([]);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const today = new Date()

    useEffect(() => {
        dispatch(setPageTitle('Sales Admin'));
    });

    useEffect(() => {
        const storedRole = localStorage.getItem('role');
        setRole(storedRole || '')
    }, [])

    // checking for token 
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedRole = localStorage.getItem('role');
        const navigateToLogin = () => navigate('/auth/boxed-signin');
        // Define the type of the role object
        interface Role {
            _id: string;
            name: string;
        }


        const fetchRole = async () => {
            try {
                const response = await axios.get<Role[]>(`${backendUrl}/role`); // Define the response type
                const roles = response.data;

                const userRole = roles.find((r: Role) => r._id === storedRole); // Type of 'r' is Role

                if (userRole) {
                    localStorage.setItem('role', userRole.name);
                    setRole(userRole.name)
                } else {
                    setRole('')
                }
            } catch (error) {
                console.error('Error fetching roles:', error);
            }
        };

        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            if (storedRole !== 'admin') {
                fetchRole();
            }
        } else {
            console.log('Token not found in localStorage');
            navigateToLogin();
        }
        fetchBookings()
        fetchServiceKmExceededVehicle()
    }, [navigate]);

    const [loading, setLoading] = useState(true);
    const [salesByCategory, setSalesByCategory] = useState({
        series: [0, 0, 0, 0],
        options: { /* Initial chart options */ }
    });

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const fetchBookings = async () => {

        const response = await axios.get(`${backendUrl}/dashboard`);
        const data = response.data.bookingData[0]
        setExpiredRecords(response.data.records)

        setBlink(data.newBookingsShowRoom.length > 0);

        setSalesByCategory({
            series: [data.newBookingsShowRoom, data.newBookingsOther, data.pendingBookings, data.completedBookings],
            options: {
                chart: {
                    type: 'donut',
                    height: 460,
                    fontFamily: 'Nunito, sans-serif',
                },
                dataLabels: {
                    enabled: false,
                },
                stroke: {
                    show: true,
                    width: 25,
                    colors: isDark ? '#0e1726' : '#fff',
                },
                colors: isDark ? ['#5c1ac3', '#e2a03f', '#e7515a', '#3182ce'] : ['#e2a03f', '#5c1ac3', '#e7515a', '#3182ce'],
                legend: {
                    position: 'bottom',
                    horizontalAlign: 'center',
                    fontSize: '14px',
                    markers: {
                        width: 10,
                        height: 10,
                        offsetX: -2,
                    },
                    height: 50,
                    offsetY: 20,
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '65%',
                            background: 'transparent',
                            labels: {
                                show: true,
                                name: {
                                    show: true,
                                    fontSize: '29px',
                                    offsetY: -10,
                                },
                                value: {
                                    show: true,
                                    fontSize: '26px',
                                    color: isDark ? '#bfc9d4' : undefined,
                                    offsetY: 16,
                                    formatter: (val: any) => {
                                        return val;
                                    },
                                },
                                total: {
                                    show: true,
                                    label: 'Total',
                                    color: '#888ea8',
                                    fontSize: '29px',
                                    formatter: (w: any) => {
                                        return w.globals.seriesTotals.reduce(function (a: any, b: any) {
                                            return a + b;
                                        }, 0);
                                    },
                                },
                            },
                        },
                    },
                },
                labels: ['ShowRoom Booking', 'Other New Bookings', 'Pending Bookings', 'Completed Bookings'],
                states: {
                    hover: {
                        filter: {
                            type: 'none',
                            value: 0.15,
                        },
                    },
                    active: {
                        filter: {
                            type: 'none',
                            value: 0.15,
                        },
                    },
                },
            }
        });
        setLoading(false);

    };

    const fetchServiceKmExceededVehicle = async () => {
        const res = await axios.get(`${BASE_URL}/vehicle/exceeded-service`)
        setExceededRecords(res.data.vehicles)
    }

    const handleDismissRecord = async (record: Record) => {
        try {
            const result = await Swal.fire({
                title: `Dismiss ${record.type} Expiry?`,
                text: `Are you sure you want to dismiss the ${record.type} expiry for vehicle ${record.vehicleNumber}?`,
                color: '#ffff',
                showCancelButton: true,
                confirmButtonColor: "#ef4444",
                cancelButtonColor: "#e5e7eb",
                confirmButtonText: "Yes, Dismiss it!"
            });

            if (!result.isConfirmed) return;

            const response = await axios.patch(`${backendUrl}/vehicle/compliance-record-dismiss`, {
                type: record.type,
                role,
                vehicleNumber: record.vehicleNumber
            });

            // Handle API response
            if (response.data) {
                fetchBookings()
                Swal.fire({
                    icon: 'success',
                    title: `${record.type} due for vehicle ${record.vehicleNumber}  dismissed successfully.`,
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
            } else {
                throw new Error(response.data.message || "Something went wrong");
            }

        } catch (error: any) {
            Swal.fire({
                title: "Error",
                text: error.message || "Failed to dismiss the record.",
                toast: true,
                icon: "error",
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        }
    }

    const handleDismissVehicleServiceKm = async (vehicle: VehicleRecord) => {
        try {
            const result = await Swal.fire({
                title: `Dismiss Service KM Exceeded?`,
                text: `Are you sure you want to dismiss the service KM exceeded status for vehicle ${vehicle.vehicleNumber}?`,
                color: '#ffff',
                showCancelButton: true,
                confirmButtonColor: "#ef4444",
                cancelButtonColor: "#e5e7eb",
                confirmButtonText: "Yes, Dismiss it!"
            });

            if (!result.isConfirmed) return;

            const response = await axios.put(`${backendUrl}/vehicle/${vehicle._id}/update-status`, {
                role
            });

            fetchServiceKmExceededVehicle(); // Refresh bookings or vehicle data
            // Handle API response
            if (response.data) {
                Swal.fire({
                    icon: 'success',
                    title: `Service KM exceeded status for vehicle ${vehicle.vehicleNumber} dismissed successfully.`,
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
            } else {
                throw new Error(response.data.message || "Something went wrong");
            }

        } catch (error: any) {
            Swal.fire({
                title: "Error",
                text: error.message || "Failed to dismiss the service KM exceeded status.",
                toast: true,
                icon: "error",
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        }
    };


    const compareDates = (dateString: string, currentDate: Date): boolean => {
        const dateObj = new Date(dateString);
        return dateObj > currentDate;
    };

    useEffect(() => {
        console.log(role, 'role')
    }, [role])

    return (
        <div className="container mx-auto p-6 bg-cover bg-center bg-no-repeat">
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Bookings</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="grid xl:grid-cols-1 gap-6 mb-6">
                    <div className="grid xl:grid-cols-4 gap-6 mb-6">
                        <div className={`panel bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-lg shadow-lg p-6 ${blink ? 'animate-pulse' : ''}`}>
                                <h5 className="font-semibold text-lg mb-3">ShowRoom Booking</h5>
                                <p className="text-2xl">{salesByCategory.series[0]}</p>
                        </div>
                        <div className="panel bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg shadow-lg p-6">
                            <h5 className="font-semibold text-lg mb-3">New Bookings</h5>
                            <p className="text-2xl">{salesByCategory.series[1]}</p>
                        </div>
                        <div className="panel bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-lg shadow-lg p-6">
                            <h5 className="font-semibold text-lg mb-3">Pending Bookings</h5>
                            <p className="text-2xl">{salesByCategory.series[2]}</p>
                        </div>
                        <div className="panel bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg shadow-lg p-6">
                            <h5 className="font-semibold text-lg mb-3">Completed Bookings</h5>
                            <p className="text-2xl">{salesByCategory.series[3]}</p>
                        </div>
                    </div>

                    {
                        expiredRecords?.map((record, index) => {
                            const bgColor =
                                record.type === "EMI" ? "bg-orange-500" :
                                    record.type === "Pollution" ? "bg-yellow-400" :
                                        record.type === "Insurance" ? "bg-white" :
                                            "bg-white";

                            return (
                                <div key={index} className="w-full gap-5">
                                    <div className={`w-full h-16 ${bgColor} rounded-xl flex items-center justify-between px-4 border-l-4 border-blue-500  shadow`}>
                                        {
                                            compareDates(record.expiryDate, today) ? (
                                                <span>
                                                    🔔 {record.type} for vehicle {record.vehicleNumber} will expire soon! Expiry Date: {dateFormate(record.expiryDate)}
                                                </span>
                                            ) : (
                                                new Date(record.expiryDate).getFullYear() === today.getFullYear() &&
                                                new Date(record.expiryDate).getMonth() === today.getMonth() &&
                                                new Date(record.expiryDate).getDate() === today.getDate()
                                            ) ? (
                                                <span>
                                                    🔔 {record.type} for vehicle {record.vehicleNumber} expires today! Expiry Date: {dateFormate(record.expiryDate)}
                                                </span>
                                            ) : (
                                                <span>
                                                    🔔 {record.type} for vehicle {record.vehicleNumber} is expired! Expiry Date: {dateFormate(record.expiryDate)}
                                                </span>
                                            )
                                        }
                                        {['', ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.VERIFIER].includes(role) && (
                                            <button
                                                className="bg-pink-500 text-white rounded-md py-2 px-3"
                                                onClick={() => handleDismissRecord(record)}
                                            >
                                                Dismiss
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    }
                    {
                        exceededRecords.map((vehicle, index) => (
                            <div key={index} className="w-full gap-5">
                                <div className={`w-full h-16  rounded-xl flex items-center justify-between px-4 border-l-4 border-blue-500  shadow`}>

                                    <span>
                                        🔔 Vehicle {vehicle.serviceVehicle} has exceeded the service limit ({vehicle.serviceKM} KM). Please service it soon!
                                    </span>
                                    <button
                                        className="bg-pink-500 text-white rounded-md py-2 px-3"
                                        onClick={() => handleDismissVehicleServiceKm(vehicle)}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))
                    }
                    <div className="panel h-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg">Bookings By Category</h5>
                            <div className="flex space-x-2 rtl:space-x-reverse">
                                <button className="bg-gray-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-gray-700">Refresh</button>
                                <button className="bg-gray-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-gray-700">Export</button>
                            </div>
                        </div>
                        <div>
                            <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                                {loading ? (
                                    <div className="min-h-[325px] grid place-content-center bg-white dark:bg-gray-900 dark:bg-opacity-[0.08]">
                                        <span className="animate-spin border-2 border-gray-300 dark:border-gray-700 !border-l-transparent rounded-full w-5 h-5 inline-flex"></span>
                                    </div>
                                ) : (
                                    <ReactApexChart series={salesByCategory.series} options={salesByCategory.options} type="donut" height={460} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Index;
