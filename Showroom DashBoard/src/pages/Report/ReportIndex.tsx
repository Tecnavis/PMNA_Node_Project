import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '../../store';
import Dropdown from '../../components/Dropdown';
import IconHorizontalDots from '../../components/Icon/IconHorizontalDots';
import IconCalendar from '../../components/Icon/IconCalendar';
import { Anchor } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IBooking } from '../../interface/booking';
import { dateFormate } from '../../utils/dateUtils';
import { Link } from 'react-router-dom';
import { getShowroomReports } from '../../service/showroom';
import IconPrinter from '../../components/Icon/IconPrinter';
import './report.module.css'

function ReportIndex() {
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [activeTab, setActiveTab] = useState('serviceCenter');
    const [timeView, setTimeView] = useState<'monthly' | 'yearly' | 'all'>('monthly');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [bookings, setBookings] = useState<IBooking[]>([]);
    const [monthlyTotals, setMonthlyTotals] = useState<any[]>([]);
    const [overallTotals, setOverallTotals] = useState<any>({});
    const [lifetimeTotals, setLifetimeTotals] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);

    const showroomId = localStorage.getItem('showroomId') || '';

    const tabs = [
        { id: 'serviceCenter', title: 'Service Center', color: 'from-cyan-500 to-cyan-400' },
        { id: 'bodyShop', title: 'Body Shop', color: 'from-violet-500 to-violet-400' },
        { id: 'showroom', title: 'Showroom', color: 'from-blue-500 to-blue-400' },
    ];

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const handleMonthSelect = (monthIndex: number) => {
        setSelectedMonth(monthIndex);
        setShowMonthPicker(false);
    };

    const cols = [
        {
            accessor: 'index',
            title: 'SI No',
            render: (item: any, index: number) => index + 1,
            width: 80
        },
        {
            accessor: 'createdAt',
            title: 'Date',
            render: (booking: IBooking) => (
                booking.createdAt ? dateFormate('' + booking.createdAt) : 'N/A'
            )
        },
        {
            accessor: 'fileNumber',
            title: 'File Number',
            render: (booking: IBooking) => (
                <Anchor component={Link} to={`/showrm/viewmore/${booking._id}`}>
                    {booking.fileNumber}
                </Anchor>
            )
        },
        {
            accessor: 'vehicleSection',
            title: 'Vehicle Section',
            render: (booking: IBooking) => booking.serviceVehicleNumber || 'N/A'
        },
        {
            accessor: 'vehicleModel',
            title: 'Vehicle Model',
            render: (booking: IBooking) => booking.vehicleType || 'N/A'
        },
        {
            accessor: 'insuranceAmount',
            title: 'Insurance Amount',
            render: (booking: IBooking) => (
                <div className="flex items-center">
                    {booking.insuranceAmount?.toLocaleString() || '0'}
                </div>
            ),
            cellsStyle: { backgroundColor: 'rgba(0, 128, 0, 0.1)' }
        },
        {
            accessor: 'showroomAmount',
            title: 'Showroom Amount',
            render: (booking: IBooking) => (
                <div className="flex items-center">
                    {booking.totalAmount?.toLocaleString() || '0'}
                </div>
            ),
            cellsStyle: { backgroundColor: 'rgba(0, 0, 255, 0.1)' }
        },
        {
            accessor: 'totalPayableAmount',
            title: 'Total Payable Amount',
            render: (booking: IBooking) => (
                <div className="flex items-center font-semibold">
                    {booking.totalAmount?.toLocaleString() || '0'}
                </div>
            ),
            cellsStyle: { backgroundColor: 'rgba(255, 165, 0, 0.1)' }
        },
        {
            accessor: 'balancePayableAmount',
            title: 'Balance Payable Amount',
            render: (booking: IBooking) => {
                const balance = (booking.totalAmount || 0) - (booking.receivedAmount || 0);
                return (
                    <div className="flex items-center">
                        ₹{balance.toLocaleString()}
                    </div>
                );
            },
            cellsStyle: (booking: IBooking) => {
                const balance = (booking.totalAmount || 0) - (booking.receivedAmount || 0);
                return {
                    backgroundColor: balance > 0 ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 128, 0, 0.1)'
                };
            }
        },
        {
            accessor: 'paymentStatus',
            title: 'Paid/Unpaid',
            render: (booking: IBooking) => {
                const balance = (booking.totalAmount || 0) - (booking.receivedAmount || 0);
                return <div className={`badge  rounded-full text-center text-xs   hover:top-0 ${(booking.totalAmount || 0) - (booking.receivedAmount || 0) === 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                    }`}>
                    {balance === 0 ? 'Paid' : 'Unpaid'}
                </div>
            }
        }
    ];

    const fetchBooking = async () => {
        setIsLoading(true);
        let data
        try {
            if (timeView === 'monthly') {
                data = await getShowroomReports({
                    month: selectedMonth + 1,
                    year: selectedYear,
                    serviceCategory: activeTab,
                    showroomId
                });
            } else if (timeView === 'yearly') {
                data = await getShowroomReports({
                    year: selectedYear,
                    serviceCategory: activeTab,
                    showroomId
                });

            } else {
                data = await getShowroomReports({
                    serviceCategory: activeTab,
                    showroomId
                });
            }

            setBookings(data.bookings || []);
            setMonthlyTotals(data.monthlyTotals || []);
            setOverallTotals(data.overallTotals || {});
            setLifetimeTotals(data.lifetimeTotals || {});
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchBooking();
    }, [activeTab, selectedMonth, selectedYear, timeView]);

    // Calculate current month data
    const currentMonthData = monthlyTotals.find(item =>
        item._id?.month === selectedMonth + 1 && item._id?.year === selectedYear
    );

    const handlePrint = () => {
        // Clone the report content
        const printContent = document.getElementById('report-content');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Basic HTML structure for printing
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${tabs.find(tab => tab.id === activeTab)?.title} Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                h1 { color: #333; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .summary-card { padding: 15px; border-radius: 5px; color: white; text-align: center; width: 23%; }
                .footer { margin-top: 30px; text-align: right; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <h1>${tabs.find(tab => tab.id === activeTab)?.title} Report</h1>
              <p style="text-align: center;">
                ${timeView === 'monthly'
                ? `Period: ${months[selectedMonth]} ${selectedYear}`
                : timeView === 'yearly'
                    ? `Year: ${selectedYear}`
                    : 'All Time Data'}
              </p>
              
              <div class="summary">
                <div class="summary-card" style="background: #06b6d4;">
                  <div>Monthly Total</div>
                  <div style="font-size: 20px; font-weight: bold;">
                    ₹${(currentMonthData?.monthlyTotal || 0).toLocaleString()}
                  </div>
                </div>
                
                <div class="summary-card" style="background: #8b5cf6;">
                  <div>Monthly Balance</div>
                  <div style="font-size: 20px; font-weight: bold;">
                    ₹${(currentMonthData?.monthlyBalance || 0).toLocaleString()}
                  </div>
                </div>
                
                <div class="summary-card" style="background: #3b82f6;">
                  <div>Overall Total</div>
                  <div style="font-size: 20px; font-weight: bold;">
                    ₹${(overallTotals.wholeTotal || 0).toLocaleString()}
                  </div>
                </div>
                
                <div class="summary-card" style="background: #d946ef;">
                  <div>Lifetime Total</div>
                  <div style="font-size: 20px; font-weight: bold;">
                    ₹${(lifetimeTotals.lifetimeTotal || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    ${cols.map(col => `<th>${col.title}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${bookings.map((booking, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${booking.createdAt ? dateFormate('' + booking.createdAt) : 'N/A'}</td>
                      <td>${booking.fileNumber || 'N/A'}</td>
                      <td>${booking.serviceVehicleNumber || 'N/A'}</td>
                      <td>${booking.vehicleType || 'N/A'}</td>
                      <td>₹${(booking.insuranceAmount || 0).toLocaleString()}</td>
                      <td>₹${(booking.totalAmount || 0).toLocaleString()}</td>
                      <td>₹${(booking.totalAmount || 0).toLocaleString()}</td>
                      <td style="${(booking.totalAmount || 0) > 0 ? 'background-color: rgba(255, 0, 0, 0.1)' : 'background-color: rgba(0, 128, 0, 0.1)'}">
                        ₹${((booking.totalAmount || 0) - (booking.receivedAmount || 0)).toLocaleString()}
                      </td>
                      <td style="${(booking.totalAmount || 0) - (booking.receivedAmount || 0) === 0 ? 'color: green' : 'color: red'}">
                        ${(booking.totalAmount || 0) - (booking.receivedAmount || 0) === 0 ? 'PAID' : 'UNPAID'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="footer">
                Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
              </div>
            </body>
          </html>
        `);

        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    return (
        <div className="panel m-5 flex flex-col gap-6 shadow-md border rounded-lg overflow-hidden">
            <div className="bg-white dark:bg-[#0e1726] p-5 rounded-t-lg border-b">
                <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
                    Showroom Report Dashboard
                </h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mt-2">
                    Comprehensive overview of all department reports
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-5">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-all duration-300 ${activeTab === tab.id
                            ? `bg-gradient-to-r ${tab.color} text-white`
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        {tab.title}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-5" >
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6 text-white" id="report-content">
                    <div className="panel bg-gradient-to-r from-cyan-500 to-cyan-400">
                        <div className="flex justify-between">
                            <div className="ltr:mr-1 rtl:ml-1 text-md font-semibold">Monthly Total ({months[selectedMonth]}):</div>
                            <div className="dropdown">
                                <Dropdown
                                    offset={[0, 5]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="hover:opacity-80"
                                    button={<IconHorizontalDots className="hover:opacity-80 opacity-70" />}
                                >
                                </Dropdown>
                            </div>
                        </div>
                        <div className="flex items-center mt-5">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">  ₹{(currentMonthData?.monthlyTotal || 0).toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Sessions */}
                    <div className="panel bg-gradient-to-r from-violet-500 to-violet-400">
                        <div className="flex justify-between">
                            <div className="ltr:mr-1 rtl:ml-1 text-md font-semibold">Monthly Total Balance ({months[selectedMonth]}):
                            </div>
                            <div className="dropdown">
                                <Dropdown
                                    offset={[0, 5]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="hover:opacity-80"
                                    button={<IconHorizontalDots className="hover:opacity-80 opacity-70" />}
                                >
                                </Dropdown>
                            </div>
                        </div>
                        <div className="flex items-center mt-5">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">   ₹{(currentMonthData?.monthlyBalance || 0).toLocaleString()}</div>
                        </div>
                    </div>

                    {/*  Time On-Site */}
                    <div className="panel bg-gradient-to-r from-blue-500 to-blue-400">
                        <div className="flex justify-between">
                            <div className="ltr:mr-1 rtl:ml-1 text-md font-semibold">Whole Total:
                            </div>
                            <div className="dropdown">
                                <Dropdown
                                    offset={[0, 5]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="hover:opacity-80"
                                    button={<IconHorizontalDots className="hover:opacity-80 opacity-70" />}
                                >
                                </Dropdown>
                            </div>
                        </div>
                        <div className="flex items-center mt-5">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3"> ₹{(overallTotals.wholeTotal || 0).toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Bounce Rate */}
                    <div className="panel bg-gradient-to-r from-fuchsia-500 to-fuchsia-400">
                        <div className="flex justify-between">
                            <div className="ltr:mr-1 rtl:ml-1 text-md font-semibold">Whole Total Balance:
                            </div>
                            <div className="dropdown">
                                <Dropdown
                                    offset={[0, 5]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="hover:opacity-80"
                                    button={<IconHorizontalDots className="hover:opacity-80 opacity-70" />}
                                >
                                </Dropdown>
                            </div>
                        </div>
                        <div className="flex items-center mt-5">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3"> ₹{(lifetimeTotals.lifetimeTotal || 0).toLocaleString()} </div>
                        </div>
                    </div>
                </div>

                {/* Reports Section */}
                <div className="p-5">
                    {/* Time View Tabs and Month Picker */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setTimeView('monthly')}
                                className={`px-4 py-2 font-medium text-sm ${timeView === 'monthly' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                Monthly View
                            </button>
                            <button
                                onClick={() => setTimeView('yearly')}
                                className={`px-4 py-2 font-medium text-sm ${timeView === 'yearly' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                Yearly View
                            </button>
                            <button
                                onClick={() => setTimeView('all')}
                                className={`px-4 py-2 font-medium text-sm ${timeView === 'all' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                All View
                            </button>
                        </div>
                        <div className='flex'>
                            <button
                                onClick={() => handlePrint()}
                                className="btn btn-outline-primary flex items-center mr-2"
                            >
                                <IconPrinter className="w-4 h-4 mr-2" />
                                Print Report
                            </button>
                            {timeView === 'monthly' && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMonthPicker(!showMonthPicker)}
                                        className="btn btn-outline-primary flex items-center"
                                    >
                                        <IconCalendar className="w-4 h-4 mr-2" />
                                        {months[selectedMonth]} {selectedYear}
                                    </button>

                                    {showMonthPicker && (
                                        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#1b2e4b] rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                                            <div className="p-2">
                                                <select
                                                    value={selectedYear}
                                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                                    className="form-select w-full mb-2"
                                                >
                                                    {years.map(year => (
                                                        <option key={year} value={year}>{year}</option>
                                                    ))}
                                                </select>
                                                <div className="grid grid-cols-3 gap-1">
                                                    {months.map((month, index) => (
                                                        <button
                                                            key={month}
                                                            onClick={() => handleMonthSelect(index)}
                                                            className={`py-1 px-2 text-sm rounded ${selectedMonth === index ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                        >
                                                            {month.substring(0, 3)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DataTable */}
                    <div className="bg-white dark:bg-[#1b2e4b] rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3">
                            {timeView === 'monthly'
                                ? `Showing data for ${months[selectedMonth]} ${selectedYear}`
                                : timeView === 'yearly'
                                    ? `Showing yearly data for ${selectedYear}`
                                    : 'Showing all data'}
                        </h3>

                        <DataTable
                            fetching={isLoading}
                            withColumnBorders
                            verticalAlignment="center"
                            highlightOnHover
                            striped
                            minHeight={300}
                            columns={cols}
                            records={bookings}
                            withBorder
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReportIndex;