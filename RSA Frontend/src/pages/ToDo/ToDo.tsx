import React, { useState, useEffect } from 'react';

const ToDo = () => {
  const [selectedStaff, setSelectedStaff] = useState('MUNEERA');
  const [currentDate, setCurrentDate] = useState('');
  
  const staffMembers = [
    {
      id: '682da7d9772cdc8f4fcf266f',
      name: 'MUNEERA',
      userName: 'MUNEERA',
      email: 'pmnacrs@gmail.com',
      phone: '7510800077'
    },
    {
      id: '682dab80772cdc8f4fcf27e3',
      name: 'ASWANI P',
      userName: 'aswani',
      email: 'pmnacrs@gmail.com',
      phone: '9526562247'
    },
    {
      name: 'VINEETHA',
      userName: 'VINEETHA'
    },
    {
      name: 'SARASWATHI',
      userName: 'SARASWATHI'
    }
  ];

  const muneeraTasks = [
    { id: 1, time: '', task: 'CASES CROSS CHECKING FOR BILLING (Group & App)', count: 0 },
    { id: 2, time: '', task: 'COMPANY BILLING', count: 0 },
    { id: 3, time: '', task: 'PAYMENT MANAGEMENT', count: 0 },
    { id: 4, time: '', task: 'EXPENSE CHECKING & TRACKING', count: 0 },
    { id: 5, time: '', task: 'ACCOUNT TRANSACTION TRACKING', count: 0 },
    { id: 6, time: '', task: 'DRIVER COMPLETED CASES PHOTOS CROSS CHECKING', count: 0 },
    { id: 7, time: '', task: 'ACCOUNT STAFF VERIFY', count: 0 },
    { id: 8, time: '', task: 'CASE UPDATION IN EUROP PORTAL', count: 0 }
  ];

  const aswaniTasks = [
    { id: 1, time: '', task: 'COMPANY BILLING', count: 0 },
    { id: 2, time: '', task: 'NEW CASE UPDATION IN EXCEL', count: 0 },
    { id: 3, time: '', task: 'DRIVERS CASE UPDATION IN EXCEL', count: 0 },
    { id: 4, time: '', task: 'INVOICE NUMBER ADD', count: 0 },
    { id: 5, time: '', task: 'FUEL BILL CHECKING & TRACKING IN PORTAL', count: 0 },
    { id: 6, time: '', task: 'COMPANY CASES ADDED IN EXCEL', count: 0 }
  ];

  const vineethaTasks = [
    { id: 1, time: '', task: 'NIGHT/TOMORROW CASES BOOKING ADD', count: 0 },
    { id: 2, time: '', task: 'PENDING CASES CLOSING', count: 0 },
    { id: 3, time: '', task: 'BOOKING ADD', count: 0 },
    { id: 4, time: '', task: 'NEW ADDED CASES TRACKING & CALL TO DRIVER FOR START', count: 0 },
    { id: 5, time: '', task: 'FEEDBACK CALLING', count: 0 },
    { id: 6, time: '', task: 'CALL TO CUSTOMER FOR CASH PENDING', count: 0 },
    { id: 7, time: '', task: 'SLIP CHECKING', count: 0 },
    { id: 8, time: '', task: 'REWARDS CHECKING', count: 0 },
    { id: 9, time: '', task: 'LEAVE TRACKING', count: 0 },
    { id: 10, time: '', task: 'LOCATION CHANGE', count: 0 }
  ];

  const saraswathiTasks = [
    { id: 1, time: '', task: 'NIGHT/TOMORROW CASES BOOKING ADD', count: 0 },
    { id: 2, time: '', task: 'PENDING CASES CLOSING', count: 0 },
    { id: 3, time: '', task: 'BOOKING ADD', count: 0 },
    { id: 4, time: '', task: 'NEW ADDED CASES TRACKING & CALL TO DRIVER FOR START', count: 0 },
    { id: 5, time: '', task: 'DRIVER COMPLETED CASES VERIFY', count: 0 },
    { id: 6, time: '', task: 'DUE DATE TRACKING & PROCEEDING VEHICLE TAX & INSURANCE', count: 0 },
    { id: 7, time: '', task: 'SHOWROOM ADD', count: 0 },
    { id: 8, time: '', task: 'INVOICE AMOUNT ADD', count: 0 },
    { id: 9, time: '', task: 'CASH PENDING CLOSING', count: 0 },
    { id: 10, time: '', task: 'DAILY WORK TO DO LIST HANDOVER TO SULFI SIR', count: 0 }
  ];

  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    setCurrentDate(formattedDate);
  }, []);

  const getTasksForStaff = () => {
    switch(selectedStaff) {
      case 'MUNEERA':
        return muneeraTasks;
      case 'ASWANI P':
        return aswaniTasks;
      case 'VINEETHA':
        return vineethaTasks;
      case 'SARASWATHI':
        return saraswathiTasks;
      default:
        return muneeraTasks;
    }
  };

