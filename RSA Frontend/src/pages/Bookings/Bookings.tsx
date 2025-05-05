import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { LuRadar } from 'react-icons/lu';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import axios from 'axios';
import Swal from 'sweetalert2';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import { MdOutlineBookmarkAdd } from 'react-icons/md';
import IconEye from '../../components/Icon/IconEye';
import IconMapPin from '../../components/Icon/IconMapPin';
import { GrPrevious } from 'react-icons/gr';
import { GrNext } from 'react-icons/gr';
import TrackModal from "../Bookings/TrackModal"; // Adjust the path as needed
import { CLOUD_IMAGE } from '../../constants/status';
import { TbCalendarCancel } from "react-icons/tb";
import ReusableModal from '../../components/modal';
import { APIForCancelApiResponse, updateCancelData } from '../../services/bookingService';


interface Company {
    _id: string;
    name: string;
    idNumber: string;
    creditLimitAmount: number;
    phone: string;
    personalPhoneNumber: string;
    password: string;
    vehicle: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
}

export interface Booking {
    invoiceNumber: string;
    partialPayment: Boolean;
    receivedUser: string,// new prop
    cancelReason: string,// w prop
    cancelImage: string,// new prop
    company: Company | string
    partialAmount?: number;
    showroomAmount?: number;
    cancelKm: number,// new prop
    vehicleNumber: string,// new prop
    dummyDriverName: string,// new prop
    dummyProviderName: string,// new prop
    companyBooking: boolean,// new prop
    approve: boolean,// new prop
    feedbackCheck: boolean,// new prop
    verified: boolean,// new prop
    accountantVerified: boolean,// new prop
    transferedSalary: number,// new prop
    receivedAmount: number,
    receivedAmountByCompany: number,
    phoneNumber: any;
    pickupTime: string;
    dropoffTime: string;
    cancelStatus: string;
    cashPending: boolean;
    _id: string;
    workType: string;
    customerVehicleNumber: string;
    bookedBy: string;
    fileNumber: string;
    location: string;
    latitudeAndLongitude: string;
    baselocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    }; // Reference to BaseLocation
    showroom: string; // Reference to Showroom
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
    mob2?: string; // Optional field
    vehicleType: string;
    brandName?: string; // Optional field
    comments?: string; // Optional field
    status?: string; // Optional field
    driver?: {
        idNumber: string;
        image: string;
        name: string;
        personalPhoneNumber: string;
        phone: string;
        _id: string;
        companyName: string; // New Props
        cashInHand: number,// new prop
        vehicle: [
            {
                basicAmount: number;
                kmForBasicAmount: number;
                overRideCharge: number;
                serviceType: string;
                vehicleNumber: string;
                _id: string;
            }
        ];
    };
    provider?: {
        idNumber: string;
        image: string;
        name: string;
        personalPhoneNumber: string;
        phone: string;
        _id: string;
        serviceDetails: [
            {
                basicAmount: number;
                kmForBasicAmount: number;
                overRideCharge: number;
                serviceType: string;
                vehicleNumber: string;
                _id: string;
            }
        ];
    };
    totalAmount?: number; // Optional field
    totalDriverDistence?: number; // Optional field
    driverSalary?: number; // Optional field
    accidentOption?: string; // Optional field
    insuranceAmount?: number; // Optional field
    adjustmentValue?: number; // Optional field
    amountWithoutInsurance?: number; // Optional field
    createdAt?: Date;
    updatedAt?: Date;
}

