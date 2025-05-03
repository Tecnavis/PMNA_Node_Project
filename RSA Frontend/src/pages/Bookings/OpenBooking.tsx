import { useEffect, useState, Fragment, useRef } from 'react';
import React, { ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { Dialog, DialogPanel, Transition, TransitionChild, Tab } from '@headlessui/react';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import Swal from 'sweetalert2';
import Button from '@mui/material/Button';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { styled } from '@mui/material/styles';
import BookingNotes from './BookingNotes';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import FeedbackModal from './FeedbackModal';
import { CLOUD_IMAGE } from '../../constants/status';
import { FiAlertTriangle, FiCheck, FiZoomIn } from 'react-icons/fi';
import { FiUpload, FiEdit2, FiTrash2 } from 'react-icons/fi';

export interface Booking {
    _id: string;
    workType: string;
    dummyProviderName?: string;
    bookingStatus: string;
    dummyDriverName?: string;
    customerVehicleNumber: string;
    bookedBy: string;
    feedbackCheck: boolean;
    fileNumber: string;
    serviceVehicleNumber: string;
    vehicleNumber: string;
    location: string;
    cashPending?: boolean;
    dropoffImagePending?: boolean;
    pickupImagePending?: boolean;
    inventoryImagePending?: boolean;
    company: {
        name: string;
    };
    latitudeAndLongitude: string;
    baselocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    }; // Reference to BaseLocation
    showroom: {
        name: string;
        location: string;
    }; // Reference to Showroom
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
    serviceCategory?: string; // Optional field
    insuranceAmount?: number; // Optional field
    adjustmentValue?: number; // Optional field
    amountWithoutInsurance?: number; // Optional field
    createdAt?: Date;
    updatedAt?: Date;
    pickupDate?: Date;
    pickupTime?: Date;
    verified: boolean;
    feedback: boolean;
    dropoffTime?: Date;
    driverSalaryCheck: boolean;
    compnayAmountCheck: boolean;
    remark: string;
    pickupImages: [string];
    dropoffImages: [string];
}

interface Feedbacks {
    _id: string;
    question: string;
    yesPoint: number;
    noPoint: number;
}

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

