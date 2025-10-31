import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CLOUD_IMAGE } from '../../constants/status';
import { GrNext, GrPrevious } from 'react-icons/gr';

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

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch showrooms from backend with pagination
  const fetchShowrooms = async (searchTerm = '', page = 1, limit = 10) => {
    try {
      setLoading(true);
      const search = searchTerm;
      const response = await axios.get(`${backendUrl}/showroom/all-showrooms`, {
        params: { search, page, limit },
      });
      setShowrooms(response.data.data);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.page);// Server already paginated the data
    } catch (error) {
      console.error('Error fetching showrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchShowrooms(searchTerm, page); // use current search term
  };

  // Token check and fetching data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      navigate('/auth/boxed-signin');
    }
    fetchShowrooms(searchTerm);
  }, [searchTerm, navigate]);

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="datatables">
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
                        src={`${CLOUD_IMAGE}${showroom.image}`}
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
      {/* Custom Pagination Controls */}
      <div className="mt-4 flex justify-center">
        <ul className="inline-flex items-center space-x-1 rtl:space-x-reverse m-auto">
          {/* Previous Button */}
          <li>
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary"
              disabled={currentPage === 1}
            >
              <GrPrevious />
            </button>
          </li>

          {/* Always show first page */}
          <li>
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${currentPage === 1 ? 'bg-primary text-white' : 'bg-white-light text-dark hover:text-white hover:bg-primary'}`}
            >
              1
            </button>
          </li>

          {/* Show ellipsis if current page is far from start */}
          {currentPage > 4 && totalPages > 7 && (
            <li className="flex items-end">
              <span className="px-1">...</span>
            </li>
          )}

          {/* Middle pages - dynamic range */}
          {Array.from({ length: Math.min(5, totalPages - 2) }, (_, i) => {
            let pageNum;
            if (currentPage < 4) {
              pageNum = i + 2; // Show pages 2-6 when near start
            } else if (currentPage > totalPages - 3) {
              pageNum = totalPages - 4 + i; // Show last pages when near end
            } else {
              pageNum = currentPage - 2 + i; // Show pages around current
            }

            if (pageNum > 1 && pageNum < totalPages) {
              return (
                <li key={pageNum}>
                  <button
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${currentPage === pageNum ? 'bg-primary text-white' : 'bg-white-light text-dark hover:text-white hover:bg-primary'}`}
                  >
                    {pageNum}
                  </button>
                </li>
              );
            }
            return null;
          })}

          {/* Show ellipsis if current page is far from end */}
          {currentPage < totalPages - 3 && totalPages > 7 && (
            <li className="flex items-end">
              <span className="px-1">...</span>
            </li>
          )}

          {/* Always show last page if there's more than 1 page */}
          {totalPages > 1 && (
            <li>
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${currentPage === totalPages ? 'bg-primary text-white' : 'bg-white-light text-dark hover:text-white hover:bg-primary'}`}
              >
                {totalPages}
              </button>
            </li>
          )}

          {/* Next Button */}
          <li>
            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary"
              disabled={currentPage === totalPages}
            >
              <GrNext />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ShowroomReport;
