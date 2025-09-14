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
  const [blink, setBlink] = useState(false); // State for blinking animation

  // Toggle blink state for animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(prev => !prev);
    }, 1000); // Blink every second

    return () => clearInterval(interval);
  }, []);

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

  const categories = [
    { key: 'newBookings', label: 'New Booking Details', color: 'bg-blue-500', blinkMain: true },
    { key: 'completedBookings', label: 'Driver Completed Booking', color: 'bg-pink-500', blinkMain: false },
    { key: 'verifiedBookings', label: 'Verifier', color: 'bg-purple-500', blinkMain: false },
    { key: 'feedbackBookings', label: 'Feedback', color: 'bg-yellow-100', blinkMain: false },
    { key: 'accountantVerifiedBookings', label: 'Accountant', color: 'bg-red-500', blinkMain: false },
    { key: 'cashPendingBookings', label: 'Cash Pending', color: 'bg-orange-500', blinkMain: true }
  ];

  // Single timePeriods declaration
  const timePeriods = [
    { 
      key: 'today', 
      label: 'Today',
      total: stats.today.totalBookings,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    { 
      key: 'yesterday', 
      label: 'Yesterday',
      total: stats.yesterday.totalBookings,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    { 
      key: 'dayBeforeYesterday', 
      label: 'Days before yesterday',
      total: stats.dayBeforeYesterday.totalBookings,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
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

      {/* Stacked Bar Chart Container */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Booking Statistics</h2>
        
        {/* Stacked chart layout */}
        <div className="space-y-8">
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
                
                {/* Stacked bars for each category */}
                <div className="space-y-4">
                  {categories.map((category) => {
                    const value = periodData[category.key as keyof BookingStats];
                    const remaining = totalBookings - value;
                    
                    return (
                      <div key={category.key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{category.label}</span>
                          <span>{value} / {totalBookings}</span>
                        </div>
                        <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden flex">
                          {/* Colored portion for the metric */}
                          <div 
                            className={`${category.color} h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500 ${
                              category.blinkMain && blink ? 'opacity-10' : ''
                            }`}
                            style={{ width: totalBookings > 0 ? `${(value / totalBookings) * 100}%` : '0%' }}
                            title={`${category.label}: ${value}`}
                          >
                            {value > 0 && (value / totalBookings) > 0.15 ? `${value}` : ''}
                          </div>
                          
                          {/* Green portion for remaining bookings */}
                          <div 
                            className={`bg-green-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500 ${
                              !category.blinkMain && blink ? 'opacity-10' : ''
                            }`}
                            style={{ width: totalBookings > 0 ? `${(remaining / totalBookings) * 100}%` : '0%' }}
                            title={`Remaining: ${remaining}`}
                          >
                            {remaining > 0 && (remaining / totalBookings) > 0.15 ? `${remaining}` : ''}
                          </div>
                        </div>
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
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-xs text-gray-600">Remaining Bookings</span>
          </div>
        </div>
        
        {/* Blinking explanation */}
        <div className="mt-4 text-xs text-gray-500">
          <span className="font-semibold">Note:</span> Colored portions blink for "New Booking Details" and "Cash Pending". 
          Green portions blink for all other categories.
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
<div className="text-xl font-normal text-red-500">(Total: {period.total})</div>                  </th>
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