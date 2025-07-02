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
interface CashCollectionDetail {
    _id: string;
    currentCashInHand: number;
    totalStaffAmount: number;
    givenAmountToStaff: number;
    balance: string;
    createdAt: string;
   
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
    // Fetch cash collection details for a staff member
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
        setCashCollectionDetails(response.data.data);
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
                        records={cashCollectionDetails}
                        columns={[
                           
                            {
                                accessor: 'createdAt',
                                title: 'Date',
                                render: (detail: CashCollectionDetail) => (
                                    <div>{new Date(detail.createdAt).toLocaleString()}</div>
                                ),
                            },
                              {
                                accessor: 'currentCashInHand',
                                title: 'Current CashInHand',
                                render: (detail: CashCollectionDetail) => (
                                    <div>₹{detail.currentCashInHand}</div>
                                ),
                            },
                            {
                                accessor: 'totalStaffAmount',
  title: 'TOTAL AMOUNT',
                                render: (detail: CashCollectionDetail) => (
                                    <div>₹{detail.totalStaffAmount}</div>
                                ),                            },
                            {
                                accessor: 'givenAmountToStaff',
                                title: 'AMOUNT GIVEN',
                                render: (detail: CashCollectionDetail) => (
                                    <div>{detail.givenAmountToStaff}</div>
                                ),
                            },
                             {
                                accessor: 'balance',
                                title: 'Balance',
                                render: (detail: CashCollectionDetail) => (
                                    <div>{detail.balance}</div>
                                ),
                            },
                        ]}
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
