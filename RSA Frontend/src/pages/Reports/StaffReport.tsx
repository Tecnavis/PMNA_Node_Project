import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CLOUD_IMAGE } from '../../constants/status';

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

  // Staff data state
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [recordsData, setRecordsData] = useState<Staff[]>([]);

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
    setRecordsData(
      (sortStatus.direction === 'desc' ? sortedData.reverse() : sortedData).slice(
        (page - 1) * pageSize,
        (page - 1) * pageSize + pageSize
      )
    );
  }, [sortStatus, staffs, page, pageSize]);

  return (
    <div>
      <div className="panel mt-6">
        {/* Header */}
        <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
          <h5 className="font-semibold text-lg dark:text-white-light">Staff Report</h5>
          <div className="ltr:ml-auto rtl:mr-auto">
            <input
              type="text"
              className="form-input w-auto"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                    {staff.image && (
                      <img
                        className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                        src={`${CLOUD_IMAGE}${staff.image}`}
                        alt=""
                      />
                    )}
                    <div>{staff.name}</div>
                  </div>
                ),
              },
              
              {
                accessor: 'cashInHand',
                title: 'Cash in Hand',
                render: (staff: Staff) => (
                  <div>₹{staff.cashInHand !== undefined ? staff.cashInHand : 0}</div>
                ),
              },
              {
                accessor: 'action',
                title: 'Action',
                titleClassName: '!text-center',
                render: (staff: Staff) => (
                  <div
                    className="relative inline-flex items-center space-x-1"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <button
                      type="button"
                      className="btn btn-success px-2 py-1 text-xs"
                      onClick={() => navigate(`/staffcashreport/${staff._id}`)}
                    >
                      View Report
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default StaffReport;
