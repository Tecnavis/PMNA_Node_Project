import axios from "axios";
import React, { useState, useEffect, ChangeEvent } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { CLOUD_IMAGE } from "../../constants/status";

interface Booking {
  _id?: string;
  receivedUser?: string;
  companyBooking: boolean;
  approve: boolean;
  receivedAmount: number;
  phoneNumber: any;
  pickupDistance?: string;
  pickupTime: string;
  dropoffTime: string;
  cashPending: boolean;
  bookingDateTime: string;
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
  };
  showroom: string;
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
  mob2?: string;
  vehicleType: string;
  brandName?: string;
  comments?: string;
  status?: string;
  driver?: any;
  provider?: any;
  totalAmount?: number;
  totalDriverDistence?: number;
  driverSalary?: number;
  accidentOption?: string;
  insuranceAmount?: number;
  adjustmentValue?: number;
  amountWithoutInsurance?: number;
  createdAt?: Date;
  updatedAt?: Date;
  pickupImages?: string[]; // Added field: array of image filenames or URLs
}

const CombinedDeliveryUploadPage = () => {
  // --- Delivery Form States ---
  const [customerName, setCustomerName] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [mob1, setMob1] = useState("");
  const [customerVehicleNumber, setCustomerVehicleNumber] = useState("");

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [bookingData, setBookingData] = useState<Booking | null>(null);
  const [fileNumber, setFileNumber] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const itemId = params.get("itemId");

  // --- Image Upload States ---
  // --- Image Upload States ---
  const [images, setImages] = useState<(File | null)[]>(Array(6).fill(null));
  const [previews, setPreviews] = useState<(string | null)[]>(Array(6).fill(null));
  const [imageFiles, setImageFiles] = useState<(File | null)[]>(Array(6).fill(null));

  // Fetch existing booking data if itemId exists
  useEffect(() => {
    if (itemId) {
      axios
        .get(`${backendUrl}/booking/${itemId}`)
        .then((response) => {

          const data = response.data as Booking;
          setBookingData(data);

          // Pre-fill form fields...
          setFileNumber(data.fileNumber || "");
          setCustomerName(data.customerName || "");
          // setPickupTime(data.pickupTime || "");
          setDeliveryTime(data.pickupTime || "");
          setMob1(data.mob1 || "");
          setCustomerVehicleNumber(data.customerVehicleNumber || "");
          if (data.pickupTime) {
            const pickupDate = new Date(data.pickupTime);
            const formattedDate = pickupDate.toISOString().split("T")[0]; // "YYYY-MM-DD"
            const formattedTime = pickupDate.toISOString().split("T")[1].slice(0, 5); // "HH:MM"

            setPickupTime(formattedDate);
            setDeliveryTime(formattedTime);
          }
          // Assuming your backend returns pickupImages as an array of filenames
          if (data.pickupImages && data.pickupImages.length > 0) {
            // Build the full URL for each image
            const imageUrls = data.pickupImages.map(
              (img) => `${CLOUD_IMAGE}${img}`
            );
            setPreviews([...imageUrls, ...Array(6 - imageUrls.length).fill(null)]);
          }
        })
        .catch((error) => {
          console.error("Error fetching booking data:", error);
        });
    }
  }, [itemId, backendUrl]);


  // Handler for invoice or receipt file upload
  const handleInvoiceUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
    }
  };
  //  -----------------------------------------------------------------------------
  // Handler for image uploads
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);

      setImages((prev) => {
        const updatedFiles = [...prev];
        updatedFiles[index] = file;
        return updatedFiles;
      });

      setPreviews((prev) => {
        const updatedPreviews = [...prev];
        updatedPreviews[index] = objectUrl;
        return updatedPreviews;
      });
    }
  };

  // Count of uploaded images
  const uploadedCount = previews.filter((img) => img !== null).length;

  const handleSubmit = async () => {
    try {
      const combinedPickupDate = new Date(`${pickupTime}T${deliveryTime}:00`).toISOString();
      const formData = new FormData();
  
      // Append fields
      formData.append("customerName", customerName);
      formData.append("pickupTime", combinedPickupDate);
      formData.append("customerVehicleNumber", customerVehicleNumber);
      formData.append("mob1", mob1);
      formData.append("fileNumber", fileNumber);
      formData.append("status", "On the way to dropoff location");
  
      // Append images (only if they exist)
      images.forEach((img) => {
        if (img) formData.append("images", img);
      });
  
      if (bookingData) {
        // Update existing booking
        await axios.put(`${backendUrl}/booking/${itemId}`, formData);
        Swal.fire({
          title: "Success!",
          text: "Booking updated successfully.",
          icon: "success",
          confirmButtonText: "OK",
        }).then(() => navigate("/bookings"));
      } else {
        // Create new booking
        await axios.post(`${backendUrl}/booking`, formData);
        Swal.fire({
          title: "Success!",
          text: "New booking created successfully.",
          icon: "success",
          confirmButtonText: "OK",
        }).then(() => navigate("/bookings"));
      }
    } catch (error) {
      console.error("Error submitting booking data:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to submit booking data. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };
  

  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col items-center">
      {/* Header + Description */}
      <div className="w-full max-w-md mb-4">
        {/* <button className="text-sm text-gray-600 mb-3" onClick={() => navigate(-1)}>
          &#8592; Back
        </button> */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">Confirm Customer & Pickup Details</h1>
        <p className="text-gray-500 mb-4">
          {bookingData
            ? "Booking data found. Review and update if needed."
            : "No booking data found. Please enter new details."}
        </p>

        {/* Delivery Form */}
        <div className="border-2 border-red-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              File Number
            </label>
            {bookingData?.fileNumber ? (
              <span className="text-danger font-medium">{bookingData.fileNumber}</span>
            ) : (
              <span className="text-gray-500 italic">No file number available</span>
            )}

          </div>          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Customer's Name
            </label>
            <input
              type="text"
              placeholder="Customer's name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Delivery Date + Time */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Pickup Date & Time
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
                Pickup Time
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer Number */}
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

          {/* Invoice or Receipt Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Customer Vehicle Number
            </label>
            <label className="flex items-center justify-center border-2 border-dashed border-gray-400 rounded-md w-full h-16 cursor-pointer">

              <input
                className="text-xl font-bold text-center border-2 border-gray-400 rounded-lg p-3 w-full max-w-md shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="text"
                placeholder="Customer Number"
                value={customerVehicleNumber}
                onChange={(e) => setCustomerVehicleNumber(e.target.value)}
              />

            </label>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-center items-center gap-4 mb-6">
        {Array(6)
          .fill(null)
          .map((_, index) => (
            <React.Fragment key={index}>
              <div
                className={`w-6 h-6 flex justify-center items-center rounded-full ${index < uploadedCount
                  ? "bg-red-500 text-white"
                  : "border-2 border-red-500 text-red-500"
                  }`}
              >
                {index < uploadedCount ? "✔" : index + 1}
              </div>
              {index < 5 && <div className="w-16 border-t-2 border-red-500"></div>}
            </React.Fragment>
          ))}
      </div>

      {/* Title */}
      <h2 className="text-lg font-bold text-gray-900 mb-2">Attach Additional Images (Please upload images for Dashboard, Front, Rear, and Scratches)</h2>
      <p className="text-gray-600 mb-6 text-center">
        Upload legible pictures of your pickup documentation.
      </p>

      {/* Image Upload Grid */}
      <div className="grid grid-cols-3 gap-4">
        {images.map((img, index) => (
          <label
            key={index}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg w-24 h-24 cursor-pointer relative"
          >
            {previews[index] ? (
              <img
                src={previews[index] as string}
                alt="Uploaded"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              // Placeholder UI if no image exists
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
      {/* <button
        onClick={handleSubmit}
        className={`mt-6 px-6 py-3 font-semibold rounded-lg shadow-md w-full max-w-xs ${
          uploadedCount === 3
            ? "bg-red-500 text-white"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        disabled={uploadedCount < 3}
      >
        Submit
      </button> */}
     <button
  onClick={handleSubmit}
  disabled={uploadedCount < 3} // Change threshold to 3
  className={`bg-red-500 text-white mt-6 px-6 py-3 font-semibold rounded-lg shadow-md w-full max-w-xs ${
    uploadedCount < 3 ? "opacity-50 cursor-not-allowed" : ""
  }`}
>
  Submit
</button>

    </div>
  );
};

export default CombinedDeliveryUploadPage;
