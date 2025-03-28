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
    receivedUser: string,// new prop
    companyBooking: boolean,// new prop
    approve: boolean,// new prop
    accountantVerified: boolean,// new prop
    receivedAmount: number,
    phoneNumber: any;
    pickupTime: string;
    dropoffTime: string;
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
    const [modal5, setModal5] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [trackModalOpen, setTrackModalOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

    const handlePageChange = (page: any) => {
        setCurrentPage(page);
        fetchBookings('', page); // Pass the current page
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
                params: { search: searchTerm, page, limit },
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

    // deleting company

    const handleTrack = (itemId: string) => {
        console.log("Tracking itemId:", itemId);
        setSelectedItemId(itemId);  // Store itemId in state
        setTrackModalOpen(true);
    };

    // getting company by id in modal

    const handleOpen = async (id: any) => {
        setModal5(true);
        const response = await axios.get(`${backendUrl}/booking/${id}`);
        const data = response.data;
        console.log(data.image);
        setCompany(data);
    };

    useEffect(() => {
        gettingToken();
        fetchCompanies();
        fetchBookings();
    }, []);

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
                                        {items.driver ? (
                                            <td>
                                                {items.driver.name || "N/A"} <p style={{ color: '#9a9a9a' }}>{items.driver.phone || "N/A"}</p>
                                            </td>
                                        ) : (
                                            <td>
                                                {items.provider?.name || 'No Provider'} <p style={{ color: '#9a9a9a' }}>{items.provider?.phone || 'N/A'}</p>
                                            </td>
                                        )}
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
                                                            src={company?.image ? `${backendUrl}/images/${company?.image}` : defaultImage}
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

                                        <button type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4">
                                            More info
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>

        </div>
    );
};

export default Bookings;
