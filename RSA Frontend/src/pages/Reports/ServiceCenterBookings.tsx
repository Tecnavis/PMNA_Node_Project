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
  phone?: string;
  image?: string;
  totalBookings: number;
  lastTwoMonthsBookings: number;
  vehicleNumbers: string[];
}

interface PrintShowroomData {
  name: string;
  phone: string;
  lastTwoMonthsBookings: number;
  showroomId: string;
  remark: string; // New field for remarks
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
  const [pageSize, setPageSize] = useState<number>(10);
  const [remarks, setRemarks] = useState<{[key: string]: string}>({}); // Store remarks for each showroom

  // Fetch showroom booking statistics
  const fetchShowroomBookings = async (searchTerm = '', page = 1, limit = pageSize) => {
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
    fetchShowroomBookings(searchTerm, page, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchShowroomBookings(searchTerm, 1, size);
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

  // Handle remark change
  const handleRemarkChange = (showroomId: string, remark: string) => {
    setRemarks(prev => ({
      ...prev,
      [showroomId]: remark
    }));
  };

  // Get selected showrooms data for printing
  const getSelectedShowroomsData = (): PrintShowroomData[] => {
    return filteredShowrooms
      .filter(showroom => selectedShowrooms.includes(showroom._id))
      .map(showroom => ({
        name: showroom.name,
        phone: showroom.phone || 'N/A',
        lastTwoMonthsBookings: showroom.lastTwoMonthsBookings,
        showroomId: showroom.showroomId,
        remark: remarks[showroom._id] || '' // Use existing remark or empty string
      }));
  };

  // Print functionality with Remarks column
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
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
            }
            h1 { 
              color: #333; 
              text-align: center; 
              margin-bottom: 10px; 
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .report-info {
              text-align: center;
              margin-bottom: 20px;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              font-size: 14px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
              position: sticky;
              top: 0;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .summary { 
              margin-bottom: 20px; 
              padding: 15px; 
              background-color: #e8f4fd; 
              border-radius: 5px;
              border-left: 4px solid #2196F3;
            }
            .timestamp { 
              color: #666; 
              font-size: 14px; 
              margin-bottom: 10px; 
            }
            .remark-cell {
              min-height: 40px;
              border: 1px dashed #ccc;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Showroom Bookings Report</h1>
          <div class="report-info">
            <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
          </div>
          
          <div class="summary">
            <strong>Report Summary:</strong><br>
            • Total Showrooms: ${selectedData.length}<br>
            • Booking Filter: ${bookingFilter === 'all' ? 'All Showrooms' : bookingFilter + ' bookings'}<br>
            • Report Date: ${new Date().toLocaleDateString()}
          </div>

          <table>
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="25%">Showroom Name</th>
                <th width="15%">Phone</th>
                <th width="15%">Last 2 Months Bookings</th>
                <th width="40%">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map((showroom, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${showroom.name}</strong><br><small style="color: #666;">ID: ${showroom.showroomId}</small></td>
                  <td>${showroom.phone}</td>
                  <td style="text-align: center;">
                    <span style="
                      display: inline-block; 
                      padding: 4px 12px; 
                      background-color: ${showroom.lastTwoMonthsBookings > 10 ? '#4CAF50' : showroom.lastTwoMonthsBookings > 5 ? '#FF9800' : '#F44336'}; 
                      color: white; 
                      border-radius: 12px; 
                      font-weight: bold;
                      min-width: 30px;
                    ">
                      ${showroom.lastTwoMonthsBookings}
                    </span>
                  </td>
                  <td class="remark-cell">
                    ${showroom.remark || '&nbsp;'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Note:</strong> This report shows booking statistics for the last 2 months. Remarks column is provided for additional notes and observations.</p>
            <p>Printed by: User • Page 1 of 1</p>
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="
              padding: 10px 20px; 
              background: #2196F3; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
            ">
              Print Report
            </button>
            <button onclick="window.close()" style="
              padding: 10px 20px; 
              background: #f44336; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer; 
              margin-left: 10px;
            ">
              Close Window
            </button>
          </div>

          <script>
            // Auto-print after window opens
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Add remark input field in the table
  const [editingRemark, setEditingRemark] = useState<string | null>(null);

  // Get filter counts
  const getFilterCounts = () => {
    return {
      '0-5': showrooms.filter(s => s.lastTwoMonthsBookings >= 0 && s.lastTwoMonthsBookings <= 5).length,
      '5-10': showrooms.filter(s => s.lastTwoMonthsBookings > 5 && s.lastTwoMonthsBookings <= 10).length,
      '10+': showrooms.filter(s => s.lastTwoMonthsBookings > 10).length,
    };
  };

  const filterCounts = getFilterCounts();

  // Generate pagination buttons - show only 3 pages at a time
  const getPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 3;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      buttons.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = 3;
      }
      if (currentPage >= totalPages - 1) {
        start = totalPages - 2;
      }
      
      if (start > 2) {
        buttons.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          buttons.push(i);
        }
      }
      
      if (end < totalPages - 1) {
        buttons.push('...');
      }
      
      buttons.push(totalPages);
    }
    
    return buttons;
  };

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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Remarks
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

                    {/* Remarks Column */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        {editingRemark === showroom._id ? (
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={remarks[showroom._id] || ''}
                              onChange={(e) => handleRemarkChange(showroom._id, e.target.value)}
                              className="form-input flex-1 text-sm py-1 px-2"
                              placeholder="Enter remarks..."
                              autoFocus
                            />
                            <button
                              onClick={() => setEditingRemark(null)}
                              className="btn btn-success py-1 px-2 text-xs"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="min-h-8 p-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => setEditingRemark(showroom._id)}
                          >
                            {remarks[showroom._id] || (
                              <span className="text-gray-400 text-sm">Click to add remarks...</span>
                            )}
                          </div>
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
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Page Size Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="form-select py-1.5 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <span className="text-sm text-gray-600 dark:text-gray-400">entries</span>
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center space-x-1 rtl:space-x-reverse">
          <button
            type="button"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50"
          >
            <GrPrevious />
          </button>

          {getPaginationButtons().map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="flex justify-center font-semibold px-3.5 py-2 text-dark dark:text-white-light">
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePageChange(page as number)}
                  className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${
                    currentPage === page 
                      ? 'bg-primary text-white' 
                      : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'
                  }`}
                >
                  {page}
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50"
          >
            <GrNext />
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    </div>
  );
};

export default ServiceCenterBookings;