const Bookings: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [companies, setCompanies] = useState<Company[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [company, setCompany] = useState<Company | null>(null);
    const [modal5, setModal5] = useState<boolean>(false);
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [trackModalOpen, setTrackModalOpen] = useState<boolean>(false);
    const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
    const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
    const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>(undefined);
    const [cancelFormData, setCancelFormData] = useState({
        enterdKm: 0,
        kmImage: '',
        totalDriverDistance: 0,
        totalDriverSalary: 0,
        Totalkm: 0,
        amountForCustomer: 0,
        cancelReason: '',
    });


    const handlePageChange = (page: any) => {
        setCurrentPage(page);
        fetchBookings('', page);
    };

    const navigate = useNavigate();

    // checking the token
    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token  found in localStorage');
        } else {
            navigate('/auth/boxed-signin');
            console.log('Token not found in localStorage');
        }
    };

    // getting all bookings
    const fetchBookings = async (searchTerm = '', page = 1, limit = 10) => {
        try {
            const response = await axios.get(`${backendUrl}/booking`, {
                params: { search: searchTerm, page, limit, status: 'Order Completed' },
            });

            setBookings(response.data.bookings);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.page);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    // getting all company

    const fetchCompanies = async () => {
        try {
            const response = await axios.get(`${backendUrl}/company`);
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching company:', error);
        }
    };

    // Handle track modal open
    const handleTrack = (itemId: string) => {
        setSelectedItemId(itemId);  // Store itemId in state
        setTrackModalOpen(true);
    };

    // handle cancel and settle booking
    const handleCancel = (booking?: Booking) => {
        setSelectedBooking(booking)
        setSelectedItemId(booking?._id || '');
        setCancelFormData({
            enterdKm: booking?.cancelKm || 0,
            kmImage: booking?.cancelImage || '',
            totalDriverDistance: booking?.totalDriverDistence || 0,
            totalDriverSalary: booking?.driverSalary || 0,
            Totalkm: booking?.totalDistence || 0,
            amountForCustomer: booking?.totalAmount || 0,
            cancelReason: booking?.cancelReason || ''
        })
        setCancelModalOpen(true)
    }

    useEffect(() => {
        gettingToken();
        fetchCompanies();
        fetchBookings();
    }, []);

    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCancelFormData({ ...cancelFormData, [name]: value });

        // When totalDriverDistance changes, recalculate the salary
        if (name === 'Totalkm') {
            const totalDistance = parseFloat(value);

            if (selectedBooking) {
                const serviceType = selectedBooking.serviceType;
                // Ensure serviceType is defined before proceeding
                if (!serviceType) {
                    console.error("Service type is undefined");
                    return;
                }

                if (serviceType) {
                    // 
                    let payableAmount
                    if (!selectedBooking.company) {

                        const baseKm = serviceType?.firstKilometer || 0;
                        const distance = totalDistance

                        const kilometerLessed = distance > baseKm ? distance - baseKm : baseKm;
                        if (distance > baseKm) {
                            const lessedAmt = kilometerLessed * (serviceType?.additionalAmount || 0);
                            payableAmount = lessedAmt + (serviceType?.firstKilometerAmount || 0);
                        } else {
                            payableAmount = serviceType?.firstKilometerAmount || 0
                        }
                    } else {
                        let getServiceType

                        if (typeof selectedBooking.company !== 'string') {
                            getServiceType = selectedBooking.company.vehicle.find((vehicle) => vehicle.serviceType && vehicle.serviceType?._id === serviceType?._id);
                        }

                        const baseKm = getServiceType?.kmForBasicAmount || 0;
                        const distance = totalDistance

                        const kilometerLessed = distance > baseKm ? distance - baseKm : baseKm;
                        if (distance > baseKm) {
                            const lessedAmt = kilometerLessed * (getServiceType?.overRideCharge || 0);
                            payableAmount = lessedAmt + (getServiceType?.basicAmount || 0);
                        } else {

                            payableAmount = getServiceType?.basicAmount || 0
                        }
                    }
                    if (parseFloat(value) === 0) {
                        payableAmount = 0
                    }

                    setCancelFormData((pre) => ({
                        ...pre,
                        amountForCustomer: payableAmount,
                    }));
                }
            }
        } else if (name === 'totalDriverDistance') {
            const totalDistance = parseFloat(value);

            const serviceType = selectedBooking!.driver!.vehicle.find(
                (vehi) => vehi.serviceType === selectedBooking?.serviceType._id
            );

            if (!serviceType) {
                console.error('No matching service type found');
                return;
            }

            const { basicAmount, kmForBasicAmount, overRideCharge } = serviceType;

            const extraDistance = Math.max(0, totalDistance - kmForBasicAmount);
            const additionalCharge = extraDistance * overRideCharge;
            let calculatedSalary = basicAmount + additionalCharge;

            if (parseFloat(value) === 0) {
                calculatedSalary = 0
            }

            setCancelFormData((pre) => ({
                ...pre,
                totalDriverSalary: calculatedSalary,
            }));
        }
    };

    const handleUpdateCancelData = async (bookingId: string, cancelData: any): Promise<APIForCancelApiResponse> => {
        return await updateCancelData(bookingId, cancelData) as APIForCancelApiResponse
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const confirm = await Swal.fire({
            title: 'Are you sure?',
            text: 'Do you really want to update this booking?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, update it!',
            cancelButtonText: 'Cancel'
        });

        if (confirm.isConfirmed) {
            const cancelData = {
                cancelReason: cancelFormData?.cancelReason,
                totalDriverDistence: cancelFormData.totalDriverDistance,
                totalDistence: cancelFormData.Totalkm,
                driverSalary: cancelFormData.totalDriverSalary,
                totalAmount: cancelFormData.amountForCustomer,
                status: "Order Completed"
            };

            const result: APIForCancelApiResponse = await handleUpdateCancelData(selectedBooking?._id || '', cancelData);

            if (result.success) {
                Swal.fire('Updated!', result.message, 'success');
            } else {
                Swal.fire('Error', result.message, 'error');
            }
            setSelectedBooking(undefined)
            setSelectedItemId(undefined)
            setCancelModalOpen(false)
            fetchBookings();
        }
    };

    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    {/* Heading */}
                    <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">New Booking Details</h5>

                    {/* Search Bar */}
                    <div className="flex-grow sm:w-auto w-full">
                        <input
                            type="text"
                            placeholder="Search bookings..."
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white-light"
                            onChange={(e) => fetchBookings(e.target.value)} // Trigger search on input change
                        />
                    </div>

                    {/* Add Booking Link */}
                    <Link to="/add-booking" className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600 sm:w-auto w-full text-center sm:text-right">
                        <span className="flex items-center justify-center sm:justify-end">
                            <MdOutlineBookmarkAdd className="me-2" />
                            Add Booking
                        </span>
                    </Link>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
                    {/* Booking (Today) */}
                    <div className="bg-green-500 text-white text-center px-3 py-1 rounded shadow">Booking (Today)</div>

                    {/* ShowRoom Booking (Today) */}
                    <div className="bg-blue-500 text-white text-center px-3 py-1 rounded shadow">ShowRoom Booking (Today)</div>

                    {/* ShowRoom Booking (Past Date) */}
                    <div className="bg-orange-500 text-white text-center px-3 py-1 rounded shadow">ShowRoom Booking (Past Date)</div>

                    {/* Other Bookings (Past Date) */}
                    <div className="bg-yellow-500 text-white text-center px-3 py-1 rounded shadow">Other Bookings (Past Date)</div>

                    {/* Rejected Bookings */}
                    <div className="bg-red-500 text-white text-center px-3 py-1 rounded shadow">Rejected Bookings</div>

                    {/* Canceled Bookings */}
                    <div className="bg-purple-500 text-white text-center px-3 py-1 rounded shadow">Canceled Bookings</div>
                </div>

                <div className="table-responsive mb-5">
                    <table style={{ overflowX: 'auto' }}>
                        <thead>
                            <tr>
                                <th>#</th> {/* Index column */}
                                <th>Created At</th>
                                <th>File Number</th>
                                <th>Vehicle Number</th>
                                <th>Phone</th>
                                <th>Driver</th>
                                <th>Booked By</th>
                                <th className="!text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((items, index) => {
                                // Determine the color for fileNumber based on the conditions
                                let fileNumberColor = '';
                                const currentDate = new Date();
                                const bookingDate = items.createdAt ? new Date(items.createdAt) : new Date();
                                const isToday = bookingDate.toLocaleDateString('en-GB') === currentDate.toLocaleDateString('en-GB');

                                if (items.bookedBy?.startsWith('RSA')) {
                                    fileNumberColor = isToday ? '#22c55e' : '#eab308'; // RSA today = green, past = yellow
                                } else if (items.bookedBy?.startsWith('SHM')) {
                                    fileNumberColor = isToday ? '#3b82f6' : '#f97316'; // SHM today = blue, past = orange
                                }
                                if (items.status === 'Rejected') {
                                    fileNumberColor = '#ef4444'; // If the status is Rejected, color it red
                                }
                                if (items.cancelStatus) {
                                    fileNumberColor = '#a855f7'; // If the status is Rejected, color it red
                                }

                                return (
                                    <tr key={index}>
                                        <td>{index + 1}</td> {/* Index column */}
                                        <td>{items.createdAt ? new Date(items.createdAt).toLocaleDateString('en-GB') : 'N/A'}</td>
                                        <td>
                                            <div style={{ background: fileNumberColor, padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                                                <p>{items.fileNumber || "N/A"}</p>
                                            </div>{' '}
                                            {/* File Number with conditional color */}
                                        </td>
                                        <td>{items.customerVehicleNumber ? items.customerVehicleNumber.toUpperCase().replace(/([a-zA-Z]+)(\d+)([a-zA-Z]+)(\d+)/, '$1 $2 $3 $4') : ''}</td>
                                        <td>{items.mob1 || "N/A"}</td>
                                        <td>
                                            {items.provider ? (
                                                <>
                                                    {items.provider.name || "No Name"}
                                                    <p style={{ color: '#9a9a9a' }}>{items.provider.phone || "N/A"}</p>
                                                </>
                                            ) : items.driver ? (
                                                <>
                                                    {items.driver.name || "No Name"}
                                                    <p style={{ color: '#9a9a9a' }}>{items.driver.phone || "N/A"}</p>
                                                </>
                                            ) : items.dummyDriverName ? (
                                                <>
                                                    {items.dummyDriverName}
                                                    <p style={{ color: '#9a9a9a' }}>No Phone</p>
                                                </>
                                            ) : items.dummyProviderName ? (
                                                <>
                                                    {items.dummyProviderName}
                                                    <p style={{ color: '#9a9a9a' }}>No Phone</p>
                                                </>
                                            ) : (
                                                <>
                                                    Not Found
                                                    <p style={{ color: '#9a9a9a' }}>N/A</p>
                                                </>
                                            )}
                                        </td>

                                        <td>{items.bookedBy || "N/A"}</td>
                                        <td className="text-center">
                                            <ul className="flex items-center justify-center gap-2">
                                                <li>
                                                    <Tippy content="View More">
                                                        <button type="button" onClick={() => navigate(`/openbooking/${items._id}`)}>
                                                            <IconEye className="text-secondary" /> {/* View More icon */}
                                                        </button>
                                                    </Tippy>
                                                </li>
                                                <li>
                                                    <Tippy content="Edit">
                                                        <button type="button" onClick={() => navigate(`/add-booking/${items._id}`)}>
                                                            <IconPencil className="text-primary" /> {/* Edit icon */}
                                                        </button>
                                                    </Tippy>
                                                </li>
                                                <li>
                                                    <Tippy content="Track">
                                                        <button type="button" onClick={() => handleTrack(items._id)}>
                                                            <LuRadar size={24} className="text-info" /> {/* Track icon */}
                                                        </button>
                                                    </Tippy>
                                                </li>
                                                <TrackModal
                                                    open={trackModalOpen}
                                                    onClose={() => setTrackModalOpen(false)}
                                                    itemId={selectedItemId} // Pass the selected item ID
                                                />
                                                <li>
                                                    <Tippy content="Change Location">
                                                        <button type="button">
                                                            <IconMapPin className="text-warning" /> {/* Change Location icon */}
                                                        </button>
                                                    </Tippy>
                                                </li>
                                                {
                                                    items.cancelStatus
                                                    &&
                                                    <li>
                                                        <Tippy content="Booking canceled">
                                                            <button type="button" onClick={() => handleCancel(items)}>
                                                                <TbCalendarCancel size={24} className="text-danger" />
                                                            </button>
                                                        </Tippy>
                                                    </li>
                                                }
                                            </ul>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <ul className="inline-flex items-center space-x-1 rtl:space-x-reverse m-auto">
                <li>
                    <button
                        type="button"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary"
                    >
                        <GrPrevious />
                    </button>
                </li>
                {Array.from({ length: totalPages }, (_, index) => (
                    <li key={index}>
                        <button
                            type="button"
                            onClick={() => handlePageChange(index + 1)}
                            className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${currentPage === index + 1 ? 'bg-primary text-white' : 'bg-white-light text-dark hover:text-white hover:bg-primary'
                                }`}
                        >
                            {index + 1}
                        </button>
                    </li>
                ))}
                <li>
                    <button
                        type="button"
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary"
                    >
                        <GrNext />
                    </button>
                </li>
            </ul>

            <Transition appear show={modal5} as={Fragment}>
                <Dialog as="div" open={modal5} onClose={() => setModal5(false)}>
                    <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0" />
                    </TransitionChild>
                    <div className="fixed inset-0 bg-[black]/60 z-[999]">
                        <div className="flex items-start justify-center min-h-screen px-4">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-5xl my-8 text-black dark:text-white-dark">
                                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                        <h5 className="font-bold text-lg">{company && company?.name ? company?.name.charAt(0).toLocaleUpperCase() + company?.name.slice(1) : 'Loading...'}</h5>
                                        <button onClick={() => setModal5(false)} type="button" className="text-white-dark hover:text-dark">
                                            <IoIosCloseCircleOutline size={22} />
                                        </button>
                                    </div>
                                    {/* Scrollable Content Area */}
                                    <div className="p-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                                        <div className="container">
                                            <div className="row">
                                                <div className="col-12">
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <img
                                                            style={{
                                                                objectFit: 'cover',
                                                                width: '100px',
                                                                height: '100px',
                                                                borderRadius: '50%',
                                                            }}
                                                            src={company?.image ? `${CLOUD_IMAGE}${company?.image}` : defaultImage}
                                                            alt=""
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <table>
                                                            <tbody>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            ID Number:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {company?.idNumber || "N/A"}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Credit Amount Limit:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {company?.creditLimitAmount || "N/A"}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Phone:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {company?.phone || "N/A"}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Personal Phone Number:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {company?.personalPhoneNumber || "N/A"}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Password:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                            onClick={() => {
                                                                                setIsVisible(true);
                                                                                setTimeout(() => setIsVisible(false), 4000); // Hide password after 4 seconds
                                                                            }}
                                                                            title="Click to view password"
                                                                        >
                                                                            {isVisible ? company?.password : company?.password?.replace(/./g, '*')}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Service Type</th>
                                                                    <th>Basic Amount</th>
                                                                    <th>KM For Basic Amount</th>
                                                                    <th>Over Ride Charge</th>
                                                                    <th>Vehicle Number</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {company?.vehicle.map((items, index) => (
                                                                    <tr key={index}>
                                                                        <td>{items.serviceType.serviceName || "N/A"}</td>
                                                                        <td>{items.basicAmount || "N/A"}</td>
                                                                        <td>{items.kmForBasicAmount}</td>
                                                                        <td>{items.overRideCharge || "N/A"}</td>
                                                                        <td>{items.vehicleNumber || "N/A"}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end items-center mt-8 mb-3 mr-3">
                                        <button onClick={() => navigate(`/companyadd/${company?._id}`)} type="button" className="btn btn-outline-primary mr-3">
                                            <IconPencil />
                                        </button>
                                        <button onClick={() => setModal5(false)} type="button" className="btn btn-outline-danger">
                                            Discard
                                        </button>

                                        {/* <button type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4">
                                            More info
                                        </button> */}
                                    </div>
                                </Dialog.Panel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            <ReusableModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                title='Canceled Booking'>
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="ctnEmail">Driver Enterd KM</label>
                        <input
                            id="ctnEmail"
                            type="number"
                            placeholder="12"
                            className="form-input"
                            name="km"
                            value={cancelFormData.enterdKm}
                        />
                    </div>
                    <div>
                        <label htmlFor="ctnEmail">Cancel image</label>
                        <div className="w-full max-h-50 border rounded overflow-hidden">
                            <img
                                src={`${CLOUD_IMAGE}${cancelFormData.kmImage}`}
                                alt="cancel-image"
                                className="w-auto h-auto object-cover"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="ctnEmail">Total Distance Traveled By the Driver</label>
                        <input
                            id="ctnEmail"
                            type="number"
                            placeholder="Enter driver kilometers"
                            className="form-input"
                            name="totalDriverDistance"
                            value={cancelFormData.totalDriverDistance}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="ctnEmail">Driver Amount</label>
                        <input
                            id="ctnEmail"
                            type="number"
                            placeholder="Enter driver amount"
                            className="form-input"
                            name="totalDriverSalary"
                            value={cancelFormData.totalDriverSalary}
                            onChange={handleInputChange}
                        />

                    </div>
                    <div>
                        <label htmlFor="ctnEmail">Total Km (Base to Pickup - pickup to dropoff - dropoff to base)</label>
                        <input
                            id="ctnEmail"
                            type="number"
                            placeholder="Enter company kilometers"
                            className="form-input"
                            name="Totalkm"
                            value={cancelFormData.Totalkm}
                            onChange={handleInputChange}
                        />

                    </div>
                    <div>
                        <label htmlFor="ctnTextarea">Payable Amount By Customer</label>
                        <input
                            id="ctnTextarea"
                            type='number'
                            className="form-textarea"
                            placeholder="Payable amount by customer"
                            required name='amountForCustomer'
                            value={cancelFormData.amountForCustomer}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="ctnTextarea">Remark (Cancel Reason)</label>
                        <input
                            id="ctnEmail"
                            type="text"
                            placeholder="Enter reason for cancellation"
                            className="form-input"
                            name="cancelReason"
                            value={cancelFormData.cancelReason}
                            onChange={handleInputChange}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary !mt-6">
                        Submit
                    </button>
                </form>
            </ReusableModal>
            {/* <TrackModal
                open={trackModalOpen} onClose={()=>handleTrack(selectedItemId || '')} itemId={selectedItemId}
            /> */}
        </div>
    );
};

export default Bookings;
