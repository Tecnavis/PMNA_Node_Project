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
// -----------------------------------------------------------
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
     balanceAmount?: number;
    advance: number;
    driverSalary?: number; // This might be provider's earnings, rename if confusing
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
 settlement?: boolean;
    isFullSettlement?: boolean;
    settlementCompletedDate?: Date | string;
    previousSettlementCompletedDate?: Date | string;
    lastSettlementAmount?: number;
    pendingExpensesCount?: number;
    totalPendingAmount?: number;
    totalTransferedAmount?: number; // Add this for tracking transfers
}

export interface Driver {
    _id: string;
    name: string;
    idNumber: string;
    cashInHand: number;
    balanceAmount?: number;
    driverSalary: number;
    advance: number;
    totalAdvance?:number;
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
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null); // Add this line

    const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [requiredAmount, setRequiredAmount] = useState(0);
const [showProviderSettlementModal, setShowProviderSettlementModal] = useState(false);
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
    // ---------------------------------------
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
 const handleProviderSettleClick = async (provider: Provider) => {
    const password = await Swal.fire({
        title: 'Authorization Required',
        input: 'password',
        inputLabel: 'Enter settlement password',
        inputPlaceholder: 'Super secret password',
        showCancelButton: true,
        confirmButtonText: 'Authenticate',
        showLoaderOnConfirm: true,
        preConfirm: (inputPassword) => {
            return inputPassword === 'RSA@123';
        },
        allowOutsideClick: () => !Swal.isLoading()
    });

    if (!password.isConfirmed || !password.value) {
        toast.error('Authentication failed');
        return;
    }

    try {
        setSelectedProvider(provider);
        setLoading(true);

        // Check settlement conditions
        const hasNegativeBalance = (provider.balanceAmount ?? 0) < 0;
        const hasCashInHand = (provider.cashInHand ?? 0) > 0;
        const hasAdvance = (provider.advance ?? 0) > 0;
        
        // Only show "nothing to settle" modal if nothing needs to be settled
        if (!hasNegativeBalance && !hasCashInHand && !hasAdvance) {
            Swal.fire({
                title: 'Nothing to Settle',
                text: 'Provider has no pending settlements',
                icon: 'info'
            });
            return;
        }

        // Show provider settlement modal
        setShowProviderSettlementModal(true);
        
    } catch (error: any) {
        console.error('Error in provider settlement:', error);
        toast.error('Failed to fetch settlement data');
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
                                                                                  {[ROLES.ADMIN, ROLES.SECONDARY_ADMIN,ROLES.Manager].includes(role) && (

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
                     {[ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager].includes(role) && (
    <button 
        type="button" 
        className="btn btn-danger px-2 py-1 text-xs" 
        onClick={() => handleProviderSettleClick(provider)}
        title={`Cash: ₹${provider.cashInHand || 0} | Advance: ₹${provider.advance || 0} | Balance: ₹${provider.balanceAmount || 0}`}
        disabled={loading}
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
                                          <button type="button" className="btn btn-warning px-2 py-1 text-xs"
                onClick={() => navigate(`/pending-payments/${company._id}`)}
            >
                Pending Payment
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
          <span>Total Salary:</span>
          <span className="font-medium">₹{selectedDriver?.driverSalary?.toFixed(2) ?? '0.00'}</span>
        </div>
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
        <span>Total Salary:</span>
        <span className="font-medium">₹{selectedDriver?.driverSalary?.toFixed(2) ?? '0.00'}</span>
      </div>
      
      <div className="border-t border-green-200 my-2"></div>
      
      {/* Settlement Amount Calculation */}
      {(() => {
        const cashInHand = selectedDriver?.cashInHand ?? 0;
        const totalPendingExpenses = pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const totalSalary = selectedDriver?.driverSalary ?? 0;
        const settlementAmount = cashInHand - (totalSalary + totalPendingExpenses);
        
        return (
          <div className="flex justify-between font-bold">
            <span>
              {settlementAmount >= 0 
                ? 'Settlement Amount (to RSA)' 
                : 'Settlement Amount (to Driver)'}
            </span>
            <span className={settlementAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
              ₹{Math.abs(settlementAmount).toFixed(2)}
            </span>
          </div>
        );
      })()}
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
{showProviderSettlementModal && selectedProvider && (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 text-white sticky top-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold">Provider Settlement: {selectedProvider?.name}</h3>
                        <p className="text-sm text-purple-100">{selectedProvider?.companyName || 'Independent Provider'}</p>
                    </div>
                    <button 
                        onClick={() => setShowProviderSettlementModal(false)} 
                        className="p-1 rounded-full hover:bg-white/20"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

           
            {/* -------------------------------------------------------- */}
    {/* Content */}
           <div className="flex-1 overflow-y-auto p-4">
  {/* Current Financial Summary */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <div className="bg-blue-50 p-4 rounded-lg">
      <h4 className="font-bold text-blue-800 mb-2">Current Status</h4>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Total Salary:</span>
          <span className="font-medium">₹{selectedProvider?.driverSalary?.toFixed(2) ?? '0.00'}</span>
        </div>
        <div className="flex justify-between">
          <span>Cash In Hand:</span>
          <span className="font-medium">₹{selectedProvider?.cashInHand?.toFixed(2) ?? '0.00'}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance Amount:</span>
          <span className={`font-medium ${(selectedProvider?.balanceAmount ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{Math.abs(selectedProvider?.balanceAmount ?? 0).toFixed(2)} 
            {(selectedProvider?.balanceAmount ?? 0) < 0 ? ' (To Driver)' : ' (To Company)'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Advance:</span>
          <span className="font-medium">₹{selectedProvider?.advance?.toFixed(2) ?? '0.00'}</span>
        </div>
        <div className="flex justify-between">
          <span>Cash Collection:</span>
          <span className="font-medium">
            ₹{((selectedProvider?.cashInHand ?? 0) - (selectedProvider?.advance ?? 0)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>

    {/* Settlement Calculation */}
    <div className="bg-green-50 p-4 rounded-lg">
      <h4 className="font-bold text-green-800 mb-2">Settlement Calculation</h4>
      <div className="space-y-2">
      
       
       <div className="flex justify-between">
        <span>Total Salary:</span>
        <span className="font-medium">₹{selectedProvider?.driverSalary?.toFixed(2) ?? '0.00'}</span>
      </div>
      
      <div className="border-t border-green-200 my-2"></div>
      
      {/* Settlement Amount Calculation */}
      {(() => {
        const cashInHand = selectedProvider?.cashInHand ?? 0;
        const totalSalary = selectedProvider?.driverSalary ?? 0;
        const settlementAmount = cashInHand - (totalSalary );
        
        return (
          <div className="flex justify-between font-bold">
            <span>
              {settlementAmount >= 0 
                ? 'Settlement Amount (to RSA)' 
                : 'Settlement Amount (to Driver)'}
            </span>
            <span className={settlementAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
              ₹{Math.abs(settlementAmount).toFixed(2)}
            </span>
          </div>
        );
      })()}
    </div>
  </div>
</div>

 
 {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
               
              

                {/* Full Settlement Warning */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h4 className="font-bold text-yellow-800">Full Settlement Notice</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                                Approving this settlement will:
                            </p>
                            <ul className="text-sm text-yellow-700 mt-1 list-disc pl-4">
                                <li>Reset Cash In Hand to ₹0.00</li>
                                <li>Reset Balance Amount to ₹0.00</li>
                                <li>Deduct advance amount (if any) from settlement</li>
                                <li>Mark all pending financial transactions as settled</li>
                                <li>Record settlement date for future reference</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
</div>
{/* ---------------------------------------------------------------- */}
            {/* Footer with action buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {(() => {
                            const cashInHand = selectedProvider?.cashInHand ?? 0;
                            const advance = selectedProvider?.advance ?? 0;
                            
                            if (cashInHand < advance) {
                                return (
                                    <span className="text-red-600 font-medium">
                                        Shortage: ₹{(advance - cashInHand).toFixed(2)}
                                    </span>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowProviderSettlementModal(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    const response = await axios.post(
                                        `${backendUrl}/provider/complete-settlement/${selectedProvider?._id}`,
                                        { 
                                            isFullSettlement: true 
                                        }
                                    );
                                    
                                    if (response.data.success) {
                                        toast.success("Provider settlement completed successfully!");
                                        
                                        // Refresh providers list
                                        fetchProviders();
                                        
                                        // Close modal
                                        setShowProviderSettlementModal(false);
                                        
                                        // Show success summary
                                        Swal.fire({
                                            title: 'Settlement Completed',
                                            html: `
                                                <div style="text-align: left; padding: 10px;">
                                                    <p><strong>Provider:</strong> ${selectedProvider?.name}</p>
                                                    <p><strong>Total Transferred:</strong> ₹${response.data.data.totalTransferredAmount || 0}</p>
                                                    <p><strong>Advance Deduction:</strong> ₹${response.data.data.advanceDeduction || 0}</p>
                                                    <p><strong>New Advance Balance:</strong> ₹${response.data.data.newAdvanceBalance || 0}</p>
                                                    <p><strong>Settlement Date:</strong> ${new Date(response.data.data.currentSettlementDate).toLocaleDateString()}</p>
                                                    <hr style="margin: 10px 0;" />
                                                    <p><strong>Final Status:</strong></p>
                                                    <ul style="margin-left: 20px;">
                                                        <li>Cash In Hand: ₹0.00</li>
                                                        <li>Balance Amount: ₹0.00</li>
                                                        <li>Advance: ₹${response.data.data.newAdvanceBalance || 0}</li>
                                                    </ul>
                                                </div>
                                            `,
                                            icon: 'success',
                                            confirmButtonText: 'OK'
                                        });
                                    } else {
                                        toast.error(response.data.message || "Failed to complete settlement");
                                    }
                                } catch (error: any) {
                                    console.error('Provider settlement error:', error);
                                    toast.error(error.response?.data?.message || 'Error completing settlement');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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

           
        </div>
    );
};

export default MultipleTables;
