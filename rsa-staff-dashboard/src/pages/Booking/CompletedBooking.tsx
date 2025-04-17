import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'tippy.js/dist/tippy.css';
import { MdOutlineBookmarkAdd } from 'react-icons/md';
import { GrPrevious } from 'react-icons/gr';
import { GrNext } from 'react-icons/gr';
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig';
import { AllBookingResponse, IBooking } from '../../interface/booking';
import { getBookings } from '../../service/booking';

const CompletedBookings: React.FC = () => {

    const [bookings, setBookings] = useState<IBooking[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    const handlePageChange = (page: any) => {
        setCurrentPage(page);
        fetchBookings('', page); // Pass the current page
    };

    const navigate = useNavigate();

    // getting all bookings

    const fetchBookings = async (searchTerm = '', page = 1, limit = 10) => {
        try {
            const data: AllBookingResponse = await getBookings({ search: searchTerm, page, limit, status: 'Order Completed' }) as AllBookingResponse

            setBookings(data.data.bookings);
            setTotalPages(data.data.pagination.totalPages);
            setCurrentPage(data.data.pagination.page);

        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

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

                    {/* Add Booking Link */}
                    <Link to="/bookings/add-booking" className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600 sm:w-auto w-full text-center sm:text-right">
                        <span className="flex items-center justify-center sm:justify-end">
                            <MdOutlineBookmarkAdd className="me-2" />
                            Add Booking
                        </span>
                    </Link>
                </div>
                <div className="table-responsive mb-5">
                    <table style={{ overflowX: 'auto' }}>
                        <thead>
                            <tr>
                                <th>#</th> {/* Index column */}
                                <th>Created At</th>
                                <th>File Number</th>
                                <th>Vehicle Number</th>
                                <th>Phone Number</th>
                                <th>Service Section</th>
                                <th>Booked By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings?.map((items, index) => {

                                return (
                                    <tr key={index}>
                                        <td>{index + 1}</td> {/* Index column */}
                                        <td>{items.createdAt ? new Date(items.createdAt).toLocaleDateString('en-GB') : 'N/A'}</td>
                                        <td>
                                            <div style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                                                <p>{items.fileNumber || "N/A"}</p>
                                            </div>{' '}
                                            {/* File Number with conditional color */}
                                        </td>
                                        <td>{items.customerVehicleNumber ? items.customerVehicleNumber : 'N/A'}</td>
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

                                        <td>{items.bookedBy?.name || "N/A"}</td>
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
