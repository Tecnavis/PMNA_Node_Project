import axios from 'axios';
import React, { useState, useEffect, ChangeEvent } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CLOUD_IMAGE } from '../../constants/status';

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
    payableAmountForDriver: number;
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

const DropoffUploadPage = () => {
    // --- Delivery Form States ---
    const [fileNumber, setFileNumber] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [customerVehicleNumber, setCustomerVehicleNumber] = useState('');
    const [mob1, setMob1] = useState('');
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [bookingData, setBookingData] = useState<Booking | null>(null);

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const itemId = params.get('itemId');

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

                    setCustomerVehicleNumber(data.customerVehicleNumber || '');
                    setFileNumber(data.fileNumber || '');
                    setPickupTime(data.pickupTime || '');
                    setMob1(data.mob1 || '');

                    // Assuming your backend returns dropoffImages as an array of filenames
                    if (data.dropoffImages && data.dropoffImages.length > 0) {
                        // Build the full URL for each image
                        const imageUrls = data.dropoffImages.map((img) => `${CLOUD_IMAGE}${img}`);
                        setPreviews([...imageUrls, ...Array(6 - imageUrls.length).fill(null)]);
                    }
                })
                .catch((error) => {
                    console.error('Error fetching booking data:', error);
                });
        }
    }, [itemId, backendUrl]);

    // ----------------------------------------------------------------------------------------
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

    // Handler for form submission
    const handleSubmit = async () => {
        try {
            // Prepare common data
            const formData = new FormData();

            // Append fields
            formData.append('fileNumber', fileNumber);
            formData.append('pickupTime', pickupTime);
            formData.append('mob1', mob1);
            formData.append('customerVehicleNumber', customerVehicleNumber);

            // Append images (only if they exist)
            images.forEach((img) => {
                if (img) formData.append('images', img);
            });

            if (bookingData) {
                await axios.put(`${backendUrl}/booking/${itemId}`, formData);
                Swal.fire({
                    icon: 'success',
                    title: 'Booking Updated',
                    text: 'Your booking details have been successfully updated!',
                });
            } else {
                await axios.post(`${backendUrl}/booking`, formData);
                Swal.fire({
                    icon: 'success',
                    title: 'Booking Created',
                    text: 'A new booking has been successfully created!',
                });
            }

            if (bookingData?.workType === 'PaymentWork') {
                await axios.put(`${backendUrl}/booking/${itemId}`, {
                    ...formData,
                    status: 'Vehicle Dropped',
                });
                navigate(`/paymentSettlement?itemId=${itemId}`);
            } else if (bookingData?.workType === 'RSAWork') {
                await axios.put(`${backendUrl}/booking/${itemId}`, {
                    ...formData,
                    status: 'Order Completed',
                });
                navigate('/bookings');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while updating the booking. Please try again.',
            });
            console.error('Error updating booking:', error);
        }
    };

    return (
        <div className="min-h-screen bg-white px-4 py-6 flex flex-col items-center">
            {/* Step Indicator */}
            <div className="flex justify-center items-center gap-4 mb-6">
                {Array(6)
                    .fill(null)
                    .map((_, index) => (
                        <React.Fragment key={index}>
                            <div className={`w-6 h-6 flex justify-center items-center rounded-full ${index < uploadedCount ? 'bg-red-500 text-white' : 'border-2 border-red-500 text-red-500'}`}>
                                {index < uploadedCount ? '✔' : index + 1}
                            </div>
                            {index < 5 && <div className="w-16 border-t-2 border-red-500"></div>}
                        </React.Fragment>
                    ))}
            </div>

            <div className="w-full max-w-md mb-4">
                <h1 className="text-xl font-bold text-gray-900 mb-2">Customer Verification</h1>

                {/* Delivery Form */}
                <div className="border-2 border-red-200 rounded-lg p-4 space-y-4">
                    {/* Recipient Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">File Number</label>
                        {bookingData?.fileNumber ? <span className="text-danger font-medium">{bookingData.fileNumber}</span> : <span className="text-gray-500 italic">No file number available</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Vehicle Number</label>
                        <input
                            type="text"
                            value={bookingData?.customerVehicleNumber || ''}
                            onChange={(e) => setBookingData((prev) => (prev ? { ...prev, customerVehicleNumber: e.target.value } : prev))}
                            className="border border-gray-300 rounded-md p-2 w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-gray-900 mb-2">Attach Additional Images  (Please upload images for Front, Rear, Left Side, Right Side, Inventory Sheet and Sticker)</h2>
            <p className="text-gray-600 mb-6 text-center">Upload legible pictures of your delivery documentation.</p>

            {/* Image Upload Grid */}
            <div className="grid grid-cols-3 gap-4">
                {images.map((_, index) => (
                    <label key={index} className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg w-24 h-24 cursor-pointer relative">
                        {previews[index] ? (
                            <img src={previews[index] as string} alt="Uploaded" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                            <div className="flex flex-col items-center justify-center">
                                <FiUploadCloud className="text-gray-500 text-2xl" />
                                <span className="text-xs text-gray-600 text-center">Choose or Capture</span>
                            </div>
                        )}

                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, index)} />
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
                disabled={uploadedCount < 6} // Example condition
                className={` bg-red-500 text-white mt-6 px-6 py-3 font-semibold rounded-lg shadow-md w-full max-w-xs ${uploadedCount < 6 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                Submit
            </button>
        </div>
    );
};

export default DropoffUploadPage;
