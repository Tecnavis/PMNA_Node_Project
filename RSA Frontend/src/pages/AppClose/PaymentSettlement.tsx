import axios from "axios";
import { useEffect, useState } from "react";
import { FaMoneyBillWave, FaExchangeAlt, FaQrcode, FaUpload } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { axiosInstance } from "../../config/axiosConfig";

interface Booking {
  _id?: string;
  receivedUser?: string;
  receivedUserId?: string;
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
  dropoffImages?: string[];
}

export default function PaymentMethod() {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"cash" | "upi" | null>(null);
  const [payableAmount, setPayableAmount] = useState<number | "">("");
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState<Booking | null>(null);
  const itemId = params.get("itemId");
  console.log("itemId",itemId)

  // Handle file selection for QR image
  const handleQrImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          icon: "error",
          title: "Invalid File",
          text: "Only image files (PNG, JPEG, JPG, WebP) are allowed.",
          toast: true,
          position: "top",
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File Too Large",
          text: "File size must be less than 5MB.",
          toast: true,
          position: "top",
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      setQrImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Upload QR image to server
  const uploadQrImage = async (): Promise<string | null> => {
    if (!qrImage || !itemId) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", qrImage);

      const response = await axiosInstance.patch(
        `${backendUrl}/booking/upload-payment-qr/${itemId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setIsUploading(false);
      return response.data.data.qrImage;
    } catch (error) {
      console.error("Error uploading QR image:", error);
      setIsUploading(false);
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: "Failed to upload QR image. Please try again.",
        toast: true,
        position: "top",
        showConfirmButton: false,
        timer: 3000,
      });
      return null;
    }
  };

  // Update your handleUpiPayment function
const handleUpiPayment = async () => {
    if (!bookingData || !itemId) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No booking data available.",
            toast: true,
            position: "top",
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }

    if (!qrImage) {
        Swal.fire({
            icon: "error",
            title: "QR Required",
            text: "Please upload a QR image for UPI payment.",
            toast: true,
            position: "top",
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }

    // Upload QR image first
    const uploadedQrImage = await uploadQrImage();
    if (!uploadedQrImage) return;

    try {
        console.log('Sending UPI payment request...');
        console.log('Item ID:', itemId);
        console.log('Total amount:', bookingData.totalAmount);
        console.log('QR Image URL:', uploadedQrImage);
        
        // Prepare payment data
        const paymentData = {
            receivedAmount: bookingData.totalAmount,
            upiPayment: true,
            qrImage: uploadedQrImage,
            status: "Order Completed",
            paymentSettlement: true,
        };

        console.log('Payment data:', paymentData);

        const response = await axiosInstance.patch(
            `${backendUrl}/booking/sattle-amount/${itemId}`,
            paymentData
        );

        console.log('Payment successful:', response.data);

        Swal.fire({
            icon: "success",
            title: "Payment Successful",
            text: "UPI payment has been processed successfully!",
            toast: true,
            position: "top",
            showConfirmButton: false,
            timer: 3000,
        });

        navigate("/bookings");
        setPaymentSuccess(true);
    } catch (error: any) {
        console.error('========== UPI PAYMENT ERROR ==========');
        console.error('Full error:', error);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        console.error('Error message:', error.message);
        
        let errorMessage = "Failed to process UPI payment.";
        
        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        }
        
        if (error.response?.data?.error) {
            errorMessage += `\nError: ${error.response.data.error}`;
        }
        
        Swal.fire({
            icon: "error",
            title: "Payment Failed",
            text: errorMessage,
            toast: true,
            position: "top",
            showConfirmButton: false,
            timer: 5000,
        });
    }
};

  // Handle cash payment - Updated
const handleCashPayment = async () => {
    if (!bookingData || !itemId) return;

    if (bookingData.totalAmount !== Number(payableAmount)) {
        Swal.fire({
            icon: "error",
            title: "Payment Error",
            text: "Entered amount does not match the payable amount!",
            toast: true,
            position: "top",
            showConfirmButton: false,
            timer: 3000,
        });
        return;
    }

    try {
        const paymentData = {
            status: "Order Completed",
            paymentSettlement: true,
            // DO NOT send receivedAmount for cash payments
        };

       // Update the booking by sending a PUT request to the backend
      await axiosInstance.put(`${backendUrl}/booking/${itemId}`, paymentData);

        Swal.fire({
            icon: "success",
            title: "Payment Successful",
            text: "Cash payment has been received successfully!",
            toast: true,
            position: "top",
            showConfirmButton: false,
            timer: 3000,
        });

        navigate("/bookings");
        setPaymentSuccess(true);
     } catch (error) {
      console.error("Error processing cash payment:", error);
    }
};

  useEffect(() => {
    if (itemId) {
      axiosInstance
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

  // Cleanup preview URL on component unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      {!paymentSuccess ? (
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <h2 className="text-gray-800 text-2xl font-bold text-center mb-6">
            Choose Payment Method
          </h2>

          {/* File Number Display */}
          <div className="border-b pb-4 mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              File Number
            </label>
            <span className="text-red-600 font-medium">
              {bookingData?.fileNumber || "N/A"}
            </span>
          </div>

          {/* Payable Amount Section */}
          <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg text-lg font-semibold text-red-700 mb-6">
            Payable Amount: <span className="font-bold">₹{bookingData?.totalAmount || 0}</span>
          </div>

          {/* Payment Options */}
          <div className="space-y-6">
            {/* Cash Payment Option */}
            <div className={`border rounded-lg p-4 transition duration-300 ${selectedMethod === "cash" ? "border-green-500 bg-green-50" : "hover:shadow-md"}`}>
              <button
                className="flex items-center space-x-2 text-lg font-semibold text-gray-700 w-full text-left"
                onClick={() => setSelectedMethod("cash")}
              >
                <FaMoneyBillWave className="text-green-500 text-xl" />
                <span>Cash Payment</span>
              </button>
              
              {selectedMethod === "cash" && (
                <div className="mt-4">
                  <input
                    type="number"
                    value={payableAmount}
                    placeholder="Enter Received Amount"
                    onChange={(e) => setPayableAmount(Number(e.target.value))}
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 transition duration-200"
                  />
                  <button
                    className="w-full bg-gradient-to-r from-green-500 to-green-700 text-white p-3 rounded-lg mt-3 text-lg font-semibold shadow-md hover:opacity-90 transition duration-300"
                    onClick={handleCashPayment}
                    disabled={!payableAmount}
                  >
                    Submit Cash Payment
                  </button>
                </div>
              )}
            </div>

            <div className="text-center text-gray-500 font-medium">or</div>

            {/* UPI Payment Option */}
            <div className={`border rounded-lg p-4 transition duration-300 ${selectedMethod === "upi" ? "border-blue-500 bg-blue-50" : "hover:shadow-md"}`}>
              <button
                className="flex items-center space-x-2 text-lg font-semibold text-gray-700 w-full text-left"
                onClick={() => setSelectedMethod("upi")}
              >
                <FaExchangeAlt className="text-blue-500 text-xl" />
                <span>UPI Transfer</span>
              </button>
              
              {selectedMethod === "upi" && (
                <div className="mt-4 space-y-4">
                  {/* QR Upload Section */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {previewUrl ? (
                      <div className="space-y-2">
                        <img
                          src={previewUrl}
                          alt="QR Preview"
                          className="w-48 h-48 mx-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setQrImage(null);
                            setPreviewUrl(null);
                          }}
                          className="text-red-500 text-sm hover:text-red-700"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <>
                        <FaQrcode className="text-gray-400 text-4xl mx-auto mb-2" />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrImageSelect}
                            className="hidden"
                          />
                          <div className="text-blue-500 hover:text-blue-700 font-medium">
                            Click to upload QR image
                          </div>
                          <p className="text-gray-500 text-sm mt-1">
                            PNG, JPG, WebP up to 5MB
                          </p>
                        </label>
                      </>
                    )}
                  </div>

                  {/* Upload progress or button */}
                  {qrImage && !isUploading && (
                    <button
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white p-3 rounded-lg text-lg font-semibold shadow-md hover:opacity-90 transition duration-300 flex items-center justify-center space-x-2"
                      onClick={handleUpiPayment}
                      disabled={isUploading}
                    >
                      <FaUpload />
                      <span>{isUploading ? "Processing..." : "Confirm UPI Transfer"}</span>
                    </button>
                  )}
                  
                  {isUploading && (
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="text-blue-600 mt-2">Uploading QR image...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Success message component
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center w-96">
          <FaExchangeAlt className="text-green-500 text-5xl mx-auto" />
          <h2 className="text-green-600 text-2xl font-bold mt-4">Payment Successful!</h2>
          <p className="text-gray-600 mt-3 leading-relaxed">
            Congratulations on a successful payment! Your transaction has been received.
          </p>
          <button 
            className="mt-6 px-5 py-3 border-2 border-green-500 text-green-600 rounded-full text-lg font-semibold hover:bg-green-500 hover:text-white transition duration-300"
            onClick={() => navigate("/bookings")}
          >
            Back to Bookings
          </button>
        </div>
      )}
    </div>
  );
}