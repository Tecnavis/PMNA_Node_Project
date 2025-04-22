import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

interface Vehicle {
  basicAmount: number;
  kmForBasicAmount: number;
  overRideCharge: number;
  serviceType: string;
  vehicleNumber: string;
  _id: string;
}

interface SelectTruckPageProps {
  itemId?: string | null;
  driverVehicle?: Vehicle[];
}

const SelectTruckPage: React.FC<SelectTruckPageProps> = ({ itemId, driverVehicle }) => {
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true); // State to manage modal visibility
// ----------------------------------------------
const [showDropdown, setShowDropdown] = useState(false);
const [otherVehicles, setOtherVehicles] = useState<string[]>([]);

  const defaultTrucks = [
    { vehicleNumber: "KL01A1234", bg: "bg-gray-200" },
    { vehicleNumber: "MH02B5678", bg: "bg-red-200" },
    { vehicleNumber: "DL03C9101", bg: "bg-blue-200" },
    { vehicleNumber: "TN04D1213", bg: "bg-green-200" },
    { vehicleNumber: "UP05E1415", bg: "bg-yellow-200" },
    { vehicleNumber: "RJ06F1617", bg: "bg-purple-200" },
  ];

  const trucks = driverVehicle?.length
    ? driverVehicle.map((v) => ({
        vehicleNumber: v.vehicleNumber,
        bg: "bg-gray-200",
      }))
    : defaultTrucks;

  const handleVehicleSelect = (vehicleNumber: string) => {
    setSelectedVehicle(vehicleNumber);
  };

  const handleCloseModal = () => {
    // setIsModalOpen(false);
    navigate("/bookings"); // Ensure this route matches the actual path of NewJobsCard
  };
  
  
  useEffect(() => {
    const fetchBooking = async () => {
      if (!itemId) return;
      try {
        const response = await axios.get(`${backendUrl}/booking/${itemId}`);
        const booking = response.data;
        if (booking?.vehicleNumber) {
          setSelectedVehicle(booking.vehicleNumber);
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
      }
    };
  
    fetchBooking();
  }, [itemId, backendUrl]);
  const handleContinue = async () => {
    if (!selectedVehicle) {
      Swal.fire({
        title: "Vehicle Required",
        text: "Please select a vehicle before continuing.",
        icon: "warning",
        confirmButtonText: "OK",
      });      return;
    }

    try {
      const updateData = {
        status: "On the way to pickup location",
        vehicleNumber: selectedVehicle,
      };

      await axios.put(`${backendUrl}/booking/${itemId}`, updateData);
      console.log("updateData", updateData);
      navigate("/bookings");
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  if (!isModalOpen) return null; // Don't render if modal is closed
  const handleOthersClick = async () => {
    try {
      const response = await axios.get(`${backendUrl}/vehicle/`);
      const vehicles = response.data?.data || [];
  
      const vehicleNumbers = vehicles.map((v: any) => v.serviceVehicle); // assuming `serviceVehicle` is the vehicle number
      setOtherVehicles(vehicleNumbers);
      setShowDropdown(true); // show the dropdown
    } catch (error) {
      console.error("Error fetching other vehicles:", error);
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white flex flex-col items-center p-4 md:p-6 max-w-sm mx-auto rounded-lg shadow-lg">
        <div className="w-full flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Select Truck</h1>
          <button
            onClick={handleCloseModal}
            className="text-gray-500 hover:text-red-500 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-4">
          Pick your truck vehicle number for tailored driving opportunities.
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          {trucks.map((truck, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center rounded-md p-4 cursor-pointer h-20 ${
                selectedVehicle === truck.vehicleNumber ? "border-2 border-red-500" : truck.bg
              }`}
              onClick={() => handleVehicleSelect(truck.vehicleNumber)}
            >
              <p className="text-lg font-semibold text-gray-700 text-center">
                {truck.vehicleNumber}
              </p>
            </div>
          ))}
        </div>
        <button
  onClick={handleOthersClick}
  className="mt-4 w-full bg-gray-200 text-gray-800 py-3 rounded-md font-semibold text-base shadow hover:bg-red-100 hover:text-red-600 transition-colors border-2 border-gray-300 hover:border-red-500"
>
  Others
</button>

{showDropdown && (
  <select
    onChange={(e) => setSelectedVehicle(e.target.value)}
    value={selectedVehicle || ""}
    className="mt-2 w-full border border-gray-300 rounded-md p-2 text-gray-700"
  >
    <option value="">Select a vehicle</option>
    {otherVehicles.map((vehicle, idx) => (
      <option key={idx} value={vehicle}>
        {vehicle}
      </option>
    ))}
  </select>
)}

        <button
          onClick={handleContinue}
          className="mt-4 w-full bg-red-500 text-white py-3 rounded-md text-center font-semibold text-base shadow-md hover:bg-red-600 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SelectTruckPage;
