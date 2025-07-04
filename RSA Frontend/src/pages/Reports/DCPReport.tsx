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
import './DcpReport.css';

import {
    XMarkIcon,
    UserIcon,
    CurrencyDollarIcon as CashIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
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
    balanceAmount?: number;
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
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [requiredAmount, setRequiredAmount] = useState(0);
    // ------------------------------------------------------------
    const [showNoExpensesModal, setShowNoExpensesModal] = useState(false);
const [processingSettlement, setProcessingSettlement] = useState(false);
    const role = localStorage.getItem('role') || ''

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
    // ------------------------
 const handleSettleClick = async (driver: Driver) => {
     const password = await Swal.fire({
    title: 'Authorization Required',
    input: 'password',
    inputLabel: 'Enter settlement password',
    inputPlaceholder: 'Super secret password',
    showCancelButton: true,
    confirmButtonText: 'Authenticate',
    showLoaderOnConfirm: true,
    preConfirm: (inputPassword) => {
      return inputPassword === 'RSA@123'; // Change to your password
    },
    allowOutsideClick: () => !Swal.isLoading()
  });

  if (!password.isConfirmed || !password.value) {
    toast.error('Authentication failed');
    return;
  }
    try {
        setSelectedDriver(driver);
        setLoading(true);

        // Fetch pending expenses for this driver
        const response = await axios.get(`${backendUrl}/expense/pending`);
        const driverPendingExpenses = response.data.expenseData.filter(
            (expense: any) => expense.driver._id === driver._id
        );

        // Check all settlement conditions
        const hasNegativeBalance = (driver.balanceAmount ?? 0) < 0;
        const hasPendingExpenses = driverPendingExpenses.length > 0;
        const hasCashInHand = (driver.cashInHand ?? 0) > 0;
        const hasAdvance = (driver.advance ?? 0) > 0;
        
        // Only show "no expenses" modal if nothing needs to be settled
        if (!hasPendingExpenses && !hasNegativeBalance && !hasCashInHand && !hasAdvance) {
            setShowNoExpensesModal(true);
            return;
        }

        // Otherwise, show settlement modal
        setPendingExpenses(driverPendingExpenses);
        setShowSettlementModal(true);
    } catch (error) {
        console.error('Error fetching pending expenses:', error);
        toast.error('Failed to fetch settlement data');
    } finally {
        setLoading(false);
    }
};
    // -------------------------------------------------------------------------------------------
// const handleCompleteEmptySettlement = async () => {
//     try {
//         if (!selectedDriver) {
//             toast.error('No driver selected');
//             return;
//         }

//         setProcessingSettlement(true);
        
//         const response = await axios.post(
//             `${backendUrl}/driver/complete-settlement/${selectedDriver._id}`,
//             { advanceAmount: 0 },
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${localStorage.getItem('token')}`
//                 }
//             }
//         );

//         if (response.data.success) {
//             toast.success(response.data.message || "Settlement completed successfully");
//             fetchDrivers();
//         } else {
//             toast.error(response.data.message || "Failed to complete settlement");
//         }
//     } catch (error: any) {
//         console.error('Full error:', error);
//         let errorMessage = 'Error completing settlement';
        
//         if (error.response) {
//             errorMessage = error.response.data?.error?.message || 
//                           error.response.data?.message || 
//                           `Server error: ${error.response.status}`;
            
//             console.error('Server response:', error.response.data);
//             toast.error(errorMessage);
//         } else if (error.request) {
//             console.error('No response received:', error.request);
//             toast.error('No response from server - check your connection');
//         } else {
//             console.error('Request setup error:', error.message);
//             toast.error('Request failed to send');
//         }
//     } finally {
//         setProcessingSettlement(false);
//         setShowNoExpensesModal(false);
//     }
// };
//  const handleApproveAll = async () => {
//     let loadingToast: string | undefined;

//     try {
//         setLoading(true);

//         if (!selectedDriver) {
//             toast.error('No driver selected');
//             return;
//         }

//         const totalPendingExpenses = pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
//         const balanceAmount = selectedDriver?.balanceAmount || 0;
        
//         // Calculate total amount needed (negative balance only if no expenses)
//         const totalAmountNeeded = balanceAmount < 0 
//             ? (pendingExpenses.length > 0 ? totalPendingExpenses + Math.abs(balanceAmount) : Math.abs(balanceAmount))
//             : totalPendingExpenses;

//         const currentCash = selectedDriver.cashInHand || 0;

//         if (currentCash < totalAmountNeeded) {
//             const shortage = totalAmountNeeded - currentCash;
//             setRequiredAmount(shortage);

//             // Create a custom toast with buttons
//             const toastId = toast.custom((t) => (
//                 <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
//                     <div className="text-left">
//                         <h3 className="font-bold text-lg mb-2">Insufficient Funds</h3>
//                         <p className="mb-1">Driver has ${currentCash.toFixed(2)} but needs ${totalAmountNeeded.toFixed(2)}</p>
//                         {balanceAmount < 0 && (
//                             <p className="text-sm text-gray-600">
//                                 {pendingExpenses.length > 0 
//                                     ? `(Includes ${totalPendingExpenses.toFixed(2)} expenses + ${Math.abs(balanceAmount).toFixed(2)} balance)`
//                                     : `(Balance settlement)`}
//                             </p>
//                         )}
//                         <p className="font-bold mt-2">Shortage: ${shortage.toFixed(2)}</p>
//                         <p className="mt-2">Would you like to provide an amount?</p>
//                     </div>
//                     <div className="flex justify-end space-x-2 mt-4">
//                         <button
//                             onClick={() => {
//                                 setShowAdvanceModal(true);
//                                 toast.dismiss(t.id);
//                             }}
//                             className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
//                         >
//                             Add Amount
//                         </button>
//                         <button
//                             onClick={() => toast.dismiss(t.id)}
//                             className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
//                         >
//                             Cancel
//                         </button>
//                     </div>
//                 </div>
//             ));

//             return;
//         }

//         const toastId = toast.custom((t) => (
//             <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
//                 <h3 className="font-bold text-lg mb-2">Confirm Settlement</h3>
//                 <div className="mb-4 space-y-1">
//                     {pendingExpenses.length > 0 && (
//                         <p>Approve {pendingExpenses.length} expenses totaling ${totalPendingExpenses.toFixed(2)}</p>
//                     )}
//                     {balanceAmount < 0 && (
//                         <p className={pendingExpenses.length > 0 ? "text-sm text-gray-600" : ""}>
//                             {pendingExpenses.length > 0 
//                                 ? `+ ${Math.abs(balanceAmount).toFixed(2)} balance settlement`
//                                 : `Balance settlement: ${Math.abs(balanceAmount).toFixed(2)}`}
//                         </p>
//                     )}
//                     <p className="font-bold">Total: ${totalAmountNeeded.toFixed(2)}</p>
//                 </div>
//                 <div className="flex justify-end space-x-2">
//                     <button
//                         onClick={async () => {
//                             toast.dismiss(t.id);
//                             loadingToast = toast.loading('Processing...');

//                             try {
//                                 // First handle the expenses if any
//                                 if (pendingExpenses.length > 0) {
//                                     const expenseResponse = await axios.patch(
//                                         `${backendUrl}/expense/complete-settlement/${selectedDriver?._id}`,
//                                         { advanceAmount: 0 }
//                                     );

//                                     if (!expenseResponse.data.success) {
//                                         throw new Error(expenseResponse.data.message || "Failed to settle expenses");
//                                     }
//                                 }

//                                 // Then handle the balance amount if negative
//                                 if (balanceAmount < 0) {
//                                     const balanceToSettle = Math.abs(balanceAmount);
                                    
//                                     if (currentCash >= totalAmountNeeded) {
//                                         // If we have enough cash, distribute the balance amount
//                                         const distributeResponse = await axios.patch(
//                                             `${backendUrl}/driver/distribute-amount`,
//                                             {
//                                                 driverId: selectedDriver._id,
//                                                 receivedAmount: balanceToSettle,
//                                                 workType: 'PaymentWork'
//                                             }
//                                         );

//                                         if (!distributeResponse.data.success) {
//                                             throw new Error(distributeResponse.data.message || "Failed to distribute balance amount");
//                                         }
//                                     } else if (currentCash < Math.abs(balanceAmount)) {
//                                         // Case 2: Not enough cash for balance - create advance and distribute
//                                         // Step 1: Create advance
//                                         const advanceResponse = await axios.post(
//                                             `${backendUrl}/advance-payment`,
//                                             {
//                                                 driverId: selectedDriver._id,
//                                                 amount: balanceToSettle,
//                                                 description: "Balance settlement advance"
//                                             }
//                                         );

//                                         if (!advanceResponse.data.success) {
//                                             throw new Error(advanceResponse.data.message || "Failed to create advance for balance");
//                                         }

//                                         // Step 2: Distribute the advance
//                                         const distributeResponse = await axios.patch(
//                                             `${backendUrl}/driver/distribute-amount`,
//                                             {
//                                                 driverId: selectedDriver._id,
//                                                 receivedAmount: balanceToSettle,
//                                                 workType: 'PaymentWork'
//                                             }
//                                         );

//                                         if (!distributeResponse.data.success) {
//                                             throw new Error(distributeResponse.data.message || "Failed to distribute advance amount");
//                                         }
//                                     } else {
//                                         // Case 3: Partial cash - use available cash first
//                                         const cashToUse = currentCash - (pendingExpenses.length > 0 ? totalPendingExpenses : 0);
//                                         if (cashToUse > 0) {
//                                             const distributeResponse = await axios.patch(
//                                                 `${backendUrl}/driver/distribute-amount`,
//                                                 {
//                                                     driverId: selectedDriver._id,
//                                                     receivedAmount: cashToUse,
//                                                     workType: 'PaymentWork'
//                                                 }
//                                             );

//                                             if (!distributeResponse.data.success) {
//                                                 throw new Error(distributeResponse.data.message || "Failed to distribute partial balance amount");
//                                             }
//                                         }
//                                     }
//                                 }

//                                 toast.success(`Settlement completed successfully!`);
//                                 fetchDrivers(); // Refresh data
//                                 setShowSettlementModal(false);
//                             } catch (error) {
//                                 let errorMessage = 'There was an error completing the settlement.';
//                                 if (axios.isAxiosError(error)) {
//                                     errorMessage = error.response?.data?.message || error.message;
//                                 } else if (error instanceof Error) {
//                                     errorMessage = error.message;
//                                 }
//                                 toast.error(errorMessage);
//                             } finally {
//                                 if (loadingToast) toast.dismiss(loadingToast);
//                                 setLoading(false);
//                             }
//                         }}
//                         className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
//                     >
//                         Confirm
//                     </button>
//                     <button
//                         onClick={() => toast.dismiss(t.id)}
//                         className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
//                     >
//                         Cancel
//                     </button>
//                 </div>
//             </div>
//         ), { duration: Infinity });

//     } catch (error) {
//         let errorMessage = 'An unexpected error occurred';
//         if (axios.isAxiosError(error)) {
//             errorMessage = error.response?.data?.message || error.message;
//         } else if (error instanceof Error) {
//             errorMessage = error.message;
//         }
//         toast.error(errorMessage);
//     } finally {
//         setLoading(false);
//     }
// };
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
                                                                                  {[ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (

                                           <button 
    type="button" 
    className="btn btn-danger px-2 py-1 text-xs" 
    onClick={() => handleSettleClick(driver)}
    title={`Cash: ${driver.cashInHand} | Advance: ${driver.advance} | Balance: ${driver.balanceAmount}`}
>
    Settle
</button>
                                                                                  )}
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
                {/* {showNoExpensesModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">No Pending Expenses</h3>
            <p className="mb-4">This driver has no pending expenses and salary settlement. Would you like to mark the settlement as complete?</p>
            
            <div className="flex justify-end space-x-3">
                <button
                    onClick={() => setShowNoExpensesModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={processingSettlement}
                >
                    Cancel
                </button>
                <button
                    onClick={handleCompleteEmptySettlement}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={processingSettlement}
                >
                    {processingSettlement ? 'Processing...' : 'Mark Complete'}
                </button>
            </div>
        </div>
    </div>
)} */}
 {showSettlementModal && (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white sticky top-0">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Complete Settlement: {selectedDriver?.name}</h3>
                    <button onClick={() => setShowSettlementModal(false)} className="p-1 rounded-full hover:bg-white/20">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
           <div className="flex-1 overflow-y-auto p-4">
  {/* Current Financial Summary */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <div className="bg-blue-50 p-4 rounded-lg">
      <h4 className="font-bold text-blue-800 mb-2">Current Status</h4>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Cash In Hand:</span>
          <span className="font-medium">₹{selectedDriver?.cashInHand?.toFixed(2) ?? '0.00'}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance Amount:</span>
          <span className={`font-medium ${(selectedDriver?.balanceAmount ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{Math.abs(selectedDriver?.balanceAmount ?? 0).toFixed(2)} 
            {(selectedDriver?.balanceAmount ?? 0) < 0 ? ' (To Driver)' : ' (To Company)'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Advance:</span>
          <span className="font-medium">₹{selectedDriver?.advance?.toFixed(2) ?? '0.00'}</span>
        </div>
        <div className="flex justify-between">
          <span>Cash Collection:</span>
          <span className="font-medium">
            ₹{((selectedDriver?.cashInHand ?? 0) - (selectedDriver?.advance ?? 0)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>

    {/* Settlement Calculation */}
    <div className="bg-green-50 p-4 rounded-lg">
      <h4 className="font-bold text-green-800 mb-2">Settlement Calculation</h4>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Pending Expenses:</span>
          <span className="font-medium">₹{pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance Adjustment:</span>
          <span className="font-medium">
            {(selectedDriver?.balanceAmount ?? 0) < 0 ? '+' : '-'}₹
            {Math.abs(selectedDriver?.balanceAmount ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="border-t border-green-200 my-2"></div>
       <div className="flex justify-between font-bold">
  <span>
    {((selectedDriver?.cashInHand ?? 0) - 
     (pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) + 
     ((selectedDriver?.balanceAmount ?? 0) < 0 ? Math.abs(selectedDriver?.balanceAmount ?? 0) : 0))) >= 0 
      ? 'Settlement Amount (to RSA)' 
      : 'Settlement Amount (to Driver)'}
  </span>
  <span className={`text-lg font-bold ${
    ((selectedDriver?.cashInHand ?? 0) - 
     (pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) + 
     ((selectedDriver?.balanceAmount ?? 0) < 0 ? Math.abs(selectedDriver?.balanceAmount ?? 0) : 0))) >= 0 
      ? 'text-green-600' 
      : 'text-red-600'
  }`}>
    ₹{Math.abs(
      ((selectedDriver?.cashInHand ?? 0) - 
       (pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) + 
       ((selectedDriver?.balanceAmount ?? 0) < 0 ? Math.abs(selectedDriver?.balanceAmount ?? 0) : 0)))
    ).toFixed(2)}
  </span>
</div>
      </div>
    </div>
  </div>

  {/* Pending Expenses List */}
  {pendingExpenses.length > 0 && (
    <div className="mb-6">
      <h4 className="font-bold mb-2">Pending Expenses ({pendingExpenses.length})</h4>
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Table headers and rows */}
        </table>
      </div>
    </div>
  )}

  {/* Full Settlement Option */}
  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
    <div className="flex items-start">
      <div className="flex-shrink-0 pt-0.5">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      </div>
      <div className="ml-3">
        <h4 className="font-bold text-yellow-800">Full Settlement</h4>
        <p className="text-sm text-yellow-700 mt-1">
          Approving will reset all amounts to zero: Cash In Hand, Balance, and Advance.
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          Final Settlement Amount: ₹{((selectedDriver?.cashInHand ?? 0) - (pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) + ((selectedDriver?.balanceAmount ?? 0) < 0 ? Math.abs(selectedDriver?.balanceAmount ?? 0) : 0))).toFixed(2)}
        </p>
      </div>
    </div>
  </div>
</div>

{/* Footer with action buttons */}
<div className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
  <div className="flex justify-between items-center">
    <div className="text-sm text-gray-600">
      {(selectedDriver?.cashInHand ?? 0) < (pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) + ((selectedDriver?.balanceAmount ?? 0) < 0 ? Math.abs(selectedDriver?.balanceAmount ?? 0) : 0)) && (
        <span className="text-red-600 font-medium">
          Shortage: ₹{((pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) + ((selectedDriver?.balanceAmount ?? 0) < 0 ? Math.abs(selectedDriver?.balanceAmount ?? 0) : 0)) - (selectedDriver?.cashInHand ?? 0)).toFixed(2)}
        </span>
      )}
    </div>
    <div className="flex space-x-3">
      <button
        onClick={() => setShowSettlementModal(false)}
        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        onClick={async () => {
          try {
            setLoading(true);
            const response = await axios.post(
              `${backendUrl}/driver/complete-settlement/${selectedDriver?._id}`,
              { 
                advanceAmount: 0,
                isFullSettlement: true 
              }
            );
            
            if (response.data.success) {
              toast.success("Full settlement completed successfully!");
              fetchDrivers();
              setShowSettlementModal(false);
            } else {
              toast.error(response.data.message || "Failed to complete settlement");
            }
          } catch (error) {
            console.error('Settlement error:', error);
            toast.error('Error completing settlement');
          } finally {
            setLoading(false);
          }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Approve Full Settlement'}
      </button>
    </div>
  </div>
</div>
        </div>
    </div>
)}
            </div>

            {/* {showAdvanceModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">Provide Amount</h3>

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

                                <label className="block mb-2 font-medium">Providing Amount</label>
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
                                    Add Amount & Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
};

export default MultipleTables;
