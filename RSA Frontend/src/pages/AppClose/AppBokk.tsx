import React, { useEffect, useState } from 'react';
import { PiPhone } from 'react-icons/pi';
import SelectTruckPage from './SelectTruckPage';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

interface Booking {
    receivedUser?: string; // new prop
    companyBooking: boolean; // new prop
    approve: boolean; // new prop
    receivedAmount: number;
    phoneNumber: any;
    pickupDistance?: string;
    pickupTime: string;
    dropoffTime: string;
    cashPending: boolean;
    _id: string;
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

const NewJobsCard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const itemId = params.get('itemId');
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [bookingData, setBookingData] = useState<Booking | null>(null);

    useEffect(() => {
        const fetchBookingData = async () => {
            try {
                const response = await axios.get(`${backendUrl}/booking/${itemId}`);
                setBookingData(response.data);
            } catch (error) {
                console.error('Error fetching booking data:', error);
            }
        };

        if (itemId) {
            fetchBookingData();
        }
    }, [itemId]);

    if (!bookingData) {
        return <div>Loading...</div>;
    }
    const formatDate = (dateString: any) => {
        const date = new Date(dateString);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };
    const handleDecline = async () => {
      if (!bookingData) return;
  
      Swal.fire({
          title: "Are you sure?",
          text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, decline it!",
      }).then(async (result) => {
          if (result.isConfirmed) {
              try {
                  await axios.put(`${backendUrl}/booking/${bookingData._id}`, {
                      status: "Rejected",
                  });
  
                  // Update local state to reflect the change
                  setBookingData((prev) => (prev ? { ...prev, status: "Rejected" } : prev));
  
                  // Show success message
                  Swal.fire("Declined!", "The booking has been rejected.", "success");
              } catch (error) {
                  console.error("Error updating booking status:", error);
                  Swal.fire("Error!", "Something went wrong. Try again.", "error");
              }
          }
      });
  };
    return (
        <div className="bg-white shadow-md rounded-2xl p-5 w-full max-w-md mx-auto border">
            <h2 className="text-lg font-bold mb-4">New Booking...</h2>
            {/* Job Details */}
            <div className="flex justify-between text-gray-700 text-sm">
                <p>
                    <span className="font-semibold">File ID:</span> <span className="text-danger">{bookingData.fileNumber}</span>
                </p>
                <p>{formatDate(bookingData.createdAt)}</p>
            </div>
            <div className="flex justify-between text-gray-700 text-sm mt-1">
                <p>
                    <span className="font-semibold">Vehicle No.:</span> {bookingData.customerVehicleNumber}
                </p>
                <p>
                    <span className="font-semibold">Driver:</span> {bookingData.driver ? bookingData.driver.name : 'N/A'}
                </p>
            </div>

            {/* Pickup & Dropoff Locations */}
            <div className="mt-4">
                <div className="mb-2">
                    <p className="text-gray-600 font-semibold">Pickup Location</p>
                    <p className="text-gray-700 text-sm">{bookingData.location}</p>
                </div>

                <div className="flex items-center">
                    <div className="w-6 h-6 flex justify-center items-center text-gray-500">→</div>
                    <div>
                        <p className="text-gray-600 font-semibold">Drop off Location</p>
                        <p className="text-gray-700 text-sm">{bookingData.dropoffLocation} </p>
                    </div>
                </div>
            </div>

            {/* Distance Info */}
            <div className="flex justify-end items-center mt-3">
                <p className="text-green-500 font-semibold text-lg">{bookingData.pickupDistance}</p>
                <p className="text-gray-600 text-sm ml-1">km away to pickup</p>
            </div>
            {/* Salary & Payable Amount */}
            <div className="mt-4 text-gray-700 text-sm">
                <p>
                    <span className="font-semibold">Salary:</span> <span>Rs </span> <span className="text-danger">{bookingData.driverSalary}</span>
                </p>
                {bookingData?.workType === 'PaymentWork' && (

                <p>
                    <span className="font-semibold">Payable Amount:</span> Rs <span className="text-success">{bookingData.totalAmount}</span>
                </p>
                )}
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center mt-5">
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 font-semibold rounded-lg shadow-md">
                    <PiPhone size={16} />
                    Get in Contact & Accept Booking
                </button>
                <button onClick={handleDecline} className="text-red-500 font-semibold">
                    Decline
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                    <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-lg">
                        <button className="absolute top-2 right-2 text-gray-600" onClick={() => setIsModalOpen(false)}>
                            ✖
                        </button>
                        <SelectTruckPage itemId={itemId || undefined} driverVehicle={bookingData.driver ? bookingData.driver.vehicle : []} />{' '}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewJobsCard;
