import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import Swal from 'sweetalert2';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios, { AxiosError } from 'axios';
import styles from './driverAdd.module.css';
import { CLOUD_IMAGE } from '../../constants/status';


interface ServiceType {
    _id: string;
    serviceName: string;
    firstKilometer: string;
    additionalAmount: string;
    firstKilometerAmount: string;
    expensePerKm: string;
}



const DriverAdd: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const id = useParams();
    const [name, setName] = useState<string>('');
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; name: string; overRideCharge: string; kmForBasicAmount: string; basicAmount: string; vehicleNumber: string }[]>([]);
    const [idNumber, setIdNumber] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [personalPhoneNumber, setPersonalPhoneNumber] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');

    const uid = id.id;


    // check the page for token and redirect

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token  found in localStorage');
        } else {
            navigate('/auth/boxed-signin');
            console.log('Token not found in localStorage');
        }
    }, []);



    // getting service types

    const fetchServiceTypes = async () => {
        try {
            const response = await axios.get(`${backendUrl}/servicetype`);
            setServiceTypes(response.data);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    // hadling the table for the choose

    const handleServiceTypeToggle = (serviceType: ServiceType) => {
        setSelectedVehicle((prev) => {
            const isSelected = prev.find((item) => item.id === serviceType._id);
            if (isSelected) {
                // If already selected, remove it
                return prev.filter((item) => item.id !== serviceType._id);
            } else {
                // If not selected, add it
                return [
                    ...prev,
                    {
                        id: serviceType._id,
                        name: serviceType.serviceName,
                        overRideCharge: '',
                        kmForBasicAmount: '',
                        basicAmount: '',
                        vehicleNumber: '',
                    },
                ];
            }
        });
    };

    // handling the service

    const handleTableInputChange = (id: string, field: string, value: string) => {
        setSelectedVehicle((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          [field]: value,
                      }
                    : item
            )
        );
    };

    // handle create driver

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validate()) {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('idNumber', idNumber);
            formData.append('phone', phone);
            formData.append('personalPhoneNumber', personalPhoneNumber);
            formData.append('password', password);
            formData.append('vehicle', JSON.stringify(selectedVehicle));
            if (profileImage) {
                formData.append('image', profileImage);
            }

            setLoading(true);

            try {
                const response = await axios.post(`${backendUrl}/driver`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Driver created successfully',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                navigate('/users/driver');
            } catch (error: unknown) {
                if (error instanceof AxiosError) {
                    console.error('Error creating driver:', error.response?.data?.message || error.message);
                    setErrors(error.response?.data || {});
                } else if (error instanceof Error) {
                    console.error('Error creating driver:', error.message);
                    setErrors({ message: error.message });
                } else {
                    // Fallback for unknown error types
                    console.error('Unexpected error:', error);
                    setErrors({ message: 'An unexpected error occurred' });
                }
            } finally {
                setLoading(false);
            }
        }
    };


