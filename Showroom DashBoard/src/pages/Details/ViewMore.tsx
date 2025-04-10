import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
// import { getFirestore, doc, getDoc, updateDoc, deleteDoc, getDocs, collection, Timestamp, query, where } from 'firebase/firestore';
// import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

// import { storage } from '../../config/config';
import Header from '../../components/Layouts/Header';
import { Timestamp } from 'firebase/firestore';

interface BookingDetails {
    id: string;
    dateTime: string;
    bookingId: string;
    newStatus: string;
    editedTime: string;
    totalSalary: string;
    updatedTotalSalary: string;
    company: string;
    trappedLocation: string;
    showroomLocation: string;
    fileNumber: string;
    customerName: string;
    driver: string;
    selectedCompany?: string;
    selectedDriver: string;
    totalDriverDistance: string;
    totalDriverSalary: string;
    vehicleNumber: string;
    phoneNumber: string;
    mobileNumber: string;
    baseLocation: { name: string; lat: number; lng: number } | null;
    pickupLocation: { name: string; lat: number; lng: number } | null;
    dropoffLocation: { name: string; lat: number; lng: number } | null;
    distance: string;
    serviceType: string;
    serviceVehicle: string;
    rcBookImageURLs: string[];
    vehicleImageURLs: string[];
    vehicleImgURLs: string[];
    fuelBillImageURLs: string[];
    comments: string;
    status: string;
    pickedTime: Timestamp | null | undefined;
    remark: string;
    formAdded: boolean;
    bookingChecked: boolean;
    paymentStatus: string;
    feedback?: boolean;
    remarkWritten?: string;
    companyName?: string;
    vehicleModel: string;
    droppedTime: Timestamp | null | undefined;
    feedbackWritten?: string;
    // Add missing properties here
    driverSalary?: string;
    companyAmount?: string;
    amount?: string;
}

interface Driver {
    id: string;
    name: string;
    phone: string;
    companyName: string;
    // Add other relevant driver fields here
}

