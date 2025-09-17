import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import BookingSkeleton from './BookingSkeleton';

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
  historical: BookingStats;
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
    historical: {
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
  const [blink, setBlink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(prev => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

 const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching booking stats for date:', selectedDate);
      
      const response = await axios.get(`${backendUrl}/booking/stats`, {
        params: { date: selectedDate },
        timeout: 30000 // 10 second timeout
      });
      
      console.log('API Response:', response.data);
      setStats(response.data);
      
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      setError('Failed to load booking statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, backendUrl]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

 

  const categories = [
    { key: 'newBookings', label: 'New Booking Details', color: 'bg-blue-500', blinkMain: true, showOnlyRemaining: false },
    { key: 'completedBookings', label: 'Driver Completed Booking', color: 'bg-pink-500', blinkMain: false, showOnlyRemaining: true },
    { key: 'verifiedBookings', label: 'Verifier', color: 'bg-purple-500', blinkMain: false, showOnlyRemaining: true },
    { key: 'feedbackBookings', label: 'Feedback', color: 'bg-yellow-500', blinkMain: false, showOnlyRemaining: true },
    { key: 'accountantVerifiedBookings', label: 'Accountant', color: 'bg-red-500', blinkMain: false, showOnlyRemaining: true },
    { key: 'cashPendingBookings', label: 'Cash Pending', color: 'bg-orange-500', blinkMain: true, showOnlyRemaining: false }
  ];

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
      key: 'historical',
      label: 'Historical (All Previous Days)',
      total: stats.historical.totalBookings,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

    if (loading) {
    return <BookingSkeleton />;
  }
  // if (error) {
  //   return (
  //     <div className="p-6 bg-gray-50 min-h-screen">
  //       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
  //         <strong className="font-bold">Error: </strong>
  //         <span className="block sm:inline">{error}</span>
  //         <button 
  //           onClick={fetchStats}
  //           className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-4 rounded"
  //         >
  //           Retry
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }
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
                          <div 
                            className={`${category.color} h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500 ${
                              category.blinkMain && blink ? 'opacity-10' : ''
                            }`}
                            style={{ width: totalBookings > 0 ? `${(value / totalBookings) * 100}%` : '0%' }}
                            title={`${category.label}: ${value}`}
                          >
                            {value > 0 && (value / totalBookings) > 0.15 ? `${value}` : ''}
                          </div>
                          
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
              <div className="text-xs font-normal text-gray-600">(Total: {period.total})</div>
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
              const remaining = period.total - value;
              
              // Define background colors for each time period
              const getBgColor = (periodKey: string) => {
                switch (periodKey) {
                  case 'today':
                    return 'bg-blue-100 hover:bg-blue-200';
                  case 'yesterday':
                    return 'bg-green-100 hover:bg-green-200';
                  case 'historical':
                    return 'bg-purple-100 hover:bg-purple-200';
                  default:
                    return 'bg-white';
                }
              };
              
              return (
                <td 
                  key={period.key} 
                  className={`px-4 py-2 text-center ${getBgColor(period.key)} transition-colors duration-200`}
                >
                  {/* For New Booking Details and Cash Pending, show both values */}
                  {!category.showOnlyRemaining ? (
                    <>
                      <div className={`font-semibold ${blink ? 'text-blue-700' : 'text-blue-900'}`}>
                        {value} 
                      </div>
                      <div className="text-xs text-gray-600">
                        Remaining: {remaining}
                      </div>
                    </>
                  ) : (
                    // For Driver Completed, Verifier, Feedback, and Accountant, show only remaining value
                    <div className={`text-lg font-bold ${blink ? 'text-green-700' : 'text-green-600'}`}>
                      {remaining} 
                      <div className="text-xs text-gray-600 mt-1">
                        Completed: {value}
                      </div>
                    </div>
                  )}
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
// ------------------------------------------------------------------