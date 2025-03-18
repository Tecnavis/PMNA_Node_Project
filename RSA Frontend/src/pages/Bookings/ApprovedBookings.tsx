import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
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
import { GrPrevious } from 'react-icons/gr';
import { GrNext } from 'react-icons/gr';


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

const ApprovedBookings: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

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
            const response = await axios.get(`${backendUrl}/booking/approvedbookings`, {
                params: { search: searchTerm, page, limit },
            });
            setBookings(response.data.bookings);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.page);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

   



    useEffect(() => {
        gettingToken();
        fetchBookings();
    }, []);

   
    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    {/* Heading */}
                    <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">Approved Bookings Details</h5>

                    {/* Search Bar */}
                    <div className="flex-grow sm:w-auto w-full">
                        <input
                            type="text"
                            placeholder="Search bookings..."
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white-light"
                            onChange={(e) => fetchBookings(e.target.value)} // Trigger search on input change
                        />
                    </div>
                </div>
                <div className="table-responsive mb-5">
                    <table style={{ overflowX: 'auto' }}>
                        <thead>
                            <tr>
                                <th>#</th> {/* Index column */}
                                <th>Created At</th>
                                <th>Customer Name</th>
                                <th>Mobile</th>
                                <th>Service Type</th>
                                <th>Vehicle Number</th>
                                <th>comments</th>
                             
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((items, index) => {
                                // Determine the color for fileNumber based on the conditions
                                let fileNumberColor = '';

                                if (items.verified && items.feedbackCheck) {
                                    fileNumberColor = '#22c35e'; // SHM today = blue, past = orange
                                } else if (items.verified) {
                                    fileNumberColor = '#3b82f6'; // RSA today = green, past = yellow
                                }

                                return (
                                    <tr key={index}>
                                        <td>{index + 1}</td> {/* Index column */}
                                        <td>{items.createdAt ? new Date(items.createdAt).toLocaleDateString('en-GB') : 'N/A'}</td>
                                        <td>
                                            {/* <div style={{ background: fileNumberColor, padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                                                <p>{items.fileNumber}</p>
                                            </div>{' '} */}
                                            {/* File Number with conditional color */}
                                            {items.customerName}
                                        </td>
                                        {/* {items.driver ? (
                                            <td>
                                                {items.driver.name} <p style={{ color: '#9a9a9a' }}>{items.driver.phone}</p>
                                            </td>
                                        ) : (
                                            <td>
                                                {items.provider?.name || 'No Provider'} <p style={{ color: '#9a9a9a' }}>{items.provider?.phone || 'N/A'}</p>
                                            </td>
                                        )} */}
                                        <td>
                                            {items.mob1}
                                        </td>
                                        <td>{items.serviceType.serviceName.toUpperCase()}</td>
                                        <td>{items.customerVehicleNumber ? items.customerVehicleNumber.toUpperCase().replace(/([a-zA-Z]+)(\d+)([a-zA-Z]+)(\d+)/, '$1 $2 $3 $4') : ''}</td>
                                        <td>{items.comments}</td>
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
                            className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${
                                currentPage === index + 1 ? 'bg-primary text-white' : 'bg-white-light text-dark hover:text-white hover:bg-primary'
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

         
        </div>
    );
};

export default ApprovedBookings;
