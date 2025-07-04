import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CLOUD_IMAGE } from '../../constants/status';
import { ROLES } from '../../constants/roles';
import Tippy from '@tippyjs/react';
import { IconInfoCircle, IconX } from '@tabler/icons-react';
import { Modal } from '@mui/material';
import './StaffReport.css';
// Update your interface
interface CashCollectionDetail {
    _id: string;
    currentCashInHand: number;
    totalStaffAmount: number;
    givenAmountToStaff: number;
    balance: string | number; // Can be either string or number
    createdAt: string;
}

interface CashCollectionTotals {
    totalDriverGiven: number;
    totalStaffGiven: number;
    totalBalance: number;
}
interface Staff {
    _id: string;
    name: string;
    email: string;
    address: string;
    phone: string;
    userName: string;
    password: string;
    image?: string;
    cashInHand?: number;
    role?: string; // Add role as a top-level property
}

const StaffReport = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Set page title
    useEffect(() => {
        dispatch(setPageTitle('Staff Report'));
    }, [dispatch]);

    // Pagination and sorting state
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'name',
        direction: 'asc',
    });
    const role = localStorage.getItem('role') || '';

    // Staff data state
    const [staffs, setStaffs] = useState<Staff[]>([]);
    const [recordsData, setRecordsData] = useState<Staff[]>([]);
  // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cashCollectionDetails, setCashCollectionDetails] = useState<CashCollectionDetail[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isLoading, setIsLoading] = useState(false);
const [modalPage, setModalPage] = useState(1);
const [modalPageSize, setModalPageSize] = useState(10);
const [totalModalRecords, setTotalModalRecords] = useState(0);
const [totals, setTotals] = useState<CashCollectionTotals>({
    totalDriverGiven: 0,
    totalStaffGiven: 0,
    totalBalance: 0
});
    // Fetch staffs from backend using the filtered endpoint
    const fetchStaffs = async (search = '') => {
        try {
            const response = await axios.get(`${backendUrl}/staff/filtered`, {
                params: { search },
            });
            console.log('Fetched Staffs:', response.data); // Debugging

            setStaffs(response.data);
        } catch (error) {
            console.error('Error fetching staffs:', error);
        }
    };
   // Update your fetch function
// Update your fetch function with proper typing
const fetchCashCollectionDetails = async (staffId: string, page = 1, pageSize = 10) => {
    setIsLoading(true);
    try {
        const response = await axios.get(`${backendUrl}/cash-received-details-staff`, {
            params: { 
                staffId,
                page,
                pageSize
            },
        });
        
        // Convert string balances to numbers if needed with proper typing
        const dataWithNumericBalances = response.data.data.map((item: CashCollectionDetail) => ({
            ...item,
            balance: typeof item.balance === 'string' ? parseFloat(item.balance) : item.balance
        }));
        
        setCashCollectionDetails(dataWithNumericBalances);
        setTotals(response.data.totals);
        setTotalModalRecords(response.data.pagination.total);
        setIsModalOpen(true);
    } catch (error) {
        console.error('Error fetching cash collection details:', error);
    } finally {
        setIsLoading(false);
    }
};

// Update your handleInfoClick function
const handleInfoClick = (staff: Staff) => {
    setSelectedStaff(staff);
    setModalPage(1); // Reset to first page when opening modal
    fetchCashCollectionDetails(staff._id, 1, modalPageSize);
};

// Add pagination handlers for the modal
const handleModalPageChange = (page: number) => {
    setModalPage(page);
    if (selectedStaff) {
        fetchCashCollectionDetails(selectedStaff._id, page, modalPageSize);
    }
};

const handleModalPageSizeChange = (size: number) => {
    setModalPageSize(size);
    setModalPage(1); // Reset to first page when changing page size
    if (selectedStaff) {
        fetchCashCollectionDetails(selectedStaff._id, 1, size);
    }
};

    // Check token and fetch data
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            navigate('/auth/boxed-signin');
        }
        fetchStaffs(search);
    }, [search, navigate]);

    // Handle pagination: slice records from fetched staffs
    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData(staffs.slice(from, to));
    }, [page, pageSize, staffs]);

    // Handle sorting
    useEffect(() => {
        const sortedData = sortBy(staffs, sortStatus.columnAccessor);
        setRecordsData((sortStatus.direction === 'desc' ? sortedData.reverse() : sortedData).slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize));
    }, [sortStatus, staffs, page, pageSize]);
