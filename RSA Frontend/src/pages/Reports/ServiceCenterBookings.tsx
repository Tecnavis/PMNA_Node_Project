
import { useEffect, useState } from 'react';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CLOUD_IMAGE } from '../../constants/status';
import { GrNext, GrPrevious } from 'react-icons/gr';

interface ShowroomBookingStats {
  _id: string;
  name: string;
  showroomId: string;
  image?: string;
  totalBookings: number;
  lastTwoMonthsBookings: number;
  vehicleNumbers: string[];
}

const ServiceCenterBookings = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setPageTitle('Showroom Bookings Report'));
  }, [dispatch]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showrooms, setShowrooms] = useState<ShowroomBookingStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedShowroom, setExpandedShowroom] = useState<string | null>(null);

  // Fetch showroom booking statistics
  const fetchShowroomBookings = async (searchTerm = '', page = 1, limit = 10) => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/showroom/bookings-stats`, {
        params: { search: searchTerm, page, limit },
      });
      setShowrooms(response.data.data);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.page);
    } catch (error) {
      console.error('Error fetching showroom bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchShowroomBookings(searchTerm, page);
  };

  const toggleExpand = (showroomId: string) => {
    setExpandedShowroom(expandedShowroom === showroomId ? null : showroomId);
  };

  // Token check and fetching data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      navigate('/auth/boxed-signin');
    }
    fetchShowroomBookings(searchTerm);
  }, [searchTerm, navigate]);

  return (
    <div>
      <div className="panel mt-6">
        <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
          <h5 className="font-semibold text-lg dark:text-white-light">Showroom Bookings Report</h5>
          <div className="ltr:ml-auto rtl:mr-auto">
            <input
              type="text"
              className="form-input w-auto"
              placeholder="Search showrooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="datatables">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Showroom
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Bookings
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last 2 Months
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vehicle Numbers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {showrooms.map((showroom) => (
                  <tr key={showroom._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {showroom.image && (
                          <img
                            className="w-10 h-10 rounded-full mr-3 object-cover"
                            src={`${CLOUD_IMAGE}${showroom.image}`}
                            alt={showroom.name}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {showroom.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {showroom.showroomId}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {showroom.totalBookings}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {showroom.lastTwoMonthsBookings}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-center">
                        {showroom.vehicleNumbers.length > 0 ? (
                          <div>
                            <button
                              onClick={() => toggleExpand(showroom._id)}
                              className="text-sm text-primary hover:text-primary-dark font-medium mb-2"
                            >
                              {expandedShowroom === showroom._id ? 'Hide' : 'Show'} Vehicles ({showroom.vehicleNumbers.length})
                            </button>
                            
                            {expandedShowroom === showroom._id && (
                              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-40 overflow-y-auto">
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {showroom.vehicleNumbers.map((vehicleNum, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                    >
                                      {vehicleNum}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">No vehicles</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {showrooms.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No showrooms found
              </div>
            )}
            
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-center">
        <ul className="inline-flex items-center space-x-1 rtl:space-x-reverse m-auto">
          <li>
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50"
            >
              <GrPrevious />
            </button>
          </li>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <li key={pageNum}>
              <button
                type="button"
                onClick={() => handlePageChange(pageNum)}
                className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${
                  currentPage === pageNum 
                    ? 'bg-primary text-white' 
                    : 'bg-white-light text-dark hover:text-white hover:bg-primary'
                }`}
              >
                {pageNum}
              </button>
            </li>
          ))}

          <li>
            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50"
            >
              <GrNext />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ServiceCenterBookings;