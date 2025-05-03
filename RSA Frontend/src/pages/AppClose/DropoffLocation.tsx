
import axios from 'axios';
import React, { useState, useEffect, ChangeEvent } from 'react';
import { FiCheck, FiUploadCloud, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CLOUD_IMAGE } from '../../constants/status';

interface Booking {
    _id?: string;
    receivedUser?: string;
    companyBooking: boolean;
    pickupImagePending?: boolean;
    inventoryImagePending?: boolean;

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
    const [dropoffTime, setDropOffTime] = useState('');
    const [customerVehicleNumber, setCustomerVehicleNumber] = useState('');
    const [mob1, setMob1] = useState('');
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [bookingData, setBookingData] = useState<Booking | null>(null);
    const [loading, setLoading] = useState<Boolean>(false);
   
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const itemId = params.get('itemId');
// --------------------------------------
    // --- Image Upload States ---
    const [images, setImages] = useState<(File | null)[]>(Array(6).fill(null));
    const [previews, setPreviews] = useState<(string | null)[]>(Array(6).fill(null));
    const [imageFiles, setImageFiles] = useState<(File | null)[]>(Array(6).fill(null));
   // --- New Inventory Image State ---
   const [inventoryImage, setInventoryImage] = useState<File | null>(null);
   const [inventoryPreview, setInventoryPreview] = useState<string | null>(null);
   const [inventoryUploaded, setInventoryUploaded] = useState(false);

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
    const requiredUploadedCount = previews.slice(0, 4).filter((img) => img !== null).length;
    // Handler for inventory image upload
  const handleInventoryUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const objectUrl = URL.createObjectURL(file);
        setInventoryImage(file);
        setInventoryPreview(objectUrl);
        setInventoryUploaded(true);
    }
};

