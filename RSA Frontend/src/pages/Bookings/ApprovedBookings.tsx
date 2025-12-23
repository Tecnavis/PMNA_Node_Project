import React, { useEffect, useState } from 'react';
import { DataTable } from 'mantine-datatable';
import { Link, useNavigate } from 'react-router-dom';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { RiVerifiedBadgeFill } from 'react-icons/ri';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import axios from 'axios';
import Swal from 'sweetalert2';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import { MdOutlineBookmarkAdd } from 'react-icons/md';
import IconEye from '../../components/Icon/IconEye';
import IconMapPin from '../../components/Icon/IconMapPin';

interface Booking {
    _id: string;
    workType: string;
    verified: boolean;
    feedbackCheck: boolean;
    customerVehicleNumber: string;
    bookedBy: string;
    fileNumber: string;
    location: string;
    latitudeAndLongitude: string;
    baselocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    };
    showroom: string;
    totalDistence: number;
    dropoffLocation: string;
    dropoffLatitudeAndLongitude: string;
    trapedLocation: string;
    serviceType: {
        additionalAmount: number;
        expensePerKm: number;
        firstKilometer: number;
        firstKilometerAmount: number;
        serviceName: string;
        _id: string;
    };
    customerName: string;
    mob1: string;
    mob2?: string;
    vehicleType: string;
    brandName?: string;
    comments?: string;
    status?: string;
    driver?: {
        idNumber: string;
        image: string;
        name: string;
        personalPhoneNumber: string;
        phone: string;
        _id: string;
        vehicle: Array<{
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            serviceType: string;
            vehicleNumber: string;
            _id: string;
        }>;
    };
    company?: {
        _id: string;
        name: string;
        phone: string;
    };
    provider?: {
        idNumber: string;
        image: string;
        name: string;
        personalPhoneNumber: string;
        phone: string;
        _id: string;
        serviceDetails: Array<{
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            serviceType: string;
            vehicleNumber: string;
            _id: string;
        }>;
    };
    totalAmount?: number;
    totalDriverDistence?: number;
    driverSalary?: number;
    accidentOption?: string;
    insuranceAmount?: number;
    adjustmentValue?: number;
    amountWithoutInsurance?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const ApprovedBookings: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // Check token
    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            navigate('/auth/boxed-signin');
        }
    };

    // Fetch bookings
    const fetchBookings = async (search = '', pageNum = page, limit = pageSize) => {
        setIsLoading(true);
        try {
            const params: any = { 
                search, 
                page: pageNum,
                limit,
            };
            
            const response = await axios.get(`${backendUrl}/booking/approvedbookings`, { params });
            
            // Ensure serviceType exists to prevent undefined errors
            const safeBookings = response.data.bookings.map((booking: Booking) => ({
                ...booking,
                serviceType: booking.serviceType || {
                    serviceName: 'N/A',
                    additionalAmount: 0,
                    expensePerKm: 0,
                    firstKilometer: 0,
                    firstKilometerAmount: 0,
                    _id: 'default'
                }
            }));
            
            setBookings(safeBookings);
            setTotalRecords(response.data.total);
            setPage(response.data.page);
            
            // Reset to page 1 if search changed
            if (search !== searchTerm) {
                setPage(1);
            }
            setSearchTerm(search);
            
        } catch (error) {
            console.error('Error fetching bookings:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load bookings. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        gettingToken();
        fetchBookings();
    }, [page, pageSize]);

    // Handle search with debounce
    const handleSearch = (value: string) => {
        const timer = setTimeout(() => {
            fetchBookings(value, 1, pageSize);
        }, 500);
        return () => clearTimeout(timer);
    };

    // Define columns for DataTable
    const columns = [
        {
            accessor: 'index',
            title: '#',
            render: (record: any, index: number) => (
                <span>{(page - 1) * pageSize + index + 1}</span>
            ),
            width: 80,
        },
        {
            accessor: 'createdAt',
            title: 'Created At',
            render: (record: Booking) => (
                <span>
                    {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                </span>
            ),
        },
        {
            accessor: 'fileNumber',
            title: 'File Number',
            render: (record: Booking) => {
                let fileNumberColor = '';
                if (record.verified && record.feedbackCheck) {
                    fileNumberColor = '#22c35e';
                } else if (record.verified) {
                    fileNumberColor = '#3b82f6';
                }
                
                return (
                    <div style={{ color: fileNumberColor }}>
                        {record.fileNumber}
                    </div>
                );
            },
        },
        {
            accessor: 'customerName',
            title: 'Customer Name',
        },
        {
            accessor: 'mob1',
            title: 'Mobile',
        },
        {
            accessor: 'company.name',
            title: 'Company',
            render: (record: Booking) => (
                <div>
                    {record.company?.name || 'Payment Work'}
                    {record.company?.phone && (
                        <div className="text-xs text-gray-500">
                            {record.company.phone}
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessor: 'serviceType.serviceName',
            title: 'Service Type',
            render: (record: Booking) => (
                <span>{record.serviceType?.serviceName?.toUpperCase() || 'N/A'}</span>
            ),
        },
        {
            accessor: 'customerVehicleNumber',
            title: 'Vehicle Number',
            render: (record: Booking) => (
                <span>
                    {record.customerVehicleNumber ? 
                        record.customerVehicleNumber.toUpperCase().replace(/([a-zA-Z]+)(\d+)([a-zA-Z]+)(\d+)/, '$1 $2 $3 $4') 
                        : ''
                    }
                </span>
            ),
        },
        {
            accessor: 'comments',
            title: 'Comments',
            render: (record: Booking) => (
                <span className="max-w-xs truncate" title={record.comments}>
                    {record.comments}
                </span>
            ),
        },
        {
            accessor: 'actions',
            title: 'Actions',
            render: (record: Booking) => (
                <Tippy content="View More">
                    <button 
                        type="button" 
                        onClick={() => navigate(`/openbooking/${record._id}`)}
                        className="text-secondary hover:text-primary transition-colors"
                    >
                        <IconEye className="w-5 h-5" />
                    </button>
                </Tippy>
            ),
            width: 100,
        },
    ];

    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    {/* Heading */}
                    <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">
                        Approved Bookings Details
                    </h5>

                    {/* Search Bar */}
                    <div className="flex-grow sm:w-auto w-full">
                        <input
                            type="text"
                            placeholder="Search bookings..."
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white-light"
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            value={searchTerm}
                        />
                    </div>
                </div>
                
                {/* Mantine DataTable */}
                <div className="datatables">
                    <DataTable
                        fetching={isLoading}
                        totalRecords={totalRecords}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={setPage}
                        recordsPerPageOptions={[10, 20, 50, 100, 200, 500]}
                        onRecordsPerPageChange={(newPageSize) => {
                            setPageSize(newPageSize);
                            setPage(1);
                        }}
                        withColumnBorders
                        highlightOnHover
                        striped
                        minHeight={300}
                        columns={columns}
                        // Optional: Add row styling based on conditions
                        rowClassName={(record) => {
                            if (record.verified && record.feedbackCheck) {
                                return 'bg-green-50';
                            } else if (record.verified) {
                                return 'bg-blue-50';
                            }
                            return '';
                        }}
                        records={bookings.map(item => ({ ...item, id: item._id }))}
                        // Add pagination text customization
                        paginationText={({ from, to, totalRecords }) => 
                            `Showing ${from} to ${to} of ${totalRecords} entries`
                        }
                        // Add empty state
                        emptyState={
                            <div className="text-center py-10">
                                <div className="text-gray-500 text-lg mb-2">No bookings found</div>
                                <div className="text-gray-400">Try adjusting your search or filters</div>
                            </div>
                        }
                    />
                </div>
            </div>
        </div>
    );
};

export default ApprovedBookings;