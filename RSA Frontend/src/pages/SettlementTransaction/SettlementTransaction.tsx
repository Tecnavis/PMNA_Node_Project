import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataTable } from 'mantine-datatable';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

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
}

const SettlementTransaction = () => {
  const [settlementTransactions, setSettlementTransactions] = useState<SettlementTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

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

  const fetchSettlementTransactions = async () => {
    try {
      setLoading(true);
      
      // Set token before making the request
      if (!setAuthToken()) {
        return; // Stop if no token
      }

      const response = await axios.get(`${backendUrl}/settlementTransaction/transaction`, {
        params: {
          page,
          limit: pageSize,
          search: searchTerm
        }
      });
      
      setSettlementTransactions(response.data.transactions);
      setTotalRecords(response.data.total);
    } catch (error: unknown) {
      console.error('Error fetching settlement transactions:', error);
      
      // Type-safe error handling
      if (axios.isAxiosError(error)) {
        // This is an Axios error
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        
        // Handle 401 specifically - redirect to login
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/auth/boxed-signin');
          return;
        }
        
        toast.error(error.response?.data?.message || 'Failed to fetch settlement transactions');
      } else if (error instanceof Error) {
        // This is a generic Error
        console.error('Error message:', error.message);
        toast.error(error.message || 'Failed to fetch settlement transactions');
      } else {
        // Unknown error type
        console.error('Unknown error:', error);
        toast.error('Failed to fetch settlement transactions');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set auth token on component mount
    setAuthToken();
    fetchSettlementTransactions();
  }, [page, pageSize, searchTerm]);

  // Add useEffect to reset to page 1 when searching
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const columns = [
    {
      accessor: 'driver.name',
      title: 'Driver',
      render: (record: SettlementTransaction) => (
        <div className="flex items-center w-max">
          <img 
            className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" 
            src={`${import.meta.env.VITE_CLOUD_IMAGE}${record.driver.image}`} 
            alt={record.driver.name}
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
              e.currentTarget.src = '/default-avatar.png';
            }}
          />
          <div>
            <div className="font-semibold">{record.driver.name}</div>
            <div className="text-xs text-gray-500">ID: {record.driver.idNumber}</div>
          </div>
        </div>
      ),
    },
    {
      accessor: 'settlementDate',
      title: 'Settlement Date',
      render: (record: SettlementTransaction) => (
        <div>
          {new Date(record.settlementDate).toLocaleDateString()}
          <div className="text-xs text-gray-500">
            {new Date(record.settlementDate).toLocaleTimeString()}
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
      accessor: 'balanceAmount',
      title: 'Balance Amount',
      render: (record: SettlementTransaction) => (
        <div className={`text-right font-semibold ${
          record.balanceAmount >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          ₹{record.balanceAmount?.toLocaleString() || 0}
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
          record.settlementAmount >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          ₹{record.settlementAmount?.toLocaleString() || 0}
        </div>
      ),
    },
    {
      accessor: 'createdAt',
      title: 'Recorded On',
      render: (record: SettlementTransaction) => (
        <div className="text-xs text-gray-500">
          {new Date(record.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  return (
    <div className="panel mt-6">
      <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
        <h5 className="font-semibold text-lg dark:text-white-light">
          Settlement Transactions
        </h5>
        <div className="ltr:ml-auto rtl:mr-auto">
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