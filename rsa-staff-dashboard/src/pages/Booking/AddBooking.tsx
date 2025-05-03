import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { getShowroomById } from '../../service/showroom';
import { IShowroom } from '../../interface/showroom';
import { useForm } from "react-hook-form";
import { AddBookingResponse, AddNewBookingFormData } from '../../interface/booking';
import { addNewBooking } from '../../service/booking';
import sweetAlert from '../../components/sweetAlert';

const AddBook: React.FC = () => {

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [bookingId, setBookingId] = useState<string>(uuid().substring(0, 4));
    const [showroomData, setShowroomData] = useState<IShowroom | null>(null);
    const [currentDateTime, setCurrentDateTime] = useState<string>("");

    const showroomId = localStorage.getItem('showroomId') || '';

    const navigate = useNavigate();

    const {
        handleSubmit,
        formState: { errors },
        register,
        setValue
    } = useForm<AddNewBookingFormData>({
        defaultValues: {
            fileNumber: '',
            customerName: '',
            mob1: '',
            serviceCategory: '',
            customerVehicleNumber: '',
            comments: '',
            showroom: '',
        },
    });

    const fetchShowroomData = async () => {
        try {
            const data: IShowroom = await getShowroomById(showroomId)

            if (data) {
                setShowroomData(data);
                if (bookingId) {
                    const generatedFileNumber = `${data.showroomId}-${bookingId}`;
                    setValue("fileNumber", generatedFileNumber);
                    setValue("showroom", data._id);
                }
            } else {
                console.log('Showroom document does not exist');
            }
        } catch (error) {
            console.error('Error fetching showroom data:', error);
        }
    };

    useEffect(() => {
        fetchShowroomData();
    }, [showroomId]);

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            setCurrentDateTime(now.toLocaleString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            }));
        };

        updateDateTime();
        const interval = setInterval(updateDateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleAddBooking = async (formData: AddNewBookingFormData) => {
        setLoading(true);
        setError(null);

        let data: AddNewBookingFormData = {
            ...formData,
            createdBy: showroomId,
            bookingStatus: 'showroomStaff'
        }

        try {
            const res: AddBookingResponse = await addNewBooking(data) as AddBookingResponse
            sweetAlert({ title: 'Booking added', message: res.message })
            navigate('/bookings');
        } catch (error) {
            console.error('Error adding document: ', error);
            setError('Failed to add booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit(handleAddBooking)}
            className="bg-white rounded-xl shadow-md p-6 mx-auto max-w-4xl w-full my-8"
        >
            {/* Header Section */}
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 mb-6'>
                <h2 className="text-2xl font-bold text-gray-800">Add Booking</h2>
                <p className="text-sm text-gray-500 mt-2 sm:mt-0">
                    {currentDateTime}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm">
                    {error}
                </div>
            )}

            {/* Booking ID */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <span className='font-medium text-blue-600 text-sm'>Booking ID: </span>
                <span className="font-semibold text-gray-700">{bookingId}</span>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
                {/* File Number */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <label htmlFor="fileNumber" className="md:col-span-1 font-medium text-gray-700 pt-2">
                        File Number
                    </label>
                    <div className="md:col-span-3">
                        <input
                            id="fileNumber"
                            type="text"
                            {...register("fileNumber", {
                                required: "FileNumber name is required",
                            })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter File Number"
                            readOnly
                        />
                        {errors.fileNumber && (
                            <p className="mt-1 text-sm text-red-600">{errors.fileNumber.message}</p>
                        )}
                    </div>
                </div>

                {/* Vehicle Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <label htmlFor="serviceCategory" className="md:col-span-1 font-medium text-gray-700 pt-2">
                        Vehicle Section
                    </label>
                    <div className="md:col-span-3">
                        <select
                            id="serviceCategory"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            {...register("serviceCategory", { required: "Please select a service category" })}
                        >
                            <option value="">Select Service Section</option>
                            <option value="serviceCenter">Service Center</option>
                            <option value="accident">Body Shops</option>
                            <option value="showroom">Showrooms</option>
                        </select>
                        {errors.serviceCategory && (
                            <p className="mt-1 text-sm text-red-600">{errors.serviceCategory.message}</p>
                        )}
                    </div>
                </div>

                {/* Customer Name */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <label htmlFor="customerName" className="md:col-span-1 font-medium text-gray-700 pt-2">
                        Customer Name
                    </label>
                    <div className="md:col-span-3">
                        <input
                            id="customerName"
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter Customer Name"
                            {...register("customerName", {
                                required: "Customer name is required",
                                minLength: { value: 3, message: "Minimum 3 characters" },
                                pattern: {
                                    value: /^[a-zA-Z ]+$/,
                                    message: "Only alphabets and spaces allowed",
                                },
                            })}
                        />
                        {errors.customerName && (
                            <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
                        )}
                    </div>
                </div>

                {/* Phone Number */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <label htmlFor="mob1" className="md:col-span-1 font-medium text-gray-700 pt-2">
                        Phone Number
                    </label>
                    <div className="md:col-span-3">
                        <input
                            id="mob1"
                            type="tel"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter Phone Number"
                            {...register("mob1", {
                                required: "Phone number is required",
                                pattern: {
                                    value: /^[0-9]{10}$/,
                                    message: "Phone number must be 10 digits"
                                }
                            })}
                        />
                        {errors.mob1 && (
                            <p className="mt-1 text-sm text-red-600">{errors.mob1.message}</p>
                        )}
                    </div>
                </div>

                {/* Vehicle Number */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <label htmlFor="customerVehicleNumber" className="md:col-span-1 font-medium text-gray-700 pt-2">
                        Vehicle Number
                    </label>
                    <div className="md:col-span-3">
                        <input
                            id="customerVehicleNumber"
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter Vehicle Number (e.g. MH12AB1234)"
                            {...register("customerVehicleNumber", {
                                required: "Vehicle number is required",
                                pattern: {
                                    value: /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/,
                                    message: "Enter a valid vehicle number (e.g. MH12AB1234)"
                                }
                            })}
                        />
                        {errors.customerVehicleNumber && (
                            <p className="mt-1 text-sm text-red-600">{errors.customerVehicleNumber.message}</p>
                        )}
                    </div>
                </div>

                {/* Comments */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <label htmlFor="comments" className="md:col-span-1 font-medium text-gray-700 pt-2">
                        Comments
                    </label>
                    <div className="md:col-span-3">
                        <textarea
                            id="comments"
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter Comments"
                            {...register("comments", {
                                required: "Comments are required",
                                minLength: {
                                    value: 5,
                                    message: "Comment should be at least 5 characters"
                                },
                                maxLength: {
                                    value: 500,
                                    message: "Comment can't exceed 500 characters"
                                },
                                validate: value => value.trim().length > 0 || "Comment cannot be empty or whitespace"
                            })}
                        />
                        {errors.comments && (
                            <p className="mt-1 text-sm text-red-600">{errors.comments.message}</p>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium text-white transition-all ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                            </span>
                        ) : 'Submit'}
                    </button>
                </div>
            </div>
        </form>
    );
};
export default AddBook;