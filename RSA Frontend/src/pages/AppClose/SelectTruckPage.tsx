import axios from "axios";
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
interface SelectTruckPageProps {
    itemId?: string | null;
  }
  const SelectTruckPage: React.FC<SelectTruckPageProps> = ({ itemId }) => {
    const trucks = [
    { name: "KL01A1234", bg: "bg-gray-200" },
    { name: "MH02B5678", bg: "bg-red-200" },
    { name: "DL03C9101", bg: "bg-blue-200" },
    { name: "TN04D1213", bg: "bg-green-200" },
    { name: "UP05E1415", bg: "bg-yellow-200" },
    { name: "RJ06F1617", bg: "bg-purple-200" },
  ];
  const navigate = useNavigate(); // Initialize navigation
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const handleContinue = async () => {
    try {
      // Prepare update data with the new status
      const updateData = { status: "On the way to pickup location" };

      // Update the booking by sending a PUT request to the backend
      await axios.put(`${backendUrl}/booking/${itemId}`, updateData);

      // Navigate to '/bookings' after a successful update
      navigate("/bookings");
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };
  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 md:p-6 max-w-sm mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-center w-full mb-4">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white text-sm font-bold">
            1
          </div>
        </div>
        {/* Line */}
        <div className="flex-1 h-1 bg-red-500 mx-2"></div>
        {/* Circle 2 */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-300 text-white text-sm font-bold">
            2
          </div>
        </div>
        {/* Line */}
        <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
        {/* Circle 3 */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-300 text-white text-sm font-bold">
            3
          </div>
        </div>
      </div>

      {/* Step Info */}
      <div className="w-full text-left mb-4">
        <p className="text-sm text-red-500 font-medium">Step 1 of 3</p>
        <h1 className="text-xl font-bold mt-1">Select Truck</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pick your truck vehicle number for tailored driving opportunities.
        </p>
      </div>

      {/* Truck Grid */}
      <div className="grid grid-cols-2 gap-4 w-full mt-2">
        {trucks.map((truck, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center justify-center rounded-md p-4 ${truck.bg} cursor-pointer h-20`}
          >
            <p className="text-lg font-semibold text-gray-700 text-center">
              {truck.name}
            </p>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        className="mt-auto w-full bg-red-500 text-white py-3 rounded-md text-center font-semibold text-base shadow-md hover:bg-red-600 transition-colors"
      >
        Continue
      </button>
    </div>
  );
};

export default SelectTruckPage;
