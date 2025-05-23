import { useEffect, useState, Fragment, useRef } from 'react';
import React, { ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import Swal from 'sweetalert2';
import Button from '@mui/material/Button';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { styled } from '@mui/material/styles';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import { CLOUD_IMAGE } from '../../constants/status';


export interface Booking {
    _id: string;
    workType: string;
    dummyProviderName?: string;
    dummyDriverName?: string;
    customerVehicleNumber: string;
    bookedBy: string;
    feedbackCheck: boolean;
    fileNumber: string;
    serviceVehicleNumber: string;
    location: string;
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

   
   

    // Verifying booking

    const verifyBooking = async () => {
        try {
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

    return (
        <div>
            <div className="panel">
                <div className="flex justify-between flex-wrap gap-4 px-4">
                    <div className="text-2xl font-semibold uppercase">Booking</div>
                  
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
                                                    <button onClick={() => handleRemovePickupImage(index)}>
                                                    <IoIosCloseCircleOutline  />
                                                    </button>
                                                    <img
                                                        src={url} alt={`pickup-${index}`} style={{ width: '100px', height: '100px', objectFit: 'contain' }}
                                                        className="w-16 h-16 hover:cursor-pointer"
                                                        onClick={() => {
                                                            setEnlargedImage(url)
                                                        }}
                                                    />
                                                    <div className='text-xs'>
                                                        <span>{formattedTime(booking?.pickupDate as unknown as string)}</span> -
                                                        <span> {dateFormate(booking?.pickupTime as unknown as string)}</span>
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
                                                        <span>{formattedTime(booking?.dropoffTime as unknown as string)}</span> -
                                                        <span> {dateFormate(booking?.dropoffTime as unknown as string)}</span>
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
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>-</td>
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
                                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>{formatDate(booking?.pickupTime)}</td>
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
                    <div className='w-full border mt-8'></div>
                    <div className="ltr:text-right rtl:text-left space-y-2 my-1 md:my-6">
                        
                    
                    </div>
                </div>
            </div>

           
          
        </div>
    );
};

export default Preview;
