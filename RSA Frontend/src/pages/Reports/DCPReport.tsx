import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconBell from '../../components/Icon/IconBell';
import IconXCircle from '../../components/Icon/IconXCircle';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../../constants/roles';
import { CLOUD_IMAGE } from '../../constants/status';
import Swal from 'sweetalert2';
import {
    XMarkIcon,
    UserIcon,
    CurrencyDollarIcon as CashIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
interface Company {
    _id: string;
    name: string;
    idNumber: string;
    creditLimitAmount: number;
    phone: string;
    cashInHand?: number; // Make it optional with ?
    driverSalary: number;
    personalPhoneNumber: string;
    password: string;
    vehicle: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
}


interface Provider {
    _id: string;
    name: string;
    companyName: string;
    cashInHand: number;
    driverSalary: number;
    baseLocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    };
    idNumber: string;
    creditAmountLimit: number;
    phone: string;
    personalPhoneNumber: string;
    password: string;
    serviceDetails: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
}

export interface Driver {
    _id: string;
    name: string;
    idNumber: string;
    cashInHand: number;
    balanceAmount: number;
    driverSalary: number;
    advance: number;
    phone: string;
    personalPhoneNumber: string;
    password: string;
    vehicle: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
    companyName: string; //New Props
}

const MultipleTables = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Multiple Tables'));
    });
    const role = localStorage.getItem('role') || '';

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

    const [search, setSearch] = useState('');
    const [searchDriver, setSearchDriver] = useState('');
    const [searchProviders, setSearchProviders] = useState('');
    const [searchCompnies, setSearchCompanies] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'firstName',
        direction: 'asc',
    });

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    // Add these state variables
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    // -----------------------------------------------------
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [requiredAmount, setRequiredAmount] = useState(0);
    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    const [page2, setPage2] = useState(1);
    const [pageSize2, setPageSize2] = useState(PAGE_SIZES[0]);

    const [search2, setSearch2] = useState('');
    const [sortStatus2, setSortStatus2] = useState<DataTableSortStatus>({
        columnAccessor: 'firstName',
        direction: 'asc',
    });

    useEffect(() => {
        setPage2(1);
    }, [pageSize2]);

    const formatDate = (date: string | number | Date) => {
        if (date) {
            const dt = new Date(date);
            const month = dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
            const day = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
            return day + '/' + month + '/' + dt.getFullYear();
        }
        return '';
    };

    const randomColor = () => {
        const color = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
        const random = Math.floor(Math.random() * color.length);
        return color[random];
    };

    // checking the token

    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            navigate('/auth/boxed-signin');
            console.log('Token not found');
        }
    };

    // getting all drivers

    const fetchDrivers = async (search = '') => {
        try {
            const response = await axios.get(`${backendUrl}/driver/filtered`, {
                params: { search }, // Send search query
            });
            setDrivers(response.data);
        } catch (error) {
            console.error('Error fetching driver:', error);
        }
    };
    // getting all providers

    const fetchProviders = async (search = '') => {
        try {
            const response = await axios.get(`${backendUrl}/provider/filtered`, {
                params: { search }, // Send search query
            });
            setProviders(response.data);
        } catch (error) {
            console.error('Error fetching driver:', error);
        }
    };
    // getting all companies

    const fetchCompanies = async (search = '') => {
        try {
            const response = await axios.get(`${backendUrl}/company/filtered`, {
                params: { search }, // Send search query
            });
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching driver:', error);
        }
    };

    useEffect(() => {
        gettingToken();
        fetchDrivers(searchDriver);
        fetchProviders(searchProviders);
        fetchCompanies(searchCompnies);
    }, [searchDriver, searchProviders, searchCompnies]);
    // Add these functions
    const handleSettleClick = async (driver: Driver) => {
        try {
            setSelectedDriver(driver);
            setLoading(true);

            // Fetch pending expenses for this driver
            const response = await axios.get(`${backendUrl}/expense/pending`);
            const driverPendingExpenses = response.data.expenseData.filter(
                (expense: any) => expense.driver._id === driver._id
            );

            setPendingExpenses(driverPendingExpenses);
            setShowSettlementModal(true);
        } catch (error) {
            console.error('Error fetching pending expenses:', error);
            // Handle error (show toast/notification)
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAll = async () => {
        let loadingToast: string | undefined;

        try {
            setLoading(true);

            if (!selectedDriver) {
                toast.error('No driver selected');
                return;
            }

            const totalPending = pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
            const currentCash = selectedDriver.cashInHand || 0;

            if (currentCash < totalPending) {
                const shortage = totalPending - currentCash;
                setRequiredAmount(shortage);

                // Create a custom toast with buttons
                const toastId = toast.custom((t) => (
                    <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
                        <div className="text-left">
                            <h3 className="font-bold text-lg mb-2">Insufficient Funds</h3>
                            <p>Driver has ${currentCash.toFixed(2)} but needs ${totalPending.toFixed(2)}</p>
                            <p className="font-bold mt-2">Shortage: ${shortage.toFixed(2)}</p>
                            <p className="mt-2">Would you like to provide an advance?</p>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowAdvanceModal(true);
                                    toast.dismiss(t.id);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Add Advance
                            </button>
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ));

                return;
            }

            const toastId = toast.custom((t) => (
                <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
                    <h3 className="font-bold text-lg mb-2">Confirm Settlement</h3>
                    <p className="mb-4">Approve {pendingExpenses.length} expenses totaling ${totalPending.toFixed(2)}?</p>
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                loadingToast = toast.loading('Processing...');

                                try {
                                    // Call the complete settlement endpoint
                                    const response = await axios.patch(
                                        `${backendUrl}/expense/complete-settlement/${selectedDriver?._id}`,
                                        { advanceAmount: 0 } // No advance unless specified
                                    );

                                    if (response.data.success) {
                                        toast.success(`Approved ${pendingExpenses.length} expenses successfully!`);
                                        fetchDrivers(); // Refresh data
                                        setShowSettlementModal(false);
                                    } else {
                                        toast.error(response.data.message);
                                    }
                                } catch (error) {
                                    let errorMessage = 'There was an error completing the settlement.';
                                    if (axios.isAxiosError(error)) {
                                        errorMessage = error.response?.data?.message || error.message;
                                    } else if (error instanceof Error) {
                                        errorMessage = error.message;
                                    }
                                    toast.error(errorMessage);
                                } finally {
                                    if (loadingToast) toast.dismiss(loadingToast);
                                    setLoading(false);
                                }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Confirm
                        </button>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ), { duration: Infinity });

        } catch (error) {
            // ... existing error handling ...
        } finally {
            setLoading(false);
        }
    };
    return (
        <div>
            {![ROLES.VERIFIER].includes(role) && (
                // {/* Driver Table................................................................................ */}
                <div className="panel mt-6">
                    <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                        <h5 className="font-semibold text-lg dark:text-white-light">PMNA Drivers</h5>
                        <div className="ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder="Search..." value={searchDriver} onChange={(e) => setSearchDriver(e.target.value)} />
                        </div>
                    </div>
                    <div className="datatables">
                        <DataTable
                            className="whitespace-nowrap table-hover"
                            records={drivers} // Set an empty array to clear the table
                            columns={[
                                {
                                    accessor: 'name',
                                    title: 'Name',
                                    render: (driver: Driver) => (
                                        <div className="flex items-center w-max">
                                            <img className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" src={`${CLOUD_IMAGE}${driver.image}`} alt="" />
                                            <div>{driver.name}</div>
                                        </div>
                                    ),
                                },
                                { accessor: 'idNumber', title: 'Driver ID', render: (driver: Driver) => <div>{driver.idNumber}</div> },
                                { accessor: 'cashInHand', title: 'Cash in Hand', render: (driver: Driver) => <div>₹{driver.cashInHand ? driver.cashInHand : 0}</div> },
                                //                                        {
                                //     accessor: 'driverSalary',
                                //     title: 'Balance To Get',
                                //     render: (driver: Driver) => {
                                //         const balance = driver.balanceAmount || 0;
                                //         const isNegative = balance < 0;
                                //         const absoluteValue = Math.abs(balance);

                                //         return (
                                //             <div className={`font-medium ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                                //                 ₹{absoluteValue.toLocaleString()}
                                //                 {isNegative && ' (To Driver)'}  {/* Optional: Add "Dr" indicator for negative values */}
                                //             </div>
                                //         );
                                //     },
                                // },

                                {
                                    accessor: 'action',
                                    title: 'Action',
                                    titleClassName: '!text-center',
                                    render: (driver: Driver) => (
                                        <div className="relative inline-flex items-center space-x-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <button type="button" className="btn btn-success px-2 py-1 text-xs" onClick={() => navigate(`/driverreport/${driver._id}`)}>
                                                Cash Report
                                            </button>
                                            <button type="button" className="btn btn-primary px-2 py-1 text-xs" onClick={() => navigate(`/dcpreport/driverreport/salaryreport/${driver._id}`)}>
                                                Salary
                                            </button>
                                            {/* =------------------------------------------ */}
                                            <button type="button" className="btn btn-danger px-2 py-1 text-xs" onClick={() => handleSettleClick(driver)}>
                                                Settle
                                            </button>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </div>
            )}
            {![ROLES.VERIFIER].includes(role) && (
                // {/* Provider Table................................................................ */}
                <div className="panel mt-6">
                    <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                        <h5 className="font-semibold text-lg dark:text-white-light">Providers</h5>
                        <div className="ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder="Search..." value={searchProviders} onChange={(e) => setSearchProviders(e.target.value)} />
                        </div>
                    </div>
                    <div className="datatables">
                        <DataTable
                            className="whitespace-nowrap table-hover"
                            records={providers} // Set an empty array to clear the table
                            columns={[
                                {
                                    accessor: 'name',
                                    title: 'Name',
                                    render: (provider: Provider) => (
                                        <div className="flex items-center w-max">
                                            <img className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" src={`${CLOUD_IMAGE}${provider.image}`} alt="" />
                                            <div>{provider.name}</div>
                                        </div>
                                    ),
                                },
                                { accessor: 'idNumber', title: 'Driver ID', render: (provider: Provider) => <div>{provider.idNumber}</div> },
                                { accessor: 'cashInHand', title: 'Cash in Hand', render: (provider: Provider) => <div>₹{provider.cashInHand ? provider.cashInHand : 0}</div> },
                                // {
                                //     accessor: 'driverSalary',
                                //     title: 'Balance To Get',
                                //     render: (provider: Provider) => (
                                //         <div>
                                //             <div>₹{provider.driverSalary ? provider.driverSalary : 0}</div>
                                //         </div>
                                //     ),
                                // },
                                // { accessor: 'balanceAmount', title: 'Balance Amount', render: (provider: Provider) => <div>₹{provider.cashInHand ? provider.cashInHand : 0}</div> },

                                {
                                    accessor: 'action',
                                    title: 'Action',
                                    titleClassName: '!text-center',
                                    render: (provider: Provider) => (
                                        <div className="relative inline-flex items-center space-x-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <button type="button" className="btn btn-success px-2 py-1 text-xs" onClick={() => navigate(`/provider-report/${provider._id}`)}>
                                                Cash Report
                                            </button>
                                            <button type="button" className="btn btn-primary px-2 py-1 text-xs" onClick={() => navigate(`/provider-report/salaryreport/${provider._id}`)}>
                                                Salary
                                            </button>
                                            {/* <button type="button" className="btn btn-danger px-2 py-1 text-xs">
                                                Expense
                                            </button> */}
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </div>
            )}
            {/* Compnay Table ............................................................................... */}
            <div className="panel mt-6">
                <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Companies</h5>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder="Search..." value={searchCompnies} onChange={(e) => setSearchCompanies(e.target.value)} />
                    </div>
                </div>
                <div className="datatables">
                    <DataTable
                        className="whitespace-nowrap table-hover"
                        records={companies} // Set an empty array to clear the table
                        columns={[
                            {
                                accessor: 'name',
                                title: 'Name',
                                render: (company: Company) => (
                                    <div className="flex items-center w-max">
                                        <img className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" src={`${CLOUD_IMAGE}${company.image}`} alt="" />
                                        <div>{company.name}</div>
                                    </div>
                                ),
                            },
                            { accessor: 'idNumber', title: 'Driver ID', render: (company: Company) => <div>{company.idNumber}</div> },
                            { accessor: 'cashInHand', title: 'Cash in Hand', render: (company: Company) => <div>₹{company.cashInHand ? company.cashInHand : 0}</div> },


                            {
                                accessor: 'action',
                                title: 'Action',
                                titleClassName: '!text-center',
                                render: (company) => (
                                    <div className="relative inline-flex items-center space-x-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <button type="button" className="btn btn-success px-2 py-1 text-xs"
                                            onClick={() => navigate(`/company-report/${company._id}`)}
                                        >
                                            Cash Report
                                        </button>
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
                {showSettlementModal && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-100">
                            {/* Compact Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white sticky top-0">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-4">
                                        <h3 className="text-lg font-bold">Settle Expenses: {selectedDriver?.name}</h3>
                                        <span className="text-sm bg-white/20 px-2 py-1 rounded flex items-center">
                                            <CashIcon className="h-4 w-4 mr-1" />
                                            ${selectedDriver?.cashInHand?.toFixed(2)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setShowSettlementModal(false)}
                                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content Area with Scroll */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
                                        <p className="text-gray-600 text-sm">Processing settlement...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Compact Table */}
                                        <div className="overflow-auto rounded-lg border border-gray-200 mb-4">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {pendingExpenses.length > 0 ? (
                                                        pendingExpenses.map((expense) => (
                                                            <tr key={expense._id} className="hover:bg-gray-50">
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    {new Date(expense.createdAt).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    })}
                                                                </td>
                                                                <td className="px-3 py-2 max-w-[160px] truncate">
                                                                    {expense.description}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap font-medium">
                                                                    ${expense.amount?.toFixed(2)}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span className="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                                        Pending
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                                                                No pending expenses found
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Compact Summary */}
                                        <div className="bg-blue-50 rounded-lg p-3 mb-4 flex justify-between items-center text-sm">
                                            <div>
                                                <span className="font-medium text-gray-700">Pending: </span>
                                                <span className="text-gray-600">{pendingExpenses.length} items</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-blue-600">
                                                    ${pendingExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => setShowSettlementModal(false)}
                                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleApproveAll}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                        disabled={loading || pendingExpenses.length === 0}
                                    >
                                        {loading ? (
                                            <>
                                                <ArrowPathIcon className="animate-spin h-3.5 w-3.5 mr-1.5" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                                                Approve All
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showAdvanceModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">Provide Advance</h3>

                            <div className="mb-6">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-yellow-50 p-3 rounded-lg">
                                        <p className="text-sm text-yellow-700">Current Cash</p>
                                        <p className="font-bold">${(selectedDriver?.cashInHand || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg">
                                        <p className="text-sm text-red-700">Required</p>
                                        <p className="font-bold">${requiredAmount.toFixed(2)}</p>
                                    </div>
                                </div>

                                <label className="block mb-2 font-medium">Advance Amount</label>
                                <input
                                    type="number"
                                    value={advanceAmount}
                                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    min={requiredAmount}
                                    step="0.01"
                                />
                                <p className="text-sm text-gray-500 mt-1">Minimum: ${requiredAmount.toFixed(2)}</p>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowAdvanceModal(false);
                                        setAdvanceAmount(0);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (advanceAmount < requiredAmount) {
                                            toast.error(`Please enter at least $${requiredAmount.toFixed(2)}`);
                                            return;
                                        }

                                        try {
                                            setLoading(true);
                                            setShowAdvanceModal(false);

                                            // Create advance
                                            const newAdvance = await axios.post(`${backendUrl}/advance-payment`, {
                                                driverId: selectedDriver?._id,
                                                advance: advanceAmount,
                                                type: 'settlement',
                                                remark: 'Advance for expense settlement'
                                            });

                                            fetchDrivers(); // Refresh data
                                            setShowSettlementModal(false)
                                            // Show success toast
                                            toast.success('Advance created successfully!');
                                            // Retry settlement with the new funds
                                            await handleApproveAll();
                                        } catch (error) {
                                            console.error('Error creating advance:', error);

                                            // Type guard for AxiosError
                                            if (error instanceof Error) {
                                                const axiosError = error as AxiosError<{ message?: string }>;
                                                toast.error(
                                                    axiosError.response?.data?.message ||
                                                    axiosError.message ||
                                                    'Failed to create advance'
                                                );
                                            } else {
                                                toast.error('Failed to create advance');
                                            }
                                        } finally {
                                            setLoading(false);
                                            setAdvanceAmount(0);
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Add Advance & Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultipleTables;
