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
            phoneNumber: '',
            serviceCategory: '',
            vehicleNumber: '',
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
        try {
            const res: AddBookingResponse = await addNewBooking(formData) as AddBookingResponse
            sweetAlert({ title: 'Booking added', message: res.message })
            navigate('/showrm');
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
            className="p-6 flex-1 mt-4 mx-auto my-8 max-w-[800px] rounded-[10px] panel "
        >
            <div className='flex items-center justify-between border-b border-gray-300 pb-2 mb-5'>
                <h2 className="font-semibold text-gray-900 text-xl">Add Booking</h2>
                <p className="mt-1 text-sm/6 text-gray-600">
                    {currentDateTime}
                </p>
            </div>
            <div
                style={{ padding: '1rem' }}>
                {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
                <div
                    className="mb-5 font-sans text-[#333] p-2.5 bg-[#f9f9f9] rounded shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                >
                    <span className='font-semibold text-sm text-blue-500'>Booking ID : </span>
                    <span style={{ fontSize: '16px', color: '#333' }}>{bookingId}</span>
                </div>
                <div className="mt-4 flex items-center" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="fileNumber" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>File Number</label>
                    <div className='w-full flex flex-col items-start justify-start'>
                        <input
                            id="fileNumber"
                            type="text"
                            {...register("fileNumber", {
                                required: "FileNumber name is required",
                            })}
                            className="form-input flex-1"
                            placeholder="Enter File Number"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                            readOnly
                        />
                        {errors.fileNumber && (
                            <p style={{ color: "red" }}>{errors.fileNumber.message}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="serviceCategory" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Vehicle Section</label>
                    <div className='w-full flex flex-col items-start justify-start'>
                        <select
                            id="serviceCategory"
                            className="form-select flex-1"
                            {...register("serviceCategory", { required: "Please select a service category" })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            <option value="">Select Service Section</option>
                            <option value="Service Center">Service Center</option>
                            <option value="Body Shop">Body Shopes</option>
                            <option value="ShowRooms">ShowRooms</option>

                        </select>
                        {errors.serviceCategory && (
                            <p className="text-red-500 text-center ">{errors.serviceCategory.message}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="customerName" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Customer Name</label>
                    <div className='w-full flex flex-col items-start justify-start'>
                        <input
                            id="customerName"
                            type="text"
                            className="form-input flex-1"
                            placeholder="Enter Customer Name"
                            {...register("customerName", {
                                required: "Customer name is required",
                                minLength: { value: 3, message: "Minimum 3 characters" },
                                pattern: {
                                    value: /^[a-zA-Z ]+$/,
                                    message: "Only alphabets and spaces allowed",
                                },
                            })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                        />
                        {errors.customerName && (
                            <p className="text-red-500 ">{errors.customerName.message}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="phoneNumber" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Phone Number</label>
                    <div className='w-full flex flex-col items-start justify-start'>
                        <input
                            id="phoneNumber"
                            type="text"
                            className="form-input flex-1"
                            placeholder="Enter Phone Number"
                            {...register("phoneNumber", {
                                required: "Phone number is required",
                                pattern: {
                                    value: /^[0-9]{10}$/,
                                    message: "Phone number must be 10 digits"
                                }
                            })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                        />
                        {errors.phoneNumber && (
                            <p className="text-red-500 text-center ">{errors.phoneNumber.message}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="vehicleNumber" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Vehicle Number</label>
                    <div className='w-full flex flex-col items-start justify-start'>
                        <input
                            id="vehicleNumber"
                            type="text"
                            className="form-input flex-1"
                            placeholder="Enter Vehicle Number"
                            {...register("vehicleNumber", {
                                required: "Vehicle number is required",
                                pattern: {
                                    value: /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/,
                                    message: "Enter a valid vehicle number (e.g. MH12AB1234)"
                                }
                            })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                        />
                        {errors.vehicleNumber && (
                            <p className="text-red-500 text-center ">{errors.vehicleNumber.message}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="comments" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Comments</label>
                    <div className='w-full flex flex-col items-start justify-start'>
                        <textarea
                            id="comments"
                            className="form-textarea flex-1"
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
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                        />
                        {errors.comments && (
                            <p className="text-red-500 text-center ">{errors.comments.message}</p>
                        )}
                    </div>
                </div>
                <div className="mt-4 flex justify-center" style={{ marginTop: '1rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            backgroundColor: '#007bff',
                            color: '#fff',
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            borderRadius: '5px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        {loading ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>
        </form>
    );
};
export default AddBook;