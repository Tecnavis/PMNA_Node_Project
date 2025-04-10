import React, { useEffect, useState, ChangeEvent } from 'react';
import { addDoc, collection,  getDoc, doc, Timestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore'; // Import getFirestore
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import Header from '../../components/Layouts/Header';

interface FormData {
    fileNumber: string;
    customerName: string;
    phoneNumber: string;
    serviceCategory: string;
    vehicleNumber: string;
    comments: string;
   
}

const AddBook: React.FC = () => {
    const showroomId = localStorage.getItem('showroomId');
    console.log("first", showroomId);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

    const [formData, setFormData] = useState<FormData>({
        fileNumber: '',
        customerName: '',
        phoneNumber: '',
        serviceCategory: '',
        vehicleNumber: '',
        comments: '',
      
    });

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const uid = import.meta.env.VITE_REACT_APP_UID;
    const db = getFirestore();
    const navigate = useNavigate();
    const [bookingId, setBookingId] = useState<string>('');
    const [showroomData, setShowroomData] = useState<any>(null);

    useEffect(() => {
        const newBookingId = uuid().substring(0, 4);
        setBookingId(newBookingId);
    }, []);

    useEffect(() => {
        const fetchShowroomData = async () => {
            try {
                const showroomDocRef = doc(db, `user/${uid}/showroom`, showroomId!);
                const showroomDocSnap = await getDoc(showroomDocRef);
                if (showroomDocSnap.exists()) {
                    const data = showroomDocSnap.data();
                    console.log('Showroom Data:', data);
                    setShowroomData(data);

                    if (data.showroomId) {
                        const updatedFileNumber = `${data.showroomId}${bookingId}`;
                        console.log("updatedFileNumber",updatedFileNumber)
                        setFormData(prevFormData => ({
                            ...prevFormData,
                            fileNumber: updatedFileNumber,
                        }));
                        console.log('Updated File Number:', updatedFileNumber);
                    }
                } else {
                    console.log('Showroom document does not exist');
                }
            } catch (error) {
                console.error('Error fetching showroom data:', error);
            }
        };

        fetchShowroomData();
    }, [showroomId, db, bookingId, uid]);

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prevFormData => ({
            ...prevFormData,
            [field]: value,
        }));
    };

    const formatDate = (date: Date): string => {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
            const year = date.getFullYear();
            const hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
    
            return `${day}/${month}/${year}, ${formattedHours}:${minutes}:${seconds} ${ampm}`;
        };

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

    const validateForm = (): boolean => {
        const { customerName, phoneNumber, serviceCategory, vehicleNumber } = formData;
        return !!(customerName && phoneNumber && serviceCategory && vehicleNumber);
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setError('Please fill in all required fields.');
            return;
        }
    
        setLoading(true);
        setError(null);
    
        try {
    
            // Create the dropoffLocation object
            const dropoffLocation = {
                lat: showroomData?.locationLatLng?.lat || 0,  // Use fallback if lat is undefined
                lng: showroomData?.locationLatLng?.lng || 0,  // Use fallback if lng is undefined
                name: showroomData?.Location || 'Default Showroom Name', // Adjusted to use showroom name
            };
    
            const docRef = await addDoc(collection(db, `user/${uid}/bookings`), {
                ...formData,
                showroomId: showroomId,
                dateTime: formatDate(new Date()), // Ensure correct date format
                createdAt: Timestamp.now(),
                bookingStatus: 'ShowRoom Booking',
                bookingEdit: true,

                status: 'booking added',
                bookingId: bookingId,
                // company: 'rsa',
                createdBy:'showroom',
                dropoffLocation: dropoffLocation,
                showroomLocation: dropoffLocation.name,
            });
    
            console.log('Document added successfully with ID:', docRef.id);
    
            // Reset form data
            setFormData({
                fileNumber: '',
                customerName: '',
                phoneNumber: '',
                vehicleNumber: '',
                serviceCategory: '',
                comments: '',
            });
    
            navigate('/showrm');
        } catch (error) {
            console.error('Error adding document: ', error);
            setError('Failed to add booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };
  
    return (
   
          
            
            <div style={{ padding: '1.5rem', flex: 1, marginTop: '1rem', margin: '2rem auto', maxWidth: '800px', boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)', borderRadius: '10px', backgroundColor: 'rgba(246, 213, 211, 0.2)' }}>
                             <h5 className="font-semibold text-lg p-4" style={{ marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>Add Bookings</h5>
                <div style={{ padding: '1rem' }}><h2 className="text-center text-lg font-medium text-gray-600  italic">
  {currentDateTime}
</h2>
                    {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
                    <div className="mb-4" style={{ marginBottom: '20px', fontFamily: 'Arial, sans-serif', color: '#333', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                        <strong style={{ fontWeight: 'bold', color: '#007bff', fontSize: '16px' }}>Booking ID: </strong>
                        <span style={{ fontSize: '16px', color: '#333' }}>{bookingId}</span>
                    </div>

                    <div className="mt-4 flex items-center" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="fileNumber" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>File Number</label>
                        <input
                            id="fileNumber"
                            type="text"
                            name="fileNumber"
                            className="form-input flex-1"
                            placeholder="Enter File Number"
                            value={formData.fileNumber}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('fileNumber', e.target.value)}
                            readOnly
                        />
                    </div>
                    <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="serviceCategory" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Vehicle Section</label>
                        <select
                            id="serviceCategory"
                            name="serviceCategory"
                            className="form-select flex-1"
                            value={formData.serviceCategory}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleInputChange('serviceCategory', e.target.value)}
                        >
                            <option value="">Select Service Section</option>
                            <option value="Service Center">Service Center</option>
                            <option value="Body Shop">Body Shopes</option>
                            <option value="ShowRooms">ShowRooms</option>

                        </select>
                    </div>
                    <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="customerName" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Customer Name</label>
                        <input
                            id="customerName"
                            type="text"
                            name="customerName"
                            className="form-input flex-1"
                            placeholder="Enter Customer Name"
                            value={formData.customerName}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('customerName', e.target.value)}
                        />
                    </div>
                    <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="phoneNumber" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Phone Number</label>
                        <input
                            id="phoneNumber"
                            type="text"
                            name="phoneNumber"
                            className="form-input flex-1"
                            placeholder="Enter Phone Number"
                            value={formData.phoneNumber}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('phoneNumber', e.target.value)}
                        />
                    </div>
                    <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="vehicleNumber" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Vehicle Number</label>
                        <input
                            id="vehicleNumber"
                            type="text"
                            name="vehicleNumber"
                            className="form-input flex-1"
                            placeholder="Enter Vehicle Number"
                            value={formData.vehicleNumber}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('vehicleNumber', e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="comments" className="w-1/3 mb-0" style={{ marginRight: '1rem' }}>Comments</label>
                        <textarea
                            id="comments"
                            name="comments"
                            className="form-textarea flex-1"
                            placeholder="Enter Comments"
                            value={formData.comments}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange('comments', e.target.value)}
                        />
                    </div>

                    <div className="mt-4 flex justify-center" style={{ marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={handleSubmit}
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
            </div>
    
    );
};

export default AddBook;
// ------------------------------------
