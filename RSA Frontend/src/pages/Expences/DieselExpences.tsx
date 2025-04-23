import React from 'react';
import { Card } from '@mui/material';
import { Check, X } from 'lucide-react';
import { Button } from '@headlessui/react';

const dummyDieselExpenses = [
  {
    id: 'EXP123456',
    driverName: 'John Doe',
    description: 'Diesel refill at Shell',
    amount: 2500,
    imageUrl: 'https://via.placeholder.com/100',
    date: '2025-04-20',
    status: 'Pending',
  },
  {
    id: 'EXP654321',
    driverName: 'Ali Khan',
    description: 'Highway fuel station',
    amount: 1800,
    imageUrl: 'https://via.placeholder.com/100',
    date: '2025-04-18',
    status: 'Approved',
  },
];

const DieselExpences = () => {
  return (
    <Card className="p-6 shadow-xl rounded-2xl bg-white">
      <h2 className="text-2xl font-semibold text-indigo-700 mb-6">Diesel Expenses</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="bg-indigo-50 border-b text-indigo-700">
            <tr>
              <th className="px-4 py-3">Expense ID</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Amount (₹)</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dummyDieselExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{expense.id}</td>
                <td className="px-4 py-3">{expense.driverName}</td>
                <td className="px-4 py-3">{expense.description}</td>
                <td className="px-4 py-3 font-semibold text-green-700">₹{expense.amount}</td>
                <td className="px-4 py-3">
                  <img
                    src={expense.imageUrl}
                    alt="Expense"
                    className="w-16 h-16 object-cover rounded-lg shadow-sm"
                  />
                </td>
                <td className="px-4 py-3">{expense.date}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      expense.status === 'Approved'
                        ? 'bg-green-100 text-green-700'
                        : expense.status === 'Rejected'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {expense.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex items-center justify-center gap-2">
                  <Button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg">
                    <Check size={16} />
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg">
                    <X size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DieselExpences;