//   const handleTimeChange = (taskId, newTime) => {
//     // This function would update the time for a specific task
//     console.log(`Task ${taskId} time updated to ${newTime}`);
//   };

//   const handleCountChange = (taskId, newCount) => {
//     // This function would update the count for a specific task
//     console.log(`Task ${taskId} count updated to ${newCount}`);
//   };

  const getStaffInfo = () => {
    return staffMembers.find(staff => staff.name === selectedStaff);
  };

  const currentStaffInfo = getStaffInfo();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Staff To-Do List</h1>
          <p className="text-gray-600">Daily task management system</p>
        </div>

        {/* Staff Selection */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Select Staff Member</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {staffMembers.map((staff) => (
              <button
                key={staff.name}
                onClick={() => setSelectedStaff(staff.name)}
                className={`px-4 py-3 rounded-lg transition-all duration-200 ${
                  selectedStaff === staff.name
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="font-medium">{staff.name}</div>
                {staff.userName && (
                  <div className="text-sm opacity-80">@{staff.userName}</div>
                )}
              </button>
            ))}
          </div>

          {/* Current Staff Info */}
          {currentStaffInfo && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {currentStaffInfo.email && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Email:</span>
                    <span>{currentStaffInfo.email}</span>
                  </div>
                )}
                {currentStaffInfo.phone && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Phone:</span>
                    <span>{currentStaffInfo.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* To-Do List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header with Date */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {selectedStaff}'s Daily To-Do List
                </h2>
                <p className="text-blue-100">Complete your tasks efficiently</p>
              </div>
              <div className="mt-4 md:mt-0 bg-blue-800 px-6 py-3 rounded-lg">
                <div className="text-lg font-semibold">DATE: {currentDate}</div>
              </div>
            </div>
          </div>

          {/* Task Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">
                    SL NO
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">
                    TIME
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">
                    TO DO LIST
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">
                    COUNT
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getTasksForStaff().map((task) => (
                  <tr 
                    key={task.id} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-900">
                      {task.id}
                    </td>
                    <td className="py-4 px-6">
                      {/* <input
                        type="time"
                        className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => handleTimeChange(task.id, e.target.value)}
                      /> */}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-800">{task.task}</div>
                    </td>
                    <td className="py-4 px-6">
                      {/* <input
                        type="number"
                        min="0"
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={task.count}
                        onChange={(e) => handleCountChange(task.id, e.target.value)}
                      /> */}
                    </td>
                    <td className="py-4 px-6">
                      <select className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total Tasks: {getTasksForStaff().length}
              </div>
              <div className="flex gap-3">
                <button className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium">
                  Save as Draft
                </button>
                <button className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium">
                  Submit Tasks
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <h3 className="font-semibold text-yellow-800 mb-3">Instructions:</h3>
          <ul className="list-disc pl-5 space-y-2 text-yellow-700">
            <li>Select staff member from the top to view their specific tasks</li>
            <li>Update TIME for when you plan to do each task</li>
            <li>Update COUNT for completed items or quantity</li>
            <li>Mark STATUS as tasks progress</li>
            <li>Click "Submit Tasks" when all daily tasks are updated</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ToDo;