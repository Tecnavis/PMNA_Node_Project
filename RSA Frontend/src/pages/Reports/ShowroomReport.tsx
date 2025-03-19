import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Showroom {
  _id: string;
  name: string;
  showroomId: string;
  description?: string;
  location: string;
  latitudeAndLongitude: string;
  image?: string;
  services: {
    serviceCenter: {
      selected: boolean;
      amount: number | null;
    };
    bodyShop: {
      selected: boolean;
      amount: number | null;
    };
    showroom: {
      selected: boolean;
    };
  };
  cashInHand?: number;
}

const ShowroomReport = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setPageTitle('Showroom Report'));
  }, [dispatch]);

  const [page, setPage] = useState(1);
  const PAGE_SIZES = [10, 20, 30, 50, 100];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [search, setSearch] = useState('');
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'name',
    direction: 'asc',
  });

  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [recordsData, setRecordsData] = useState<Showroom[]>([]);

  // Fetch showrooms from backend
  const fetchShowrooms = async (search = '') => {
    try {
      const response = await axios.get(`${backendUrl}/showroom/filtered`, {
        params: { search },
      });
      setShowrooms(response.data);
    } catch (error) {
      console.error('Error fetching showrooms:', error);
    }
  };

  // Token check and fetching data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      navigate('/auth/boxed-signin');
    }
    fetchShowrooms(search);
  }, [search, navigate]);

  // Handle pagination
  useEffect(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    setRecordsData(showrooms.slice(from, to));
  }, [page, pageSize, showrooms]);

  // Optional: handle sorting (you can adjust the logic based on your needs)
  useEffect(() => {
    const sortedData = sortBy(showrooms, sortStatus.columnAccessor);
    setRecordsData(
      (sortStatus.direction === 'desc' ? sortedData.reverse() : sortedData).slice(
        (page - 1) * pageSize,
        (page - 1) * pageSize + pageSize
      )
    );
  }, [sortStatus, showrooms, page, pageSize]);

  return (
    <div>
      <div className="panel mt-6">
        <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
          <h5 className="font-semibold text-lg dark:text-white-light">Showroom Report</h5>
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
        <div className="datatables">
          <DataTable
            className="whitespace-nowrap table-hover"
            records={recordsData}
            columns={[
              {
                accessor: 'name',
                title: 'Showroom Name',
                render: (showroom: Showroom) => (
                  <div className="flex items-center w-max">
                    {showroom.image && (
                      <img
                        className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                        src={`${backendUrl}/images/${showroom.image}`}
                        alt=""
                      />
                    )}
                    <div>{showroom.name}</div>
                  </div>
                ),
              },
              { accessor: 'showroomId', title: 'Showroom ID', render: (showroom: Showroom) => <div>{showroom.showroomId}</div> },
              { accessor: 'cashInHand', title: 'Cash in Hand', render: (showroom: Showroom) => <div>₹{showroom.cashInHand ? showroom.cashInHand : 0}</div> },

              {
                accessor: 'action',
                title: 'Action',
                titleClassName: '!text-center',
                render: (showroom: Showroom) => (
                  <div className="relative inline-flex items-center space-x-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-success px-2 py-1 text-xs"
                      onClick={() => navigate(`/servicecenterreport/${showroom._id}`)}
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

export default ShowroomReport;
