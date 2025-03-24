import React, { useState } from "react";
import { PiPhone } from "react-icons/pi";
import SelectTruckPage from "./SelectTruckPage";
import { useLocation } from "react-router-dom";

const NewJobsCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const itemId = params.get("itemId");

  console.log("Received itemId:", itemId);
  return (
    <div className="bg-white shadow-md rounded-2xl p-5 w-full max-w-md mx-auto border">
      <h2 className="text-lg font-bold mb-4">New Jobs</h2>
      {/* Job Details */}
      <div className="flex justify-between text-gray-700 text-sm">
        <p>
          <span className="font-semibold">File ID:</span> PMNA022520
        </p>
        <p>20 Feb 2025, 05:00 PM</p>
      </div>
      <div className="flex justify-between text-gray-700 text-sm mt-1">
        <p>
          <span className="font-semibold">Vehicle No.:</span> KL0101101
        </p>
        <p>
          <span className="font-semibold">Driver:</span> ABC
        </p>
      </div>

      {/* Pickup & Dropoff Locations */}
      <div className="mt-4">
        <div className="mb-2">
          <p className="text-gray-600 font-semibold">Pickup Location</p>
          <p className="text-gray-700 text-sm">
            123 Main Street, Anytown, IND 845103
          </p>
        </div>

        <div className="flex items-center">
          <div className="w-6 h-6 flex justify-center items-center text-gray-500">→</div>
          <div>
            <p className="text-gray-600 font-semibold">Drop off Location</p>
            <p className="text-gray-700 text-sm">
              123 Main Street, Anytown, IND 845103
            </p>
          </div>
        </div>
      </div>

      {/* Distance Info */}
      <div className="flex justify-end items-center mt-3">
        <p className="text-green-500 font-semibold text-lg">0.02</p>
        <p className="text-gray-600 text-sm ml-1">km away to pickup</p>
      </div>

      {/* Salary & Payable Amount */}
      <div className="mt-4 text-gray-700 text-sm">
        <p>
          <span className="font-semibold">Salary:</span> Rs 5000
        </p>
        <p>
          <span className="font-semibold">Payable Amount:</span> Rs 10000
        </p>
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center mt-5">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 font-semibold rounded-lg shadow-md"
        >
          <PiPhone size={16} />
          Get in Contact & Accept Booking
        </button>
        <button className="text-red-500 font-semibold">Decline</button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-lg">
            <button
              className="absolute top-2 right-2 text-gray-600"
              onClick={() => setIsModalOpen(false)}
            >
              ✖
            </button>
            <SelectTruckPage itemId={itemId || undefined} />
            </div>
        </div>
      )}
    </div>
  );
};

export default NewJobsCard;
