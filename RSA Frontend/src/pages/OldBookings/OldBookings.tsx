import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    DocumentTextIcon,
    ArchiveBoxIcon,
    UserIcon,
    PhoneIcon,
    TruckIcon,
    CalendarIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    ClockIcon,
    EyeIcon,
    XMarkIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
// @ts-ignore
import { DateRangePicker, RangeKeyDict, Range } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// Define interfaces
interface Filters {
    startDate: string | null;
    endDate: string | null;
    status: string;
    workType: string;
    serviceType: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

interface Booking {
    _id: string;
    fileNumber: string;
    customerName: string;
    mob1: string;
    mob2?: string;
    customerVehicleNumber: string;
    vehicleType: string;
    workType: string;
    archiveDate: string;
    status: string;
    totalAmount: number;
    location: string;
    dropoffLocation: string;
    totalDistence: number;
    serviceCategory?: string;
    serviceType?: { serviceName: string };
    company?: { name: string };
    driver?: { name: string; phone: string } | null; // Allow null
    provider?: { name: string; companyName: string; phone: string } | null; // Allow null
    comments?: string;
    createdAt: string;
    insuranceAmount?: number;
    driverSalary?: number;
    pickupDate?: string;
      // Add these fields for archived bookings
    dummyDriverName?: string;
    dummyDriverPhone?: string;
    dummyProviderName?: string;
    dummyProviderCompany?: string;
    dummyProviderPhone?: string;
}

const OldBookings: React.FC = () => {
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // State
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Filters>({
        startDate: null,
        endDate: null,
        status: '',
        workType: '',
        serviceType: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
    });
    
    // Fixed dateRange state
    const [dateRange, setDateRange] = useState<Range[]>([
        {
            startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
            endDate: new Date(),
            key: 'selection'
        }
    ]);
    
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'archiveDate', direction: 'desc' });

    // Fetch archived bookings
    const fetchArchivedBookings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Build params properly
            const params: Record<string, any> = {
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm,
                sortBy: sortConfig.key,
                sortOrder: sortConfig.direction,
            };

            // Add filters conditionally
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.status) params.status = filters.status;
            if (filters.workType) params.workType = filters.workType;
            if (filters.serviceType) params.serviceType = filters.serviceType;

            const response = await axios.get(`${backendUrl}/archive/bookings`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });

            if (response.data.success) {
                 console.log('Bookings data:', response.data.data.bookings); // Add this line
            console.log('First booking driver:', response.data.data.bookings[0]?.driver); // Check driver data
                setBookings(response.data.data.bookings);
                setPagination(response.data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching archived bookings:', error);
            toast.error('Failed to load archived bookings');
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchArchivedBookings();
    }, [pagination.page, sortConfig]);

    // Handle search with debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (pagination.page !== 1) {
                setPagination(prev => ({ ...prev, page: 1 }));
            } else {
                fetchArchivedBookings();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filters]);

    // Handle filter changes
    const handleFilterChange = (key: keyof Filters, value: string | null) => {
        setFilters(prev => ({ ...prev, [key]: value || '' }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const applyDateFilter = () => {
        if (dateRange[0].startDate && dateRange[0].endDate) {
            handleFilterChange('startDate', dateRange[0].startDate.toISOString());
            handleFilterChange('endDate', dateRange[0].endDate.toISOString());
        }
        setShowFilters(false);
    };

    const clearFilters = () => {
        setFilters({
            startDate: null,
            endDate: null,
            status: '',
            workType: '',
            serviceType: ''
        });
        setDateRange([
            {
                startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
                endDate: new Date(),
                key: 'selection'
            }
        ]);
        setSearchTerm('');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const viewBookingDetails = (booking: Booking) => {
        setSelectedBooking(booking);
        setShowDetailsModal(true);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const getStatusBadgeColor = (status: string): string => {
        const colors: Record<string, string> = {
            'Completed': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800',
            'In Progress': 'bg-blue-100 text-blue-800',
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Booking Added': 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getWorkTypeColor = (workType: string): string => {
        const colors: Record<string, string> = {
            'RSAWork': 'bg-purple-100 text-purple-800',
            'PaymentWork': 'bg-indigo-100 text-indigo-800',
            'default': 'bg-gray-100 text-gray-800'
        };
        return colors[workType] || colors['default'];
    };

// Update your getDriverName function
const getDriverName = (booking: Booking): string => {
    // Check populated driver first
    if (booking.driver && typeof booking.driver === 'object' && booking.driver.name) {
        return booking.driver.name;
    }
    
    // Check dummy driver name
    if (booking.dummyDriverName) {
        return booking.dummyDriverName;
    }
    
    // Check provider
    if (booking.provider && typeof booking.provider === 'object' && booking.provider.name) {
        return booking.provider.name;
    }
    
    // Check dummy provider name
    if (booking.dummyProviderName) {
        return booking.dummyProviderName;
    }
    
    return 'Not Assigned';
};

// Update getDriverPhone
const getDriverPhone = (booking: Booking): string => {
    // Check populated driver
    if (booking.driver && typeof booking.driver === 'object' && booking.driver.phone) {
        return booking.driver.phone;
    }
    
    // Check dummy driver phone
    if (booking.dummyDriverPhone) {
        return booking.dummyDriverPhone;
    }
    
    // Check provider
    if (booking.provider && typeof booking.provider === 'object' && booking.provider.phone) {
        return booking.provider.phone;
    }
    
    // Check dummy provider phone
    if (booking.dummyProviderPhone) {
        return booking.dummyProviderPhone;
    }
    
    return '-';
};

    // Stats calculation
    const totalAmount = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const completedBookings = bookings.filter(b => b.status === 'Completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'Cancelled').length;
    const bookingsWithDriver = bookings.filter(b => b.driver || b.provider).length;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <ArchiveBoxIcon className="h-8 w-8 text-indigo-600" />
                            Archived Bookings
                        </h1>
                        <p className="text-gray-600 mt-2">View and manage all archived bookings</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Archived</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{pagination.total}</p>
                            </div>
                            <ArchiveBoxIcon className="h-8 w-8 text-indigo-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    ₹{totalAmount.toLocaleString()}
                                </p>
                            </div>
                            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Completed</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{completedBookings}</p>
                            </div>
                            <DocumentTextIcon className="h-8 w-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Cancelled</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{cancelledBookings}</p>
                            </div>
                            <XMarkIcon className="h-8 w-8 text-red-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">With Driver</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{bookingsWithDriver}</p>
                            </div>
                            <UserGroupIcon className="h-8 w-8 text-blue-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by file number, customer name, vehicle, location, driver name..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filter Button */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2.5 border rounded-lg flex items-center gap-2 transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <FunnelIcon className="h-5 w-5" />
                            Filters
                            {Object.values(filters).some(Boolean) && (
                                <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    {Object.values(filters).filter(Boolean).length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Date Range Picker - Fixed */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                                <DateRangePicker
                                    ranges={dateRange}
                                    onChange={(item: RangeKeyDict) => setDateRange([item.selection])}
                                    moveRangeOnFirstSelection={false}
                                    className="w-full"
                                />
                                <button
                                    onClick={applyDateFilter}
                                    className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Apply Date Filter
                                </button>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Booking Added">Booking Added</option>
                                </select>
                            </div>

                            {/* Work Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    value={filters.workType}
                                    onChange={(e) => handleFilterChange('workType', e.target.value)}
                                >
                                    <option value="">All Work Types</option>
                                    <option value="RSAWork">RSA Work</option>
                                    <option value="PaymentWork">Payment Work</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600">Loading archived bookings...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="p-12 text-center">
                        <ArchiveBoxIcon className="h-16 w-16 text-gray-400 mx-auto" />
                        <p className="mt-4 text-gray-600 text-lg">No archived bookings found</p>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th 
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => handleSort('fileNumber')}
                                        >
                                            <div className="flex items-center gap-1">
                                                File Number
                                                {sortConfig.key === 'fileNumber' && (
                                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vehicle
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Work Type
                                        </th>
                                        <th 
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => handleSort('createdAt')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Booking Date
                                                {sortConfig.key === 'createdAt' && (
                                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Driver
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th 
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => handleSort('totalAmount')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Amount
                                                {sortConfig.key === 'totalAmount' && (
                                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bookings.map((booking) => (
                                        <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                                                    <span className="font-medium text-gray-900">{booking.fileNumber}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="flex items-center">
                                                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                        <span className="font-medium">{booking.customerName}</span>
                                                    </div>
                                                    <div className="flex items-center mt-1 text-sm text-gray-500">
                                                        <PhoneIcon className="h-3 w-3 mr-1" />
                                                        {booking.mob1}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                    <div>
                                                        <span className="block">{booking.customerVehicleNumber}</span>
                                                        <span className="text-sm text-gray-500">{booking.vehicleType}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getWorkTypeColor(booking.workType)}`}>
                                                    {booking.workType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-gray-600">
                                                    <CalendarIcon className="h-4 w-4 mr-2" />
                                                    {booking.createdAt ? format(new Date(booking.createdAt), 'dd MMM yyyy') : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center">
                                                        <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                        <span className="font-medium">{getDriverName(booking)}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {getDriverPhone(booking)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">
                                                    ₹{booking.totalAmount?.toLocaleString() || '0'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => viewBookingDetails(booking)}
                                                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span>{' '}
                                    of <span className="font-medium">{pagination.total}</span> archived bookings
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className={`px-3 py-2 border rounded-lg flex items-center gap-1 ${pagination.page === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <ChevronLeftIcon className="h-4 w-4" />
                                        Previous
                                    </button>
                                    
                                    {/* Page Numbers */}
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (pagination.totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (pagination.page <= 3) {
                                            pageNum = i + 1;
                                        } else if (pagination.page >= pagination.totalPages - 2) {
                                            pageNum = pagination.totalPages - 4 + i;
                                        } else {
                                            pageNum = pagination.page - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-3 py-2 border rounded-lg ${pagination.page === pageNum ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className={`px-3 py-2 border rounded-lg flex items-center gap-1 ${pagination.page === pagination.totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Next
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Booking Details Modal */}
            {showDetailsModal && selectedBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                                    <p className="text-gray-600">File Number: {selectedBooking.fileNumber}</p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <XMarkIcon className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Customer Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <UserIcon className="h-5 w-5" />
                                        Customer Information
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500">Name</p>
                                            <p className="font-medium">{selectedBooking.customerName}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Mobile 1</p>
                                                <p className="font-medium">{selectedBooking.mob1}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Mobile 2</p>
                                                <p className="font-medium">{selectedBooking.mob2 || '-'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Vehicle</p>
                                            <p className="font-medium">{selectedBooking.customerVehicleNumber} - {selectedBooking.vehicleType}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5" />
                                        Service Information
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Work Type</p>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getWorkTypeColor(selectedBooking.workType)}`}>
                                                    {selectedBooking.workType}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Status</p>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(selectedBooking.status)}`}>
                                                    {selectedBooking.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Service Category</p>
                                            <p className="font-medium">{selectedBooking.serviceCategory || '-'}</p>
                                        </div>
                                        {selectedBooking.serviceType && (
                                            <div>
                                                <p className="text-sm text-gray-500">Service Type</p>
                                                <p className="font-medium">{selectedBooking.serviceType.serviceName}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Location Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <MapPinIcon className="h-5 w-5" />
                                        Location Details
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500">Pickup Location</p>
                                            <p className="font-medium">{selectedBooking.location}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Dropoff Location</p>
                                            <p className="font-medium">{selectedBooking.dropoffLocation || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Total Distance</p>
                                            <p className="font-medium">{selectedBooking.totalDistence} km</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <CurrencyDollarIcon className="h-5 w-5" />
                                        Financial Details
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500">Total Amount</p>
                                            <p className="font-medium text-lg">₹{selectedBooking.totalAmount?.toLocaleString() || '0'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Insurance Amount</p>
                                                <p className="font-medium">₹{selectedBooking.insuranceAmount?.toLocaleString() || '0'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Driver Salary</p>
                                                <p className="font-medium">₹{selectedBooking.driverSalary?.toLocaleString() || '0'}</p>
                                            </div>
                                        </div>
                                        {selectedBooking.company && (
                                            <div>
                                                <p className="text-sm text-gray-500">Company</p>
                                                <p className="font-medium">{selectedBooking.company.name}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Driver/Provider Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <TruckIcon className="h-5 w-5" />
                                        Service Provider
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedBooking.driver ? (
                                            <div>
                                                <p className="text-sm text-gray-500">Driver</p>
                                                <p className="font-medium">{selectedBooking.driver.name}</p>
                                                <p className="text-sm text-gray-500">{selectedBooking.driver.phone}</p>
                                            </div>
                                        ) : selectedBooking.provider ? (
                                            <div>
                                                <p className="text-sm text-gray-500">Provider</p>
                                                <p className="font-medium">{selectedBooking.provider.name}</p>
                                                <p className="text-sm text-gray-500">{selectedBooking.provider.companyName}</p>
                                                <p className="text-sm text-gray-500">{selectedBooking.provider.phone}</p>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">No service provider assigned</p>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <ClockIcon className="h-5 w-5" />
                                        Timeline
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500">Created At</p>
                                            <p className="font-medium">
                                                {selectedBooking.createdAt ? format(new Date(selectedBooking.createdAt), 'dd MMM yyyy HH:mm') : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Archived At</p>
                                            <p className="font-medium">
                                                {selectedBooking.archiveDate ? format(new Date(selectedBooking.archiveDate), 'dd MMM yyyy HH:mm') : '-'}
                                            </p>
                                        </div>
                                        {selectedBooking.pickupDate && (
                                            <div>
                                                <p className="text-sm text-gray-500">Pickup Date</p>
                                                <p className="font-medium">
                                                    {format(new Date(selectedBooking.pickupDate), 'dd MMM yyyy HH:mm')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Comments */}
                            {selectedBooking.comments && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Comments</h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-gray-700">{selectedBooking.comments}</p>
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OldBookings;