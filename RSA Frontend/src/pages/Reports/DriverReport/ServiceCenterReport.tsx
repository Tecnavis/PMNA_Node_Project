import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { DataTable } from 'mantine-datatable';
import Dropdown from '../../../components/Dropdown';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconShoppingBag from '../../../components/Icon/IconShoppingBag';
import IconTag from '../../../components/Icon/IconTag';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import IconPhone from '../../../components/Icon/IconPhone';
import { MONTHS, YEARS_FOR_FILTER } from '../constant'
import { CLOUD_IMAGE } from '../../../constants/status';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

type Showroom = {
  _id: string;
  name: string;
  image: string;
  phone: string;
  advance: number;
  cashInHand: number;
  showroomId: string;
};

type Booking = {
  _id: string;
  createdAt?: string;
  fileNumber?: string;
  customerVehicleNumber?: string;
  totalAmount?: number;
  showroomAmount: number;
  receivedAmount: number | string;
  approve?: boolean;
  // add or remove fields according to showroom requirements
};
interface FilterData {
  totalCollectedAmount: number,
  overallAmount: number,
  balanceAmountToCollect: number
}
const PAGE_SIZES = [10, 20, 30, 50, 100];

const ShowroomCashCollectionsReport = () => {
  const [showroom, setShowroom] = useState<Showroom | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [search, setSearch] = useState('');
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isRtl = useSelector((state: any) => state.themeConfig.rtlClass) === 'rtl';
  // ----------------------------------
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date())
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [filterData, setFilterData] = useState<FilterData>({
    totalCollectedAmount: 0,
    overallAmount: 0,
    balanceAmountToCollect: 0
  })
  const [startDate, setStartDate] = useState<string>('2025-03-01')
  const [endingDate, setEndingDate] = useState<string>('2025-03-31')

  const printRef = useRef<HTMLDivElement>(null);
  const role = localStorage.getItem('role') || '';

  // -----------------------------------
  // Set token for API requests
  const gettingToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      navigate('/auth/boxed-signin');
    }
  };

  // Fetch showroom details
  const getShowroom = async () => {
    try {
      const response = await axios.get(`${backendUrl}/showroom/${id}`);
      setShowroom(response.data);
    } catch (error) {
      console.error("Error fetching showroom:", error);
    }
  };

  // Fetch bookings related to this showroom
  const fetchBookings = async () => {
    if (!showroom?._id) return;
    try {
      const response = await axios.get(`${backendUrl}/booking`, {
        params: {
          showroomId: showroom._id,
          startDate,
          endingDate,
          search,
          page,
          limit: pageSize
        }
      });
      setBookings(response.data.bookings);
    } catch (error) {
      console.error("Error fetching bookings for showroom:", error);
    }
  };



  useEffect(() => {
    gettingToken();
    getShowroom();
    // Optionally, fetch bookings here if showroom data is not required for the query
  }, []);

  useEffect(() => {
    if (showroom) {
      fetchBookings();
    }
  }, [showroom, startDate, endingDate, page, search, pageSize]);


  useEffect(() => {
    dispatch(setPageTitle('Showroom Cash Collection Report'));
  }, [dispatch]);

  const handleInputChange = (bookingId: string, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [bookingId]: value,
    }));
  };

  const handleOkClick = (bookingId: string) => {
    // Add logic to handle OK click for a booking (e.g., update received amount, approve payment, etc.)
  };

  // Function to calculate balance (adjust if your showroom logic is different)
  const calculateBalance = (amount: string | number, receivedAmount: string | number) => {
    const parsedAmount = Number(amount) || 0;
    const parsedReceivedAmount = Number(receivedAmount) || 0;
    return (parsedAmount - parsedReceivedAmount).toFixed(2);
  };

  const cols = [
    {
      accessor: '_id',
      title: 'Select',
      render: (_: Booking, index: number) => index + 1
    },
    {
      accessor: 'createdAt',
      title: 'Date',
      render: (record: Booking) =>
        `${new Date(record.createdAt || '').toLocaleDateString()}, ${new Date(record.createdAt || '').toLocaleTimeString()}`
    },
    { accessor: 'fileNumber', title: 'File Number' },
    {
      accessor: 'showroomAmount',
      title: 'Payable Amount From Showroom',
      render: (record: Booking) => {
        return <div className='flex gap-2'>
          <input type="number" className=' border py-2 px-2 border-gray-500 rounded-md h-9' value={record?.showroomAmount || 0} />
          <button className='bg-green-500 text-white p-2 rounded'>OK</button>
        </div>
      }
    },
    { accessor: 'insuranceAmount', title: 'Payable Insurance From Showroom' },
    {
      accessor: 'receivedAmount',
      title: 'Amount Received',
      render: (booking: Booking) => (
        <div style={{ display: 'flex', alignItems: 'center' }} className='flex gap-2'>
          <input
            type="text"
            value={inputValues[booking._id] || booking.receivedAmount || ''}
            onChange={(e) => handleInputChange(booking._id, e.target.value)}
            className=' border py-2 px-2 border-gray-500 rounded-md h-9'
            disabled={booking.approve}
          />
          <button
            onClick={() => handleOkClick(booking._id)}
            disabled={booking.approve || loadingStates[booking._id]}
            style={{
              backgroundColor:
                Number(calculateBalance(booking.totalAmount || 0, inputValues[booking._id] || booking.receivedAmount || 0)) === 0
                  ? '#28a745'
                  : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {loadingStates[booking._id] ? 'Loading...' : 'OK'}
          </button>
        </div>
      )
    },
    {
      accessor: 'balance',
      title: 'Balance',
      render: (booking: Booking) => {
        const effectiveReceivedAmount = inputValues[booking._id] || booking.receivedAmount || 0;
        return (
          <span
            style={{
              backgroundColor:
                Number(calculateBalance(booking.totalAmount || 0, effectiveReceivedAmount)) === 0
                  ? '#e6ffe6'
                  : '#ffe6e6',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem'
            }}
          >
            {calculateBalance(booking.totalAmount || 0, effectiveReceivedAmount)}
          </span>
        );
      }
    },
    {
      accessor: 'approve',
      title: 'Approve',
      render: (record: Booking) =>
        <button className="px-2 py-1 bg-green-500 text-white rounded">Approve</button>
    },
  ];
  const handleMonth = (month: string) => {
    setSelectedMonth(month);
    updateDateRange(month, selectedYear);
  };

  const handleYear = (year: number) => {
    setSelectedYear(year);
    updateDateRange(selectedMonth, year);
  };

  const updateDateRange = (month = "January", year: number) => {
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth(); // Convert month name to index

    // Start date: First day of the selected month
    const firstDay = new Date(year, monthIndex, 1);

    // End date: Last day of the selected month
    const lastDay = new Date(year, monthIndex + 1, 0);

    // Ensure proper formatting to "YYYY-MM-DD"
    setStartDate(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
    setEndingDate(lastDay.toISOString().slice(0, 10));
  };

  return (
    <div>
      <div className="pt-5">
        {/* Showroom Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="panel w-full">
            <div className="flex items-center justify-between mb-5">
              <h5 className="font-semibold text-lg dark:text-white-light">
                Showroom Cash Collection Report
              </h5>
            </div>
            <div className="mb-5 flex flex-col justify-center items-center">
              <img
                src={`${CLOUD_IMAGE}${showroom?.image}`}
                alt="Showroom"
                className="w-24 h-24 rounded-full object-cover mb-5 border-2"
              />
              <p className="font-semibold text-primary text-xl">{showroom?.name}</p>
              <span>{showroom?.showroomId}</span>
              <ul className="mt-5 flex gap-5 font-semibold text-white-dark">
                <li className="flex items-center gap-2">
                  <IconPhone className="text-black" />
                  <span>{showroom?.phone}</span>
                </li>
                <li className="flex items-center">
                  <span>Advance Payment: </span>
                  <span className="text-primary">₹{showroom?.advance || 0}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Cash in Hand Section */}
          <div className="panel w-full flex flex-col items-center justify-center">
            <h5 className="font-semibold text-lg dark:text-white-light mb-3">
              Net Total Amount in Hand
            </h5>
            <p className="text-2xl font-bold text-primary">₹{showroom?.cashInHand || 0}</p>
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
          <div className="flex flex-col md:flex-row items-center justify-between mb-5">
            <button className="btn btn-primary">Generate Invoice</button>
            <div className="mt-3 md:mt-0">
              <input
                type="text"
                className="form-input"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="datatables">
            <DataTable
              className="whitespace-nowrap table-hover"
              records={bookings.map((item) => ({ ...item, id: item._id }))}
              columns={cols}
              highlightOnHover
              totalRecords={bookings.length}
              recordsPerPage={10}
              page={page}
              onPageChange={setPage}
              recordsPerPageOptions={[10, 20, 50]}
              onRecordsPerPageChange={setPageSize}
              minHeight={400}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowroomCashCollectionsReport;
