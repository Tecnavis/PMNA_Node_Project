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
  phone?: string; // Added phone field
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
  const [sortBy, setSortBy] = useState<'total' | 'lastTwoMonths'>('lastTwoMonths');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedShowrooms, setSelectedShowrooms] = useState<string[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | '0-5' | '5-10' | '10+'>('all');

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

  // Sort showrooms based on selected criteria
  const sortedShowrooms = [...showrooms].sort((a, b) => {
    let valueA, valueB;
    
    if (sortBy === 'lastTwoMonths') {
      valueA = a.lastTwoMonthsBookings;
      valueB = b.lastTwoMonthsBookings;
    } else {
      valueA = a.totalBookings;
      valueB = b.totalBookings;
    }
    
    if (sortOrder === 'desc') {
      return valueB - valueA;
    } else {
      return valueA - valueB;
    }
  });

  const handleSort = (type: 'total' | 'lastTwoMonths') => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  // Selection handlers
  const toggleSelectShowroom = (showroomId: string) => {
    setSelectedShowrooms(prev =>
      prev.includes(showroomId)
        ? prev.filter(id => id !== showroomId)
        : [...prev, showroomId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedShowrooms.length === filteredShowrooms.length) {
      setSelectedShowrooms([]);
    } else {
      setSelectedShowrooms(filteredShowrooms.map(showroom => showroom._id));
    }
  };

  // Filter showrooms based on booking count
  const filteredShowrooms = sortedShowrooms.filter(showroom => {
    switch (bookingFilter) {
      case '0-5':
        return showroom.lastTwoMonthsBookings >= 0 && showroom.lastTwoMonthsBookings <= 5;
      case '5-10':
        return showroom.lastTwoMonthsBookings > 5 && showroom.lastTwoMonthsBookings <= 10;
      case '10+':
        return showroom.lastTwoMonthsBookings > 10;
      default:
        return true;
    }
  });

  // Get selected showrooms data
  const getSelectedShowroomsData = () => {
    return filteredShowrooms.filter(showroom => 
      selectedShowrooms.includes(showroom._id)
    );
  };

  // Print functionality
  const handlePrint = () => {
    const selectedData = getSelectedShowroomsData();
    
    if (selectedData.length === 0) {
      alert('Please select at least one showroom to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Showroom Bookings Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .summary { margin-bottom: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 5px; }
            .timestamp { color: #666; font-size: 14px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>Showroom Bookings Report</h1>
          <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
          <div class="summary">
            <strong>Summary:</strong> ${selectedData.length} showroom(s) selected | 
            Filter: ${bookingFilter} bookings
          </div>
          <table>
            <thead>
              <tr>
                <th>Showroom Name</th>
                <th>Phone</th>
                <th>Last 2 Months Bookings</th>
                <th>Showroom ID</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map(showroom => `
                <tr>
                  <td>${showroom.name}</td>
                  <td>${showroom.phone || 'N/A'}</td>
                  <td>${showroom.lastTwoMonthsBookings}</td>
                  <td>${showroom.showroomId}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Get filter counts
  const getFilterCounts = () => {
    return {
      '0-5': showrooms.filter(s => s.lastTwoMonthsBookings >= 0 && s.lastTwoMonthsBookings <= 5).length,
      '5-10': showrooms.filter(s => s.lastTwoMonthsBookings > 5 && s.lastTwoMonthsBookings <= 10).length,
      '10+': showrooms.filter(s => s.lastTwoMonthsBookings > 10).length,
    };
  };

  const filterCounts = getFilterCounts();

  return (
    <div>
      <div className="panel mt-6">
        {/* Header with Search and Print Button */}
        <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
          <h5 className="font-semibold text-lg dark:text-white-light">Showroom Bookings Report</h5>
          <div className="ltr:ml-auto rtl:mr-auto flex flex-wrap gap-4">
            <input
              type="text"
              className="form-input w-auto"
              placeholder="Search showrooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={selectedShowrooms.length === 0}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Print Selected ({selectedShowrooms.length})
            </button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => setBookingFilter('all')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              bookingFilter === 'all'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Showrooms ({showrooms.length})
          </button>
          <button
            onClick={() => setBookingFilter('0-5')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              bookingFilter === '0-5'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            0-5 Bookings ({filterCounts['0-5']})
          </button>
          <button
            onClick={() => setBookingFilter('5-10')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              bookingFilter === '5-10'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            5-10 Bookings ({filterCounts['5-10']})
          </button>
          <button
            onClick={() => setBookingFilter('10+')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              bookingFilter === '10+'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            10+ Bookings ({filterCounts['10+']})
          </button>
        </div>

        <div className="datatables">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedShowrooms.length === filteredShowrooms.length && filteredShowrooms.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Showroom
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-center">
                      Total Bookings
                      {sortBy === 'total' && (
                        <span className="ml-1">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('lastTwoMonths')}
                  >
                    <div className="flex items-center justify-center">
                      Last 2 Months
                      {sortBy === 'lastTwoMonths' && (
                        <span className="ml-1">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vehicle Numbers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredShowrooms.map((showroom) => (
                  <tr 
                    key={showroom._id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selectedShowrooms.includes(showroom._id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedShowrooms.includes(showroom._id)}
                        onChange={() => toggleSelectShowroom(showroom._id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
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
                          {showroom.phone && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Phone: {showroom.phone}
                            </div>
                          )}
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
            
            {filteredShowrooms.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No showrooms found matching the current filter
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