import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface BookingStats {
  newBookings: number;
  completedBookings: number;
  verifiedBookings: number;
  feedbackBookings: number;
  accountantVerifiedBookings: number;
  cashPendingBookings: number;
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
      cashPendingBookings: 0
    },
    yesterday: {
      newBookings: 0,
      completedBookings: 0,
      verifiedBookings: 0,
      feedbackBookings: 0,
      accountantVerifiedBookings: 0,
      cashPendingBookings: 0
    },
    dayBeforeYesterday: {
      newBookings: 0,
      completedBookings: 0,
      verifiedBookings: 0,
      feedbackBookings: 0,
      accountantVerifiedBookings: 0,
      cashPendingBookings: 0
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
        console.error('Today data fetch error:', error);
        return { data: { bookings: [] } };
      }),
        axios.get(`${backendUrl}/booking`, {
          params: {
            startDate: formatDate(dayBeforeYesterday),
            endingDate: formatDate(dayBeforeYesterday),
            all: true
          }
        }).catch(error => {
        console.error('Today data fetch error:', error);
        return { data: { bookings: [] } };
      }),
        
      ]);
       console.log('API Responses:', {
      today: todayData.data,
      yesterday: yesterdayData.data,
      dayBefore: dayBeforeData.data
    });
      const processBookings = (bookings: any[]): BookingStats => {
        return {
          newBookings: bookings.filter(b => b.status === 'Booking Added').length,
          completedBookings: bookings.filter(b => b.status === 'Order Completed').length,
          verifiedBookings: bookings.filter(b => b.verified === true).length,
          feedbackBookings: bookings.filter(b => b.feedbackCheck === true).length,
          accountantVerifiedBookings: bookings.filter(b => b.accountantVerified === true).length,
          cashPendingBookings: bookings.filter(b => b.cashPending === true).length
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

  // Calculate max value for scaling the chart
  // Alternative type-safe approach
const allValues: number[] = [];
Object.values(stats).forEach((period: BookingStats) => {
  Object.values(period).forEach(value => {
    allValues.push(value as number);
  });
});
const maxValue = Math.max(...allValues);

  const categories = [
    { key: 'newBookings', label: 'New Booking Details', color: 'bg-blue-500' },
    { key: 'completedBookings', label: 'Driver Completed Booking', color: 'bg-green-500' },
    { key: 'verifiedBookings', label: 'Verifier', color: 'bg-purple-500' },
    { key: 'feedbackBookings', label: 'Feedback', color: 'bg-yellow-500' },
    { key: 'accountantVerifiedBookings', label: 'Accountant', color: 'bg-red-500' },
    { key: 'cashPendingBookings', label: 'Cash Pending', color: 'bg-orange-500' }
  ];

  const timePeriods = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'dayBeforeYesterday', label: 'Days before yesterday' }
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

      {/* Bar Chart Container */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Booking Statistics</h2>
        
         {/* Add a visual guide for debugging */}
  <div className="relative h-64 mb-4 border border-gray-200 rounded">
    {/* Y-axis guide lines */}
    <div className="absolute left-0 right-0 h-px bg-gray-100 top-1/4"></div>
    <div className="absolute left-0 right-0 h-px bg-gray-100 top-1/2"></div>
    <div className="absolute left-0 right-0 h-px bg-gray-100 top-3/4"></div>
    
    <div className="flex justify-between items-end h-full px-4">
      {timePeriods.map((period) => {
        const periodData = stats[period.key as keyof TimePeriodStats];
        return (
          <div key={period.key} className="flex flex-col items-center flex-1">
            <div className="text-center mb-2 text-sm font-medium">
              {period.label}
            </div>
            <div className="flex items-end justify-center space-x-2 h-48 w-full">
              {categories.map((category) => {
                const value = periodData[category.key as keyof BookingStats];
                const height = maxValue > 0 ? Math.max((value / maxValue) * 100, 5) : 5; // Minimum 5% height
                
                console.log(`Bar: ${category.key}, Value: ${value}, Height: ${height}%`);
                
                return (
                  <div key={category.key} className="flex flex-col items-center">
                    <div
                      className={`${category.color} w-10 rounded-t transition-all duration-300 flex items-end justify-center min-h-[2px]`}
                      style={{ height: `${height}%` }}
                      title={`${category.label}: ${value}`}
                    >
                      <span className="text-white text-xs font-bold">
                        {value > 0 ? value : ''}
                      </span>
                    </div>
                    <div className="text-xs mt-1 text-center text-gray-600 truncate w-16">
                      {category.label.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
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

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Detailed Statistics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Category</th>
                {timePeriods.map((period) => (
                  <th key={period.key} className="px-4 py-2 text-center">{period.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.key} className="border-b">
                  <td className="px-4 py-2 font-medium">{category.label}</td>
                  {timePeriods.map((period) => (
                    <td key={period.key} className="px-4 py-2 text-center">
                      {stats[period.key as keyof TimePeriodStats][category.key as keyof BookingStats]}
                    </td>
                  ))}
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