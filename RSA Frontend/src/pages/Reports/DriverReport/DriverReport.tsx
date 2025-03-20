import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { DataTable } from 'mantine-datatable';
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

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const DriverCashCollectionsReport = () => {

    const [driver, serDriver] = useState<Driver | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>('March');
    const [selectedYear, setSelectedYear] = useState<number>(2025)

    const [startDate, setStartDate] = useState<string>('2025-03-01')
    const [endingDate, setEndingDate] = useState<string>('2025-03-31')

    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [initialRecords, setInitialRecords] = useState(bookings);
    const [inputValues, setInputValues] = useState<Record<string, number>>({});
    const [search, setSearch] = useState('');

    const { id } = useParams();
    const navigate = useNavigate();
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

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
            serDriver(response.data);
        } catch (error) {
            console.error("API Error: ", error);
        }
    };

    //Fetch booking related driverID
    const fetchBookings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/booking`, {
                params: { driverId: driver?._id, startDate, endingDate }
            });

            const data = response.data

            setBookings(data.bookings);
        } catch (error) {
            console.error("Error fetching api booking in report section : ", error)
        }
    }

    useEffect(() => {
        gettingToken();
        fetchBookings();
        getDriver();
    }, [search, endingDate, startDate])

    const updateInputValues = (bookingId: string, value: number) => {
        setInputValues((prev) => ({
            ...prev,
            [bookingId]: value,
        }));
    };

    const handleApproveClick = (record: Booking) => {

    }

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
                    <input type="checkbox" name="selectAll" className="mr-2" />
                    <span>Select All</span>
                </label>
            ),
            render: (record: Booking) =>
                record._id !== 'total' ? <input type="checkbox" /> : null
        },
        {
            accessor: 'createdAt',
            title: 'Date',
            render: (record: Booking) => new Date(record.createdAt || '').toLocaleDateString()
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
            render: (record: Booking) => <div className='flex justify-center'>{record.workType === 'PaymentWork' ? record.totalAmount : "0.00"}</div>
        },
        {
            accessor: 'receivedAmount',
            title: 'Amount Received From The Customer',
            render: (booking: Booking) => {
                return (<td key={booking._id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center' }} className='text-center'>
                        {booking.workType === 'RSAWork' && driver?.companyName !== 'Company' || booking.receivedUser === "Staff" ? (
                            <span className={`text-center ${booking.receivedUser === "Staff" ? 'text-green-600' : 'text-red-500'} `} >{booking.receivedUser === "Staff" ? "Staff Received" : "No Need"}</span>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={inputValues[booking._id] || ""}
                                    onChange={(e) => updateInputValues(booking._id, +e.target.value)}
                                    style={{
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.25rem',
                                        padding: '0.25rem 0.5rem',
                                        marginRight: '0.5rem',
                                    }}
                                    disabled={booking.approve}
                                    min="0"
                                />
                                <button
                                    // onClick={() => handleOkClick(booking._id)}
                                    disabled={booking.approve || loadingStates[booking._id]}
                                    style={{
                                        backgroundColor:
                                            Number(
                                                calculateBalance(
                                                    parseFloat(booking.totalAmount?.toString() || '0'),
                                                    inputValues[booking._id] || booking.receivedAmount || '0',
                                                    booking.receivedUser
                                                )
                                            ) === 0
                                                ? '#28a745' // Green for zero balance
                                                : '#dc3545', // Red for non-zero balance
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.25rem',
                                        padding: '0.3rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {loadingStates[booking._id] ? 'Loading...' : 'OK'}
                                </button>
                            </>
                        )}
                    </div>
                </td>)
            }
        },
        {
            accessor: 'balance',
            title: 'Balance',
            render: (booking: Booking) => {
                const effectiveReceivedAmount = booking.receivedAmount || 0;
                return (
                    <span
                        className={`
                        ${booking.workType === 'RSAWork'
                                ? 'text-green-500' // Light green for zero balance
                                : 'text-red-500' // Light red for non-zero balance
                            }
                        `}
                    >
                        {
                            booking.workType === 'RSAWork' ?
                                '0.00'
                                : calculateBalance(
                                    parseFloat(booking.totalAmount?.toString() || '0'),
                                    effectiveReceivedAmount || 0,
                                    booking.receivedUser
                                )
                        }
                    </span>
                );
            }
        },
        {
            accessor: 'approve',
            title: 'Approve',
            className: 'text-center',
            headerClassName: 'text-center',
            render: (record: Booking) =>
                record._id !== 'total' && record.workType !== 'RSAWork' ? (
                    <button
                        onClick={() => handleApproveClick(record)}
                        className={`${record.approve ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-500'} hover:${record.approve ? 'bg-green-300' : 'bg-red-300'
                            } ${record.approve ? 'cursor-not-allowed' : 'cursor-pointer'} px-4 py-2 rounded`}
                        disabled={record.approve}
                    >
                        {record.approve ? 'Approved' : 'Approve'}
                    </button>
                ) : <div className='text-green-500'>Company Work</div>
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

    const updateDateRange = (month: string, year: number) => {
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth(); // Convert month name to index

        // Start date: First day of the selected month
        const firstDay = new Date(year, monthIndex, 1);

        // End date: Last day of the selected month
        const lastDay = new Date(year, monthIndex + 1, 0);

        // Ensure proper formatting to "YYYY-MM-DD"
        setStartDate(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
        setEndingDate(lastDay.toISOString().slice(0, 10));
    };

    const calculateBalance = (amount: string | number, receivedAmount: string | number, receivedUser?: string) => {
        if (receivedUser === "Staff") {
            return 0;
        }
        const parsedAmount = Number(amount) || 0; // Convert to number safely
        const parsedReceivedAmount = Number(receivedAmount) || 0;
        const balance = parsedAmount - parsedReceivedAmount;

        return balance; // Always return a string
    };

    useEffect(() => {
        const updatedValues: Record<string, number> = {};
        bookings.forEach((booking) => {
            updatedValues[booking._id] = calculateBalance(
                parseFloat(booking.totalAmount?.toString() || "0"),
                booking.receivedAmount,
                booking.receivedUser
            );
        });
        setInputValues(updatedValues);
    }, [bookings]);


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
                                <img src={`${backendUrl}/images/${driver?.image}`} alt="img" className="w-24 h-24 rounded-full object-cover mb-5 border-2" />
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
                                <div className="inline-flex mb-5">
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
                        <div className="space-y-4">
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-4">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-secondary-light dark:bg-secondary text-secondary dark:text-secondary-light">
                                        <IconShoppingBag />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-base  dark:text-white-dark">
                                            Total Collected Amount in {selectedMonth}
                                            <span className="block text-base text-[#515365] dark:text-white-light">₹92,600</span>
                                        </h6>
                                        {/* <p className="ltr:ml-auto rtl:mr-auto text-secondary">₹92,600</p> */}
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
                                            <span className="block text-base text-[#515365] dark:text-white-light">₹37,515</span>
                                        </h6>
                                        {/* <p className="ltr:ml-auto rtl:mr-auto text-info">65%</p> */}
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
                                                <span className="block text-base text-[#515365] dark:text-white-light">₹37,515</span>
                                            </h6>
                                            {/* <p className="ltr:ml-auto rtl:mr-auto text-info">65%</p> */}
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
                        <button className='btn btn-primary'>Generate Invoice</button>
                        <div className="flex items-center gap-5 ltr:ml-auto rtl:mr-auto">
                            <div className="text-right">
                                <input type="text" className="form-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="datatables">
                        <DataTable
                            withColumnBorders
                            verticalAlignment={"center"}
                            highlightOnHover
                            striped
                            // totalRecords={bookings?.length}
                            // recordsPerPage={10}
                            // page={1}
                            // onPageChange={() => { }}
                            // recordsPerPageOptions={[10, 20, 50]}
                            // onRecordsPerPageChange={() => { }}
                            minHeight={300}
                            columns={cols}
                            records={[
                                ...bookings.map(item => ({ ...item, id: item._id }))
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverCashCollectionsReport;