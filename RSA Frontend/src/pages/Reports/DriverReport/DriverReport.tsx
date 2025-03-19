import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { sortBy } from 'lodash';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { IRootState } from '../../../store';
import Dropdown from '../../../components/Dropdown';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconShoppingBag from '../../../components/Icon/IconShoppingBag';
import IconTag from '../../../components/Icon/IconTag';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import { Driver } from '../DCPReport';
import { Booking } from '../../Bookings/Bookings';
import IconPhone from '../../../components/Icon/IconPhone';

const DriverCashCollectionsReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [driver, serDriver] = useState<Driver | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('')

    const dispatch = useDispatch();

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
                params: { driverId: driver?._id }
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
    }, [])

    useEffect(() => {
        dispatch(setPageTitle('Column Chooser Table'));
    });
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState(bookings);
    const [recordsData, setRecordsData] = useState(initialRecords);
    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'asc',
    });

    const handleOkClick = (id:string) => {

    }

    const cols = [
        {
            accessor: '_id',
            title: '#',
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
        { accessor: 'createdAt', title: 'Date', render: (record: Booking) => new Date(record.createdAt || '').toLocaleDateString() },
        { accessor: 'fileNumber', title: 'File Number' },
        { accessor: 'customerVehicleNumber', title: 'Customer Vehicle Number' },
        { accessor: 'totalAmount', title: 'Payable Amount By Customer' },
        {
            accessor: 'receivedAmount',
            title: 'Amount Received From The Customer',
            render: (booking: Booking, index: number) => (
                <td key={booking._id} >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {booking.companyBooking && booking.driver?.companyName !== 'Company' || booking.receivedUser === "Staff" ? (
                            <span style={{ color: 'red', fontWeight: 'bold' }}>Not Need</span>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={inputValues[booking._id] || booking.receivedAmount || ''}
                                    onChange={(e) => handleInputChange(booking._id, e.target.value)}
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
                                    onClick={() => handleOkClick(booking._id)}
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
                                        padding: '0.5rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {loadingStates[booking._id] ? 'Loading...' : 'OK'}
                                </button>
                            </>
                        )}
                    </div>
                </td>
            )
        },
        {
            accessor: 'balance',
            title: 'Balance',
            render: (booking: Booking) => {
                const effectiveReceivedAmount = inputValues[booking._id] || booking.receivedAmount || 0;
                return (
                    <td
                        
                        style={{
                            backgroundColor:
                                Number(calculateBalance(
                                    parseFloat(booking.totalAmount?.toString() || '0'),
                                    effectiveReceivedAmount || 0,
                                    booking.receivedUser
                                )) === 0
                                    ? '#e6ffe6' // Light green for zero balance
                                    : '#ffe6e6', // Light red for non-zero balance
                        }}
                    >
                        {calculateBalance(
                            parseFloat(booking.totalAmount?.toString() || '0'),
                            effectiveReceivedAmount || 0,
                            booking.receivedUser
                        )}
                    </td>
                );
            }
        },
        {
            accessor: 'approve',
            title: 'Approve',
            render: (record: Booking) =>
                record._id !== 'total' ? <button className="px-2 py-1 bg-green-500 text-white rounded">Approve</button> : null
        },
        {
            accessor: 'viewmore',
            title: 'View More',
            render: (record: Booking) =>
                record._id !== 'total' ? <button className="px-2 py-1 bg-blue-500 text-white rounded">View</button> : null
        }
    ];

    const calculateBalance = (amount: string | number, receivedAmount: string | number, receivedUser?: string) => {
        if (receivedUser === "Staff") {
            return '0.00';
        }
        const parsedAmount = Number(amount) || 0; // Convert to number safely
        const parsedReceivedAmount = Number(receivedAmount) || 0;
        const balance = parsedAmount - parsedReceivedAmount;

        return balance.toFixed(2); // Always return a string
    };

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        setInitialRecords(recordsData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        const data = sortBy(initialRecords, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortStatus]);

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
                                <img src={`₹{backendUrl}/images/₹{driver?.image}`} alt="img" className="w-24 h-24 rounded-full object-cover mb-5 border-2" />
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
                                    <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">All Months</button>
                                    <div className="dropdown">
                                        <Dropdown
                                            placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                            btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light h-full"
                                            button={<span className="sr-only">Filter by Month:</span>}
                                        >
                                            <ul className="!min-w-[170px]">
                                                <li><button type="button">All Months</button></li>
                                                <li><button type="button">January</button></li>
                                                <li><button type="button">February</button></li>
                                                <li><button type="button">March</button></li>
                                                <li><button type="button">April</button></li>
                                                <li><button type="button">May</button></li>
                                                <li><button type="button">June</button></li>
                                                <li><button type="button">July</button></li>
                                                <li><button type="button">August</button></li>
                                                <li><button type="button">September</button></li>
                                                <li><button type="button">October</button></li>
                                                <li><button type="button">November</button></li>
                                                <li><button type="button">December</button></li>
                                            </ul>
                                        </Dropdown>
                                    </div>
                                </div>
                                <div className="inline-flex mb-5">
                                    <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">All Years</button>
                                    <div className="dropdown">
                                        <Dropdown
                                            placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                            btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light h-full"
                                            button={<span className="sr-only">All Years</span>}
                                        >
                                            <ul className="!min-w-[170px]">
                                                <li><button type="button">All Years</button></li>
                                                <li><button type="button">2020</button></li>
                                                <li><button type="button">2021</button></li>
                                                <li><button type="button">2022</button></li>
                                                <li><button type="button">2023</button></li>
                                                <li><button type="button">2024</button></li>
                                                <li><button type="button">2025</button></li>
                                                <li><button type="button">2026</button></li>
                                                <li><button type="button">2027</button></li>
                                                <li><button type="button">2028</button></li>
                                                <li><button type="button">2029</button></li>
                                            </ul>
                                        </Dropdown>
                                    </div>
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
                                            Total Collected Amount in April
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
                                            Balance Amount To Collect in April
                                            <span className="block text-base text-[#515365] dark:text-white-light">₹37,515</span>
                                        </h6>
                                        {/* <p className="ltr:ml-auto rtl:mr-auto text-info">65%</p> */}
                                    </div>
                                </div>
                            </div>
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-4">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                                        <IconCreditCard />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-base dark:text-white-dark">
                                            Overall Amount in April
                                            <span className="block text-base text-[#515365] dark:text-white-light">₹37,515</span>
                                        </h6>
                                        {/* <p className="ltr:ml-auto rtl:mr-auto text-info">65%</p> */}
                                    </div>
                                </div>
                            </div>
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
                            className="whitespace-nowrap table-hover"
                            records={[...bookings, { id: 'total', receivedAmount: 'Total', balance: 100 }]}
                            columns={cols}
                            highlightOnHover
                            totalRecords={bookings?.length}
                            recordsPerPage={10}
                            page={1}
                            onPageChange={() => { }}
                            recordsPerPageOptions={[10, 20, 50]}
                            onRecordsPerPageChange={() => { }}
                            minHeight={400}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverCashCollectionsReport;
