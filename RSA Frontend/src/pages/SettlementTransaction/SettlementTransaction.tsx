import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataTable } from 'mantine-datatable';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
// -----------------------------------------------------------

interface UnverifiedBooking {
  fileNumber: string;
  createdAt: string;
  verified: boolean;
  salary: number;
  userType: 'driver' | 'provider';
}

interface UserUnverifiedData {
  user: {
    _id: string;
    name: string;
    companyName?: string;
  };
  bookings: UnverifiedBooking[];
  totalSalary: number;
  unverifiedCount: number;
  userType: 'driver' | 'provider';
}

interface SettlementTransaction {
  _id: string;
  driver?: {
    _id: string;
    name: string;
    idNumber: string;
    image: string;
  };
  provider?: {
    _id: string;
    name: string;
    idNumber: string;
    companyName: string;
    image: string;
  };
  userType: 'driver' | 'provider';
  settlementDate: Date;
  totalSalary: number;
  cashInHand: number;
  balanceAmount: number;
  advance: number;
  cashCollection: number;
  pendingExpenses: number;
  settlementAmount: number;
  remarks: string;
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: Date;
  unverifiedBookings?: UnverifiedBooking[];
}

const SettlementTransaction = () => {
  const [settlementTransactions, setSettlementTransactions] = useState<SettlementTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
// Also fix the type issue with unverifiedDataMap
const [unverifiedDataMap, setUnverifiedDataMap] = useState<Record<string, UserUnverifiedData>>({});  const [selectedUserType, setSelectedUserType] = useState<string>('all');

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  // Set authorization token
  const setAuthToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return true;
    } else {
      navigate('/auth/boxed-signin');
      return false;
    }
  };

  // Fetch unverified bookings for both drivers and providers
 const fetchUnverifiedBookings = async (userIds: string[], userType: 'driver' | 'provider') => {
  try {
    if (!setAuthToken() || userIds.length === 0) return;

    const endpoint = `${backendUrl}/booking/unverified-by-users`;
        console.log(`Fetching unverified bookings for ${userType}s:`, userIds);

    const response = await axios.get(endpoint, {
      params: {
        [userType === 'driver' ? 'driverIds' : 'providerIds']: userIds.join(','),
        userType: userType
      }
    });
    console.log(`Unverified bookings response for ${userType}s:`, response.data);

    if (response.data.success && response.data.data) {
      // Merge with existing data
      setUnverifiedDataMap(prev => ({
        ...prev,
        ...response.data.data
      }));
    }
  } catch (error) {
    console.error(`Error fetching unverified bookings for ${userType}s:`, error);
  }
};

  // Fetch unverified bookings for all users in settlement transactions
  const fetchAllUnverifiedBookings = async (transactions: SettlementTransaction[]) => {
    try {
      // Separate driver and provider IDs
      const driverIds = transactions
        .filter((t) => t.userType === 'driver' && t.driver?._id)
        .map((t) => t.driver!._id);
      
      const providerIds = transactions
        .filter((t) => t.userType === 'provider' && t.provider?._id)
        .map((t) => t.provider!._id);
      
      // Fetch in parallel
      await Promise.all([
        fetchUnverifiedBookings(driverIds, 'driver'),
        fetchUnverifiedBookings(providerIds, 'provider')
      ]);
      
    } catch (error) {
      console.error('Error fetching all unverified bookings:', error);
    }
  };

  const fetchSettlementTransactions = async () => {
    try {
      setLoading(true);
      
      if (!setAuthToken()) {
        return;
      }

      const response = await axios.get(`${backendUrl}/settlementTransaction/transaction`, {
        params: {
          page,
          limit: pageSize,
          search: searchTerm
        }
      });
      
      const transactions = response.data.transactions || [];
      setSettlementTransactions(transactions);
      setTotalRecords(response.data.total);

      // Fetch unverified bookings for all users
      await fetchAllUnverifiedBookings(transactions);
      
    } catch (error: unknown) {
      console.error('Error fetching settlement transactions:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/auth/boxed-signin');
          return;
        }
        toast.error(error.response?.data?.message || 'Failed to fetch settlement transactions');
      } else if (error instanceof Error) {
        toast.error(error.message || 'Failed to fetch settlement transactions');
      } else {
        toast.error('Failed to fetch settlement transactions');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAuthToken();
    fetchSettlementTransactions();
  }, [page, pageSize, searchTerm]);

  // Reset page when searching
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const getUnverifiedDataForUser = (userId: string): UserUnverifiedData | null => {
    return unverifiedDataMap[userId] || null;
  };


  const getUserDisplay = (transaction: SettlementTransaction) => {
    if (transaction.userType === 'driver' && transaction.driver) {
      return {
              _id: transaction.driver._id, // Add _id here

        name: transaction.driver.name,
        idNumber: transaction.driver.idNumber,
        image: transaction.driver.image,
        type: 'Driver',
        typeClass: 'bg-blue-100 text-blue-800'
      };
    } else if (transaction.userType === 'provider' && transaction.provider) {
      return {
              _id: transaction.provider._id, // Add _id here

        name: transaction.provider.name,
        idNumber: transaction.provider.idNumber,
        image: transaction.provider.image,
        type: 'Provider',
        typeClass: 'bg-purple-100 text-purple-800',
        company: transaction.provider.companyName
      };
    }
    return {
          _id: '', // Add _id here with empty string

      name: 'Unknown',
      idNumber: 'N/A',
      image: '',
      type: 'Unknown',
      typeClass: 'bg-gray-100 text-gray-800'
    };
  };

  const columns = [
    {
      accessor: 'user',
      title: 'User',
      render: (record: SettlementTransaction) => {
        const userInfo = getUserDisplay(record);
        
        return (
          <div className="flex items-center w-max">
            <img 
              className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" 
              src={`${import.meta.env.VITE_CLOUD_IMAGE}${userInfo.image}`} 
              alt={userInfo.name}
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <div className="font-semibold">{userInfo.name}</div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${userInfo.typeClass}`}>
                  {userInfo.type}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                ID: {userInfo.idNumber}
              </div>
              {userInfo.company && (
                <div className="text-xs text-gray-500">
                  {userInfo.company}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessor: 'settlementDate',
      title: 'Settlement Date',
      render: (record: SettlementTransaction) => (
        <div>
          {record.settlementDate ? new Date(record.settlementDate).toLocaleDateString() : 'N/A'}
          <div className="text-xs text-gray-500">
            {record.settlementDate ? new Date(record.settlementDate).toLocaleTimeString() : ''}
          </div>
        </div>
      ),
    },
    {
      accessor: 'totalSalary',
      title: 'Total Salary',
      render: (record: SettlementTransaction) => (
        <div className="text-right font-semibold text-green-600">
          ₹{record.totalSalary?.toLocaleString() || 0}
        </div>
      ),
    },
    {
      accessor: 'cashInHand',
      title: 'Cash in Hand',
      render: (record: SettlementTransaction) => (
        <div className="text-right">
          ₹{record.cashInHand?.toLocaleString() || 0}
        </div>
      ),
    },
    {
      accessor: 'advance',
      title: 'Advance',
      render: (record: SettlementTransaction) => (
        <div className="text-right text-orange-600">
          ₹{record.advance?.toLocaleString() || 0}
        </div>
      ),
    },
    {
      accessor: 'cashCollection',
      title: 'Cash Collection',
      render: (record: SettlementTransaction) => (
        <div className="text-right">
          ₹{record.cashCollection?.toLocaleString() || 0}
        </div>
      ),
    },
    {
      accessor: 'pendingExpenses',
      title: 'Pending Expenses',
      render: (record: SettlementTransaction) => (
        <div className="text-right text-red-600">
          {record.userType === 'driver' ? `₹${record.pendingExpenses?.toLocaleString() || 0}` : 'N/A'}
        </div>
      ),
    },
    {
      accessor: 'settlementAmount',
      title: 'Settlement Amount',
      render: (record: SettlementTransaction) => (
        <div className={`text-right font-bold text-lg ${
          (record.settlementAmount || 0) >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          ₹{(record.balanceAmount || 0)?.toLocaleString()}

        </div>
      ),
    },
    {
      accessor: 'createdAt',
      title: 'Recorded On',
      render: (record: SettlementTransaction) => (
        <div className="text-xs text-gray-500">
          {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'}
        </div>
      ),
    },

  {
  accessor: 'unverifiedSalary',
 
  title: 'Unverified Amount❌',
   render: (record: SettlementTransaction) => {
    const userInfo = getUserDisplay(record);
    if (!userInfo._id) return null;
    
    const unverifiedData = getUnverifiedDataForUser(userInfo._id);
    
    console.log(`Unverified data for ${userInfo._id}:`, unverifiedData);
    
    if (!unverifiedData || unverifiedData.unverifiedCount === 0) {
      return (
        <div className="text-center text-green-500">
          <span className="font-semibold">All Verified ✓</span>
        </div>
      );
    }
    
    // Safely get the totalSalary
    const totalSalary = unverifiedData?.totalSalary ?? 0;
    const unverifiedCount = unverifiedData?.unverifiedCount ?? 0;
    const bookings = unverifiedData?.bookings ?? [];
    
    return (
      <div className="min-w-[220px]">
        <div className="flex justify-between items-center mb-1">
          <div className="text-red-500 font-semibold">
            {unverifiedCount} Unverified
          </div>
          <div className="font-bold text-red-600">
            ₹{totalSalary.toLocaleString()}
          </div>
        </div>
        <div className="max-h-24 overflow-y-auto border rounded p-1 bg-red-50">
          {bookings.map((booking, index) => (
            <div key={index} className="text-xs mb-1 p-1 bg-white rounded shadow-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">{booking.fileNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-medium">
                    ₹{(booking.salary || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
            </div>
          </div>
        );
      },
    },
  ];

  // Calculate total unverified salary across all drivers
   // Calculate total unverified salary for all users
  const calculateTotalUnverifiedSalary = (): number => {
    let total = 0;
    Object.values(unverifiedDataMap).forEach(data => {
      total += data.totalSalary || 0;
    });
    return total;
  };

  const calculateTotalUnverifiedCount = (): number => {
    let total = 0;
    Object.values(unverifiedDataMap).forEach(data => {
      total += data.unverifiedCount || 0;
    });
    return total;
  };

  // Filter transactions based on selected user type
  const filteredTransactions = selectedUserType === 'all' 
    ? settlementTransactions 
    : settlementTransactions.filter(t => t.userType === selectedUserType);

  // Calculate driver and provider counts
  const driverCount = settlementTransactions.filter(t => t.userType === 'driver').length;
  const providerCount = settlementTransactions.filter(t => t.userType === 'provider').length;

  return (
    <div className="panel mt-6">
      <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
        <h5 className="font-semibold text-lg dark:text-white-light">
          Settlement Transactions
        </h5>
        <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-4">
          <div className="flex items-center gap-3">
            {/* User Type Filter */}
            <select 
              className="form-select w-auto"
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="driver">Drivers Only</option>
              <option value="provider">Providers Only</option>
            </select>
            
            {/* Stats display */}
            <div className="flex gap-4">
              <div className="bg-blue-50 px-3 py-1 rounded border border-blue-200">
                <div className="text-xs text-gray-500">Driver Settlements</div>
                <div className="font-bold text-blue-600">
                  {driverCount}
                </div>
              </div>
              <div className="bg-purple-50 px-3 py-1 rounded border border-purple-200">
                <div className="text-xs text-gray-500">Provider Settlements</div>
                <div className="font-bold text-purple-600">
                  {providerCount}
                </div>
              </div>
              <div className="bg-red-50 px-3 py-1 rounded border border-red-200">
                <div className="text-xs text-gray-500">Unverified Total</div>
                <div className="font-bold text-red-600">
                  ₹{calculateTotalUnverifiedSalary().toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">
                  {calculateTotalUnverifiedCount()} bookings
                </div>
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
              Unverified
              <div className="w-3 h-3 rounded-full bg-green-500 ml-4 mr-1"></div>
              Verified
            </div>
            
            <input 
              type="text" 
              className="form-input w-auto" 
              placeholder="Search by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="datatables">
        <DataTable
          className="whitespace-nowrap table-hover"
          records={filteredTransactions}
          columns={columns}
          fetching={loading}
          totalRecords={totalRecords}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={setPage}
          recordsPerPageOptions={[10, 20, 30, 50]}
          onRecordsPerPageChange={setPageSize}
          minHeight={200}
          noRecordsText="No settlement transactions found"
          rowClassName={(transaction) => 
            transaction.userType === 'driver' 
              ? 'hover:bg-blue-50' 
              : 'hover:bg-purple-50'
          }
        />
      </div>
    </div>
  );
};

export default SettlementTransaction;