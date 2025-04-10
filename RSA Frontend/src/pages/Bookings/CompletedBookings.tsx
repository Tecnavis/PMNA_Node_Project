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

interface Booking {
    _id: string;
    workType: string;
    dummyProviderName: string;
    dummyDriverName: string;
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

const CompletedBookings: React.FC = () => {
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
            const response = await axios.get(`${backendUrl}/booking/getordercompleted`, {
                params: { search: searchTerm, page, limit },
            });
            setBookings(response.data.bookings);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.page);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };



    // handling accountant verifying 

    const handleAccountantVerify = (id: any) => {
        try {
            Swal.fire({
                title: 'Are you sure?',
                text: 'This action cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, verify it!',
            }).then((result) => {
                if (result.isConfirmed) {
                    axios.patch(`${backendUrl}/booking/accountantverify/${id}`);
                    setBookings((prev) => prev.filter((item) => item._id !== id));
                    Swal.fire('Verified!', 'The booking has been verified.', 'success');
                }
            });

        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        gettingToken();
        fetchBookings();
    }, []);

    console.log('bookings', bookings);
    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    {/* Heading */}
                    <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">Completed Booking Details</h5>

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
                <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
                    {/* FeedBack & verify Completed */}
                    <div className="bg-green-500 text-white text-center px-3 py-1 rounded shadow">FeedBack & Verify Completed</div>

                    {/* Verify Completed*/}
                    <div className="bg-blue-500 text-white text-center px-3 py-1 rounded shadow">Verify Completed</div>
                </div>

                <div className="table-responsive mb-5">
                    <table style={{ overflowX: 'auto' }}>
                        <thead>
                            <tr>
                                <th>#</th> {/* Index column */}
                                <th>Created At</th>
                                <th>File Number</th>
                                <th>Driver Name</th>
                                <th>Phone</th>
                                <th>Service Type</th>
                                <th>Vehicle Number</th>
                                <th className="!text-center">Action</th>
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
                                            <div style={{ background: fileNumberColor, padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                                                <p>{items.fileNumber}</p>
                                            </div>{' '}
                                            {/* File Number with conditional color */}
                                        </td>
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
                                        <td>{items.mob1}</td>
                                        <td>
                                            {items.serviceType?.serviceName
                                                ? items.serviceType.serviceName.toUpperCase()
                                                : 'N/A'}
                                        </td>
                                        <td>{items.customerVehicleNumber ? items.customerVehicleNumber.toUpperCase().replace(/([a-zA-Z]+)(\d+)([a-zA-Z]+)(\d+)/, '$1 $2 $3 $4') : ''}</td>
                                        <td className="text-center">
                                            <ul className="flex items-center justify-center gap-2">
                                                <li>
                                                    <Tippy content="View More">
                                                        <button type="button" onClick={() => navigate(`/openbooking/${items._id}`)}>
                                                            <IconEye className="text-secondary" />
                                                        </button>
                                                    </Tippy>
                                                </li>
                                                {items.feedbackCheck && (
                                                    <li>
                                                        <Tippy content="Accountantant verify">
                                                            <button type="button">
                                                                <RiVerifiedBadgeFill size={25} className="text-success" onClick={() => handleAccountantVerify(items._id)} />
                                                            </button>
                                                        </Tippy>
                                                    </li>
                                                )}
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


        </div>
    );
};

export default CompletedBookings;