// getting driver by id 
useEffect(() => {
    if (!uid) {
        console.error('ID is missing or invalid');
        return;
    }

    const fetchDriverById = async () => {
        try {
            const response = await axios.get(`${backendUrl}/driver/${uid}`);
            const data = response.data;

            console.log('response data', data);

            // Set other fields
            setName(data.name || '');
            setIdNumber(data.idNumber || '');
            setPhone(data.phone || '');
            setPersonalPhoneNumber(data.personalPhoneNumber || '');
            setPassword(data.password || '');
            setConfirmPassword(data.password || '');
            setImagePreview(`${CLOUD_IMAGE}${data.image}` || '');

            // Transform serviceDetails and set selectedServiceTypes
            if (data.vehicle?.length) {
                const formattedServiceDetails = data.vehicle.map((service : any) => ({
                    id: service.serviceType._id,
                    name: service.serviceType?.serviceName || 'Unknown',
                    overRideCharge: service.overRideCharge.toString(),
                    kmForBasicAmount: service.kmForBasicAmount.toString(),
                    basicAmount: service.basicAmount.toString(),
                    vehicleNumber: service.vehicleNumber,
                }));
                setSelectedVehicle(formattedServiceDetails);
            }
        } catch (error) {
            console.error('Error fetching driver data:', error);
        }
    };

    fetchDriverById();
}, [uid]);


   

    // handling edit


    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validate()) {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('idNumber', idNumber);
            formData.append('phone', phone);
            formData.append('personalPhoneNumber', personalPhoneNumber);
            formData.append('password', password);
            formData.append('vehicle', JSON.stringify(selectedVehicle));
            if (profileImage) {
                formData.append('image', profileImage);
            }

            setLoading(true);

            try {
                const response = await axios.put(`${backendUrl}/driver/${uid}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Updated driver successfully',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                navigate('/users/driver');
            } catch (error: unknown) {
                if (error instanceof AxiosError) {
                    console.error('Error creating driver:', error.response?.data?.message || error.message);
                    setErrors(error.response?.data || {});
                } else if (error instanceof Error) {
                    console.error('Error creating driver:', error.message);
                    setErrors({ message: error.message });
                } else {
                    console.error('Unexpected error:', error);
                    setErrors({ message: 'An unexpected error occurred' });
                }
            } finally {
                setLoading(false);
            }
        }
    };


    // validation for add or update driver

    const validate = (): boolean => {
        let formErrors: Record<string, string> = {};

        // Name validation
        if (!name.trim()) {
            formErrors.name = 'Name is required';
        } else if (name.length < 3) {
            formErrors.name = 'Name must be at least 3 characters';
        }

        // Phone number validation (Indian format)
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phone.trim()) {
            formErrors.phone_number = 'Phone number is required';
        } else if (!phoneRegex.test(phone)) {
            formErrors.phone_number = 'Enter a valid 10-digit Indian phone number';
        }

        // Password validation
        if (!password.trim()) {
            formErrors.password = 'Password is required';
        } else if (password.length < 4) {
            formErrors.password = 'Password must be at least 4 characters';
        }

        // Confirm password validation
        if (password !== confirmPassword) {
            formErrors.confirmPassword = 'Password and confirm password do not match';
        }

       

        // Service types validation
        if (!selectedVehicle || selectedVehicle.length === 0) {
            formErrors.selectedServiceTypes = 'Select at least one service';
        }

        // Validation for each selected service type
        selectedVehicle.forEach((service) => {
            if (service.kmForBasicAmount === '') {
                formErrors[`kmForBasicAmount_${service.id}`] = `Enter distance for ${service.name}`;
            }
            if (service.basicAmount === '') {
                formErrors[`basicAmount_${service.id}`] = `Enter basic amount for ${service.name}`;
            }
            if (service.overRideCharge === '') {
                formErrors[`overRideCharge_${service.id}`] = `Enter override charge for ${service.name}`;
            }
        });

        setErrors(formErrors);

        return Object.keys(formErrors).length === 0;
    };

    // handling profile image

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const file = e.target.files?.[0];
        if (file) {
            setProfileImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };


    useEffect(() => {
        fetchServiceTypes();
    }, []);
    return (
        <div>
                <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h6 className="text-lg font-bold mb-5">General Information</h6>
                    </div>
                    <div className="flex flex-col sm:flex-row">
                        <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5">
                            <img src={imagePreview || defaultImage} alt="Profile" className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label htmlFor="name">Name</label>
                                <input id="name" type="text" placeholder="Enter Name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                                {errors.name && <p className="text-red-500">{errors.name}</p>}
                            </div>
                          


                            <div>
                                <label htmlFor="idNumber">ID Number</label>
                                <input id="idNumber" type="text" placeholder="Enter ID Number" className="form-input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                            </div>
                          

                            <div>
                                <label htmlFor="phone">Phone</label>
                                <input id="phone" type="tel" placeholder="Enter Phone Number" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                {errors.phone_number && <p className="text-red-500">{errors.phone_number}</p>}
                            </div>
                            <div>
                                <label htmlFor="personalPhoneNumber">Personal Phone Number</label>
                                <input
                                    id="personalPhoneNumber"
                                    type="tel"
                                    placeholder="Enter Personal Phone Number"
                                    className="form-input"
                                    value={personalPhoneNumber}
                                    onChange={(e) => setPersonalPhoneNumber(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor="profileImage">Profile Image</label>
                                <input id="profileImage" type="file" accept=".jpg, .jpeg, .png" onChange={handleImageChange} className="form-input" />
                            </div>

                            <div>
                                <label htmlFor="password">Password </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="password"
                                        className="form-input pr-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <span className="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                                {errors.password && <p className="text-red-500">{errors.password}</p>}
                            </div>
                            <div>
                                <label htmlFor="confirmPassword">Confirm password </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Confirm Password"
                                        className="form-input pr-10"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <span className="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                                {errors.confirmPassword && <p className="text-red-500">{errors.confirmPassword}</p>}
                            </div>

                            <div className="sm:col-span-2 mt-3">
                                <div>
                                    <h6 className="text-md font-bold mb-3">Choose Service Types</h6>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {serviceTypes.map((type) => (
                                            <label key={type._id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    value={type._id}
                                                    onChange={() => handleServiceTypeToggle(type)}
                                                    checked={selectedVehicle.some((item) => item.id === type._id)}
                                                />
                                                <span>{type.serviceName.charAt(0).toUpperCase() + type.serviceName.slice(1)}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.selectedServiceTypes && <p className="text-red-500">{errors.selectedServiceTypes}</p>}
                                </div>

                                {selectedVehicle.length > 0 && (
                                    <div className="mt-5 overflow-x-auto">
                                        <h6 className="text-lg font-bold mb-5">Service Details</h6>
                                        <table className="table-auto border-collapse border border-gray-300 w-full">
                                            <thead>
                                                <tr>
                                                    <th className="p-2 text-sm">Service Type</th>
                                                    <th className="p-2 text-sm">Km for Basic Amount (KM)</th>
                                                    <th className="p-2 text-sm">Basic Amount</th>
                                                    <th className="p-2 text-sm">Override Charge</th>
                                                    <th className="p-2 text-sm">Vehicle Number</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedVehicle.map((service) => (
                                                    <tr key={service.id}>
                                                        <td className="p-2 text-sm">{service.name.charAt(0).toUpperCase() + service.name.slice(1)}</td>
                                                        <td className="p-2 text-sm">
                                                            <input
                                                                type="number"
                                                                className={`${styles.formInput} form-input w-full`}
                                                                value={service.kmForBasicAmount}
                                                                onChange={(e) => handleTableInputChange(service.id, 'kmForBasicAmount', e.target.value)}
                                                            />
                                                            {service.kmForBasicAmount === '' && <div className="text-red-500 text-xs mt-1">Please enter the distance</div>}
                                                        </td>
                                                        <td className="p-2 text-sm">
                                                            <input
                                                                type="number"
                                                                className={`${styles.formInput} form-input w-full`}
                                                                value={service.basicAmount}
                                                                onChange={(e) => handleTableInputChange(service.id, 'basicAmount', e.target.value)}
                                                            />
                                                            {service.basicAmount === '' && <div className="text-red-500 text-xs mt-1">Please enter the amount</div>}
                                                        </td>
                                                        <td className="p-2 text-sm">
                                                            <input
                                                                type="number"
                                                                className={`${styles.formInput} form-input w-full`}
                                                                value={service.overRideCharge}
                                                                onChange={(e) => handleTableInputChange(service.id, 'overRideCharge', e.target.value)}
                                                            />
                                                            {service.overRideCharge === '' && <div className="text-red-500 text-xs mt-1">Please enter the charge</div>}
                                                        </td>
                                                        <td className="p-2 text-sm">
                                                            <input
                                                                type="text"
                                                                className={`${styles.formInput} form-input w-full`}
                                                                value={service.vehicleNumber}
                                                                onChange={(e) => handleTableInputChange(service.id, 'vehicleNumber', e.target.value)}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
{uid ? (
       <button type="button" className="btn btn-info mt-5" onClick={handleUpdate}>
       Update
   </button>
):(
    <button type="button" className="btn btn-success mt-5" onClick={handleSubmit}>
    Save
</button>
)}
                            </div>
                        </div>
                    </div>
                </form>
            
        </div>
    );
};

export default DriverAdd;
