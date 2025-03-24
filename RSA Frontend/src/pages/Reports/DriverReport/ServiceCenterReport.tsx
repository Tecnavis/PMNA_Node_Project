import { useEffect, useState } from 'react';
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

const backendUrl = import.meta.env.VITE_BACKEND_URL;

type Showroom = {
  _id: string;
  name: string;
  image: string;
  phone: string;
  advance: number;
  cashInHand: number;
  // add any additional fields as needed
};

type Booking = {
  _id: string;
  createdAt?: string;
  fileNumber?: string;
  customerVehicleNumber?: string;
  totalAmount?: number;
  receivedAmount: number | string;
  approve?: boolean;
  // add or remove fields according to showroom requirements
};

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
    try {
      const response = await axios.get(`${backendUrl}/booking`, {
        params: { showroomId: showroom?._id }
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

  // Fetch bookings when showroom data is ready
  useEffect(() => {
    if (showroom) {
      fetchBookings();
    }
  }, [showroom]);

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
      title: '#',
      render: (_: Booking, index: number) => index + 1
    },
    {
      accessor: 'createdAt',
      title: 'Date',
      render: (record: Booking) =>
        new Date(record.createdAt || '').toLocaleDateString()
    },
    { accessor: 'fileNumber', title: 'File Number' },
    { accessor: 'customerVehicleNumber', title: 'Customer Vehicle Number' },
    { accessor: 'totalAmount', title: 'Payable Amount' },
    {
      accessor: 'receivedAmount',
      title: 'Amount Received',
      render: (booking: Booking) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
                src={`${backendUrl}/images/${showroom?.image}`}
                alt="Showroom"
                className="w-24 h-24 rounded-full object-cover mb-5 border-2"
              />
              <p className="font-semibold text-primary text-xl">{showroom?.name}</p>
              <span>{showroom?._id}</span>
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

        {/* Filter Section */}
        <div className="grid grid-cols-1 gap-5 my-2">
          <div className="panel">
            <div className="mb-5 flex justify-between">
              <h5 className="font-semibold text-lg dark:text-white-light">Filter Monthly Report</h5>
              <div className="flex">
                {/* Month Filter */}
                <div className="inline-flex mb-5 mr-2">
                  <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">
                    All Months
                  </button>
                  <div className="dropdown">
                    <Dropdown
                      placement={isRtl ? 'bottom-start' : 'bottom-end'}
                      btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle"
                      button={<span className="sr-only">Filter by Month:</span>}
                    >
                      <ul className="!min-w-[170px]">
                        <li><button type="button">January</button></li>
                        <li><button type="button">February</button></li>
                        <li><button type="button">March</button></li>
                        {/* Add other months as needed */}
                      </ul>
                    </Dropdown>
                  </div>
                </div>
                {/* Year Filter */}
                <div className="inline-flex mb-5">
                  <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">
                    All Years
                  </button>
                  <div className="dropdown">
                    <Dropdown
                      placement={isRtl ? 'bottom-start' : 'bottom-end'}
                      btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle"
                      button={<span className="sr-only">Filter by Year:</span>}
                    >
                      <ul className="!min-w-[170px]">
                        <li><button type="button">2020</button></li>
                        <li><button type="button">2021</button></li>
                        <li><button type="button">2022</button></li>
                        {/* Add other years as needed */}
                      </ul>
                    </Dropdown>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards (Optional) */}
            <div className="space-y-4">
              <div className="border rounded dark:bg-[#1b2e4b] p-4">
                <div className="flex items-center">
                  <div className="w-9 h-9 rounded-md bg-secondary-light flex items-center justify-center">
                    <IconShoppingBag />
                  </div>
                  <div className="ml-4">
                    <h6 className="text-white-dark">Total Collected Amount</h6>
                    <span className="text-[#515365]">₹xx,xxx</span>
                  </div>
                </div>
              </div>
              {/* Add more summary cards as needed */}
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
