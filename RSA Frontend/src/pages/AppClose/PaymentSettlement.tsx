import axios from "axios";
import { useEffect, useState } from "react";
import { FaMoneyBillWave, FaExchangeAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";


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
  payableAmountForDriver:number;
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
  dropoffImages?: string[]; // Added field: array of image filenames or URLs
}
export default function PaymentMethod() {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const navigate = useNavigate(); // Initialize navigation
  const [bookingData, setBookingData] = useState<Booking | null>(null);
  const [payableAmountForDriver, setPayableAmountForDriver] = useState<number | "">("");

  // Just an example of how you might get itemId
  const itemId = params.get("itemId");
  console.log("itemId",itemId)
useEffect(() => {
    if (itemId) {
      axios
        .get(`${backendUrl}/booking/${itemId}`)
        .then((response) => {
          
          const data = response.data as Booking;
          setBookingData(data);
  
       
        })
        .catch((error) => {
          console.error("Error fetching booking data:", error);
        });
    }
  }, [itemId, backendUrl]);
  const handlePayment = async () => {
    if (!bookingData) {
      console.error("No booking data available.");
      return;
    }
  
    if (bookingData.totalAmount !== Number(payableAmountForDriver)) {
      Swal.fire({
        icon: "error",
        title: "Payment Error",
        text: "Entered amount does not match the payable amount!",
        toast: true,
        position: "top",
        showConfirmButton: false,
        timer: 3000,
        padding: "10px 20px",
      });
      return;
    }
  
    try {
      // Prepare update data with the new status
      const updateData = { status: "Order Completed" };
  
      // Update the booking by sending a PUT request to the backend
      await axios.put(`${backendUrl}/booking/${itemId}`, updateData);
  
      Swal.fire({
        icon: "success",
        title: "Payment Successful",
        text: "The order has been completed successfully!",
        toast: true,
        position: "top",
        showConfirmButton: false,
        timer: 3000,
        padding: "10px 20px",
      });
            navigate("/bookings");
      setPaymentSuccess(true);
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
    {!paymentSuccess ? (
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-96">
        {/* Title */}
        <h2 className="text-gray-800 text-2xl font-bold text-center mb-6">
          Choose Payment Method
        </h2>
  
        {/* File Number Display */}
        <div className="border-b pb-4 mb-4">
          <label className="block text-sm font-semibold text-gray-600 mb-1">
            File Number
          </label>
          {bookingData?.fileNumber ? (
            <span className="text-red-600 font-medium">{bookingData.fileNumber}</span>
          ) : (
            <span className="text-gray-500 italic">No file number available</span>
          )}
        </div>
  
        {/* Payable Amount Section */}
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg text-lg font-semibold text-red-700 mb-6">
          Payable Amount: <span className="font-bold">{bookingData?.totalAmount}</span>
        </div>
  
        {/* Payment Options */}
        <div className="space-y-6">
          {/* Cash Payment */}
          <div className="border rounded-lg p-4 hover:shadow-md transition duration-300">
            <div className="flex items-center space-x-2 text-lg font-semibold text-gray-700">
              <FaMoneyBillWave className="text-green-500 text-xl" />
              <span>Cash Payment</span>
            </div>
            <input
  type="number"
  value={payableAmountForDriver ?? ""}
  placeholder="Enter Received Amount"
  onChange={(e) => setPayableAmountForDriver(Number(e.target.value))}
  className="w-full border p-3 rounded-lg mt-3 focus:ring-2 focus:ring-red-500 transition duration-200"
/>


            <button
              className="w-full bg-gradient-to-r from-red-500 to-red-700 text-white p-3 rounded-lg mt-3 text-lg font-semibold shadow-md hover:opacity-90 transition duration-300"
              onClick={handlePayment}
            >
              Submit Payment
            </button>
          </div>
  
          <div className="text-center text-gray-500 font-medium">or</div>
  
          {/* Bank Transfer */}
          <div className="border rounded-lg p-4 hover:shadow-md transition duration-300">
            <div className="flex items-center space-x-2 text-lg font-semibold text-gray-700">
              <FaExchangeAlt className="text-blue-500 text-xl" />
              <span>Bank Transfer</span>
            </div>
            <input
              type="text"
              placeholder="Enter Transaction ID"
              className="w-full border p-3 rounded-lg mt-3 focus:ring-2 focus:ring-blue-500 transition duration-200"
            />
            <button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white p-3 rounded-lg mt-3 text-lg font-semibold shadow-md hover:opacity-90 transition duration-300"
              onClick={handlePayment}
            >
              Confirm Transfer
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="bg-white rounded-3xl shadow-2xl p-8 text-center w-96">
        <FaExchangeAlt className="text-green-500 text-5xl mx-auto" />
        <h2 className="text-green-600 text-2xl font-bold mt-4">Payment Successful!</h2>
        <p className="text-gray-600 mt-3 leading-relaxed">
          Congratulations on a successful payment! Your transaction has been received.
        </p>
        <button className="mt-6 px-5 py-3 border-2 border-green-500 text-green-600 rounded-full text-lg font-semibold hover:bg-green-500 hover:text-white transition duration-300">
          Book New Trip
        </button>
      </div>
    )}
  </div>
  
  );
}
