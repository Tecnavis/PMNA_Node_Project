const BookingSkeleton = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="flex items-center">
          <div className="h-4 bg-gray-200 rounded w-24 mr-2 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      </div>

      {/* Stacked Bar Chart Skeleton */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        
        <div className="space-y-8">
          {[...Array(3)].map((_, periodIndex) => (
            <div key={periodIndex} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
              
              <div className="space-y-4">
                {[...Array(6)].map((_, categoryIndex) => (
                  <div key={categoryIndex} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                    </div>
                    <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden flex">
                      <div className="bg-gray-300 h-full animate-pulse" style={{ width: `${30 + categoryIndex * 10}%` }}></div>
                      <div className="bg-gray-400 h-full animate-pulse" style={{ width: `${70 - categoryIndex * 10}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-6">
          {[...Array(7)].map((_, index) => (
            <div key={index} className="flex items-center">
              <div className="w-4 h-4 bg-gray-200 rounded mr-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
        </div>
      </div>

      {/* Detailed Statistics Table Skeleton */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                </th>
                {[...Array(3)].map((_, index) => (
                  <th key={index} className="px-4 py-2 text-center">
                    <div className="h-5 bg-gray-200 rounded w-full mb-1 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b">
                  <td className="px-4 py-2">
                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                  </td>
                  {[...Array(3)].map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-2 text-center">
                      <div className="h-5 bg-gray-200 rounded w-full mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
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

export default BookingSkeleton;