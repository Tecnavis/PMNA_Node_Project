// @ts-nocheck
import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { DataTable } from 'mantine-datatable';
import Swal from 'sweetalert2'
import { IRootState } from '../../../store';
import Dropdown from '../../../components/Dropdown';
import IconShoppingBag from '../../../components/Icon/IconShoppingBag';
import IconTag from '../../../components/Icon/IconTag';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import { Driver } from '../DCPReport';
import { Booking } from '../../Bookings/Bookings';
import IconPhone from '../../../components/Icon/IconPhone';
import IconEye from '../../../components/Icon/IconEye';
import { MONTHS, YEARS_FOR_FILTER } from '../constant'
import { BASE_URL } from '../../../config/axiosConfig';
import IconPrinter from '../../../components/Icon/IconPrinter';
import { handlePrint } from '../../../utils/PrintInvoice';
import { Dialog, Transition } from '@headlessui/react';
import { dateFormate } from '../../../utils/dateUtils';
import { ROLES } from '../../../constants/roles';
import { CLOUD_IMAGE, NON_COMPLETED_STATUS } from '../../../constants/status';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

interface FilterData {
    totalCollectedAmount: number,
    overallAmount: number,
    balanceAmountToCollect: number
}

const DriverCashCollectionsReport = () => {

    const [driver, serDriver] = useState<Driver | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date())
    );
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
    const [filterData, setFilterData] = useState<FilterData>({
        totalCollectedAmount: 0,
        overallAmount: 0,
        balanceAmountToCollect: 0
    })
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth(); // 0-indexed
    const month = String(monthIndex + 1).padStart(2, '0'); // convert to 01–12

    const lastDay = new Date(year, monthIndex + 1, 0).getDate(); // Get actual last day
    const paddedLastDay = String(lastDay).padStart(2, '0');

    const [startDate, setStartDate] = useState<string>(`${year}-${month}-01`);
    const [endingDate, setEndingDate] = useState<string>(`${year}-${month}-${paddedLastDay}`);

    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [initialRecords, setInitialRecords] = useState(bookings);
    const [inputValues, setInputValues] = useState<Record<string, number>>({});
    const [totalBalance, setTotalBalance] = useState<string, number>(0);
    const [balanceForApplay, setBalanceForApplay] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedBookings, setSelectedBookings] = useState<Map>(new Map());
    const [modal2, setModal2] = useState(false);
    const [totalSelectedBalance, setTotalSelectedBalance] = useState<string>('0.00');
    //Pagination states 
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const { id } = useParams();
    const navigate = useNavigate();
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;
    const printRef = useRef<HTMLDivElement>(null);
    const role = localStorage.getItem('role') || '';

    // checking the token
    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            navigate('/auth/boxed-signin');
        }
    };

    // getting drvier 
    const getDriver = async () => {
        try {
            const response = await axios.get(`${backendUrl}/driver/${id}`);

            console.log(response.data)

            serDriver(response.data);
        } catch (error) {
            console.error("API Error: ", error);
        }
    };

    //Fetch booking related driverID
    const fetchBookings = async () => {
        setIsLoading(true);
        const forDriverReport = true
        try {
            const response = await axios.get(`${backendUrl}/booking`, {
                params: {
                    driverId: id,
                    startDate,
                    endingDate,
                    search,
                    page,
                    forDriverReport,
                    limit: pageSize,
                    status: NON_COMPLETED_STATUS
                }
            });

            const data = response.data
            const totalBalanceCalculated = (data.bookings || []).reduce(
                (total, booking) => total + (booking.totalAmount - booking.receivedAmount),
                0
            );

            setTotalBalance(totalBalanceCalculated);
            setBookings(data.bookings);
            setTotalBalance(data.balanceAmount || 0);
            setTotalRecords(data.total);
            setFilterData({
                balanceAmountToCollect: data.financials.balanceAmountToCollect,
                overallAmount: data.financials.overallAmount,
                totalCollectedAmount: data.financials.totalCollectedAmount
            })
        } catch (error) {
            console.error("Error fetching api booking in report section : ", error)
        } finally {
            setIsLoading(false);
        }
    }

    const updateInputValues = (bookingId: string, value: number) => {
        setInputValues((prev) => ({
            ...prev,
            [bookingId]: value,
        }));
    };

    const handleApproveClick = async (record: Booking) => {
        // Check if receivedAmount is not zero
        if (calculateBalance(
            parseFloat(record.totalAmount?.toString() || '0'),
            record.receivedAmount || 0,
            record.receivedUser
        ) !== 0) {
            Swal.fire({
                title: 'Balance Amount Not Zero',
                text: 'The balance amount needs to be zero before approving this booking.',
                icon: 'error',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK',
            });
            return; // Stop further execution
        }

        // Proceed with approval if receivedAmount is zero
        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to approve this booking?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, approve it!',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await axios.patch(`${BASE_URL}/booking/update-approve/${record._id}`);
                    fetchBookings(); // Refresh the bookings list
                    Swal.fire('Approved!', 'The booking has been approved.', 'success');
                } catch (error) {
                    console.error('Error approving booking:', error);
                    Swal.fire('Error!', 'Failed to approve the booking.', 'error');
                }
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedBookings.size === bookings.length) {
            // Deselect all
            setSelectedBookings(new Map());
        } else {
            // Select all
            const allIds = new Map(
                bookings
                    .filter(booking => !booking.approved)
                    .map((booking) => [booking._id, booking])
            );
            setSelectedBookings(new Map(allIds));
            if (![ROLES.VERIFIER].includes(role)) {
                setModal2(true)
            }
        }
    };

    //Handle navigation for invoice
    const handleGenerateInvoices = () => {
        // Collect selected bookings
        const selected = bookings.filter((booking) => selectedBookings.has(booking._id));
        // Navigate to the invoice generation page or handle the invoice generation here
        if (selected.length > 0) {
            navigate('/showroom-cashcollection/selectiveInvoice', { state: { bookings: selected, role: "driver" } });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Please select any booking',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            })
        }
    };

    const cols = [
        {
            accessor: '_id',
            title: '#',
            className: 'text-center',
            headerClassName: 'text-center',
            render: (_: Booking, index: number) => index + 1
        },
        {
            accessor: 'selectall',
            title: (
                <label className="flex items-center mt-2">
                    <input
                        type="checkbox"
                        name="selectAll"
                        className="mr-2"
                        onChange={handleSelectAll}
                    />
                    <span>Select All</span>
                </label>
            ),
            render: (record: Booking) =>
                record._id !== 'total' ? <input
                    type="checkbox"
                    disabled={record.approve}
                    checked={selectedBookings.has(record._id)}
                    onChange={() => {
                        if (record.approve) return; // Prevent state update if disabled
                        setSelectedBookings((prevSelected) => {
                            const updatedSelection = new Set(prevSelected);
                            if (updatedSelection.has(record._id)) {
                                updatedSelection.delete(record._id);
                            } else {
                                updatedSelection.add(record._id);
                            }
                            return updatedSelection;
                        });
                    }}
                /> : null
        },
     {
    accessor: 'createdAt',
    title: 'Date',
    render: (record: Booking) => record.createdAt
        ? new Date(record.createdAt).toLocaleDateString('en-GB') // DD/MM/YYYY format
        : ""
},
        {
            accessor: 'fileNumber',
            title: 'File Number',
            className: 'text-center',
            headerClassName: 'text-center',
        },
        {
            accessor: 'customerVehicleNumber',
            title: 'Customer Vehicle Number',
            className: 'text-center',
            headerClassName: 'text-center',
            render: (record: Booking) => <div className='flex justify-center'>{record.customerVehicleNumber}</div>
        },
       {
  accessor: 'totalAmount',
  title: 'Payable Amount By Customer',
  render: (record: Booking) => (
    <div className='flex justify-center'>
      {record.workType === 'PaymentWork' ? record.totalAmount : "0.00"}
      {record.cashPending && record.partialPayment && (
        <>
         
          <span className="text-green-600 font-semibold">
             {` (Partialy Received : (${record.partialAmount} `} 
            By {record.receivedUser} {`)`}
          </span>
         
        </>
      )}
    </div>
  )
}
,
       {
    accessor: 'receivedAmount',
  title: 'Amount Received From The Driver',
render: (booking: Booking) => {
    if (booking._id === 'total') {
        return <span className='font-semibold text-lg w-full flex justify-center text-center'>Total</span>
    } else if (booking.cashPending) {
        return <span className='ml-5 flex justify-center items-center text-center w-full text-red-500'>
            Cash is pending...
        </span>
    } else if (booking.totalAmount == booking.receivedAmount) {
        return <div className='flex justify-center items-center text-center w-full bg-yellow-100 p-2 rounded'>
            {booking.receivedAmount}
        </div>
    } else {
        // Calculate amounts based on payment flow
        const driverReceivedAmount = booking.receivedAmountDriver || 0;
        const staffReceivedAmount = booking.receivedAmountStaff || 0;
        
        // Determine payment flow direction
        const isDriverToStaff = booking.receivedUser === "Staff" && booking.previousReceivedUser === "Driver";
        const isStaffToDriver = booking.receivedUser === "Driver" && booking.previousReceivedUser === "Staff";
        
        return (
            <td key={booking._id} className='flex justify-center items-center text-center w-full'>
                <div className='flex justify-center items-center text-center w-full'>
                    {booking.workType === 'RSAWork' && driver?.companyName !== 'Company' || booking.receivedUser === "Staff" ? (
                        <span className={`flex flex-col justify-center items-center text-center w-full ${
                            booking.receivedUser === "Staff" 
                                ? booking.partialReceivedAmountStaff 
                                    ? 'text-blue-600'  // Blue for partially received
                                    : 'text-green-600' // Green for fully received
                                : 'text-red-500'
                        }`}>
                            {isStaffToDriver ? (
                                <>
                                    <span>Driver Received: ₹{driverReceivedAmount}</span>
                                    <span className="text-sm">(Staff Paid: ₹{staffReceivedAmount})</span>
                                </>
                            ) : isDriverToStaff ? (
                                <>
                                    <span>Staff Received: ₹{staffReceivedAmount}</span>
                                    <span className="text-sm">(Driver Received: ₹{driverReceivedAmount})</span>
                                </>
                            ) : booking.receivedUser === "Staff" ? (
                                <>
                                    {booking.partialReceivedAmountStaff 
                                        ? "Staff Partially Received" 
                                        : "Staff Received"}
                                    <br />
                                    <span className="text-sm font-medium">
                                        (₹{staffReceivedAmount})
                                    </span>
                                </>
                            ) : "No Need"}
                        </span>
                    ) : (
                        <>
                            <input
                                type="number"
                                value={inputValues[booking._id] || 0}
                                onChange={(e) => updateInputValues(booking._id, +e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 mr-2 w-20"
                                disabled={booking.approve}
                                min="0"
                            />
                            <button
                                onClick={() => [ROLES.VERIFIER].includes(role) ? null : handleUpdateAmount(booking._id)}
                                disabled={booking.approve || loadingStates[booking._id]}
                                className={`px-3 py-1 rounded text-white ${
                                    Number(
                                        calculateBalance(
                                            parseFloat(booking.totalAmount?.toString() || '0'),
                                            inputValues[booking._id] || booking.receivedAmount || '0',
                                            booking.receivedUser,
                                            booking.partialReceivedAmountStaff, 
                                            booking.receivedAmountStaff
                                        )
                                    ) === 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                            >
                                {loadingStates[booking._id] ? 'Loading...' : 'OK'}
                            </button>
                        </>
                    )}
                </div>
            </td>
        )
    }
}
},
       {
  accessor: 'balance',
  title: 'Balance',
  render: (booking: Booking) => {
    if (booking._id === 'total') {
      return (
        <div className="font-semibold text-lg text-blue-600 flex items-center justify-center text-center">
          {filterData.balanceAmountToCollect || 0}
        </div>
      );
    }

    if (booking.cashPending) {
      return <div className='text-center'>0</div>;
    }

    // Handle Staff payments
    if (booking.receivedUser === 'Staff') {
          // New condition for multiple received users both being Staff
      if (booking.multipleReceivedUser === true && 
          booking.receivedUser === 'Staff' && 
          booking.previousReceivedUser === 'Driver') {
        return <div className='text-center'>0</div>;
      }
      const effectiveReceivedAmount = 
  (booking.receivedAmountDriver === booking.receivedAmount && 
   booking.receivedAmountStaff === booking.givenAmountByStaff)
    ? booking.totalAmount
    : booking.receivedAmount;
    //   if (booking.partialReceivedAmountStaff === false) {
    //     return <div className='text-center'>0</div>;
    //   }
    if (booking.receivedUser === 'Staff' && 
    booking.multipleReceivedUser === true && 
    booking.previousReceivedUser === 'Driver') {
  return <div className='text-center'>{(booking.receivedAmountDriver || 0).toFixed(2)}</div>;
}
      if (booking.partialReceivedAmountStaff === true) {
        const balance = booking.totalAmount - (booking.receivedAmountStaff || 0);
        return (
          <span className="text-red-500 flex items-center justify-center text-center">
            {balance.toFixed(2)}
          </span>
        );
      }
    }


    // Handle regular payments
    const effectiveReceivedAmount = booking.receivedAmount || 0;
    const effectivePartialAmount = booking.partialAmount || 0;
    
    const balance = booking.workType === 'RSAWork'
      ? 0
      : booking.cashPending && booking.partialPayment
        ? (booking.totalAmount - effectivePartialAmount)
        : (booking.totalAmount - effectiveReceivedAmount);

    return (
      <span className={`text-red-500 flex items-center justify-center text-center`}>
        {balance.toFixed(2)}
      </span>
    );
  }
},
        {
            accessor: 'approve',
            title: 'Approve',
            className: 'text-center',
            headerClassName: 'text-center',
            render: (record: Booking) => {
                if (record._id === 'total') {
                    return ""
                } else {
                    return record._id !== 'total' && record.workType !== 'RSAWork' ? (
                        <button
                            onClick={() => handleApproveClick(record)}
                            className={`${record.accountantVerified ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-500'} hover:${record.accountantVerified ? 'bg-green-300' : 'bg-red-300'
                                } ${record.accountantVerified ? 'cursor-not-allowed' : 'cursor-pointer'} px-4 py-2 rounded`}
                            disabled={record.accountantVerified}
                        >
                            {record.accountantVerified ? 'Approved' : 'Approve'}
                        </button>
                    ) : <div className='text-green-500'>Company Work</div>
                }
            }
        },
        {
            accessor: 'viewmore',
            title: 'View More',
            render: (record: Booking) =>
                record._id !== 'total' ?
                    <div className='flex justify-center' onClick={() => navigate(`/openbooking/${record._id}`)}> <IconEye /></div>
                    :
                    null
        }
    ];

    const handleMonth = (month: string) => {
        setSelectedMonth(month);
        updateDateRange(month, selectedYear);
    };

    const handleYear = (year: number) => {
        setSelectedYear(year);
        updateDateRange(selectedMonth, year);
    };

    const updateDateRange = (month: string = '1', year: number) => {
        if (month === 'All Months') {
            const today = new Date();
            const twoYearsAgo = new Date(today.getFullYear() - 2, 0, 1); // Jan 1st, two years ago

            setStartDate(twoYearsAgo.toISOString().slice(0, 10)); // YYYY-MM-DD
            setEndingDate(today.toISOString().slice(0, 10)); // today
        } else {
            const monthIndex = new Date(`${month} 1, ${year}`).getMonth(); // Convert to 0-index

            // Get the last day of the selected month using 0th day of the next month
            const lastDay = new Date(year, monthIndex + 1, 0).getDate(); // e.g., 29 for Feb (leap), 30, or 31

            const paddedMonth = String(monthIndex + 1).padStart(2, '0');
            const paddedLastDay = String(lastDay).padStart(2, '0');

            const start = `${year}-${paddedMonth}-01`;
            const end = `${year}-${paddedMonth}-${paddedLastDay}`;

            setStartDate(start);
            setEndingDate(end);
        }
    };
// --------------------------------

  const calculateBalance = (
  amount: string | number, 
  receivedAmount: string | number, 
  receivedUser?: string,
  partialReceivedAmountStaff?: boolean,
  receivedAmountStaff?: string | number // Add this parameter
) => {
  // If Staff payment is fully received, balance is 0
  if (receivedUser === "Staff" && partialReceivedAmountStaff === false) {
    return 0;
  }
  
  // If Staff payment is partially received, use receivedAmountStaff for calculation
  if (receivedUser === "Staff" && partialReceivedAmountStaff === true) {
    const parsedAmount = Number(amount) || 0;
    const parsedReceivedAmountStaff = Number(receivedAmountStaff) || 0;
    return parsedAmount - parsedReceivedAmountStaff;
  }
  
  // For all other cases, use regular receivedAmount
  const parsedAmount = Number(amount) || 0;
  const parsedReceivedAmount = Number(receivedAmount) || 0;
  return parsedAmount - parsedReceivedAmount;
};

    const handleUpdateAmount = async (id: string) => {
        const updatingBooking = bookings.filter((booking) => booking._id === id)
        const receivedAmount = inputValues[id]

        if (!receivedAmount || receivedAmount <= 0) return;

        if ((updatingBooking.totalAmount - updatingBooking.receivedAmount) === 0) {
            Swal.fire('Error!', 'Full amount receved successfully.', 'error');
        }

        try {
            const res = await axios.patch(`${BASE_URL}/booking/sattle-amount/${id}`, { receivedAmount });
            fetchBookings();
            Swal.fire('Balance!', 'The booking balance amount updated.', 'success');
        } catch (error) {
            console.error('Error updatebalnce amount:', error);
            Swal.fire('Error!', 'Failed to update balance amount in booking.', 'error');
        }
    }


    // Calculate the total selected bookings
const calculateTotalSelectedBalance = () => {
    let totalBalances = 0;
    
    // Iterate over selected bookings (Map values)
    selectedBookings.forEach((booking) => {
        if (booking && 
            booking.status === "Order Completed" && 
            !booking.cashPending && 
            booking.workType !== 'RSAWork'
        ) {
            console.log(booking.status, booking.cashPending, booking.workType);
            
            let balance = 0;
            
            if (booking.receivedUser === 'Staff') {
                // Handle Staff payments
                if (booking.partialReceivedAmountStaff === true) {
                    balance = booking.totalAmount - (booking.receivedAmountStaff || 0);
                }
                // If partialReceivedAmountStaff is false, balance remains 0
            } else {
                // Handle non-Staff payments
                balance = booking.totalAmount - (booking.receivedAmount || 0);
            }
            
            totalBalances += isNaN(balance) ? 0 : balance;
        }
    });

    setTotalSelectedBalance(totalBalances.toFixed(2));
};

    //distribute the received balance amount
    const distributeReceivedAmount = async () => {
        try {
            const bookingIds = []
            selectedBookings.forEach((booking) => {
                if (!booking) return;
                bookingIds.push(booking._id)
            })
            const res = await axios.patch(`${BASE_URL}/booking/distribute-amount`, {
                receivedAmount: balanceForApplay,
                driverId: id,
                bookingIds,
            })
            fetchBookings();
            setSelectedBookings(new Map());
            setModal2(false)
            setBalanceForApplay('')
        } catch (error) {
            console.log(error.message, 'error in distribute received amount')
        }
    }

    useEffect(() => {
        const updatedValues: Record<string, number> = {};
        bookings.forEach((booking) => {
            updatedValues[booking._id] = booking.receivedAmount;
        });
        setInputValues(updatedValues);
    }, [bookings]);

    useEffect(() => {
        gettingToken();
        getDriver();
        // Calculate the first and last day of the current month
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const firstDay = new Date(year, month, 2).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

        // Update the state
        setStartDate(firstDay);
        setEndingDate(lastDay);
    }, [])

    useEffect(() => {
        if (startDate && endingDate) {
            fetchBookings();
        }
    }, [page, pageSize, id, startDate, endingDate, search]);

    useEffect(() => {
        if (selectedBookings.size > 0) {
            calculateTotalSelectedBalance();
        }
    }, [selectedBookings]);

    return (
        <div>
            <div className="pt-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 w-full">
                    {/* DriverCashCollectionsReport Section */}
                    <div className="panel w-full">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Cash Collection Report</h5>
                        </div>
                        <div className="mb-5">
                            <div className="flex flex-col justify-center items-center">
                                <img src={`${CLOUD_IMAGE}/${driver?.image}`} alt="img" className="w-24 h-24 rounded-full object-cover mb-5 border-2" />
                                <p className="font-semibold text-primary text-xl">{driver?.name}</p>
                                <span className="whitespace-nowrap" dir="ltr">
                                    {driver?.idNumber}
                                </span>
                            </div>
                            <ul className="mt-5 flex flex-row  m-auto  font-semibold text-white-dark items-center justify-center gap-5">
                                <li className="flex items-center gap-2">
                                    <IconPhone className='text-black' />
                                    <span dir="ltr">
                                        {driver?.phone}
                                    </span>
                                </li>
                                <li className="flex ">
                                    <span>Advance Payment :  </span>
                                    <span className='text-primary'>
                                        ₹{driver?.advance || 0}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Cash in Hand Section */}
                    <div className="panel w-full flex flex-col items-center justify-center">
                        <h5 className="font-semibold text-lg dark:text-white-light mb-3">Net Total Amount in Hand</h5>
                        <p className="text-2xl font-bold text-primary">₹{driver?.cashInHand || 0}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-5 my-2 ">
                    <div className="panel">
                        <div className="mb-5 flex justify-between">
                            <h5 className="font-semibold text-lg dark:text-white-light">Filter Monthly Report</h5>
                            <div className='flex justify-end'>
                                <div className="inline-flex mb-5 mr-2">
                                    <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">{selectedMonth}</button>
                                    <div className="dropdown">
                                        <Dropdown
                                            placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                            btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light h-full"
                                            button={<span className="sr-only">Filter by Month:</span>}
                                        >
                                            <ul className="!min-w-[170px]">
                                                {
                                                    MONTHS.map((month: string, index: number) => (
                                                        <li
                                                            key={index}
                                                        >
                                                            <button
                                                                onClick={() => handleMonth(month)}
                                                                type="button"
                                                            >
                                                                {month}
                                                            </button>
                                                        </li>
                                                    ))
                                                }
                                            </ul>
                                        </Dropdown>
                                    </div>
                                </div>
                                <div className="inline-flex mb-5 dropdown">
                                    <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">{selectedYear}</button>
                                    <Dropdown
                                        placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                        btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light h-full"
                                        button={<span className="sr-only">All Years</span>}
                                    >
                                        <ul className="!min-w-[170px]">
                                            <li><button type="button">All Years</button></li>
                                            {
                                                YEARS_FOR_FILTER.map((year: number, index: number) => (
                                                    <li key={index}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleYear(year)}
                                                        >
                                                            {year}
                                                        </button>
                                                    </li>
                                                ))
                                            }
                                        </ul>
                                    </Dropdown>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4" ref={printRef}>
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-4">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-secondary-light dark:bg-secondary text-secondary dark:text-secondary-light">
                                        <IconShoppingBag />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-base  dark:text-white-dark">
                                            Total Collected Amount in {selectedMonth}
                                            <span className="block text-base text-[#515365] dark:text-white-light">₹{filterData.totalCollectedAmount}</span>
                                        </h6>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-4">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                                        <IconTag />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-base dark:text-white-dark">
                                            Balance Amount To Collect in {selectedMonth}
                                            <span className="block text-base text-[#515365] dark:text-white-light">₹{filterData.balanceAmountToCollect}</span>
                                        </h6>
                                    </div>
                                </div>
                            </div>
                            {
                                (selectedMonth && selectedMonth !== 'All Months') && <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                    <div className="flex items-center justify-between p-4 py-4">
                                        <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                                            <IconCreditCard />
                                        </div>
                                        <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                            <h6 className="text-white-dark text-base dark:text-white-dark">
                                                Overall Amount in {selectedMonth}
                                                <span className="block text-base text-[#515365] dark:text-white-light">₹{filterData.overallAmount}</span>
                                            </h6>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
                {/* Report Table */}
                <div className="panel mt-6">
                    <div className="flex md:items-center md:flex-row flex-col mb-5 ">
                        <div className='flex gap-1'>
                            <button className='btn btn-primary' onClick={handleGenerateInvoices}>Generate Invoice</button>
                            <button
                                className='btn btn-primary'
                                onClick={() => handlePrint(printRef, selectedYear, selectedMonth, role, driver?.name, bookings, filterData.totalCollectedAmount, filterData.balanceAmountToCollect)}
                            ><IconPrinter />Print</button>
                        </div>
                        <div className="flex items-center gap-5 ltr:ml-auto rtl:mr-auto">
                            <div className="text-right">
                                <input type="text" className="form-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="datatables">
                        <DataTable
                            fetching={isLoading}
                            totalRecords={totalRecords}
                            recordsPerPage={pageSize}
                            page={page}
                            onPageChange={(p) => setPage(p)}
                            recordsPerPageOptions={[10, 20, 50]}
                            onRecordsPerPageChange={(newPageSize) => {
                                setPageSize(newPageSize);
                                setPage(1);
                            }}
                            withColumnBorders
                            highlightOnHover
                            striped
                            minHeight={300}
                            columns={cols}
                            rowClassName={(record) =>
                                record.approve ? classes.disabledRow : ''
                            }
                            records={[
                                ...(bookings || [])?.map(item => ({ ...item, id: item._id })),
                                ...(Array.isArray(bookings) && bookings.length > 0
                                    ? [{ _id: 'total', id: 'total', isTotalRow: true } as Booking]
                                    : [])
                            ]}
                        />
                    </div>
                </div>
            </div>
            {/* Modal for balance applay  */}
            <div className="mb-5">
                <Transition appear show={modal2} as={Fragment}>
                    <Dialog as="div" open={modal2} onClose={() => {
                        setModal2(false)
                        setSelectedBookings(new Map());
                    }}>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0" />
                        </Transition.Child>
                        <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                            <div className="flex items-center justify-center min-h-screen px-4">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
                                >
                                    <Dialog.Panel as="div" className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-md my-8 text-black dark:text-white-dark">
                                        <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                            <button type="button" className="text-white-dark hover:text-dark" onClick={() => setModal2(false)}>
                                            </button>
                                        </div>
                                        <div className="p-5 text-center">
                                            <p className=''>
                                                Total Balance : {totalSelectedBalance}
                                            </p>
                                            <p className=''>
                                                Amount Received On : {dateFormate(new Date() + '')}
                                            </p>
                                            <div className="flex justify-end items-center mt-8 flex-col gap-1 w-full">
                                                <input
                                                    type="number"
                                                    className='w-full rounded-md py-2 px-3 border-gray-400 outline-1 outline-gray-300'
                                                    placeholder='Enter amount...'
                                                    value={balanceForApplay}
                                                    onChange={(e) => setBalanceForApplay((pre) => e.target.value)}
                                                />
                                                <button type="button" className="btn btn-primary w-full" onClick={distributeReceivedAmount}>
                                                    Apply amount
                                                </button>
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>
            </div>
        </div>
    );
};

export default DriverCashCollectionsReport;