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
            </div>

           
        </div>
    );
};

export default MultipleTables;
