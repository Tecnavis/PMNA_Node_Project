import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataTable } from 'mantine-datatable';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface UnverifiedBooking {
  fileNumber: string;
  createdAt: string;
  verified: boolean;
  driverSalary: number;
}

interface DriverUnverifiedData {
  driver: {
    _id: string;
    name: string;
  };
  bookings: UnverifiedBooking[];
  totalDriverSalary: number;
  unverifiedCount: number;
}

interface SettlementTransaction {
  _id: string;
  driver: {
    _id: string;
    name: string;
    idNumber: string;
    image: string;
  };
  settlementDate: Date;
  totalSalary: number;
  cashInHand: number;
  balanceAmount: number;
  advance: number;
  cashCollection: number;
  pendingExpenses: number;
  settlementAmount: number;
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
  const [unverifiedDataMap, setUnverifiedDataMap] = useState<Record<string, DriverUnverifiedData>>({});

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  // Set authorization token
  const setAuthToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Token set in headers');
      return true;
    } else {
      navigate('/auth/boxed-signin');
      console.log('Token not found in localStorage');
      return false;
    }
  };

  // Fetch unverified bookings for all drivers
  const fetchUnverifiedBookings = async (driverIds: string[]) => {
    try {
      if (!setAuthToken()) return;

      const response = await axios.get(`${backendUrl}/booking/unverified-by-drivers`, {
        params: {
          driverIds: driverIds.join(',')
        }
      });

      if (response.data.success && response.data.data) {
        setUnverifiedDataMap(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching unverified bookings:', error);
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

      // Extract driver IDs and fetch their unverified bookings
      const driverIds = transactions
        .filter((t: SettlementTransaction) => t.driver && t.driver._id)
        .map((t: SettlementTransaction) => t.driver._id);
      
      if (driverIds.length > 0) {
        await fetchUnverifiedBookings(driverIds);
      }
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

  const getUnverifiedDataForDriver = (driverId: string): DriverUnverifiedData | null => {
    return unverifiedDataMap[driverId] || null;
  };

  const columns = [
    {
      accessor: 'driver.name',
      title: 'Driver',
      render: (record: SettlementTransaction) => (
        <div className="flex items-center w-max">
          <img 
            className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" 
            src={`${import.meta.env.VITE_CLOUD_IMAGE}${record.driver?.image || ''}`} 
            alt={record.driver?.name || 'Driver'}
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
              e.currentTarget.src = '/default-avatar.png';
            }}
          />
          <div>
            <div className="font-semibold">{record.driver?.name || 'No Driver'}</div>
            <div className="text-xs text-gray-500">ID: {record.driver?.idNumber || 'N/A'}</div>
          </div>
        </div>
      ),
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
          ₹{record.pendingExpenses?.toLocaleString() || 0}
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
        accessor: 'createdAt',
      title: 'Unverified Salary❌',
      render: (record: SettlementTransaction) => {
        if (!record.driver || !record.driver._id) return null;
        
        const unverifiedData = getUnverifiedDataForDriver(record.driver._id);
        
        if (!unverifiedData || unverifiedData.unverifiedCount === 0) {
          return (
            <div className="text-center text-green-500">
              <span className="font-semibold">All Verified ✓</span>
            </div>
          );
        }
        
        return (
          <div className="min-w-[220px]">
            <div className="flex justify-between items-center mb-1">
              <div className="text-red-500 font-semibold">
                {unverifiedData.unverifiedCount} Unverified
              </div>
              <div className="font-bold text-red-600">
                ₹{unverifiedData.totalDriverSalary?.toLocaleString() || 0}
              </div>
            </div>
            <div className="max-h-24 overflow-y-auto border rounded p-1 bg-red-50">
              {unverifiedData.bookings.map((booking, index) => (
                <div key={index} className="text-xs mb-1 p-1 bg-white rounded shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{booking.fileNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">
                        ₹{booking.driverSalary?.toLocaleString() || 0}
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
  const calculateTotalUnverifiedSalary = (): number => {
    let total = 0;
    Object.values(unverifiedDataMap).forEach(data => {
      total += data.totalDriverSalary || 0;
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

  return (
    <div className="panel mt-6">
      <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
        <h5 className="font-semibold text-lg dark:text-white-light">
          Settlement Transactions
        </h5>
        <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 px-3 py-1 rounded border border-red-200">
              <div className="text-xs text-gray-500">Unverified Total</div>
              <div className="font-bold text-red-600">
                ₹{calculateTotalUnverifiedSalary().toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">
                {calculateTotalUnverifiedCount()} bookings
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
              Unverified
              <div className="w-3 h-3 rounded-full bg-green-500 ml-4 mr-1"></div>
              Verified
            </div>
          </div>
          <input 
            type="text" 
            className="form-input w-auto" 
            placeholder="Search by driver name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="datatables">
        <DataTable
          className="whitespace-nowrap table-hover"
          records={settlementTransactions}
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
        />
      </div>
    </div>
  );
};

export default SettlementTransaction;