import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import TableExportButtons from '../../components/TableExportButtons';
import { useEffect, useRef, useState } from 'react';
import sortBy from 'lodash/sortBy';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CLOUD_IMAGE } from '../../constants/status';
import { GrNext, GrPrevious } from 'react-icons/gr';
import { getImageUrl } from '../../utils/imageUrl';

import { Pager, useServerPaging } from '../../components/ui/ListControls';
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
    bookingsCount?: number; // Add this field

}

const ShowroomReport = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setPageTitle('Showroom Report'));
  }, [dispatch]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const sp = useServerPaging({ storageKey: 'showroom-report', pageSize: 25 });
  const searchTerm = sp.search;
  const loadSeq = useRef(0);

  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch showrooms from backend with pagination
  const fetchShowrooms = async () => {
    const seq = ++loadSeq.current;
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/showroom/all-showrooms`, {
        params: { search: sp.search, page: sp.page, limit: sp.pageSize },
      });
      if (seq !== loadSeq.current) return;
      setShowrooms(Array.isArray(response.data?.data) ? response.data.data : []);
      setTotalPages(response.data?.totalPages || 0);
      setCurrentPage(response.data?.page || sp.page);
      sp.setTotal(Number(response.data?.totalCount) || 0);
    } catch (error) {
      if (seq === loadSeq.current) console.error('Error fetching showrooms:', error);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/auth/boxed-signin');
  }, [navigate]);

  useEffect(() => {
    fetchShowrooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.page, sp.pageSize, sp.search]);

  return (
    <div>
      <div className="panel mt-6">
        <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
          <h5 className="font-semibold text-lg dark:text-white-light">Showroom Report</h5>
          <TableExportButtons containerId="tbl-showroom-report" title="Showroom report" />
<div className="ltr:ml-auto rtl:mr-auto">
            <input
              type="text"
              className="form-input w-auto"
              placeholder="Search..."
              value={sp.searchInput}
              onChange={(e) => sp.setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div className="datatables" id="tbl-showroom-report">
          <DataTable
          fetching={loading}
            className="whitespace-nowrap table-hover"
            records={showrooms}
            columns={[
              {
                accessor: 'name',
                title: 'Showroom Name',
                render: (showroom: Showroom) => (
                  <div className="flex items-center w-max">
                    {showroom.image && (
                      <img
                        className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                        src={getImageUrl(showroom.image)}
                        alt=""
                      />
                    )}
                    <div>{showroom.name}</div>
                  </div>
                ),
              },
              { accessor: 'showroomId', title: 'Showroom ID', render: (showroom: Showroom) => <div>{showroom.showroomId}</div> },
              { accessor: 'cashInHand', title: 'Cash in Hand', render: (showroom: Showroom) => <div>₹{showroom.cashInHand ? showroom.cashInHand : 0}</div> },
// In your ShowroomReport component, update the column:
{
  accessor: 'bookingsCount',
  title: 'Bookings Count',
  render: (showroom: Showroom) => (
    <div className="flex justify-center">
      <span className="relative inline-flex items-center justify-center">
        {/* Star Badge */}
        <div className="relative">
          {/* Star SVG Background */}
          <svg 
            className="w-12 h-12 text-yellow-400 drop-shadow-lg" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          
          {/* Count Text */}
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
            {showroom.bookingsCount || 0}
          </span>
        </div>
      </span>
    </div>
  ),
},
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
      {/* Custom Pagination Controls */}
      <div className="mt-4 flex justify-center">
        <Pager {...sp.pager} loading={loading} sizes={[10, 25, 50, 100, 500]} />
      </div>
    </div>
  );
};

export default ShowroomReport;
