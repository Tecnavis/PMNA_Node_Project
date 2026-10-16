import { useEffect, useState } from 'react';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CLOUD_IMAGE } from '../../constants/status';
import { GrNext, GrPrevious } from 'react-icons/gr';
import { getImageUrl } from '../../utils/imageUrl';

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


  // Print: for each selected showroom, every case in the chosen period (case ID, date, vehicle no., status)
  const [printPeriod, setPrintPeriod] = useState<'2m' | 'all' | 'custom'>('2m');
  const [printFrom, setPrintFrom] = useState('');
  const [printTo, setPrintTo] = useState('');
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    if (selectedShowrooms.length === 0) {
      alert('Please select at least one showroom to print.');
      return;
    }
    const ist = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    let from = '', to = '';
    if (printPeriod === '2m') { const d = new Date(); d.setMonth(d.getMonth() - 2); from = ist(d); to = ist(new Date()); }
    if (printPeriod === 'custom') {
      if (!printFrom || !printTo) { alert('Choose the From and To dates.'); return; }
      from = printFrom; to = printTo;
    }
    // open the window first (browsers block pop-ups opened after waiting)
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow pop-ups for this site to print.'); return; }
    printWindow.document.write('<p style="font-family:Arial;padding:20px">Preparing report…</p>');

    setPrinting(true);
    let groups: { _id: string; name: string; showroomId: string; phone: string; bookings: { fileNumber: string; date: string; vehicleNumber: string; status: string; customerName: string }[] }[] = [];
    try {
      const ids = selectedShowrooms; // selections from every page
      const r = await axios.get(`${backendUrl}/reports/showroom-bookings`, { params: { ids: ids.join(','), ...(from ? { from } : {}), ...(to ? { to } : {}) } });
      groups = Array.isArray(r.data?.data) ? r.data.data : [];
    } catch (e: any) {
      printWindow.document.body.innerHTML = `<p style="font-family:Arial;padding:20px;color:#b91c1c">Could not load the bookings: ${String(e?.response?.data?.message || e?.message || 'error')}</p>`;
      setPrinting(false);
      return;
    }
    setPrinting(false);

    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    const fmt = (d: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');
    const periodText = printPeriod === 'all' ? 'All bookings' : `${fmt(`${from}T12:00:00+05:30`)} – ${fmt(`${to}T12:00:00+05:30`)}`;
    const statusColor = (st: string) => (st === 'Order Completed' ? '#15803d' : st === 'Cancelled' || st === 'Rejected' ? '#b91c1c' : '#1d4ed8');
    const remarkFor = (id: string) => remarks[id] || '';
    const total = groups.reduce((a, g) => a + g.bookings.length, 0);

    const sections = groups.map((g, gi) => `
      <section class="showroom">
        <div class="sh-head">
          <div>
            <div class="sh-name">${gi + 1}. ${esc(g.name)}</div>
            <div class="sh-meta">ID: ${esc(g.showroomId)}${g.phone ? ` · Phone: ${esc(g.phone)}` : ''}</div>
          </div>
          <div class="sh-count">${g.bookings.length} booking${g.bookings.length === 1 ? '' : 's'}</div>
        </div>
        ${remarkFor(g._id) ? `<div class="remark"><b>Remarks:</b> ${esc(remarkFor(g._id))}</div>` : ''}
        ${g.bookings.length === 0 ? '<p class="none">No bookings in this period.</p>' : `
        <table>
          <thead><tr><th style="width:5%">#</th><th style="width:27%">Case ID</th><th style="width:18%">Date</th><th style="width:22%">Vehicle no.</th><th style="width:28%">Status</th></tr></thead>
          <tbody>
            ${g.bookings.map((b, i) => `<tr>
              <td>${i + 1}</td>
              <td><b>${esc(b.fileNumber)}</b></td>
              <td>${fmt(b.date)}</td>
              <td>${esc(b.vehicleNumber)}</td>
              <td style="color:${statusColor(b.status)};font-weight:600">${esc(b.status === 'Order Completed' ? 'Completed' : b.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </section>`).join('');

    const printContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Showroom Bookings Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 18px; color: #111; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #555; margin-bottom: 14px; }
  .summary { display: flex; gap: 24px; padding: 10px 14px; background: #f1f5f9; border-radius: 6px; margin-bottom: 16px; }
  .showroom { margin-bottom: 18px; page-break-inside: auto; }
  .sh-head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #b91c1c; padding-bottom: 4px; margin-bottom: 6px; page-break-after: avoid; }
  .sh-name { font-size: 15px; font-weight: 700; }
  .sh-meta { color: #555; }
  .sh-count { font-weight: 700; }
  .remark { background: #fff7ed; border-left: 3px solid #f59e0b; padding: 4px 8px; margin: 4px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d4d4d8; padding: 5px 7px; text-align: left; }
  th { background: #f4f4f5; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  tr:nth-child(even) td { background: #fafafa; }
  .none { color: #777; font-style: italic; margin: 4px 0; }
  .no-print { margin: 12px 0; }
  @media print { .no-print { display: none; } body { margin: 8mm; } }
</style></head>
<body>
  <div class="no-print"><button onclick="window.print()">Print</button> <button onclick="window.close()">Close</button></div>
  <h1>Showroom Bookings Report</h1>
  <div class="sub">Period: <b>${esc(periodText)}</b> · Generated ${esc(new Date().toLocaleString('en-IN'))}</div>
  <div class="summary"><span>Showrooms: <b>${groups.length}</b></span><span>Total bookings: <b>${total}</b></span></div>
  ${sections}
  <script>setTimeout(function () { window.print(); }, 400);</script>
</body></html>`;

    printWindow.document.open();
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
            
            {/* Print: period + button */}
            <select className="form-select w-auto" value={printPeriod} onChange={(e) => setPrintPeriod(e.target.value as any)} title="Bookings to list in the print">
              <option value="2m">Last 2 months</option>
              <option value="all">All bookings</option>
              <option value="custom">Choose dates…</option>
            </select>
            {printPeriod === 'custom' && (
              <>
                <input type="date" className="form-input w-auto" value={printFrom} max={printTo || undefined} onChange={(e) => setPrintFrom(e.target.value)} aria-label="From" />
                <input type="date" className="form-input w-auto" value={printTo} min={printFrom || undefined} onChange={(e) => setPrintTo(e.target.value)} aria-label="To" />
              </>
            )}
            <button
              onClick={handlePrint}
              disabled={selectedShowrooms.length === 0 || printing}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {printing ? 'Preparing…' : `Print Selected (${selectedShowrooms.length})`}
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
                            src={getImageUrl(showroom.image)}
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