// Remove inventory image
const removeInventoryImage = () => {
    setInventoryImage(null);
    setInventoryPreview(null);
    setInventoryUploaded(false);
};
    // Handler for form submission
    const handleSubmit = async () => {
        setLoading(true)
        if (requiredUploadedCount < 4) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Upload',
                text: 'Please upload at least 4 required images before submitting.',
            });
            setLoading(false);
            return;
        }
        
        try {
            // Prepare common data
            const formData = new FormData();

            // Append fields
            formData.append('fileNumber', fileNumber);
            formData.append('dropoffTime', dropoffTime || ' ');
            formData.append('mob1', mob1);
            formData.append('customerVehicleNumber', customerVehicleNumber);
            formData.append("dropoffImagePending", "false");
            formData.append("inventoryImagePending", "false");

            // Append images (only if they exist)
            images.forEach((img) => {
                if (img) formData.append('images', img);
            });

            if (bookingData) {
                await axios.put(`${backendUrl}/booking/${itemId}`, formData);
                  // Then upload inventory image if exists
                  if (inventoryImage) {
                    const inventoryFormData = new FormData();
                    inventoryFormData.append('image', inventoryImage);
                    await axios.patch(`${backendUrl}/booking/inventory/${itemId}`, inventoryFormData);
                }
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
                // Show modal with "Paid" and "Not Paid"
                const result = await Swal.fire({
                    title: 'Payment Status',
                    text: 'Has the customer paid?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Paid',
                    cancelButtonText: 'Not Paid',
                    reverseButtons: true,
                });

                if (result.isConfirmed) {
                    // If "Paid" is clicked
                    await axios.put(`${backendUrl}/booking/${itemId}`, {
                        cashPending: false,
                        status: 'Vehicle Dropped',
                    });
                    navigate(`/paymentSettlement?itemId=${itemId}`);
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    // If "Not Paid" is clicked
                    await axios.put(`${backendUrl}/booking/${itemId}`, {
                        cashPending: true,
                        status: 'Order Completed',
                    });
                    Swal.fire('Info', 'Marked as not paid. No settlement page opened.', 'info')
                        .then(() => {
                            navigate('/bookings'); // Navigate after user sees the info alert
                        });
                }

            } else if (bookingData?.workType === 'RSAWork') {
                await axios.put(`${backendUrl}/booking/${itemId}`, {
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
        } finally {
            setLoading(false)
        }
    };

    return (
        <div className="min-h-screen bg-white px-4 py-6 flex flex-col items-center">
            {/* Step Indicator */}
            <div className="flex justify-center items-center gap-4 mb-6">
    {Array(6).fill(null).map((_, index) => (
        <React.Fragment key={index}>
            <div className={`w-6 h-6 flex justify-center items-center rounded-full ${
                previews[index] ? 'bg-red-500 text-white' : 'border-2 border-red-500 text-red-500'
            } ${index >= 4 ? 'opacity-50' : ''}`} // Optional images are faded
                title={index < 4 ? 'Required' : 'Optional'}
            >
                {previews[index] ? '✔' : index + 1}
            </div>
            {index < 5 && <div className="w-16 border-t-2 border-red-500"></div>}
        </React.Fragment>
    ))}
</div>


            <div className="w-full max-w-md mb-4">
                <h1 className="text-xl font-bold text-gray-900 mb-2">Customer Verification</h1>

                {/* Delivery Form */}
                <div className="border-2 border-red-200 rounded-lg p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">File Number</label>
                        {bookingData?.fileNumber ? 
                            <span className="text-danger font-medium">{bookingData.fileNumber}</span> : 
                            <span className="text-gray-500 italic">No file number available</span>
                        }
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Vehicle Number</label>
                        <input
                            type="text"
                            value={bookingData?.customerVehicleNumber || ''}
                            onChange={(e) => setBookingData(prev => prev ? 
                                {...prev, customerVehicleNumber: e.target.value} : prev)}
                            className="border border-gray-300 rounded-md p-2 w-full"
                        />
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                DropOff Time
                            </label>
                            <input
                                type="datetime-local"
                                value={dropoffTime}
                                onChange={(e) => setDropOffTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Inventory Image Upload Section */}
                <div className="mt-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Inventory Sheet</h2>
                    <p className="text-gray-600 mb-4">Upload a clear photo of the signed inventory sheet</p>
                    
                    <div className="flex flex-col items-center">
                        {inventoryPreview ? (
                            <div className="relative group">
                                <img 
                                    src={inventoryPreview} 
                                    alt="Inventory sheet" 
                                    className="w-full max-w-xs h-64 object-contain border-2 border-green-200 rounded-lg shadow-sm"
                                />
                                <button
                                    onClick={removeInventoryImage}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                                >
                                    <FiX size={16} />
                                </button>
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                                        <FiCheck className="mr-1" /> Uploaded
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg w-full max-w-xs h-64 cursor-pointer hover:border-red-300 transition-colors duration-200">
                                <div className="flex flex-col items-center justify-center p-4 text-center">
                                    <FiUploadCloud className="text-gray-500 text-3xl mb-2" />
                                    <span className="text-sm font-medium text-gray-700">Upload Inventory Sheet</span>
                                    <span className="text-xs text-gray-500 mt-1">Click to browse or drag & drop</span>
                                    <span className="text-xs text-gray-500">(JPG, PNG, or PDF)</span>
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf" 
                                    className="hidden" 
                                    onChange={handleInventoryUpload}
                                />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Vehicle Images Section */}
            <h2 className="text-lg font-bold text-gray-900 mb-2">Attach Vehicle Images</h2>
            <p className="text-gray-600 mb-6 text-center">Upload legible pictures of your delivery documentation.</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
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
            <button
    onClick={handleSubmit}
    disabled={requiredUploadedCount  < 4 || !Boolean(inventoryUploaded) || !!loading}
    className={`bg-red-500 text-white mt-6 px-6 py-3 font-semibold rounded-lg shadow-md w-full max-w-xs transition-colors duration-200 ${
        requiredUploadedCount  < 4 || !inventoryUploaded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
    }`}
>

                {loading ? (
                    <div className="flex items-center justify-center">
                        <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                    </div>
                ) : "Submit"}
            </button>
        </div>
    );
};

export default DropoffUploadPage;
