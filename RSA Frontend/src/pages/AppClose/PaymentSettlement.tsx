import axios from "axios";
import { useState } from "react";
import { FaMoneyBillWave, FaExchangeAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

export default function PaymentMethod() {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const navigate = useNavigate(); // Initialize navigation

  // Just an example of how you might get itemId
  const itemId = params.get("itemId");

  const handlePayment = async () => {
    try {
      // Prepare update data with the new status
      const updateData = { status: "Order Completed" };

      // Update the booking by sending a PUT request to the backend
      await axios.put(`${backendUrl}/booking/${itemId}`, updateData);

      // Navigate to '/bookings' after a successful update
      navigate("/bookings");
    } catch (error) {
      console.error("Error updating booking:", error);
    }
    setPaymentSuccess(true);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      {!paymentSuccess ? (
        <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
          <h2 className="text-gray-700 text-lg font-semibold text-center mb-4">
            Choose payment method
          </h2>
          <div className="border-b pb-4">
            <div className="flex items-center space-x-2 text-lg font-medium text-gray-700">
              <FaMoneyBillWave className="text-black" />
              <span>Cash</span>
            </div>
            <input
              type="text"
              placeholder="Enter Received amount"
              className="w-full border p-2 rounded mt-2 focus:outline-none"
            />
            <button
              className="w-full bg-red-600 text-white p-2 rounded mt-2"
              onClick={handlePayment}
            >
              Submit
            </button>
          </div>

          <div className="my-4 text-center text-gray-400 text-sm">or</div>

          <div>
            <div className="flex items-center space-x-2 text-lg font-medium text-gray-700">
              <FaExchangeAlt className="text-red-600" />
              <span>Transfer</span>
            </div>
            <input
              type="text"
              placeholder="Enter Transaction ID"
              className="w-full border p-2 rounded mt-2 focus:outline-none"
            />
            <button
              className="w-full bg-red-600 text-white p-2 rounded mt-2"
              onClick={handlePayment}
            >
              Submit
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center w-80">
          <FaExchangeAlt className="text-red-600 text-5xl mx-auto" />
          <h2 className="text-red-600 text-xl font-bold mt-4">Congratulations</h2>
          <p className="text-gray-700 mt-2">
            Congratulations on a successful delivery! Online payment received – celebrate your
            achievement and anticipate more success ahead!
          </p>
          <button className="mt-4 px-4 py-2 border-2 border-red-600 text-red-600 rounded-full">
            Book New Trip
          </button>
        </div>
      )}
    </div>
  );
}