const Preview = () => {
    // message checkimg from open booking

    const navigate = useNavigate();
    const { id } = useParams();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [booking, setBooking] = useState<Booking | null>(null);
    const [modal5, setModal5] = useState(false);
    const [modal6, setModal6] = useState(false);
    const [feedbacks, setFeedbacks] = useState<Feedbacks[]>([]);
    const [driverSalaryIsChecked, setDriverSalaryIsChecked] = useState<boolean | null>(false);
    const [companyAmountIsChecked, setCompanyAmountIsChecked] = useState<boolean | null>(false);
    const [totalDistence, setTotalDistence] = useState<string>('');
    const [serviceVehicleNumber, setServiceVehicleNumber] = useState<string>('');
    const [remark, setRemark] = useState<string>('');
    const [totalAmount, setTotalAmount] = useState<string>('');
    const [dropoffTime, setDropoffTime] = useState<string>('');
    const [pickupTime, setPickupTime] = useState<string>('');
    const [pickupImages, setPickupImages] = useState<File[]>([]);
    const [pickupImageUrls, setPickuptImageUrls] = useState<string[]>([]);
    const [dropoffImageUrls, setDropoffImageUrls] = useState<string[]>([]);
    const [dropoffImages, setDropoffImages] = useState<File[]>([]);
    const [fileNumber, setFileNumber] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedResponses, setSelectedResponses] = useState<{ [key: string]: string }>({});
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
    const [role, setRole] = useState<string>('');
    const dropoffAndPickup = useRef<any>(null);
    const [inventoryImageUrl, setInventoryImageUrl] = useState<string | null>(null);
    const [isUploadingInventory, setIsUploadingInventory] = useState(false);

    // checking the token

    const gettingToken = () => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        if (role === 'admin') {
            setRole(role);
        } else if (role !== 'admin') {
            const name = localStorage.getItem('name');
            if (name) {
                setRole(`${role}-${name}`);
            } else {
                console.error('No user found');
            }
        }
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.error('Token  found in localStorage');
        } else {
            navigate('/auth/boxed-signin');
            console.error('Token not found in localStorage');
        }
    };

    // fetching booking by id
    const fetchBookingById = async () => {
        try {
            const response = await axios.get(`${backendUrl}/booking/${id}`);
            setBooking(response.data);
            setTotalDistence(response.data.totalDistence);
            setTotalAmount(response.data.totalAmount);
            setPickupImages(response.data.pickupImages);
            setDropoffImages(response.data.dropoffImages);
            setPickupTime(response.data.pickupTime);
            setDropoffTime(response.data.dropoffTime);
            setCompanyAmountIsChecked(response.data.compnayAmountCheck);
            setDriverSalaryIsChecked(response.data.driverSalaryCheck);
            setRemark(response.data.remark);
            setServiceVehicleNumber(response.data.serviceVehicleNumber);
            setFileNumber(response.data.fileNumber);
            const files = response.data.pickupImages?.map((filename: any) => {
                const blob = new Blob(); // Simulate a file blob (replace this if you receive actual blobs)
                return new File([blob], filename, { type: 'image/jpeg' }); // Adjust the type as needed
            });

            const urls = files?.map((file: any) => `${CLOUD_IMAGE}${file.name}`);

            const dropoffFiles = response.data.dropoffImages?.map((filename: any) => {
                const blob = new Blob(); // Simulate a file blob (replace this if you receive actual blobs)
                return new File([blob], filename, { type: 'image/jpeg' }); // Adjust the type as needed
            });

            const dropoffUrls = dropoffFiles?.map((file: any) => `${CLOUD_IMAGE}${file.name}`);
            setDropoffImageUrls(dropoffUrls);
            setPickuptImageUrls(urls);
               // Add inventory image URL if exists
        if (response.data.inventoryImage) {
            setInventoryImageUrl(`${CLOUD_IMAGE}${response.data.inventoryImage}`);
        }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    useEffect(() => {
        const files = pickupImages?.map((filename: any) => {
            const blob = new Blob(); // Simulate a file blob (replace this if you receive actual blobs)
            return new File([blob], filename, { type: 'image/jpeg' }); // Adjust the type as needed
        });

        const urls = files?.map((file: any) => `${CLOUD_IMAGE}${file.name}`);
        setPickuptImageUrls(urls);

        const dropoffFiles = dropoffImages?.map((filename: any) => {
            const blob = new Blob(); // Simulate a file blob (replace this if you receive actual blobs)
            return new File([blob], filename, { type: 'image/jpeg' }); // Adjust the type as needed
        });

        const dropoffUrls = dropoffFiles?.map((file: any) => `${CLOUD_IMAGE}${file.name}`);
        setDropoffImageUrls(dropoffUrls);
    }, []);

    // format date for the created at

    const formatDate = (dateString: any) => {
        const date = new Date(dateString);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    //   removing prefix fro booking id

    const removePrefix = (fileNumber: any) => {
        return fileNumber?.startsWith('PMNA-') ? fileNumber.replace('PMNA-', '') : fileNumber;
    };

    // toogling for button

    const handleToggleDriver = () => {
        setDriverSalaryIsChecked((prev) => !prev);
    };
    const handleToggleCompnay = () => {
        setCompanyAmountIsChecked((prev) => !prev);
    };


    // handling pickup and dropoff images

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>, type: 'pickup' | 'dropoff') => {
        const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
        const updatedImages = type === 'pickup' ? [...pickupImages, ...files] : [...dropoffImages, ...files];

        // Update the appropriate state
        if (type === 'pickup') {
            setPickupImages(updatedImages);
        } else {
            setDropoffImages(updatedImages);
        }

        try {
            const formData = new FormData();
            updatedImages.forEach((file) => {
                formData.append('images', file);
            });

            const endpoint = type === 'pickup' ? `${backendUrl}/booking/addingpickupimage/${id}` : `${backendUrl}/booking/addingdropoffimage/${id}`;

            await axios.patch(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            fetchBookingById(); // Refresh booking data
        } catch (error) {
            console.error('Error uploading images:', error);

            const errorMessage =
                error instanceof AxiosError && error.response && error.response.data.message ? error.response.data.message : 'There was an issue uploading the images. Please try again.';

            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: errorMessage,
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });

            // Reset the respective images state in case of an error
            if (type === 'pickup') {
                setPickupImages([]);
            } else {
                setDropoffImages([]);
            }
        }
    };

    //Removing pickup images

    const handleRemovePickupImage = async (index: number) => {
        try {
            await axios.patch(`${backendUrl}/booking/pickupimage/${id}/${index}`);
            setPickuptImageUrls((prevUrls) => prevUrls.filter((_, i) => i !== index));
        } catch (error: unknown) {
            console.error('Error deleting image:', error);
            alert('Failed to delete the image.');
        }
    };
    //Removing dropoff images

    const handleRemoveDropoffImage = async (index: number) => {
        try {
            await axios.patch(`${backendUrl}/booking/dropoffimage/${id}/${index}`);
            setDropoffImageUrls((prevUrls) => prevUrls.filter((_, i) => i !== index));
        } catch (error: unknown) {
            console.error('Error deleting image:', error);
            alert('Failed to delete the image.');
        }
    };

    // validating the booking

    const validate = (): boolean => {
        const formErrors: Record<string, string> = {};

        // Work type validation
        if (pickupImageUrls.length < 3) {
            formErrors.pickupImageUrls = 'Pickup image need minimum 3';
            dropoffAndPickup.current?.focus();
        }
        if (dropoffImageUrls.length < 3) {
            formErrors.dropoffImageUrls = 'dropoff image need minimum 3';
            dropoffAndPickup.current?.focus();
        }

        if (!dropoffTime) {
            formErrors.dropoffTime = "Dropoff time can't be empty";
        }
        if (!pickupTime) {
            formErrors.pickupTime = "Pickup time can't be empty";
        }
        if (!totalDistence) {
            formErrors.totalDistence = "Totlal distence can't be empty";
        }
        if (!totalAmount) {
            formErrors.totalAmount = "Amount can't be empty";
        }
        if (!serviceVehicleNumber) {
            formErrors.serviceVehicleNumber = "Vehicle number can't be empty";
        }
        if (!remark) {
            formErrors.remark = "Remark can't be empty";
        }

        // Set errors in the state
        setErrors(formErrors);

        return Object.keys(formErrors).length === 0;
    };
    // ref to scrolling

    // Updating booking for order Completion

    const updateBooking = async () => {
        if (validate()) {
            const data = {
                totalDistence: totalDistence,
                totalAmount: totalAmount,
                pickupTime: pickupTime,
                dropoffTime: dropoffTime,
                serviceVehicleNumber: serviceVehicleNumber,
                driverSalaryCheck: driverSalaryIsChecked,
                compnayAmountCheck: companyAmountIsChecked,
                remark,
            };
            try {
                await axios.put(`${backendUrl}/booking/pickupbyadmin/${id}`, data);
                setTotalAmount('');
                setTotalDistence('');
                setPickupTime('');
                setDropoffTime('');
                setServiceVehicleNumber('');
                setDriverSalaryIsChecked(null);
                setCompanyAmountIsChecked(null);
                setRemark('');
                setModal5(false);
                fetchBookingById();
                navigate('/bookings');
                Swal.fire({
                    icon: 'success',
                    title: 'Booking Updated',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
            } catch (error) {
                console.error(error);
            }
        }
    };

    // closing modal of booking completion

    const closeBookingModal = () => {
        setModal5(false);
        fetchBookingById();
    };

    const openFeedbackModal = async () => {
        setModal6(true);
        try {
            const response = await axios.get(`${backendUrl}/feedback/`);
            // console.log('reespo',response.data)
            setFeedbacks(response.data.data);
        } catch (error) {
            console.error(error);
        }
    };
    const closeFeedbackModal = async () => {
        setModal6(false);
    };


    // Verifying booking

    const verifyBooking = async () => {
        try {
            if (booking?.cashPending) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Cash is Pending',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                return; // Stop here, don't verify
            }
            if (booking?.pickupImagePending || booking?.dropoffImagePending) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Image is Pending',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                return;
            }
            if (booking?.inventoryImagePending) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Inventory Image is Pending',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                return;
            }
            // If no pending, proceed
            await axios.patch(`${backendUrl}/booking/verifybooking/${id}`);
            navigate('/completedbookings');
            Swal.fire({
                icon: 'success',
                title: 'Booking Verified',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            console.error(error);
        }
    };
    // Handling navigation to update
    const handleNavigateToBookingUpdate = (id: any, isMessageTrue: boolean) => {
        // Navigate to Page 2 with the boolean value in the URL
        navigate(`/add-booking/${id}?message=${isMessageTrue}`);
    };

    // handling feedback

    const handleOptionChange = (questionId: string, response: string) => {
        setSelectedResponses((prev) => ({ ...prev, [questionId]: response }));
    };

    // posting feedback

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if all feedback questions have been answered
        const allAnswered = feedbacks.every((feedback) => selectedResponses[feedback._id]);

        if (!allAnswered) {
            Swal.fire({
                icon: 'error',
                title: 'Incomplete Feedback',
                text: 'Please answer all questions before submitting.',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            return; // Stop the function if not all questions are answered
        }

        const feedbackData = feedbacks?.map((feedback) => ({
            questionId: feedback._id,
            response: selectedResponses[feedback._id] || '', // "yes" or "no"
            yesPoint: feedback.yesPoint,
            noPoint: feedback.noPoint,
        }));

        try {
            const response = await axios.put(`${backendUrl}/booking/postfeedback/${id}`, { feedback: feedbackData });
            navigate('/completedbookings');
            Swal.fire({
                icon: 'success',
                title: 'Feedback added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error('Error saving feedback:', error.response?.data || error.message);
            } else {
                console.error('An unexpected error occurred:', error);
            }
        }
    };

    const handleDownloadImage = () => {
        if (!enlargedImage) return;

        fetch(enlargedImage)
            .then(response => response.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "downloaded-image.jpg";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(error => console.error("Error downloading the image:", error));
    }

    useEffect(() => {
        gettingToken();
        fetchBookingById();
    }, []);
// Add this handler function
const handleInventoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        setIsUploadingInventory(true);
        
        const formData = new FormData();
        formData.append('image', file);

        const response = await axios.patch(`${backendUrl}/booking/inventory/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        // Update local state with new image
        setInventoryImageUrl(`${CLOUD_IMAGE}${response.data.booking.inventoryImage}`);
        
        Swal.fire({
            icon: 'success',
            title: 'Inventory Updated!',
            text: 'The inventory sheet has been successfully uploaded',
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 3000,
        });

        // Refresh booking data to update pending status
        fetchBookingById();
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: 'Failed to upload inventory sheet',
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 3000,
        });
        console.error('Error uploading inventory image:', error);
    } finally {
        setIsUploadingInventory(false);
    }
};
    return (
        <div>
            <div className="panel">
                <div className="flex justify-between flex-wrap gap-4 px-4">
                    <div className="text-2xl font-semibold uppercase">Booking</div>
                    {booking?.verified && ( // Optional chaining to check if booking exists and is verified
                        <div className="flex-grow text-center">
                            <div className={`inline-block px-4 py-2 rounded-md text-white font-semibold ${booking.feedbackCheck ? 'bg-green-500' : 'bg-blue-500'}`}>
                                {booking.feedbackCheck ? 'Verification and Feedback Completed' : 'Booking Verified'}
                            </div>
                        </div>
                    )}
                    <div className="shrink-0">
                        <img src="/assets/images/RSALogo.png" alt="img" className="w-14 ltr:ml-auto rtl:mr-auto" style={{ width: '183px', height: '50px', objectFit: 'cover' }} />
                    </div>
                </div>
                <div className="ltr:text-right rtl:text-left px-4">
                    <div className="space-y-1 mt-6 text-white-dark"></div>
                </div>

                <hr className="border-white-light dark:border-[#1b2e4b] my-6" />

                <div className="table-responsive mt-6">
                    <Tab.Group onChange={() => setEnlargedImage(null)}>
                        <Tab.List className="flex flex-wrap mt-3 border-b border-white-light dark:border-[#191e3a]">
                            <Tab as={Fragment}>
                                {({ selected }) => (
                                    <button
                                        type="button"
                                        className={`${selected ? '!border-white-light !border-b-white  text-primary dark:!border-[#191e3a] dark:!border-b-black !outline-none ' : ''
                                            } p-3.5 py-2 -mb-[1px] block border border-transparent hover:text-primary dark:hover:border-b-black`}
                                    >
                                        Pickup Details
                                    </button>
                                )}
                            </Tab>
                            <Tab as={Fragment}>
                                {({ selected }) => (
                                    <button
                                        type="button"
                                        className={`${selected ? '!border-white-light !border-b-white  text-primary dark:!border-[#191e3a] dark:!border-b-black !outline-none ' : ''
                                            } p-3.5 py-2 -mb-[1px] block border border-transparent hover:text-primary dark:hover:border-b-black`}
                                    >
                                        Dropoff Details
                                    </button>
                                )}
                            </Tab>
                        </Tab.List>
                        <Tab.Panels>
                            <Tab.Panel>
                                <div>
                                    <div className="flex items-start pt-5">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '25px' }}>
                                            {pickupImageUrls?.map((url, index) => (
                                                <div key={index} className='flex flex-col gap-5 justify-center items-center'>
                                                    <IoIosCloseCircleOutline onClick={() => handleRemovePickupImage(index)} />
                                                    <img
                                                        src={url} alt={`pickup-${index}`} style={{ width: '100px', height: '100px', objectFit: 'contain' }}
                                                        className="w-16 h-16 hover:cursor-pointer"
                                                        onClick={() => {
                                                            setEnlargedImage(url)
                                                        }}
                                                    />
                                                    <div className='text-xs'>
                                                        <span>{new Date(booking?.pickupTime ?? (booking?.pickupDate || "")).toLocaleDateString()}</span> -
                                                        <span>{new Date(booking?.pickupTime ?? (booking?.pickupDate || "")).toLocaleTimeString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {pickupImageUrls.length >= 6 ? (
                                                <div></div>
                                            ) : (
                                                <Button component="label" role={undefined} variant="contained" tabIndex={-1} startIcon={<FaCloudUploadAlt />}>
                                                    Upload files
                                                    <VisuallyHiddenInput type="file" accept="image/png, image/jpeg, image/jpg" onChange={(e) => handleImageChange(e, 'pickup')} multiple />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Tab.Panel>
                            <Tab.Panel>
                                <div>
                                    <div className="flex items-start pt-5">
                                        <div className="flex items-center justify-center gap-6">
                                            {dropoffImageUrls.map((url, index) => (
                                                <div key={index} className='flex flex-col gap-5 justify-center items-center'>
                                                    <IoIosCloseCircleOutline onClick={() => handleRemoveDropoffImage(index)} />
                                                    <img
                                                        src={url} alt={`pickup-${index}`} style={{ width: '100px', height: '100px', objectFit: 'contain' }}
                                                        className="w-16 h-16 hover:cursor-pointer"
                                                        onClick={() => {
                                                            setEnlargedImage(url);
                                                        }}
                                                    />
                                                    <div className='text-xs'>
                                                        <span> {dateFormate(booking?.dropoffTime as unknown as string)}</span> -
                                                        <span>{formattedTime(booking?.dropoffTime as unknown as string)}</span>
                                                    </div>
                                                </div>
                                            ))}

                                            {dropoffImageUrls.length < 6 && (
                                                <Button component="label" role={undefined} variant="contained" tabIndex={-1} startIcon={<FaCloudUploadAlt />}>
                                                    Upload files
                                                    <VisuallyHiddenInput type="file" accept="image/png, image/jpeg, image/jpg" onChange={(e) => handleImageChange(e, 'dropoff')} multiple />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Modal for Enlarged Image */}
                                </div>
                            </Tab.Panel>
                            {enlargedImage && (
                                <div
                                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000]"
                                    onClick={() => setEnlargedImage(null)}
                                >
                                    <div className="relative">
                                        <IoIosCloseCircleOutline
                                            className="absolute -top-2 -right-2 text-white text-4xl cursor-pointer "
                                            onClick={() => setEnlargedImage(null)}
                                        />
                                        <img src={enlargedImage} alt="Enlarged" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
                                        <button className='text-white w-full py-2 rounded-md mt-1  bg-primary' onClick={handleDownloadImage}>Download</button>
                                    </div>
                                </div>
                            )}
                        </Tab.Panels>
                    </Tab.Group>
                    {/* --------------------------------------------------------------- */}
<div className="mt-8">
    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Inventory Sheet</h3>
    
    {inventoryImageUrl ? (
        <div className="relative group max-w-md mx-auto">
            <div className="relative overflow-hidden rounded-lg shadow-md border-2 border-green-100 dark:border-green-800 transition-all duration-300 hover:shadow-lg">
                <img 
                    src={inventoryImageUrl} 
                    alt="Inventory sheet"
                    className="w-full h-64 object-contain bg-gray-50 dark:bg-gray-800"
                    onClick={() => setEnlargedImage(inventoryImageUrl)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div className="flex justify-between w-full items-center">
                        <span className="text-white text-sm bg-green-500 px-2 py-1 rounded-full flex items-center">
                            <FiCheck className="mr-1" /> Verified Inventory
                        </span>
                        <div className="flex gap-2">
                            <label className="text-white bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors cursor-pointer">
                                <FiEdit2 size={18} />
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf" 
                                    className="hidden" 
                                    onChange={handleInventoryImageUpload}
                                    disabled={isUploadingInventory}
                                />
                            </label>
                            <button 
                                onClick={() => setEnlargedImage(inventoryImageUrl)}
                                className="text-white bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors"
                            >
                                <FiZoomIn size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
            <FiAlertTriangle className="mx-auto text-yellow-500 dark:text-yellow-400 text-2xl mb-2" />
            <p className="text-yellow-700 dark:text-yellow-300 font-medium">No inventory sheet uploaded</p>
            <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">Please upload the signed inventory sheet</p>
            
            <label className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary-dark transition-colors cursor-pointer">
                {isUploadingInventory ? (
                    <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                    </span>
                ) : (
                    <span className="flex items-center">
                        <FiUpload className="mr-2" />
                        Upload Inventory Sheet
                    </span>
                )}
                <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    className="hidden" 
                    onChange={handleInventoryImageUpload}
                    disabled={isUploadingInventory}
                />
            </label>
        </div>
    )}
</div>
                    <table className="table-striped mt-4">
                        <tbody>
                            {booking && (
                                <>
                                    {/* Work Type */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Date And Time</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{formatDate(booking?.createdAt)}</td>
                                    </tr>

                                    {/* Booking Id */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Booking ID</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{removePrefix(booking?.fileNumber) || "N/A"}</td>
                                    </tr>

                                    {/* Pickup date */}
                                    {booking?.pickupDate && (
                                        <tr>
                                            <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Pickup Date</td>
                                            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{formatDate(booking?.pickupDate) || "N/A"}</td>
                                        </tr>
                                    )}

                                    {/* Edited Person */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Edited Person</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.bookedBy || "N/A"}</td>
                                    </tr>

                                    {/* Compnay */}
                                    {booking?.workType === 'PaymentWork' ? (
                                        <tr>
                                            <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Company</td>
                                            <td style={{ border: '1px solid #ccc', padding: '8px' }}>Payment work</td>
                                        </tr>
                                    ) : booking?.workType === 'RSAWork' ? (
                                        <>
                                            <tr>
                                                <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Company</td>
                                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>RSA work</td>
                                            </tr>
                                            <tr>
                                                <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Selected Company</td>
                                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.company?.name || 'No company available'}</td>
                                            </tr>
                                        </>
                                    ) : null}

                                    {/* Traped location  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Traped Location</td>

                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.trapedLocation || "N/A"}</td>
                                    </tr>

                                    {/* Service center  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Service Center</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.showroom?.name || "N/A"}</td>
                                    </tr>

                                    {/* File number  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>File Number</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.fileNumber || "N/A"}</td>
                                    </tr>

                                    {/* Customer name  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Customer Name</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.customerName || "N/A"}</td>
                                    </tr>

                                    {/* Driver name  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Driver Name</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                                            {booking?.driver ?
                                                booking?.driver?.name :
                                                booking?.provider ?
                                                    booking.provider?.name :
                                                    booking?.dummyDriverName ? booking?.dummyDriverName : booking?.dummyProviderName ? booking?.dummyProviderName : "No Driver And No Provider found"}
                                        </td>
                                    </tr>

                                    {/* Driver total distence  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Driver Total Distence</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.totalDriverDistence || "N/A"}</td>
                                    </tr>

                                    {/* Driver salary  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Driver Salary</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                                            <p style={{ color: 'red', fontWeight: 'bold', fontSize: 'large' }}>{booking?.driverSalary || "N/A"}</p>
                                        </td>
                                    </tr>

                                    {/* Customer vehicle number  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Customer Vehicle Number</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.customerVehicleNumber || "N/A"}</td>
                                    </tr>

                                    {/* Brand name  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Brand Name</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.brandName || "N/A"}</td>
                                    </tr>

                                    {/* Mobile 1  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Mobile 1</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.mob1 || "N/A"}</td>
                                    </tr>

                                    {/* Mobile 2  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Mobile 2</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.mob2 || "N/A"}</td>
                                    </tr>

                                    {/* Start location  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Start Location</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.baselocation?.baseLocation || "N/A"}</td>
                                    </tr>

                                    {/* Pickup location  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Pickup Location</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.location || "N/A"}</td>
                                    </tr>

                                    {/* Dropoff location  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Dropoff Location</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.showroom?.location}</td>
                                    </tr>

                                    {/* Distence  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Distence</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.totalDistence || "N/A"}</td>
                                    </tr>

                                    {/* Service type  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Service Type</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.serviceType?.serviceName}</td>
                                    </tr>

                                    {/* Service vehicle number  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Service Vehicle number</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.vehicleNumber || "N/A"}</td>
                                    </tr>

                                    {/*Service Category  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Service Category</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.serviceCategory || "N/A"}</td>
                                    </tr>
                                    {/*Insurance amount  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Insurance Amount</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.insuranceAmount || "0"}</td>
                                    </tr>
                                    {/*Comments  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Comments</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.comments || "N/A"}</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                    {booking?.status === 'Order Completed' && (
                        <div>
                            {' '}
                            <table className="table-striped mt-4">
                                <tbody>
                                    {/* serviceVehicleNumbe  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Service Vehicle Number</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking.serviceVehicleNumber}</td>
                                    </tr>
                                    {/* Pickup time  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Pickup Time</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                                        <span>{new Date(booking?.pickupTime ?? (booking?.pickupDate || "")).toLocaleDateString()}</span> - 
                                        <span>{new Date(booking?.pickupTime ?? (booking?.pickupDate || "")).toLocaleTimeString()}</span>
                                        </td>
                                    </tr>
                                    {/* Dropoff time  */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Dropoff Time</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{formatDate(booking?.dropoffTime)}</td>
                                    </tr>
                                    {/* Remark */}
                                    <tr>
                                        <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>Remark</td>
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{booking?.remark}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="grid sm:grid-cols-1 grid-cols-1 px-4 mt-6 gap-5">
                    {/* Notes section goes here */}
                    <BookingNotes role={role} id={id || ''} />
                    <div className='w-full border mt-8'></div>
                    <div className="ltr:text-right rtl:text-left space-y-2 my-1 md:my-6">
                        <div className="flex items-center justify-center font-semibold text-lg">
                            <div className="flex-1">Payable Amount by Customer/Company :<span className='text-red-500 ml-2'>₹ {booking?.totalAmount}</span> </div>
                            {/* <div className="w-[37%]" style={{ color: 'red' }}>
                                
                            </div> */}
                        </div>
                        {booking?.status === 'Order Completed' ? (
                            <div>
                                {!booking.verified && !booking.feedbackCheck ? (
                                    <>
                                        <button type="button" className="btn btn-info w-full mb-3" onClick={() => handleNavigateToBookingUpdate(id, true)}>
                                            Edit
                                        </button>
                                        <button type="button" className="btn btn-success w-full" onClick={verifyBooking}>
                                            Verify
                                        </button>
                                    </>
                                ) : (
                                    booking.verified &&
                                    !booking.feedbackCheck && (
                                        <button type="button" className="btn btn-success w-full" onClick={openFeedbackModal}>
                                            Feedback
                                        </button>
                                    )
                                )}
                            </div>
                        ) : (
                            <button type="button" className="btn btn-info w-full" onClick={() => setModal5(true)}>
                                Booking Completed
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* modal for the order Complete  */}

            <Transition appear show={modal5} as={Fragment}>
                <Dialog as="div" open={modal5} onClose={closeBookingModal} className="fixed inset-0 z-50 overflow-y-auto">
                    <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0" />
                    </TransitionChild>
                    <div className="fixed inset-0 bg-[black]/60 z-[999]">
                        <div className="flex items-start justify-center min-h-screen px-4">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-5xl my-8 text-black dark:text-white-dark">
                                    {' '}
                                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                        <h5 className="font-bold text-lg">Pickup and dropoff details</h5>
                                        <button onClick={closeBookingModal} type="button" className="text-white-dark hover:text-dark">
                                            <IoIosCloseCircleOutline size={24} />
                                        </button>
                                    </div>
                                    <div
                                        style={{
                                            height: '500px', // Set the height you want
                                            overflowY: 'auto', // Enable vertical scrolling
                                        }}
                                    >
                                        <div className="p-5">
                                            <div className="container mx-auto">
                                                <h3>Pickup images</h3>
                                                <div className="flex">
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                                                        {pickupImageUrls?.map((url, index) => (
                                                            <div key={index}>
                                                                <IoIosCloseCircleOutline onClick={() => handleRemovePickupImage(index)} />

                                                                <img src={url} alt={`pickup-${index}`} style={{ width: '100px', height: '100px', objectFit: 'contain' }} className="w-16 h-16" />
                                                            </div>
                                                        ))}
                                                        {pickupImageUrls.length >= 6 ? (
                                                            <div></div>
                                                        ) : (
                                                            <Button component="label" role={undefined} variant="contained" tabIndex={-1} startIcon={<FaCloudUploadAlt />}>
                                                                Upload files
                                                                <VisuallyHiddenInput
                                                                    ref={dropoffAndPickup}
                                                                    type="file"
                                                                    accept="image/png, image/jpeg, image/jpg"
                                                                    onChange={(e) => handleImageChange(e, 'pickup')}
                                                                    multiple
                                                                />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {errors.pickupImageUrls && <p className="text-red-500">{errors.pickupImageUrls}</p>}
                                                <h3>Dropoff images</h3>
                                                <div className="flex">
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                                                        {dropoffImageUrls?.map((url, index) => (
                                                            <div key={index}>
                                                                <IoIosCloseCircleOutline onClick={() => handleRemoveDropoffImage(index)} />
                                                                <img src={url} alt={`pickup-${index}`} style={{ width: '100px', height: '100px', objectFit: 'contain' }} className="w-16 h-16" />
                                                            </div>
                                                        ))}
                                                        {dropoffImageUrls.length >= 6 ? (
                                                            <div></div>
                                                        ) : (
                                                            <Button component="label" role={undefined} variant="contained" tabIndex={-1} startIcon={<FaCloudUploadAlt />}>
                                                                Upload files
                                                                <VisuallyHiddenInput type="file" accept="image/png, image/jpeg, image/jpg" onChange={(e) => handleImageChange(e, 'dropoff')} multiple />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {errors.dropoffImageUrls && <p className="text-red-500">{errors.dropoffImageUrls}</p>}
                                            </div>
                                            <div>
                                                <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black mt-3">
                                                    <div className="flex flex-col sm:flex-row">
                                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                            <div>
                                                                <label htmlFor="pickupDateAndTime">Pickup Date And Time</label>
                                                                <input
                                                                    id="date-time"
                                                                    type="datetime-local"
                                                                    className="form-input"
                                                                    value={pickupTime ? new Date(pickupTime).toISOString().slice(0, 16) : ''}
                                                                    onChange={(e) => setPickupTime(e.target.value)}
                                                                />
                                                                {errors.pickupTime && <p className="text-red-500">{errors.pickupTime}</p>}
                                                            </div>
                                                            <div>
                                                                <label htmlFor="dropoffDateAndTime">Dropoff Date And Time</label>
                                                                <input
                                                                    id="date-time"
                                                                    type="datetime-local"
                                                                    className="form-input"
                                                                    value={dropoffTime ? new Date(dropoffTime).toISOString().slice(0, 16) : ''}
                                                                    onChange={(e) => setDropoffTime(e.target.value)}
                                                                />
                                                                {errors.dropoffTime && <p className="text-red-500">{errors.dropoffTime}</p>}
                                                            </div>
                                                            <div>
                                                                <label htmlFor="totalDistence">Distence</label>
                                                                <input
                                                                    id="totalDistence"
                                                                    type="number"
                                                                    placeholder="Enter Distence"
                                                                    className="form-input"
                                                                    value={totalDistence}
                                                                    onChange={(e) => setTotalDistence(e.target.value)}
                                                                />
                                                                {errors.totalDistence && <p className="text-red-500">{errors.totalDistence}</p>}
                                                            </div>
                                                            <div>
                                                                <label htmlFor="totalAmount">Amount</label>
                                                                <input
                                                                    id="totalAmount"
                                                                    type="number"
                                                                    placeholder="Enter Amount"
                                                                    value={totalAmount}
                                                                    className="form-input"
                                                                    onChange={(e) => setTotalAmount(e.target.value)}
                                                                />
                                                                {errors.totalAmount && <p className="text-red-500">{errors.totalAmount}</p>}
                                                            </div>
                                                            <div>
                                                                <label htmlFor="driverSalary">Driver Salary</label>
                                                                <label className="w-12 h-6 relative">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                                                        id="custom_switch_checkbox1"
                                                                        checked={driverSalaryIsChecked === null ? false : driverSalaryIsChecked}
                                                                        onChange={handleToggleDriver}
                                                                    />
                                                                    <span
                                                                        className={`outline_checkbox bg-icon border-2 border-[#f37b79] dark:border-white-dark block h-full before:absolute before:left-1 before:bg-[#f37b79] dark:before:bg-white-dark before:bottom-1 before:w-4 before:h-4
                        before:bg-[url(/assets/images/close.svg)] before:bg-no-repeat before:bg-center peer-checked:before:left-7 peer-checked:before:bg-[url(/assets/images/checked.svg)] peer-checked:border-primary peer-checked:before:bg-primary before:transition-all before:duration-300`}
                                                                    ></span>
                                                                </label>
                                                            </div>
                                                            <div>
                                                                <label htmlFor="driverSalary">Company Amount</label>
                                                                <label className="w-12 h-6 relative">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                                                        id="custom_switch_checkbox1"
                                                                        checked={companyAmountIsChecked === null ? false : companyAmountIsChecked}
                                                                        onChange={handleToggleCompnay}
                                                                    />
                                                                    <span
                                                                        className={`outline_checkbox bg-icon border-2 border-[#f37b79] dark:border-white-dark block h-full before:absolute before:left-1 before:bg-[#f37b79] dark:before:bg-white-dark before:bottom-1 before:w-4 before:h-4
                        before:bg-[url(/assets/images/close.svg)] before:bg-no-repeat before:bg-center peer-checked:before:left-7 peer-checked:before:bg-[url(/assets/images/checked.svg)] peer-checked:border-primary peer-checked:before:bg-primary before:transition-all before:duration-300`}
                                                                    ></span>
                                                                </label>
                                                            </div>
                                                            <div>
                                                                <label htmlFor="serviceVehicleNumber">Service Vehicle Number</label>
                                                                <input
                                                                    id="serviceVehicleNumbe"
                                                                    type="text"
                                                                    placeholder="Enter Service Vehicle Number"
                                                                    className="form-input"
                                                                    value={serviceVehicleNumber}
                                                                    onChange={(e) => setServiceVehicleNumber(e.target.value)}
                                                                />
                                                                {errors.serviceVehicleNumber && <p className="text-red-500">{errors.serviceVehicleNumber}</p>}
                                                            </div>
                                                            <div>
                                                                <label htmlFor="remark">Remark</label>
                                                                <textarea id="remark" className="form-input" value={remark} onChange={(e) => setRemark(e.target.value)} />
                                                                {errors.remark && <p className="text-red-500">{errors.remark}</p>}
                                                            </div>

                                                            <div className="sm:col-span-2 mt-3">
                                                                <button type="button" className="btn btn-primary" onClick={updateBooking}>
                                                                    Update
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* modal for feedback  */}
            <FeedbackModal
                feedbacks={feedbacks}
                isOpen={modal6}
                onChange={handleOptionChange}
                onClose={closeFeedbackModal}
                selectedResponses={selectedResponses}
                onSubmit={handleSubmitFeedback}
            />
        </div>
    );
};

export default Preview;