// Add this calculation function
const calculateClientSideTotals = (details: CashCollectionDetail[]) => {
    return details.reduce((acc, detail) => ({
        totalDriverGiven: acc.totalDriverGiven + (detail.totalStaffAmount || 0),
        totalStaffGiven: acc.totalStaffGiven + (detail.givenAmountToStaff || 0),
  totalBalance: acc.totalBalance + (typeof detail.balance === 'string' ? 
                         parseFloat(detail.balance) || 0 : 
                         detail.balance || 0)    }), { totalDriverGiven: 0, totalStaffGiven: 0, totalBalance: 0 });
};
    return (
        <div>
            <div className="panel mt-6">
                {/* Header */}
                <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Staff Report</h5>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>
                {/* Data Table */}
                <div className="datatables">
                    <DataTable
                        className="whitespace-nowrap table-hover"
                        records={recordsData}
                        columns={[
                            {
                                accessor: 'name',
                                title: 'Staff Name',
                                render: (staff: Staff) => (
                                    <div className="flex items-center w-max">
                                        {staff.image && <img className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" src={`${CLOUD_IMAGE}${staff.image}`} alt="" />}
                                        <div>{staff.name}</div>
                                    </div>
                                ),
                            },

                            {
                                accessor: 'cashInHand',
                                title: 'Cash in Hand',
                                render: (staff: Staff) => <div>₹{staff.cashInHand !== undefined ? staff.cashInHand : 0}</div>,
                            },
   {
                                accessor: 'action',
                                title: 'Action',
                                titleClassName: '!text-center',
                                render: (staff: Staff) => (
                                    <div className="flex items-center justify-center space-x-1">
                                        <Tippy content="Info">
                                            <button type="button" onClick={() => handleInfoClick(staff)}>
                                                <IconInfoCircle className="text-secondary" />
                                            </button>
                                        </Tippy>
                                    </div>
                                ),
                            },
                            ...([ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role)
                                ? [
                                      {
                                          accessor: 'action',
                                          title: 'Action',
                                          titleClassName: '!text-center',
                                          render: (staff: Staff) => (
                                              <div className="flex items-center justify-center space-x-1">
                                                  <button type="button" className="btn btn-success px-2 py-1 text-xs" onClick={() => navigate(`/staffcashreport/${staff._id}`)}>
                                                      View Report
                                                  </button>
                                              </div>
                                          ),
                                      },
                                  ]
                                : []),
                        ]}
                    />
                </div>
            </div>
              {/* Modal for displaying cash collection details */}
     <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-5">
            <div className="flex items-center justify-between mb-5">
                <h5 className="text-lg font-semibold">
                    Cash Collection Details for {selectedStaff?.name}
                </h5>
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 px-4 py-2 rounded-lg shadow-md border border-green-200 dark:border-emerald-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <div className="text-xs font-medium text-green-700 dark:text-green-300">CASH IN HAND</div>
                        <div className="text-xl font-bold text-green-800 dark:text-white">
                            ₹{selectedStaff?.cashInHand?.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <IconX className="w-6 h-6" />
                </button>
            </div>

        
{isLoading ? (
    <div className="text-center">Loading...</div>
) : (
    <div className="datatables">
        <DataTable
            className="whitespace-nowrap table-hover"
            records={[
                ...cashCollectionDetails,
                {
                    _id: 'totals-row',
                    createdAt: 'Totals',
                    totalStaffAmount: calculateClientSideTotals(cashCollectionDetails).totalDriverGiven,
                    givenAmountToStaff: calculateClientSideTotals(cashCollectionDetails).totalStaffGiven,
        balance: calculateClientSideTotals(cashCollectionDetails).totalBalance.toString(), // Convert to string
                    currentCashInHand: 0 // dummy value
                }
            ]}
            columns={[
                {
                    accessor: 'createdAt',
                    title: 'Date',
                    render: (detail: CashCollectionDetail) => (
                        <div className={detail._id === 'totals-row' ? 'font-bold' : ''}>
                            {detail._id === 'totals-row' ? 'Totals:' : new Date(detail.createdAt).toLocaleString()}
                        </div>
                    ),
                },
                {
                    accessor: 'totalStaffAmount',
                    title: 'DRIVER GIVEN AMOUNT',
                    render: (detail: CashCollectionDetail) => (
                        <div className={detail._id === 'totals-row' ? 'font-bold text-blue-600 dark:text-blue-300' : ''}>
                            ₹{detail.totalStaffAmount?.toLocaleString('en-IN')}
                        </div>
                    ),
                },
                {
                    accessor: 'givenAmountToStaff',
                    title: 'STAFF GIVEN TO RSA',
                    render: (detail: CashCollectionDetail) => (
                        <div className={detail._id === 'totals-row' ? 'font-bold text-green-600 dark:text-green-300' : ''}>
                            ₹{detail.givenAmountToStaff?.toLocaleString('en-IN')}
                        </div>
                    ),
                },
              {
    accessor: 'balance',
    title: 'Balance',
    render: (detail: CashCollectionDetail) => {
        const balanceValue = typeof detail.balance === 'string' 
            ? parseFloat(detail.balance) 
            : detail.balance;
        return (
            <div className={`font-medium ${
                balanceValue < 0 ? 'text-red-600' : 'text-green-600'
            } ${detail._id === 'totals-row' ? 'font-bold' : ''}`}>
                ₹{balanceValue.toLocaleString('en-IN')}
            </div>
        );
    },
}
            ]}
            rowClassName={(record) => 
                record._id === 'totals-row' ? 'bg-gray-50 dark:bg-gray-700' : ''
            }
            totalRecords={totalModalRecords}
            recordsPerPage={modalPageSize}
            page={modalPage}
            onPageChange={handleModalPageChange}
            recordsPerPageOptions={[10, 20, 30, 50, 100]}
            onRecordsPerPageChange={handleModalPageSizeChange}
            paginationText={({ from, to, totalRecords }) => 
                `Showing ${from} to ${to} of ${totalRecords} entries`
            }
        />
    </div>
)}
        </div>
    </div>
</Modal>
        </div>
    );
};

export default StaffReport;
