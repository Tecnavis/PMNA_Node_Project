import axios from "axios";
import React, { useState } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
interface CombinedDeliveryUploadPageProps {
    itemId?: string | null;
  }
  interface Booking {
    receivedUser?: string,// new prop
    companyBooking: boolean,// new prop
    approve: boolean,// new prop
    receivedAmount: number,
    phoneNumber: any;
    pickupDistance?:string;
    pickupTime: string;
    dropoffTime: string;
    cashPending: boolean;
    _id: string;
    bookingDateTime:string;
    workType: string;
    customerVehicleNumber: string;
    bookedBy: string;
    fileNumber: string;
    location: string;
    latitudeAndLongitude: string;
    baselocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    }; // Reference to BaseLocation
    showroom: string; // Reference to Showroom
    totalDistence: number;
    dropoffLocation: string;
    dropoffLatitudeAndLongitude: string;
    trapedLocation: string;
    serviceType: {
        additionalAmount: number;
        expensePerKm: number;
        firstKilometer: number;
        firstKilometerAmount: number;
        serviceName: string;
        _id: string;
    };
    customerName: string;
    mob1: string;
    mob2?: string; // Optional field
    vehicleType: string;
    brandName?: string; // Optional field
    comments?: string; // Optional field
    status?: string; // Optional field
    driver?: {
        idNumber: string;
        image: string;
        name: string;
        personalPhoneNumber: string;
        phone: string;
        _id: string;
        companyName: string; // New Props
        vehicle: [
            {
                basicAmount: number;
                kmForBasicAmount: number;
                overRideCharge: number;
                serviceType: string;
                vehicleNumber: string;
                _id: string;
            }
        ];
    };
    provider?: {
        idNumber: string;
        image: string;
        name: string;
        personalPhoneNumber: string;
        phone: string;
        _id: string;
        serviceDetails: [
            {
                basicAmount: number;
                kmForBasicAmount: number;
                overRideCharge: number;
                serviceType: string;
                vehicleNumber: string;
                _id: string;
            }
        ];
    };
    totalAmount?: number; // Optional field
    totalDriverDistence?: number; // Optional field
    driverSalary?: number; // Optional field
    accidentOption?: string; // Optional field
    insuranceAmount?: number; // Optional field
    adjustmentValue?: number; // Optional field
    amountWithoutInsurance?: number; // Optional field
    createdAt?: Date;
    updatedAt?: Date;
}
const CombinedDeliveryUploadPage = () => {
  // --- Delivery Form States ---
  const [customerName, setCustomerName] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [mob1, setMob1] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const navigate = useNavigate(); // Initialize navigation

  const itemId = params.get("itemId");

  // --- Image Upload States ---
  const [images, setImages] = useState<(string | null)[]>(Array(6).fill(null));

  // Handler for invoice or receipt
  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
    }
  };

  // Handler for images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...images];
        newImages[index] = reader.result as string;
        setImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  // Count the number of uploaded images
  const uploadedCount = images.filter((img) => img !== null).length;

  // Handler for final submission
  const handleSubmit = async () => {
  try {
    // Prepare update data with the new status
    const updateData = { status: "On the way to dropoff location" };

    // Update the booking by sending a PUT request to the backend
    await axios.put(`${backendUrl}/booking/${itemId}`, updateData);

    // Navigate to '/bookings' after a successful update
    navigate("/bookings");
  } catch (error) {
    console.error("Error updating booking:", error);
  }
};


  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col items-center">
      {/* Header + Description */}
      <div className="w-full max-w-md mb-4">
        <button className="text-sm text-gray-600 mb-3">&#8592; Back</button>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Confirm Delivery</h1>
        <p className="text-gray-500 mb-4">
          After filling, users receive a proof of delivery (POD) and invoice/receipt if applicable.
          Drivers provide copies of these documents along with any return labels.
        </p>

        {/* Delivery Form */}
        <div className="border-2 border-red-200 rounded-lg p-4 space-y-4">
          {/* Recipient Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Costomer's Name
            </label>
            <input
              type="text"
              placeholder="Customer's name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Delivery date + time */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Delivery date
              </label>
              <input
                type="date"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Delivery time
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Confirmation Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Customer Number
            </label>
            <input
              type="text"
              placeholder="Customer Number"
              value={mob1}
              onChange={(e) => setMob1(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Invoice or Receipt */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Vehicle Number
            </label>
            <label className="flex items-center justify-center border-2 border-dashed border-gray-400 rounded-md w-full h-16 cursor-pointer">
              {invoiceFile ? (
                <span className="text-gray-700 text-sm px-2">{invoiceFile.name}</span>
              ) : (
                <span className="text-gray-500 text-sm">Upload Invoice or Receipt</span>
              )}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleInvoiceUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-center items-center gap-4 mb-6">
        {Array(6).fill(null).map((_, index) => (
          <React.Fragment key={index}>
            <div
              className={`w-6 h-6 flex justify-center items-center rounded-full ${
                index < uploadedCount ? "bg-red-500 text-white" : "border-2 border-red-500 text-red-500"
              }`}
            >
              {index < uploadedCount ? "✔" : index + 1}
            </div>
            {index < 5 && <div className="w-16 border-t-2 border-red-500"></div>}
          </React.Fragment>
        ))}
      </div>

      {/* Title */}
      <h2 className="text-lg font-bold text-gray-900 mb-2">Attach Additional Images (POD)</h2>
      <p className="text-gray-600 mb-6 text-center">
        Upload legible pictures of your vehicle to verify them.
      </p>

      {/* Image Upload Grid */}
      <div className="grid grid-cols-3 gap-4">
        {images.map((img, index) => (
          <label
            key={index}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg w-24 h-24 cursor-pointer relative"
          >
            {img ? (
              <img src={img} alt="Uploaded" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <FiUploadCloud className="text-gray-500 text-2xl" />
                <span className="text-xs text-gray-600 text-center">Choose or Capture</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, index)}
            />
          </label>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className={`mt-6 px-6 py-3 font-semibold rounded-lg shadow-md w-full max-w-xs ${
          uploadedCount === 3 ? "bg-red-500 text-white" : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        disabled={uploadedCount < 3}
      >
        Submit
      </button>
    </div>
  );
};

export default CombinedDeliveryUploadPage;
