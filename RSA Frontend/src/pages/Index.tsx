import { useEffect, useRef, useState } from 'react';
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
import AddVehicleCompliance from './VehicleDetails/addVehicleCompliance';
import BookingDashboard from './Bookings/BookingChart';
import { FaChartBar, FaTimes } from 'react-icons/fa';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { BarChart3, ChartBarIcon, X } from 'lucide-react';

interface Record {
    _id: string,
    type: string,
    expiryDate: string,
    vehicleNumber: string,
}

const Index = () => {

    const [blink, setBlink] = useState<boolean>(false);
    const [role, setRole] = useState<string>('');
    const [recordId, setRecordId] = useState<string>('');
    const [openRenewal, setOpenRenewal] = useState<boolean>(false);
    const [expiredRecords, setExpiredRecords] = useState<Record[]>([]);
    const [exceededRecords, setExceededRecords] = useState<VehicleRecord[]>([]);
    const [showBookingDashboard, setShowBookingDashboard] = useState<boolean>(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const [openCompilanceModalForDissmiss, setOpenCompilanceModalForDissmiss] = useState(false);
    const [pendingAlerts, setPendingAlerts] = useState<{type: 'showroom' | 'whatsapp', count: number}[]>([]);
    const [dismissRecordType, setDismissRecordType] = useState<string>('');
    const [dismissVehicleNumber, setDismissVehicleNumber] = useState<string>('');

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

    const [prevBookings, setPrevBookings] = useState({
        showroom: 0,
        whatsapp: 0
    });
    
    // Refs for audio elements
    const showroomAlertRef = useRef<HTMLAudioElement | null>(null);
    const whatsappAlertRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio elements
    useEffect(() => {
        showroomAlertRef.current = new Audio('/public/mixkit-signal-alert-771.wav');
        whatsappAlertRef.current = new Audio('/public/mixkit-signal-alert-771.wav');
        
        // Optional: Preload audio files
        showroomAlertRef.current.preload = 'auto';
        whatsappAlertRef.current.preload = 'auto';
        
        return () => {
            // Cleanup
            if (showroomAlertRef.current) {
                showroomAlertRef.current.pause();
                showroomAlertRef.current = null;
            }
            if (whatsappAlertRef.current) {
                whatsappAlertRef.current.pause();
                whatsappAlertRef.current = null;
            }
        };
    }, []);

    // Initialize audio elements with user interaction
    useEffect(() => {
        const handleUserInteraction = () => {
            setUserInteracted(true);
            // Play any pending alerts
            pendingAlerts.forEach(alert => {
                if (alert.type === 'showroom') {
                    playShowroomAlert();
                } else {
                    playWhatsappAlert();
                }
            });
            setPendingAlerts([]);
            
            // Remove event listeners after first interaction
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
        };

        // Add event listeners for user interaction
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('keydown', handleUserInteraction);
        document.addEventListener('touchstart', handleUserInteraction);

        return () => {
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
        };
    }, [pendingAlerts]);

    const fetchBookings = async () => {
        const response = await axios.get(`${backendUrl}/dashboard`);
        const data = response.data.bookingData[0];
        setExpiredRecords(response.data.records);

        // Check for new ShowRoom bookings
        if (data.newBookingsShowRoom > prevBookings.showroom) {
            setBlink(true);
            if (userInteracted) {
                playShowroomAlert();
            } else {
                setPendingAlerts(prev => [...prev, { type: 'showroom', count: data.newBookingsShowRoom }]);
            }
        } else if (data.newBookingsShowRoom === 0) {
            setBlink(false);
        }

        // Check for new WhatsApp bookings
        if (data.whatsappBooking > prevBookings.whatsapp) {
            if (userInteracted) {
                playWhatsappAlert();
            } else {
                setPendingAlerts(prev => [...prev, { type: 'whatsapp', count: data.whatsappBooking }]);
            }
        }

        // Update previous bookings state
        setPrevBookings({
            showroom: data.newBookingsShowRoom,
            whatsapp: data.whatsappBooking
        });
        setSalesByCategory({
            series: [data.newBookingsShowRoom, data.newBookingsOther, data.pendingBookings, data.completedBookings, data.whatsappBooking],
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
// Function to play ShowRoom booking alert
    const playShowroomAlert = () => {
        if (showroomAlertRef.current) {
            showroomAlertRef.current.currentTime = 0; // Reset to start
            showroomAlertRef.current.play().catch(error => {
                console.warn('ShowRoom alert play failed:', error);
            });
        }
    };

    // Function to play WhatsApp booking alert
    const playWhatsappAlert = () => {
        if (whatsappAlertRef.current) {
            whatsappAlertRef.current.currentTime = 0; // Reset to start
            whatsappAlertRef.current.play().catch(error => {
                console.warn('WhatsApp alert play failed:', error);
            });
        }
    };

    // Optional: Add manual trigger functions for testing
    const testShowroomAlert = () => {
        playShowroomAlert();
    };

    const testWhatsappAlert = () => {
        playWhatsappAlert();
    };
   // Example for your vehicle query
const fetchServiceKmExceededVehicle = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/vehicle/exceeded-service`, {
      timeout: 15000 // 15 second timeout
    });
    setExceededRecords(res.data.vehicles || []);
  } catch (error: any) {
    console.error('Fetch service km exceeded vehicle failed:', error);
    if(error?.response.status === 404){
        setExceededRecords([])
    }
  }
};
    
    const handleDismissRecord = async (record: Record) => {
        try {
            const result = await Swal.fire({
                title: `Dismiss ${record.type} Expiry?`,
                text: `Are you sure you want to dismiss the ${record.type} expiry for vehicle ${record.vehicleNumber}?`,
                color: '#ffff',
                showCancelButton: true,
                confirmButtonColor: "#ef4444",
                cancelButtonColor: "#e5e7eb",
                confirmButtonText: "Yes, Dismiss and update record."
            });

            if (!result.isConfirmed) {
                return
            } 
            await axios.patch(`${backendUrl}/vehicle/compliance-record-dismiss`, {
                    type: record.type,
                    vehicleNumber: record.vehicleNumber,
                    role,
                });
            
            Swal.fire({
                icon: 'success',
                title: `${record.type} dismissed successfully.`,
                toast: true,
                position: 'top',
                timer: 3000,
                showConfirmButton: false,
            });
            setRecordId(record._id);
            setDismissRecordType(record.type);
            setOpenCompilanceModalForDissmiss(true);
            setOpenRenewal(true);

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
            text: `This will update the vehicle status and mark all completed bookings as requiring service. Continue?`,
            color: '#ffff',
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#e5e7eb",
            confirmButtonText: "Yes, Dismiss it and update record"
        });
            
        if (!result.isConfirmed) return;

        setRecordId(vehicle?.recordId || '');
        setDismissRecordType("Service KM Exceeded");
        setDismissVehicleNumber(vehicle.serviceVehicle);
        setOpenCompilanceModalForDissmiss(true);
        setOpenRenewal(true);
    } catch (error: any) {
        Swal.fire({
            title: "Error",
            text: error.message || "Failed to update service status",
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

    const handleRenewal = (recordId: string) => {
        setRecordId(recordId)
        setOpenRenewal(true)
    }

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
 {/* Toggle Button for Booking Dashboard */}
    <div className="mb-6 flex justify-end">
    <button
        onClick={() => setShowBookingDashboard(!showBookingDashboard)}
        className="btn btn-primary flex items-center gap-2"
    >
        {showBookingDashboard ? (
            <>
                <X className="w-4 h-4" />
                <span>Hide Graph</span>
            </>
        ) : (
            <>
                <BarChart3 className="w-4 h-4" />
                <span>Show Graph</span>
            </>
        )}
    </button>
</div>
        {showBookingDashboard ? (
            // Show Booking Dashboard when toggled
            <div className="flex mb-6">
                <BookingDashboard />
            </div>
        ) : (
            <div className="pt-5">
                <div className="grid xl:grid-cols-1 gap-6 mb-6">
                    <div className="grid xl:grid-cols-4 gap-4 mb-6">
                        <div className={`panel bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-lg shadow-lg p-6  ${blink ? 'animate-pulse' : ''}`}>
                            <h5 className="font-semibold text-lg mb-3">ShowRoom Booking</h5>
                            <p className="text-2xl">{salesByCategory.series[0]}</p>
                        </div>
                        <div className={`panel bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-lg shadow-lg p-6 ${salesByCategory.series[4] > 0 && 'animate-pulse'}`}>
                            <h5 className="font-semibold text-lg mb-3">Whatsapp Booking</h5>
                            <p className="text-2xl">{salesByCategory.series[4]}</p>
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
                                    <div  className={`w-full h-16 ${bgColor} rounded-xl flex items-center justify-between px-4 border-l-4 border-blue-500  shadow` }>
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
                                        <div className='flex flex-row gap-1'>
                                            {/* {['', ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.VERIFIER,ROLES.Manager].includes(role) && (
                                                <button
                                                    className="btn btn-danger text-white rounded-md py-2 px-3"
                                                    onClick={() => handleDismissRecord(record)}
                                                >
                                                    Dismiss
                                                </button>
                                            )} */}
                                            {['', ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.VERIFIER,ROLES.Manager].includes(role) && (
                                                <button
                                                    className="btn btn-primary text-white rounded-md py-2 px-3"
                                                    onClick={()=>handleRenewal(record._id)}
                                                >
                                                    Renewal
                                                </button>
                                            )}
                                        </div>
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
                 
                    </div>
                    <AddVehicleCompliance
                        isEditingForDissmissBtn={openCompilanceModalForDissmiss}
                        open={openRenewal}
                        id={recordId}
                        recordType={dismissRecordType} 
                        dissmissVehicleNumber={dismissVehicleNumber}

                        handleClose={() => {
                            setOpenRenewal(false);
                            setOpenCompilanceModalForDissmiss(false);
                            setRecordId('');
                            setDismissRecordType('');
                            setDismissVehicleNumber('');
                            fetchBookings();
                            fetchServiceKmExceededVehicle();
                        }}
                        fetchComplianceDetails={fetchServiceKmExceededVehicle}
                        isEditMode={true}
                    />
                    </div>
            </div>
        )}
    </div>
);
};

export default Index;
