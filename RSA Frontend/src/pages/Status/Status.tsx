import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactModal from 'react-modal'
import { debounce } from 'lodash';
import { Socket } from 'socket.io-client';
import Swal from 'sweetalert2';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { GrNext, GrPrevious } from 'react-icons/gr';
import { Booking } from '../Bookings/Bookings';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import IconArrowLeft from '../../components/Icon/IconArrowLeft';
import IconBarChart from '../../components/Icon/IconBarChart';
import { formattedTime, dateFormate } from '../../utils/dateUtils'
import IconClock from '../../components/Icon/IconClock';
import BookingSkeleton from '../../components/Skeleton/BookingSkeleton';
import IconListCheck from '../../components/Icon/IconListCheck';
import { connectSocket, disconnectSocket } from '../../utils/socket';
import FeedbackModal from '../Bookings/FeedbackModal';
import Feedbacks from '../Feedback/Feedback';

type ApiError = {
    success: false;
    errorCode: string;
    errors: Array<{ message: string }>;
};
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
    const [query, setQuery] = useState<string>('');
    const [showAll, setShowAll] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const currentTabRef = useRef<Tabs>(Tabs.OngoingBookings);

    const navigate = useNavigate();
    const role = localStorage.getItem('role') || ''
 useEffect(() => {
        currentTabRef.current = tab;
    }, [tab]);
const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    fetchBookings(query, page); // Pass current query
};

const fetchBookings = useCallback(async (search: string, page: number = 1, limit: number = 10) => {
    const abortController = new AbortController();
    
    setLoader(true);
    const currentTab = currentTabRef.current;
    
    let status: string = currentTab === Tabs.CompletedBookings
        ? 'Order Completed'
        : currentTab === Tabs.CashPendingBookings
            ? Tabs.CashPendingBookings
            : Tabs.OngoingBookings;

    try {
        const response = await axiosInstance.get(`/booking/status-based`, {
            params: {
                page,
                limit: showAll ? undefined : limit,
                search: search.trim(),
                status,
                showAll
            },
            signal: abortController.signal
        });

        if (currentTabRef.current === currentTab) {
            setBookings(response.data.bookings);
            setTotalPages(response.data.showAll ? 1 : response.data.totalPages);
            setCurrentPage(response.data.page);
        }
    } catch (error: any) {
        if (error.name === 'CanceledError') {
            console.log('Request canceled');
            return;
        }
        console.error("Error fetching bookings", error);
        if (currentTabRef.current === currentTab) {
            setBookings([]);
        }
    } finally {
        if (currentTabRef.current === currentTab) {
            setLoader(false);
        }
    }
    
    return () => abortController.abort();
}, [showAll]);

