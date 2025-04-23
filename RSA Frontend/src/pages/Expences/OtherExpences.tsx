import { Button } from '@headlessui/react';
import { Card, CardContent } from '@mui/material';
import React from 'react';

const ExpenseApproveUI = () => {
  const driverName = "John Driver";
  const expenseAmount = 1200;
  const cashInHand = 5000;
  const updatedCash = cashInHand - expenseAmount;

  return (
    <Card className="w-full max-w-lg mx-auto mt-12 p-6 shadow-2xl rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-100">
      <CardContent className="space-y-6 text-gray-800">
        <h2 className="text-2xl font-semibold text-center text-indigo-700">Expense Request</h2>

        <div className="text-center space-y-1">
          <p className="text-lg font-semibold">Driver: <span className="font-bold text-indigo-600">{driverName}</span></p>
          <p className="text-sm text-gray-500">Wallet: <span className="font-semibold text-gray-700">Cash</span></p>
        </div>

        <div className="flex justify-between bg-gray-200 p-4 rounded-lg shadow-sm">
          <span className="text-sm font-medium text-gray-600">Cash In Hand (Before)</span>
          <span className="font-semibold text-lg text-indigo-600">₹{cashInHand}</span>
        </div>

        <div className="flex justify-between bg-yellow-100 p-4 rounded-lg shadow-sm border border-yellow-300">
          <span className="text-sm font-medium text-gray-700">Expense Amount</span>
          <span className="font-bold text-yellow-700 text-lg">₹{expenseAmount}</span>
        </div>

        <div className="flex justify-between bg-green-100 p-4 rounded-lg shadow-sm border border-green-300">
          <span className="text-sm font-medium text-green-700">Cash After Deduction</span>
          <span className="font-bold text-green-800 text-lg">₹{updatedCash}</span>
        </div>

        <div className="bg-white p-4 rounded-lg border mt-6 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Description:</p>
          <p className="text-base text-gray-800 font-medium">Fuel refill</p>
        </div>

        <div className="flex justify-between gap-4 pt-6">
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition ease-in-out duration-300 transform hover:scale-105">
            Approve
          </Button>
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition ease-in-out duration-300 transform hover:scale-105">
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseApproveUI;
