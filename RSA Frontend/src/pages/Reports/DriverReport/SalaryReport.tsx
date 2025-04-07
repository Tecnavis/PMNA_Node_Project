// @ts-nocheck
import { Button } from '@mantine/core';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
import { MONTHS, MONTHS_NUMBER, YEARS_FOR_FILTER } from '../constant'
import { axiosInstance as axios, BASE_URL } from '../../../config/axiosConfig';
import IconPrinter from '../../../components/Icon/IconPrinter';
import { handlePrint } from '../../../utils/PrintInvoice';
import { Dialog, Transition } from '@headlessui/react';
import { dateFormate, formattedTime } from '../../../utils/dateUtils';
import IconCashBanknotes from '../../../components/Icon/IconCashBanknotes';
import { ROLES } from '../../../constants/roles';
import { render } from 'react-dom';

const DriverSalaryReport = () => {

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [driver, serDriver] = useState<Driver | null>(null);
    //Pagination states 
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS_NUMBER[new Date().getMonth()]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
    const [search, setSearch] = useState('');
    const [selectedBookings, setSelectedBookings] = useState<Map>(new Map());
    const [modal2, setModal2] = useState(false);
    const [startDate, setStartDate] = useState<string>('')
    const [endingDate, setEndingDate] = useState<string>('')
    const [totalCalculatedUpdatedTotalSalary, setTotalCalculatedUpdatedTotalSalary] = useState(0);
    const [totalSalaryForSelectedBooking, setTotalSalaryForSelectedBooking] = useState(0);
    const [balanceSalary, setBalanceSalary] = useState(0);
    const [showSelectedBooking, setShowSelectedBookings] = useState<boolean>(false)
    // state for update transfer state
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [updatedSalary, setUpdatedSalary] = useState<Record<string, string>>({});

    const role = localStorage.getItem('role') || '';

    const printRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const { id } = useParams();

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    const totalSalary = bookings.reduce((acc, record) => acc + record.driverSalary, 0);

    const handleEditClick = (rowId: string, currentSalary: number) => {
        setEditingRowId(rowId);
        setUpdatedSalary((prev) => ({ ...prev, [rowId]: currentSalary }));
    };

    const handleSaveClick = async (rowId: string) => {
        const newSalary = updatedSalary[rowId];

        if (newSalary === undefined || newSalary < 0) {
            return Swal.fire("Error", "Salary must be a valid positive number", "error");
        }

        const result = await Swal.fire({
            title: "Are you sure?",
            text: `You are about to update transfer salary to ${newSalary}`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, update it!"
        });
        try {

            if (result.isConfirmed) {
                await updateSalary(rowId, newSalary);
                setEditingRowId(null);
                setUpdatedSalary((prev) => ({}));
                fetchBookings()
                Swal.fire("Updated!", "Salary has been updated successfully.", "success");

            }
        } catch (error) {
            Swal.error("error!", "Salary has not updated.", "error");
        }
    };

    const updateSalary = async (bookingId: string, newSalary: number) => {
        const res = await axios.put(`${BASE_URL}/booking/${bookingId}`, { transferedSalary: +newSalary })
        return res
    };

    const handleSelectAll = () => {
        if (selectedBookings.size === bookings.length) {
            // Deselect all
            setSelectedBookings(new Map());
            setShowSelectedBookings(false)
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
    // table for selected driver salary
    const colSelectiveBookingSalary = [
        {
            accessor: "fileNumber",
            title: "File Number",
            render: (record: Booking) => (
                <span className={`${record._id === "total" && "font-bold"}`}>{
                    record._id === "total"
                        ? "Total Driver Salary" :
                        record.driverSalary
                }</span>
            )
        },
        {
            accessor: "Total Salary Amount",
            title: "driverSalary",
            render: (record: Booking) => (
                <span className={`${record._id === "total" && "font-bold"}`}>
                    {record._id === "total" ? totalSalaryForSelectedBooking : ((record.driverSalary || 0) - (record.transferedSalary || 0))}
                </span>
            )
        }
    ]
    // table structure for driver salary
    const col = [
        { accessor: '#', title: '#', render: (record, index: number) => record._id !== 'total' && index + 1 },
        {
            accessor: 'actions',
            title: (
                <label className="flex items-center mt-2">
                    <input
                        type="checkbox"
                        name="selectAll"
                        className="mr-2"
                        onChange={handleSelectAll}
                    />
                    <span className='font-bold'>Select All</span>
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
        { accessor: 'fileNumber', title: 'File Number' },
        {
            accessor: 'createdAt', title: 'Date', render: (record: Booking) => record.createdAt
                ? new Date(record.createdAt).toLocaleDateString()
                : ""

        },
        { accessor: 'serviceType.serviceName', title: 'Service Type' },
        { accessor: 'customerVehicleNumber', title: 'Customer Vehicle Number' },
        {
            accessor: 'totalDistence',
            title: 'Covered Distance',
            render: (record: Booking) => {
                return record._id === 'total' ? "Total Salary" : record.totalDistence
            }
        },
        {
            accessor: 'totalDriverSalary', title: 'Total Driver Salary', render: (record: Booking) => (
                <span style={{ color: record._id === 'total' ? 'red' : 'inherit', fontWeight: record._id === 'total' ? '600' : 'normal', fontSize: record._id === 'total' ? '1.25rem' : 'inherit' }}>
                    {record._id === 'total' ? totalCalculatedUpdatedTotalSalary : record.driverSalary}
                </span>
            )
        },
        {
            accessor: 'transferredSalary',
            title: 'Transferred Salary',
            render: (record: Booking) => {
                return (
                    <>
                        {record._id !== 'total' && (
                            <div className="flex flex-row items-center gap-2">
                                {editingRowId === record._id ? (
                                    <>
                                        <input
                                            type="number"
                                            value={updatedSalary[record._id] || 0}
                                            onChange={(e) => setUpdatedSalary((prev) => ({
                                                ...prev, [record._id]: e.target.value
                                            }))}
                                            className="border p-1 rounded w-20"
                                        />
                                        <button
                                            className="text-xs bg-green-500 py-2 px-2 rounded-md text-white"
                                            onClick={() => handleSaveClick(record._id)}
                                        >
                                            Save
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span>{record.transferedSalary || 0}</span>
                                        {
                                            (record.driverSalary - (record.transferedSalary || 0)) !== 0 && <button
                                                className="text-xs bg-primary py-2 px-2 rounded-md text-white"
                                                onClick={() => handleEditClick(record._id, (record.driverSalary - (record.transferedSalary || 0)))}
                                            >
                                                Update
                                            </button>
                                        }
                                    </>
                                )}
                            </div>
                        )}
                    </>
                );
            }
        },
        {
            accessor: 'balanceSalary', title: 'Balance Salary', render: (record: Booking) => (
                <span style={{ color: record._id === 'total' ? 'red' : 'inherit', fontWeight: record._id === 'total' ? '600' : 'normal', fontSize: record._id === 'total' ? '1.25rem' : 'inherit' }}>
                    {record._id === 'total' ? balanceSalary : record.driverSalary - (record.transferedSalary || 0)}
                </span>
            )
        },
        {
            accessor: 'viewMore',
            title: 'View More',
            render: (record: Booking) => (
                record._id !== 'total' && <button className='text-blue-500' onClick={() => navigate(`/openbooking/${record._id}`)}><IconEye /></button>
            ),
        },
    ]

    // getting drvier 
    const getDriver = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/driver/${id}`);
            serDriver(response.data);
        } catch (error) {
            console.error("API Error: ", error);
        }
    };

    //Fetch booking related driverID
    const fetchBookings = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/booking`, {
                params: {
                    driverId: id,
                    startDate,
                    endingDate,
                    verified : true,
                    search,
                    page,
                    limit: pageSize
                }
            });

            const data = response.data

            setBookings(data.bookings);
            setTotalRecords(data.total);
        } catch (error) {
            console.error("Error fetching api booking in report section : ", error)
        } finally {
            setIsLoading(false);
        }
    }

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

    const handleUpdateDriverBalance = async () => {
        try {
            const res = await axios.patch(`${BASE_URL}/booking/settle-driver-balance-salary`, {
                bookingIds: Array.from(selectedBookings.values()),
                totalAmount: totalSalaryForSelectedBooking
            });

            Swal.fire({
                title: "Success!",
                text: "Driver balance salary updated successfully.",
                icon: "success",
                confirmButtonColor: "#3085d6",
                confirmButtonText: "OK"
            });
            const selectBookings = bookings.filter((booking) => selectedBookings.has(booking._id))
            navigate('/dcpreport/driverreport/salaryreport/selectiveInvoice', {
                state: { bookings: selectBookings, role: "driver" }
            });

        } catch (error) {
            console.error(error);

            Swal.fire({
                title: "Error!",
                text: error.response?.data?.message || "Something went wrong!",
                icon: "error",
                confirmButtonColor: "#d33",
                confirmButtonText: "Try Again"
            });
        }
    };

    useEffect(() => {
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
    }, []);

    // Fetch bookings only after startDate and endingDate are updated
    useEffect(() => {
        if (startDate && endingDate) {
            fetchBookings();
        }
    }, [startDate, endingDate, selectedMonth, selectedYear]);

    // calculat the total salary
    useEffect(() => {
        const calculatedTotal = bookings.reduce((acc, booking: Booking) => {
            const driverSalary = parseFloat(booking.driverSalary) || 0; // Ensure it's a valid number
            return acc + driverSalary;
        }, 0);


        setTotalCalculatedUpdatedTotalSalary(calculatedTotal);

        if (bookings.length) {
            const total = bookings
                .reduce((acc, booking) => acc + ((booking.driverSalary || 0) - (booking.transferedSalary || 0)), 0);

            setBalanceSalary(total);
        } else {
            setBalanceSalary(0);
        }

    }, [bookings]);

    useEffect(() => {
        if (selectedBookings.size) {
            const total = bookings
                .filter((booking) => selectedBookings.has(booking._id))
                .reduce((acc, booking) => acc + ((booking.driverSalary || 0) - (booking.transferedSalary || 0)), 0);
            setTotalSalaryForSelectedBooking(total)
        }
        if (selectedBookings.size && selectedBookings.size > 0) {
            setShowSelectedBookings(true)
        } else {
            setShowSelectedBookings(false)
        }
    }, [selectedBookings])

    return (
        <div>
            <div className="pt-5">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-5 my-2 ">
                    <div className="panel">
                        {/* month , year filter */}
                        <div className="mb-5 flex justify-between items-center">
                            {/* <h5 className="font-semibold text-lg dark:text-white-light">Filter Monthly Report</h5> */}
                            <h5 className="font-semibold text-xl dark:text-white-light">
                                Salary Report
                                <span className='text-red-500 ml-1 font-bold'>
                                    {driver?.name}
                                </span>
                            </h5>
                            <div className='flex justify-end'>
                                <div className="inline-flex mb-5 mr-2">
                                    <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">
                                        {selectedMonth}
                                    </button>
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
                                    <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">
                                        {selectedYear}
                                    </button>
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
                        {/* section for driver salary data (summary) */}
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                            {/* driver salary reports */}
                            <div className="space-y-4" >
                                <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                    <div className="flex items-center justify-between p-4 py-4">
                                        <div className="grid place-content-center w-9 h-9 rounded-md bg-secondary-light dark:bg-secondary text-secondary dark:text-secondary-light">
                                            <IconShoppingBag />
                                        </div>
                                        <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                            <h6 className="text-white-dark text-base  dark:text-white-dark">
                                                Advance Amount
                                                <span className="block text-base text-[#515365] dark:text-white-light">{driver?.advance ? '₹' + driver.advance : 'No advance payment made'}</span>
                                            </h6>
                                        </div>
                                    </div>
                                </div>
                                <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                    <div className="flex items-center justify-between p-4 py-4">
                                        <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                                            <IconCashBanknotes />
                                        </div>
                                        <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                            <h6 className="text-white-dark text-base dark:text-white-dark">
                                                Salary in {selectedMonth}
                                                <span className="block text-base text-[#515365] dark:text-white-light">₹ {totalCalculatedUpdatedTotalSalary}</span>
                                            </h6>
                                        </div>
                                    </div>
                                </div>
                                <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                    <div className="flex items-center justify-between p-4 py-4">
                                        <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-green text-green-500 dark:text-info-light">
                                            <IconCashBanknotes />
                                        </div>
                                        <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                            <h6 className="text-white-dark text-base dark:text-white-dark">
                                                Balance
                                                <span className="block text-base text-[#515365] dark:text-white-light">₹ {balanceSalary}</span>
                                            </h6>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* driver cash in hand  */}
                            <div className=" w-full flex flex-col items-center justify-center border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <h5 className="font-semibold text-lg dark:text-white-light mb-3">Net Total Amount in Hand</h5>
                                <p className="text-2xl font-bold text-primary">
                                    ₹ {driver?.cashInHand}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Report Table */}
                <div className="panel mt-6">
                    <div className="flex md:items-center md:flex-row flex-col mb-5 ">
                        <div className=''>
                            <h3 className='text-lg font-semibold'>
                                Driver Salary Details
                            </h3>
                        </div>
                    </div>
                    <div className="datatables">
                        <DataTable
                            columns={col}
                            withColumnBorders
                            highlightOnHover
                            striped
                            minHeight={400}
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
                            records={[
                                ...bookings.filter((booking) => booking._id),
                                ...(Array.isArray(bookings) && bookings.length > 0
                                    ? [{
                                        _id: 'total',
                                        fileNumber: '',
                                        date: '',
                                        serviceType: '',
                                        customerVehicleNumber: '',
                                        coveredDistance: 'Total Salary',
                                        totalDriverSalary: totalCalculatedUpdatedTotalSalary,
                                        transferredSalary: 'Balance',
                                        balanceSalary: balanceSalary.toFixed(2),
                                        actions: '',
                                    }]
                                    :
                                    []
                                )]}
                        />
                    </div>
                </div>
                {
                    showSelectedBooking &&
                    <div className="panel mt-6">
                        <div className="flex md:items-center md:flex-row flex-col mb-5 ">
                            <div className=''>
                                <h3 className='text-lg font-semibold'>
                                    Selected Bookings Total Salary
                                </h3>
                            </div>
                        </div>
                        <div className="datatables">
                            <DataTable
                                columns={colSelectiveBookingSalary}
                                withColumnBorders
                                highlightOnHover
                                striped
                                minHeight={200}
                                records={[
                                    ...bookings.filter((booking) => selectedBookings.has(booking._id)),
                                    {
                                        _id: 'total',
                                        fileNumber: '',
                                        driverSalary: 0
                                    }
                                ]}
                            />
                        </div>
                        <div className='flex justify-between items-center'>
                            <h1 className='text-lg font-semibold'>Total Salary: {totalSalaryForSelectedBooking}</h1>
                            <div className="flex items-center gap-5 ltr:ml-auto rtl:mr-auto">
                                <div className='flex gap-1'>
                                    <button
                                        className='btn btn-primary'
                                        onClick={handleUpdateDriverBalance}
                                    >Confirm</button>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div>
            {/* Modal for balance applay  */}
            <div className="mb-5">
                <Transition appear show={false} as={Fragment}>
                    <Dialog as="div" open={false} onClose={() => {
                        // setModal2(false)
                        // setSelectedBookings(new Map());
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
                                            <button type="button" className="text-white-dark hover:text-dark"
                                            // onClick={() => setModal2(false)}
                                            >
                                            </button>
                                        </div>
                                        <div className="p-5 text-center">
                                            <p className=''>
                                                Total Balance : 12
                                            </p>
                                            <p className=''>
                                                Amount Received On : {dateFormate(new Date() + '')}
                                            </p>
                                            <div className="flex justify-end items-center mt-8 flex-col gap-1 w-full">
                                                <input
                                                    type="number"
                                                    className='w-full rounded-md py-2 px-3 border-gray-400 outline-1 outline-gray-300'
                                                    placeholder='Enter amount...'
                                                // value={balanceForApplay}
                                                // onChange={(e) => setBalanceForApplay((pre) => e.target.value)}
                                                />
                                                <button type="button" className="btn btn-primary w-full"
                                                // onClick={distributeReceivedAmount}
                                                >
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
export default DriverSalaryReport;