const ViewMore: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
    // const db = getFirestore();
    const uid = import.meta.env.VITE_REACT_APP_UID;
    const [dId, setDId] = useState<string | null>(null);
    const [allDrivers, setALLDrivers] = useState<Driver[]>([]);
    const [docId, setDocId] = useState<string>('');
    const role = sessionStorage.getItem('role');
    const bookingCheck = bookingDetails?.bookingChecked ?? false;
    const { search } = useLocation();
    const [showPickupDetails, setShowPickupDetails] = useState(false);
    const [showDropoffDetails, setShowDropoffDetails] = useState(false);
    const queryParams = new URLSearchParams(search);
    const userName = sessionStorage.getItem('username');

    const [notes, setNotes] = useState<string>('');
    const [showroomName, setShowroomName] = useState('');

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [editedFields, setEditedFields] = useState({
        salary: bookingDetails?.updatedTotalSalary || '',
        fileNumber: bookingDetails?.fileNumber || '',
        totalDriverSalary: bookingDetails?.totalDriverSalary || '',
        serviceVehicle: bookingDetails?.serviceVehicle || '',
        bookingId: bookingDetails?.bookingId,
        company: bookingDetails?.company,
        companyName: bookingDetails?.companyName,
        trappedLocation: bookingDetails?.trappedLocation,
        showroomLocation: bookingDetails?.showroomLocation,
        customerName: bookingDetails?.customerName,
        driver: bookingDetails?.driver,
        selectedCompany: bookingDetails?.selectedCompany,
        totalDriverDistance: bookingDetails?.totalDriverDistance,
        vehicleNumber: bookingDetails?.vehicleNumber,
        vehicleModel: bookingDetails?.vehicleModel,
        baseLocation: bookingDetails?.baseLocation,
        pickupLocation: bookingDetails?.pickupLocation,
        dropoffLocation: bookingDetails?.dropoffLocation,
        distance: bookingDetails?.distance,
        serviceType: bookingDetails?.serviceType,
        rcBookImageURLs: bookingDetails?.rcBookImageURLs || [],
        vehicleImageURLs: bookingDetails?.vehicleImageURLs || [],
        fuelBillImageURLs: bookingDetails?.fuelBillImageURLs || [],
        comments: bookingDetails?.comments,
        pickedTime: bookingDetails?.pickedTime,
        droppedTime: bookingDetails?.droppedTime,
        remark: bookingDetails?.remark,
        feedback: bookingDetails?.feedback,
    });
    useEffect(() => {
        if (bookingDetails && bookingDetails.comments) {
            setNotes(bookingDetails.comments);
        }
    }, [bookingDetails]);

    const handleImageClick = (url: string) => {
        setSelectedImage(url); // Set selected image for modal
    };

    const closeModal = () => {
        setSelectedImage(null); // Clear selected image
    };
    useEffect(() => {
        fetchBookingDetails();
        fetchDrivers();
    }, [id, uid]);

    const fetchDrivers = async () => {
        try {
            // const driversCollection = collection(db, `user/${uid}/driver`);
            // const driverSnapshot = await getDocs(driversCollection);
            // const driverList = driverSnapshot.docs.map((doc) => ({
            //     id: doc.id,
            //     ...doc.data(),
            // })) as Driver[]; // Type assertion to indicate the shape of objects is Driver

            // setALLDrivers(driverList); // Store the fetched drivers in state
            // console.log(driverList, 'Fetched Drivers'); // Optional logging
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const fetchBookingDetails = async () => {
        if (!uid || !id) {
            console.error('UID or ID is undefined.');
            return;
        }

        // try {
        //     const docRef = doc(db, `user/${uid}/bookings`, id);
        //     const docSnap = await getDoc(docRef);

        //     if (docSnap.exists()) {
        //         const data = docSnap.data();
        //         console.log(data, 'this is the data provided');
        //         setBookingDetails({
        //             id: data.id || '',
        //             dateTime: data.dateTime || '',
        //             bookingId: data.bookingId || '',
        //             newStatus: data.newStatus || '',
        //             editedTime: data.editedTime || '',
        //             totalSalary: data.totalSalary || '',
        //             updatedTotalSalary: data.updatedTotalSalary || '',
        //             company: data.company || '',
        //             companyName: data.companyName || '',
        //             trappedLocation: data.trappedLocation || '',
        //             showroomLocation: data.showroomLocation || '',
        //             fileNumber: data.fileNumber || '',
        //             customerName: data.customerName || '',
        //             driver: data.driver || '',
        //             totalDriverDistance: data.totalDriverDistance || '',
        //             totalDriverSalary: data.totalDriverSalary || '',
        //             vehicleNumber: data.vehicleNumber || '',
        //             vehicleModel: data.vehicleModel || '',
        //             phoneNumber: data.phoneNumber || '',
        //             mobileNumber: data.mobileNumber || '',
        //             baseLocation: data.baseLocation || null,
        //             pickupLocation: data.pickupLocation || null,
        //             dropoffLocation: data.dropoffLocation || null,
        //             distance: data.distance || '',
        //             serviceType: data.serviceType || '',
        //             serviceVehicle: data.serviceVehicle || '',
        //             rcBookImageURLs: data.rcBookImageURLs || [],
        //             vehicleImageURLs: data.vehicleImageURLs || [],
        //             vehicleImgURLs: data.vehicleImgURLs || [],
        //             fuelBillImageURLs: data.fuelBillImageURLs || [],
        //             comments: data.comments || '',
        //             status: data.status || '',
        //             pickedTime: data.pickedTime || '',
        //             droppedTime: data.droppedTime || '',
        //             remark: data.remark || '',
        //             selectedDriver: data.selectedDriver || '',
        //             formAdded: data.formAdded || '',
        //             bookingChecked: data.bookingChecked || false,
        //             paymentStatus: data.paymentStatus || '',
        //             feedback: data.feedback || false,
        //             remarkWritten: data.remarkWritten || '',
        //             feedbackWritten: data.feedbackWritten || '',
        //         });
        //     }
        // } catch (error) {
        //     console.error('Error fetching data:', error);
        // }
    };

    const togglePickupDetails = () => {
        setShowPickupDetails(!showPickupDetails);
        setShowDropoffDetails(false);
    };

    const toggleDropoffDetails = () => {
        setShowDropoffDetails(!showDropoffDetails);
        setShowPickupDetails(false);
    };

    useEffect(() => {
        const fetchShowroom = async () => {
            if (!bookingDetails?.showroomLocation || !uid) return;

            // const showroomRef = collection(db, `user/${uid}/showroom`);
            // const q = query(showroomRef, where('Location', '==', bookingDetails.showroomLocation));

            // const querySnapshot = await getDocs(q);
            // if (!querySnapshot.empty) {
            //     const showroomData = querySnapshot.docs[0].data();
            //     setShowroomName(showroomData.ShowRoom || 'N/A');
            // } else {
            //     setShowroomName('N/A');
            // }
        };

        fetchShowroom();
    }, [bookingDetails?.showroomLocation, uid]);

    if (!bookingDetails) {
        return <div>Loading...</div>;
    }
    const formatTimestamp = (timestamp: Timestamp | null | undefined): string => {
        if (!timestamp) return 'N/A';

        // Convert Firestore timestamp to JavaScript Date object
        const date = timestamp.toDate();

        // Define the options for formatting
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true, // 24-hour format
        };

        // Use Intl.DateTimeFormat for proper formatting
        const formattedDate = new Intl.DateTimeFormat('en-IN', options).format(date);

        // Replace the "at" position manually since Intl.DateTimeFormat can't add it
        return formattedDate.replace(', ', ' at ');
    };
    // const handleReplaceImage = async (event: React.ChangeEvent<HTMLInputElement>, index: number, type: 'vehicleImageURLs' | 'vehicleImgURLs') => {
    //     if (event.target.files && event.target.files[0] && bookingDetails && uid && id) {
    //         const file = event.target.files[0];
    //         const fileExtension = file.name.split('.').pop(); // Get file extension
    //         const storageRef = ref(storage, `images/${file.name}-${Date.now()}.${fileExtension}`);

    //         try {
    //             // Upload the file to Firebase Storage
    //             await uploadBytes(storageRef, file);
    //             const downloadURL = await getDownloadURL(storageRef);

    //             // Update the image URL in the state
    //             const updatedURLs = [...bookingDetails[type]];
    //             updatedURLs[index] = downloadURL;

    //             // Update the Firestore document
    //             const docRef = doc(db, `user/${uid}/bookings`, id);
    //             await updateDoc(docRef, { [type]: updatedURLs });

    //             // Update the local state to reflect changes
    //             setBookingDetails((prevDetails) => {
    //                 if (!prevDetails) return null; // Handle null case
    //                 return {
    //                     ...prevDetails,
    //                     [type]: updatedURLs,
    //                 };
    //             });

    //             console.log(`${type} updated successfully at index ${index}`);
    //         } catch (error) {
    //             console.error(`Error updating ${type}:`, error);
    //         }
    //     }
    // };



    return (
        <div style={{ padding: '10px' }}>

            <div className="container mx-auto my-8 p-4 bg-white shadow rounded-lg">
                <h5 className="font-semibold text-lg mb-5">Booking Details</h5>
                <div className="flex mb-5">
                    <button onClick={togglePickupDetails} className="mr-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        {showPickupDetails ? 'Close' : 'Show Pickup Details'}
                    </button>
                    <button onClick={toggleDropoffDetails} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                        {showDropoffDetails ? 'Close' : 'Show Dropoff Details'}
                    </button>
                </div>

                {showPickupDetails && (
                    <div>
                        <h2 className="text-xl font-bold mt-5">Vehicle Images (Pickup)</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {bookingDetails?.vehicleImageURLs.map((url, index) => (
                                <div key={index}>
                                    <img
                                        src={url}
                                        alt={`Vehicle Image ${index + 1}`}
                                        className="cursor-pointer" // Make the image clickable
                                        onClick={() => handleImageClick(url)} // Open the image in the modal
                                    />
                                    {/* <input type="file" accept="image/*" onChange={(event) => handleReplaceImage(event, index, 'vehicleImageURLs')} /> */}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {showDropoffDetails && (
                    <div>
                        <h2 className="text-xl font-bold mt-5">Vehicle Images (Dropoff)</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {bookingDetails?.vehicleImgURLs.map((url, index) => (
                                <div key={index}>
                                    <img
                                        src={url}
                                        alt={`Vehicle Img ${index + 1}`}
                                        className="cursor-pointer" // Make the image clickable
                                        onClick={() => handleImageClick(url)} // Open the image in the modal
                                    />
                                    {/* <input type="file" accept="image/*" onChange={(event) => handleReplaceImage(event, index, 'vehicleImgURLs')} /> */}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal for viewing the selected image */}
                {selectedImage && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="relative">
                            <img
                                src={selectedImage}
                                alt="Selected"
                                className="max-w-full max-h-[80vh] object-contain" // Limit height to 80% of the viewport height
                            />
                            <div className="absolute top-2 right-2 flex space-x-2">
                                {/* Close Button */}
                                <button onClick={closeModal} className="bg-white text-black rounded-full p-1">
                                    X
                                </button>
                                {/* Download Button */}
                                <a href={selectedImage} download className="bg-white text-black rounded-full p-1">
                                    Download
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                <table className="w-full border-collapse mt-5">
                    <tbody>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Date & Time :</td>
                            <td className="p-2">{bookingDetails.dateTime}</td>
                        </tr>

                        {role === 'staff' && (
                            <tr>
                                <td className="bg-gray-100 p-2 font-semibold">Staff Name :</td>
                                <td className="p-2">{userName}</td>
                            </tr>
                        )}

                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Edited person :</td>
                            <td className="p-2">
                                {bookingDetails.newStatus}, {bookingDetails.editedTime}
                            </td>
                        </tr>
                        {/* ----------------------------------------------------------------- */}
                        <tr>
                            <td className="bg-gray-100 p-2 font-bold">Payable Amount by Customer/Company:</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <td
                                        className="p-2"
                                        style={{
                                            color: 'red',
                                            fontSize: '1.5rem', // Adjust size (1.5rem = larger font)
                                            fontWeight: 'bold', // Optional: to make it bold
                                        }}
                                    >
                                        {bookingDetails.updatedTotalSalary}
                                    </td>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Company :</td>
                            <td className="p-2">{bookingDetails.company}</td>
                        </tr>
                        {bookingDetails.company.toLowerCase() === 'rsa' && (
                            <tr>
                                <td className="bg-gray-100 p-2 font-semibold">Selected Company :</td>
                                <td className="p-2">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.companyName}</div>
                                </td>
                            </tr>
                        )}

                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Service Center :</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.showroomLocation}</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">File Number :</td>
                            <td className="p-2">{bookingDetails.fileNumber}</td>
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Customer Name :</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.customerName}</div>
                            </td>{' '}
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Driver :</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.driver}</div>
                            </td>{' '}
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Driver Total Distance:</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.totalDriverDistance}</div>
                            </td>{' '}
                        </tr>

                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Customer Vehicle Number :</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.vehicleNumber}</div>
                            </td>{' '}
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Brand Name :</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.vehicleModel}</div>
                            </td>{' '}
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Phone Number :</td>
                            <td className="p-2">{bookingDetails.phoneNumber}</td>
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Mobile Number :</td>
                            <td className="p-2">{bookingDetails.mobileNumber}</td>
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Start Location:</td>
                            <td className="p-2">{bookingDetails.baseLocation ? `${bookingDetails.baseLocation.name}` : 'Location not selected'}</td>
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Pickup Location:</td>
                            <td className="p-2">{bookingDetails.pickupLocation ? `${bookingDetails.pickupLocation.name}` : 'Location not selected'}</td>
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Dropoff Location :</td>
                            <td className="p-2">{bookingDetails.dropoffLocation ? `${bookingDetails.dropoffLocation.name}` : 'Location not selected'}</td>
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Distance :</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.distance}</div>
                            </td>{' '}
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Service Type :</td>
                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.serviceType}</div>
                            </td>{' '}
                        </tr>
                        <tr>
                            <td className="bg-gray-100 p-2 font-semibold">Service Vehicle Number :</td>

                            <td className="p-2">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{bookingDetails.serviceVehicle}</div>
                            </td>
                        </tr>

                        {bookingDetails.status === 'Order Completed' && (
                            <>
                                <tr>
                                    <td className="bg-gray-100 p-2 font-semibold">Pickup Time :</td>
                                    <td className="p-2">{formatTimestamp(bookingDetails?.pickedTime)}</td>
                                </tr>
                                <tr>
                                    <td className="bg-gray-100 p-2 font-semibold">Dropoff Time :</td>
                                    <td className="p-2">
                                        <td>{formatTimestamp(bookingDetails?.droppedTime)}</td>
                                    </td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
                <br />
            </div>
        </div>
    );
};

export default ViewMore;
