import React, { useEffect, useState, useCallback } from 'react';
import { Booking } from '../Bookings/Bookings';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import IconArrowLeft from '../../components/Icon/IconArrowLeft';
import IconBarChart from '../../components/Icon/IconBarChart';
import { formattedTime, dateFormate } from '../../utils/dateUtils'
import { useNavigate } from 'react-router-dom';
import IconClock from '../../components/Icon/IconClock';
import BookingSkeleton from '../../components/Skeleton/BookingSkeleton';
import IconListCheck from '../../components/Icon/IconListCheck';
import { GrNext, GrPrevious } from 'react-icons/gr';
import ReactModal from 'react-modal'
import { debounce } from 'lodash';
import { connectSocket, disconnectSocket } from '../../utils/socket';
import { Socket } from 'socket.io-client';
import FeedbackModal from '../Bookings/FeedbackModal';
import Feedbacks from '../Feedback/Feedback';
import Swal from 'sweetalert2';
import axios from 'axios';

export interface SocketData {
    type: 'update' | 'newBooking';
    bookingId: string;
    status?: string;
    newBooking: Booking;
    updatedBooking: Booking;
}

enum Tabs {
    OngoingBookings = "OngoingBookings",
    CashPendingBookings = "CashPendingBookings",
    CompletedBookings = "CompletedBookings",
}

const statusColors: Record<string, string> = {
    "Rejected": "bg-red-500 text-white",
    "Order Completed": "bg-green-500 text-white",
    "pending": "bg-yellow-500 text-white",
    "Cancelled": "bg-orange-500 text-white",
    "default": "bg-gray-500 text-white"
};

