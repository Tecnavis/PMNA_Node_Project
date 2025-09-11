import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface BookingStats {
  newBookings: number;
  completedBookings: number;
  verifiedBookings: number;
  feedbackBookings: number;
  accountantVerifiedBookings: number;
  cashPendingBookings: number;
  totalBookings: number;
}

interface TimePeriodStats {
  today: BookingStats;
  yesterday: BookingStats;
  dayBeforeYesterday: BookingStats;
}

const BookingDashboard: React.FC = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  
  const [stats, setStats] = useState<TimePeriodStats>({
    today: {
      newBookings: 0,
      completedBookings: 0,
      verifiedBookings: 0,
      feedbackBookings: 0,
      accountantVerifiedBookings: 0,
      cashPendingBookings: 0,
      totalBookings: 0
    },
    yesterday: {
      newBookings: 0,
      completedBookings: 0,
      verifiedBookings: 0,
      feedbackBookings: 0,
      accountantVerifiedBookings: 0,
      cashPendingBookings: 0,
      totalBookings: 0
    },
    dayBeforeYesterday: {
      newBookings: 0,
      completedBookings: 0,
      verifiedBookings: 0,
      feedbackBookings: 0,
      accountantVerifiedBookings: 0,
      cashPendingBookings: 0,
      totalBookings: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const currentDate = new Date(selectedDate);
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const dayBeforeYesterday = new Date(currentDate);
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      console.log('Fetching data for dates:', {
        today: formatDate(currentDate),
        yesterday: formatDate(yesterday),
        dayBeforeYesterday: formatDate(dayBeforeYesterday)
      });
      
      // Fetch data for all three time periods
      const [todayData, yesterdayData, dayBeforeData] = await Promise.all([
        axios.get(`${backendUrl}/booking`, {
          params: {
            startDate: formatDate(currentDate),
            endingDate: formatDate(currentDate),
            all: true
          }
        }).catch(error => {
          console.error('Today data fetch error:', error);
          return { data: { bookings: [] } };
        }),
        axios.get(`${backendUrl}/booking`, {
          params: {
            startDate: formatDate(yesterday),
            endingDate: formatDate(yesterday),
            all: true
          }
        }).catch(error => {
          console.error('Yesterday data fetch error:', error);
          return { data: { bookings: [] } };
        }),
        axios.get(`${backendUrl}/booking`, {
          params: {
            startDate: formatDate(dayBeforeYesterday),
            endingDate: formatDate(dayBeforeYesterday),
            all: true
          }
        }).catch(error => {
          console.error('Day before yesterday data fetch error:', error);
          return { data: { bookings: [] } };
        }),
      ]);
      
      console.log('API Responses:', {
        today: todayData.data,
        yesterday: yesterdayData.data,
        dayBefore: dayBeforeData.data
      });
      
      const processBookings = (bookings: any[]): BookingStats => {
        const total = bookings.length;
        return {
          newBookings: bookings.filter(b => b.status === 'Booking Added').length,
          completedBookings: bookings.filter(b => b.status === 'Order Completed').length,
          verifiedBookings: bookings.filter(b => b.verified === true).length,
          feedbackBookings: bookings.filter(b => b.feedbackCheck === true).length,
          accountantVerifiedBookings: bookings.filter(b => b.accountantVerified === true).length,
          cashPendingBookings: bookings.filter(b => b.cashPending === true).length,
          totalBookings: total
        };
      };
      
      setStats({
        today: processBookings(todayData.data.bookings),
        yesterday: processBookings(yesterdayData.data.bookings),
        dayBeforeYesterday: processBookings(dayBeforeData.data.bookings)
      });
      
    } catch (error) {
      console.error('Error fetching booking stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedDate]);

  // Calculate max value for scaling the chart (exclude totalBookings from calculation)
  const allValues: number[] = [];
  Object.values(stats).forEach((period: BookingStats) => {
    Object.entries(period).forEach(([key, value]) => {
      if (key !== 'totalBookings') {
        allValues.push(value as number);
      }
    });
  });
  const maxValue = Math.max(...allValues, 1);

  const categories = [
    { key: 'newBookings', label: 'New Booking Details', color: 'bg-blue-500' },
    { key: 'completedBookings', label: 'Driver Completed Booking', color: 'bg-green-500' },
    { key: 'verifiedBookings', label: 'Verifier', color: 'bg-purple-500' },
    { key: 'feedbackBookings', label: 'Feedback', color: 'bg-yellow-500' },
    { key: 'accountantVerifiedBookings', label: 'Accountant', color: 'bg-red-500' },
    { key: 'cashPendingBookings', label: 'Cash Pending', color: 'bg-orange-500' }
  ];

  // Calculate total bookings for each time period
  const calculateTotalBookings = (periodStats: BookingStats): number => {
    return periodStats.totalBookings; // Use the stored totalBookings value
  };

  // Single timePeriods declaration
 const timePeriods = [
    { 
      key: 'today', 
      label: 'Today',
      total: calculateTotalBookings(stats.today),
      bgColor: 'bg-blue-50', // Light blue background for today
      borderColor: 'border-blue-200' // Blue border for today
    },
    { 
      key: 'yesterday', 
      label: 'Yesterday',
      total: calculateTotalBookings(stats.yesterday),
      bgColor: 'bg-green-50', // Light green background for yesterday
      borderColor: 'border-green-200' // Green border for yesterday
    },
    { 
      key: 'dayBeforeYesterday', 
      label: 'Days before yesterday',
      total: calculateTotalBookings(stats.dayBeforeYesterday),
      bgColor: 'bg-purple-50', // Light purple background for day before yesterday
      borderColor: 'border-purple-200' // Purple border for day before yesterday
    }
  ];


  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Dashboard</h1>
        <div className="flex items-center">
          <label htmlFor="date-select" className="mr-2 text-gray-600">Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded p-1"
          />
        </div>
      </div>

      {/* Vertical Bar Chart Container */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Booking Statistics</h2>
        
        {/* Vertical chart layout */}
        <div className="space-y-6"> {/* Reduced space between graphs */}
          {timePeriods.map((period) => {
            const periodData = stats[period.key as keyof TimePeriodStats];
            const totalBookings = period.total;
            
            return (
              <div 
                key={period.key} 
                className={`${period.bgColor} ${period.borderColor} border-2 rounded-lg p-4 shadow-sm`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-medium text-gray-800">{period.label}</h3>
                  <span className="text-sm text-gray-700 bg-white px-3 py-1 rounded-full border">
                    Total: {totalBookings} bookings
                  </span>
                </div>
                
                <div className="flex items-end space-x-4 h-48 px-4">
                  {categories.map((category) => {
                    const value = periodData[category.key as keyof BookingStats];
                    const height = maxValue > 0 ? Math.max((value / maxValue) * 100, 5) : 5;
                    const percentage = totalBookings > 0 ? ((value / totalBookings) * 100).toFixed(1) : '0';
                    
                    return (
                      <div key={category.key} className="flex flex-col items-center flex-1">
                        <div
                          className={`${category.color} w-10 rounded-t transition-all duration-300 flex items-end justify-center min-h-[2px] relative`}
                          style={{ height: `${height}%` }}
                          title={`${category.label}: ${value} out of ${totalBookings} (${percentage}%)`}
                        >
                          <span className="text-white text-xs font-bold">
                            {value > 0 ? value : ''}
                          </span>
                        </div>
                        <div className="text-xs mt-2 text-center text-gray-700 font-medium truncate w-16">
                          {category.label.split(' ')[0]}
                        </div>
                        {totalBookings > 0 && (
                          <div className="text-xs text-gray-600 mt-1 font-semibold">
                            {percentage}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-6">
          {categories.map((category) => (
            <div key={category.key} className="flex items-center">
              <div className={`w-4 h-4 ${category.color} rounded mr-2`}></div>
              <span className="text-xs text-gray-600">{category.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Data Table with percentages */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Detailed Statistics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Category</th>
                {timePeriods.map((period) => (
                  <th key={period.key} className="px-4 py-2 text-center">
                    <div className={`${period.bgColor} py-1 rounded`}>
                      {period.label}
                    </div>
                    <div className="text-xs font-normal">(Total: {period.total})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.key} className="border-b">
                  <td className="px-4 py-2 font-medium">{category.label}</td>
                  {timePeriods.map((period) => {
                    const value = stats[period.key as keyof TimePeriodStats][category.key as keyof BookingStats];
                    const percentage = period.total > 0 ? ((value / period.total) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <td key={period.key} className="px-4 py-2 text-center">
                        <div className="font-semibold">{value}</div>
                        <div className="text-xs text-gray-600">
                          ({percentage}%)
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BookingDashboard;