const debouncedFetchBookings = useMemo(
    () => debounce((search: string, page: number = 1) => {
        fetchBookings(search, page);
    }, 500), // Reduced to 500ms for better responsiveness
    [fetchBookings]
);
   const toggleShowAll = () => {
    setShowAll(!showAll);
    fetchBookings(query, 1, 10); // Pass current query
};
const handleChangeTabs = (tabName: Tabs) => {
    // Cancel any pending debounced searches
    debouncedFetchBookings.cancel();
    
    // Reset search and pagination
    // setQuery('');
    setCurrentPage(1);
    
    // Update tab state
    setTab(tabName);
    
    // Don't call fetchBookings here - let useEffect handle it
};
    const handlePaymentSettlement = (record: Booking) => {
        setSelectedBooking(record);
        setPaymentAmount(((selectedBooking?.totalAmount ?? 0) - (selectedBooking?.receivedAmount ?? 0)));
        setShowPaymentModal(true);
    };

    const handleSettleCashPending = async (bookingId: string) => {
         // First show confirmation dialog
    const confirmation = await Swal.fire({
        title: 'Confirm Settlement',
        text: 'Are you sure you want to settle this cash pending amount?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, settle it!',
        cancelButtonText: 'Cancel',
    });

    // If user cancels, don't proceed
    if (!confirmation.isConfirmed) {
        return;
    }

        setIsProcessing(bookingId);

        const toastId = toast.loading('Processing cash settlement...');

        try {
            const response = await axios.patch(`${BASE_URL}/booking/settle-cash-pending/${bookingId}`);

            toast.success(response.data.message || 'Cash pending settled successfully!', {
                id: toastId,
            });
 // Show success SweetAlert
        await Swal.fire({
            title: 'Success!',
            text: 'Cash pending has been settled successfully.',
            icon: 'success',
            confirmButtonColor: '#3085d6',
        });
fetchBookings(query, 1);

        } catch (error) {
            const axiosError = error as AxiosError<ApiError>;

            // Default error message
            let errorMessage = 'Failed to settle cash pending';

            if (axiosError.response) {
                // Use the first error message from the API response
                errorMessage = axiosError.response.data.errors[0]?.message || errorMessage;

            } else if (axiosError.request) {
                errorMessage = 'Network error - please check your connection';
            }

            toast.error(errorMessage, {
                id: toastId,
                duration: 5000,
            });
             // Show error SweetAlert
        await Swal.fire({
            title: 'Error!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#d33',
        });
        } finally {
            setIsProcessing(null);
        }
    };

   const handleSavePayment = async () => {
    // Convert to number and check if it's valid and greater than 0
    const amount = Number(paymentAmount);
    
    if (!amount || amount <= 0) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Amount',
            text: 'Please enter a valid amount greater than zero',
            confirmButtonColor: '#3085d6',
        });
        return;
    }

    setLoader(true);
    try {
        // You'll need to get the selected driver's ID from your state
        const driverId = selectedBooking?.driver?._id; // Or however you store the selected driver's ID
        
        const response = await axiosInstance.patch(
            `/booking/sattle-amount/${selectedBooking?._id}`, 
            { 
                partialAmount: paymentAmount, 
                receivedUser,  // 'Driver', 'Staff', or 'Showroom'
                receivedUserId: receivedUser === 'Driver' ? driverId : undefined,
                role 
            }
        );
        setShowPaymentModal(false);
        setPaymentAmount(0);
fetchBookings(query, 1);
    } catch (error) {
        console.error('Error saving payment:', error);
    } finally {
        setLoader(false);
    }
};
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
    // Clear previous bookings when tab changes to avoid showing stale data
    setBookings([]);
    fetchBookings(query, 1);
}, [tab, fetchBookings]); // Remove query from dependencies

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

                const currentTab = currentTabRef.current;

                if (data.status) {
                    if (data.status === 'Order Completed') {
                        setBookings(prev => prev.filter(booking => booking._id !== data.bookingId));
                    } else {
                        setBookings(prev => updateBookingInState(prev, data.bookingId, data.updatedBooking as Booking));
                    }
                    return;
                } else if (data.type === 'newBooking') {
                    if (Tabs.OngoingBookings === currentTab && data.newBooking) {
                        setBookings(prevData => [...prevData, data.newBooking as Booking]);
                    }
                } else {
                    const response = await axiosInstance.get(`/booking/${data.bookingId}`);
                    const updatedBooking = response.data;
                    setBookings(prev => updateBookingInState(prev, data.bookingId, updatedBooking));

                    if (shouldRefetchForTab(updatedBooking.status, currentTab)) {
                        // Use the current search query when refetching
                        fetchBookings(query, 1);
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
}, [query, fetchBookings]); // Keep query dependency

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

useEffect(() => {
    // Cancel any pending debounced calls
    debouncedFetchBookings.cancel();
    
    // Immediately clear bookings and show loader
    setBookings([]);
    setLoader(true);
    
    // Fetch new data for the current tab WITH the current search query
    fetchBookings(query, 1);
}, [tab, fetchBookings, query]); // Add query back to dependencies

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
    value={query}
    onChange={(e) => {
        const searchValue = e.target.value;
        setQuery(searchValue);
        
        // Cancel previous debounced call
        debouncedFetchBookings.cancel();
        
        // If search is empty, fetch immediately
        if (searchValue.trim() === '') {
            fetchBookings('', 1);
        } else {
            debouncedFetchBookings(searchValue, 1);
        }
    }}
    placeholder="Search..."
    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white-light"
/>
                    </div>
                </div>
            </div>
{loader && (
    <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
)}
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
                                        {booking?.partialPaymentRemark && (
                                            <li className='w-full flex flex-row mt-3 border-b'>
                                                <span className='w-1/2 font-semibold pl-4 text-violet-600 dark:text-violet-300'>
                                                    Partial Payment Remark:
                                                </span>
                                                <span className='w-1/2 text-end pr-4 text-red-600 italic dark:text-gray-300'>
                                                    {booking.partialPaymentRemark}
                                                </span>
                                            </li>
                                        )}
                                        <li className='w-full flex flex-row justify-center my-3 place-items-center'>
                                            <span className='w-1/2  font-semibold pl-4 mb-2 dark:text-white'>Status :</span>
                                            <span className='w-1/2 text-end pr-4 pt-1'>
                                                <span className={`font-medium px-2 py-1 rounded-md text-md ${statusColors[booking?.status ?? 'default'] || statusColors["default"]}`}>
                                                    {booking?.status}
                                                </span>
                                            </span>
                                        </li>
                                    </ul>
                                    {<div className="flex items-center  justify-between my-5">
                                        <button onClick={() => navigate(`/openbooking/${booking?._id}`)}
                                            className='text-white mb-2 mx-4 flex justify-between items-center gap-2 bg-blue-500 px-10 py-1 rounded-md text-md hover:bg-blue-600'
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


                                    {booking.cashPending && <div className="flex justify-between my-5">
                                        <button
                                            onClick={() => handlePaymentSettlement(booking)}
                                            className='text-white mb-10 mx-4 flex justify-between items-center gap-2 bg-blue-500 px-10 py-1 rounded-md text-md hover:bg-blue-600'
                                        >
                                            Settle Payment
                                            <IconArrowLeft />
                                        </button>
                                       {booking.partialPayment && (
    <button
        onClick={() => handleSettleCashPending(booking._id)}
        disabled={isProcessing === booking._id}
        className={`text-white mb-10 mx-4 flex justify-between items-center gap-2 px-10 py-1 rounded-md text-md ${
            isProcessing === booking._id
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600'
        }`}
    >
        {isProcessing === booking._id ? (
            <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
            </span>
        ) : (
            <>
                Settle Cash Pending
                <IconArrowLeft />
            </>
        )}
    </button>
)}
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
                    bookings.length > 0 && (
                        <div className="flex flex-col items-center mt-4">
                            <div className="flex justify-center items-center space-x-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    className={`flex justify-center font-semibold p-2 rounded-full transition ${currentPage === 1 || showAll
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                        }`}
                                    disabled={currentPage === 1 || showAll}
                                >
                                    <GrPrevious />
                                </button>

                                {!showAll && Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                                    // Show only a subset of pages for better UX
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = index + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = index + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + index;
                                    } else {
                                        pageNum = currentPage - 2 + index;
                                    }

                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`px-4 py-2 rounded-full transition ${currentPage === pageNum
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-200 text-gray-700 hover:bg-blue-300"
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    className={`flex justify-center font-semibold p-2 rounded-full transition ${currentPage === totalPages || showAll
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                        }`}
                                    disabled={currentPage === totalPages || showAll}
                                >
                                    <GrNext />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={toggleShowAll}
                                className={`mt-2 px-4 py-2 rounded-full transition ${showAll
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-green-300"
                                    }`}
                            >
                                {showAll ? "Pages" : "All"}
                            </button>


                        </div>
                    )
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
                               
                                onChange={handleRoleChange}
                            />
                            <label className="mt-1">Driver</label>
                        </li>
                        {
                            role !== 'admin' && <>
                                <li className="flex items-center gap-1">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="Staff"
                                        onChange={handleRoleChange}
                                    />
                                    <label className="mt-1">Staff</label>
                                </li>
                            </>
                        }
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