const Status: React.FC = () => {

    const [tab, setTab] = useState<Tabs>(Tabs.OngoingBookings);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loader, setLoader] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [feedbacks, setFeedbacks] = useState<Feedbacks[]>([]);
    const [selectedResponses, setSelectedResponses] = useState<{ [key: string]: string }>({});
    const [selectedBookingId, setSelectedBookingId] = useState<string>('');
    const [receivedUser, setReceivedUser] = useState<string>('');

    const navigate = useNavigate();
    const role = localStorage.getItem('role') || ''

    const handlePageChange = (page: number) => {
        if (page === currentPage || page < 1 || page > totalPages) return;
        fetchBookings("", page);
    };

    const fetchBookings = async (search: string = '', page: number = 1, limit: number = 10) => {
        setLoader(true);

        let status: string = tab === Tabs.CompletedBookings ? 'Order Completed' : tab === Tabs.CashPendingBookings ? Tabs.CashPendingBookings : Tabs.OngoingBookings;

        try {
            const response = await axiosInstance.get(`/booking/status-based`, {
                params: { page, limit, search, status }
            });

            setBookings(response.data.bookings);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.page);

        } catch (error) {
            console.error("Error fetching bookings", error);
        } finally {
            setLoader(false);
        }
    };

    const debouncedFetchBookings = useCallback(debounce(fetchBookings, 1000), []);

    const handleChangeTabs = (tabName: Tabs) => setTab(tabName);

    const handlePaymentSettlement = (record: Booking) => {
        setSelectedBooking(record);
        setPaymentAmount(((selectedBooking?.totalAmount ?? 0) - (selectedBooking?.receivedAmount ?? 0)));
        setShowPaymentModal(true);
    };

    const handleSavePayment = async () => {
        setLoader(true);

        try {
            const partialAmount = paymentAmount

            const response = await axiosInstance.patch(`/booking/sattle-amount/${selectedBooking?._id}`, { partialAmount, receivedUser, role });

            setShowPaymentModal(false);
            setPaymentAmount(0);
            fetchBookings();
        } catch (error) {

        } finally {
            setLoader(false);
        }
    }
    const handleChangeAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.trim();

        if (/^\d*$/.test(value)) {
            const numericValue = Number(value);
            const maxAllowed = (selectedBooking?.totalAmount ?? 0) - (selectedBooking?.partialAmount ?? 0);

            if (numericValue <= maxAllowed) {
                setPaymentAmount(numericValue);
            }
        }
    };
    useEffect(() => {
        fetchBookings();
    }, [tab]);

    // Helper function to update a single booking in state
    const updateBookingInState = (
        prevBookings: Booking[],
        bookingId: string,
        updateData: Partial<Booking>
    ): Booking[] => {
        return prevBookings.map(booking =>
            booking._id === bookingId
                ? { ...booking, ...updateData }
                : booking
        );
    };

    // Helper function to check if booking should be in a different tab
    const shouldRefetchForTab = (status: string, currentTab: Tabs): boolean => {
        return (
            (status === 'Order Completed' && currentTab !== Tabs.CompletedBookings) ||
            (status !== 'Order Completed' && currentTab === Tabs.CompletedBookings)
        );
    };

    useEffect(() => {
        try {
            const socketInstance = connectSocket("test@example.com");
            setSocket(socketInstance);

            socketInstance.on("newChanges", async (data: SocketData) => {
                try {
                    if (!data.type) return;

                    if (data.status) {
                        if (data.status === 'Order Completed') {
                            console.log("status order completed", data)
                            setBookings(prev => prev.filter(booking => booking._id !== data.bookingId));
                        } else {
                            console.log("status other", data)
                            setBookings(prev => updateBookingInState(prev, data.bookingId, data.updatedBooking as Booking));
                        }
                        return;
                    } else if (data.type === 'newBooking') {
                        console.log("status other", data)
                        if (Tabs.OngoingBookings === tab && data.newBooking) {
                            setBookings(prevData => [...prevData, data.newBooking as Booking]);
                        }
                    } else {
                        console.log("else case", data)
                        const response = await axiosInstance.get(`/booking/${data.bookingId}`);
                        const updatedBooking = response.data;
                        setBookings(prev => updateBookingInState(prev, data.bookingId, updatedBooking));

                        if (shouldRefetchForTab(updatedBooking.status, tab)) {
                            fetchBookings();
                        }
                    }
                } catch (err) {
                    console.error("Error handling socket data:", err);
                }
            });

            return () => {
                socketInstance.off("newChanges");
                disconnectSocket();
            };
        } catch (error) {
            console.error("Socket setup failed:", error);
        }
    }, [tab]);

    const openFeedbackModal = async (id: string) => {
        setIsOpen(true);
        setSelectedBookingId(id)
        try {
            const response = await axiosInstance.get(`${BASE_URL}/feedback/`);
            setFeedbacks(response.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const onClose = async () => {
        setIsOpen(false);
        setSelectedBookingId('')
        setSelectedResponses({})
    };


    const handleOptionChange = (questionId: string, response: string) => {
        setSelectedResponses((prev) => ({ ...prev, [questionId]: response }));
    };

    // posting feedback

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if all feedback questions have been answered
        const allAnswered = feedbacks.every((feedback) => selectedResponses[feedback._id]);

        if (!allAnswered) {
            Swal.fire({
                icon: 'error',
                title: 'Incomplete Feedback',
                text: 'Please answer all questions before submitting.',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            return; // Stop the function if not all questions are answered
        }

        const feedbackData = feedbacks?.map((feedback) => ({
            questionId: feedback._id,
            response: selectedResponses[feedback._id] || '', // "yes" or "no"
            yesPoint: feedback.yesPoint,
            noPoint: feedback.noPoint,
        }));

        try {
            const response = await axiosInstance.put(`${BASE_URL}/booking/postfeedback/${selectedBookingId}`, { feedback: feedbackData });
            Swal.fire({
                icon: 'success',
                title: 'Feedback added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error('Error saving feedback:', error.response?.data || error.message);
            } else {
                console.error('An unexpected error occurred:', error);
            }
        }
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReceivedUser(e.target.value);
    };

    return <div>
        <div className="container-fluid">
            <div className="row">
                <div className="col-12 my-3"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Heading */}
                    <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left"> Driver Status
                    </h5>
                    {/* Search Bar */}
                    <div className="flex-grow sm:w-auto w-full ml-3">
                        <input
                            type="text"
                            onChange={(e) => debouncedFetchBookings(e.target.value)}
                            placeholder="Search..."
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white-light"
                        />
                    </div>
                </div>
            </div>
            <div className='w-full'>
                <div
                    className="border-b border-gray-200 dark:border-gray-700"
                >
                    <ul className="flex flex-wrap justify-between -mb-px text-sm font-medium text-center text-gray-5000 dark:text-gray-400">
                        <li
                            className="me-2 hover:cursor-pointer flex gap-2"
                            onClick={() => handleChangeTabs(Tabs.OngoingBookings)}
                        >
                            <span
                                className={`${Tabs.OngoingBookings === tab ? 'text-blue-600 border-b-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'hover:text-blue-600 hover:border-blue-500 dark:hover:text-blue-500 '} inline-flex items-center justify-center p-4 border-b-2  border-transparent rounded-t-lg  group text-base text-center`}
                            >
                                <IconBarChart className={`${Tabs.OngoingBookings === tab ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'hover:text-gray-600 hover:border-gray-300 '} mr-2`} />
                                Ongoing Bookings
                            </span>
                        </li>
                        <li
                            className="me-2 hover:cursor-pointer"
                            onClick={() => handleChangeTabs(Tabs.CashPendingBookings)}
                        >
                            <span
                                className={`${Tabs.CashPendingBookings === tab ? 'text-blue-600 border-b-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'hover:text-blue-600 hover:border-blue-500 dark:hover:text-blue-500 '} inline-flex items-center justify-center p-4 border-b-2  border-transparent rounded-t-lg  group text-base text-center`}
                            >
                                <IconClock className={`${Tabs.CashPendingBookings === tab ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'hover:text-gray-600 hover:border-gray-300 '} mr-2`} />
                                Cash Pending Bookings
                            </span>
                        </li>
                        <li
                            className="me-2 hover:cursor-pointer"
                            onClick={() => handleChangeTabs(Tabs.CompletedBookings)}
                        >
                            <span
                                className={`${Tabs.CompletedBookings === tab ? 'text-blue-600 border-b-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'hover:text-blue-600 hover:border-blue-500 dark:hover:text-blue-500 '} inline-flex items-center justify-center p-4 border-b-2  border-transparent rounded-t-lg  group text-base text-center`}
                            >
                                <IconListCheck className={`${Tabs.CompletedBookings === tab ? ' text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500' : 'hover:text-gray-600 hover:border-gray-300 '} mr-2`} />
                                Completed Bookings
                            </span>
                        </li>
                    </ul>
                </div>

                <div className='rounded-lg m-5'>

                    {
                        loader ? (
                            <BookingSkeleton />
                        ) : (
                            bookings?.map((booking) => (
                                <section key={booking?._id} className='shadow-lg rounded-xl w-full mt-5 bg-white dark:bg-black'>
                                    <div className="flex justify-end mr-5">
                                        <button className="font-[400] text-base mt-5 dark:text-white">
                                            Date & Time: {dateFormate(booking?.createdAt as unknown as string)}, {formattedTime(booking?.createdAt as unknown as string)}
                                        </button>
                                    </div>
                                    <ul>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>File Number :</span>
                                            <span className='w-1/2 text-end text-red-500 pr-4'>{booking?.fileNumber}</span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>Driver Name :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{booking?.driver?.name ? booking?.driver?.name : "N/A"}</span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>Driver Phone Number :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{booking?.driver?.phone ? booking?.driver?.phone : 'N/A'}</span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>Vehicle Number :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{booking?.customerVehicleNumber || "N/A"}</span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>Customer Name :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{booking?.customerName || 'N/A'}</span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white '>
                                                Customer Contact Number :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{booking?.mob1 ? booking?.mob1 : booking?.mob2 || "N/A"}
                                            </span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>Pickup Location :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{booking?.location}</span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>DropOff Location :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{booking?.dropoffLocation}</span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>Pickup Time :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{dateFormate(booking?.pickupTime)} at {formattedTime(booking?.pickupTime)}</span>
                                        </li>
                                        <li className='w-full flex flex-row mt-3 border-b'>
                                            <span className='w-1/2  font-semibold pl-4 dark:text-white'>Dropoff Time :</span>
                                            <span className='w-1/2 text-end text-gray-500 dark:text-gray-300 pr-4'>{dateFormate(booking?.dropoffTime)} at {formattedTime(booking?.dropoffTime)}</span>
                                        </li>
                                        <li className='w-full flex flex-row justify-center my-3 place-items-center'>
                                            <span className='w-1/2  font-semibold pl-4 mb-2 dark:text-white'>Status :</span>
                                            <span className='w-1/2 text-end pr-4 pt-1'>
                                                <span className={`font-medium px-2 py-1 rounded-md text-md ${statusColors[booking?.status ?? 'default'] || statusColors["default"]}`}>
                                                    {booking?.status}
                                                </span>
                                            </span>
                                        </li>
                                    </ul>
                                    {!booking.cashPending && <div className="flex items-center  justify-between my-5">
                                        <button onClick={() => navigate(`/openbooking/${booking?._id}`)}
                                            className='text-white mb-10 mx-4 flex justify-between items-center gap-2 bg-blue-500 px-10 py-1 rounded-md text-md hover:bg-blue-600'
                                        >
                                            Order Details
                                            <IconArrowLeft />
                                        </button>
                                        {
                                            !booking.feedbackCheck && booking.verified && (
                                                <button onClick={() => openFeedbackModal(booking?._id)}
                                                    className='text-white mb-10 mx-4 flex justify-between items-center gap-2 bg-green-500 px-10 py-1 rounded-md text-md hover:bg-green-600'
                                                >
                                                    Feedback
                                                </button>
                                            )
                                        }
                                    </div>}
                                    {booking.cashPending && <div className="flex justify-start my-5">
                                        <button
                                            onClick={() => handlePaymentSettlement(booking)}
                                            className='text-white mb-10 mx-4 flex justify-between items-center gap-2 bg-blue-500 px-10 py-1 rounded-md text-md hover:bg-blue-600'
                                        >
                                            Settle Payment
                                            <IconArrowLeft />
                                        </button>
                                    </div>
                                    }
                                </section>
                            ))
                        )
                    }
                    {/* {
                        !bookings.length && !loader && <EmptyData dataName={'bookings'}/>
                    } */}
                </div>
                {/* Pagination */}
                {
                    bookings.length > 0 && <ul className="flex justify-center items-center space-x-2 mt-4">
                        <li>
                            <button
                                type="button"
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="flex justify-center font-semibold p-2 rounded-full transition bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50"
                                disabled={currentPage === 1}
                            >
                                <GrPrevious />
                            </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, index) => (
                            <li key={index}>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(index + 1)}
                                    className={`px-4 py-2 rounded-full transition ${currentPage === index + 1
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-blue-300"
                                        }`}
                                >
                                    {index + 1}
                                </button>
                            </li>
                        ))}
                        <li>
                            <button
                                type="button"
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="flex justify-center font-semibold p-2 rounded-full transition bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50"
                                disabled={currentPage === totalPages}
                            >
                                <GrNext />
                            </button>
                        </li>
                    </ul>
                }
                <ReactModal
                    isOpen={showPaymentModal}
                    onRequestClose={() => {
                        setShowPaymentModal(false);
                        setPaymentAmount(0);
                    }}
                    contentLabel="Payment Settlement"
                    style={{
                        content: {
                            width: '400px',
                            height: '350px',
                            margin: 'auto',
                            padding: '20px',
                            borderRadius: '8px',
                            border: '1px solid #ccc',
                            backgroundColor: '#fff',
                        },
                        overlay: {
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        },
                    }}
                >
                    <h2 className="text-xl font-semibold">
                        Payment Settlement of {selectedBooking?.customerName}
                    </h2>
                    <div className="mt-4 flex">
                        <label className="block">Payable Amount (By Customer) : <span>
                            &#8377;{((selectedBooking?.totalAmount ?? 0) - (selectedBooking?.partialAmount ?? 0))}
                        </span>
                        </label>
                    </div>
                    {(selectedBooking?.partialAmount ?? 0) > 0 && (
                        <div>
                            <label className="block">
                                Received Amount:
                                <span className="text-blue-700">
                                    &#8377;{(selectedBooking?.partialAmount || 0)}
                                </span>
                            </label>
                        </div>
                    )}
                    <div className="mt-4">
                        <label className="block">Amount</label>
                        <input
                            type="text"
                            onChange={handleChangeAmount}
                            className="border p-2 w-full"
                        />
                    </div>
                    {paymentAmount < (((selectedBooking?.totalAmount ?? 0) - (selectedBooking?.partialAmount ?? 0))) && (
                        <div className="mt-2 text-red-500">
                            Balance Remaining: {((selectedBooking?.totalAmount ?? 0) - (selectedBooking?.partialAmount ?? 0)) - paymentAmount}
                        </div>
                    )}
                    <ul className="flex gap-3">
                        <li className="flex items-center gap-1">
                            <input
                                type="radio"
                                name="role"
                                value="Driver"
                                defaultChecked
                                onChange={handleRoleChange}
                            />
                            <label className="mt-1">Driver</label>
                        </li>
                        <li className="flex items-center gap-1">
                            <input
                                type="radio"
                                name="role"
                                value="Staff"
                                onChange={handleRoleChange}
                            />
                            <label className="mt-1">Staff</label>
                        </li>
                        <li className="flex items-center gap-1">
                            <input
                                type="radio"
                                name="role"
                                value="Showroom"
                                onChange={handleRoleChange}
                            />
                            <label className="mt-1">Showroom</label>
                        </li>
                    </ul>

                    <button
                        onClick={handleSavePayment}
                        className="bg-green-500 text-white py-2 px-4 rounded mt-4"
                    >
                        Save Payment
                    </button>
                </ReactModal>
                {/* Feedback */}
                <FeedbackModal feedbacks={feedbacks} isOpen={isOpen} onChange={handleOptionChange} onClose={onClose} onSubmit={handleSubmitFeedback} selectedResponses={selectedResponses} />
            </div>
        </div >
    </div >
}

export default Status;