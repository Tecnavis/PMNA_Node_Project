import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import Swal from 'sweetalert2';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios, { AxiosError } from 'axios';
import Select, { ActionMeta, SingleValue } from 'react-select';
import statesData from './states-and-districts.json';
import styles from './showroomAdd.module.css';
import { CLOUD_IMAGE } from '../../constants/status';

const ShowroomAdd: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const id = useParams();
    const [name, setName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [showroomId, setShowroomId] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [location, setLocation] = useState<string>('');
    const [latitudeAndLongitude, setLatitudeAndLongitude] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [helpline, setHelpline] = useState<string>('');
    const [mobile, setMobile] = useState<string>('');
    const [state, setState] = useState<string>('');
    const [district, setDistrict] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [services, setServices] = useState<{
        serviceCenter: { selected: boolean; amount: number | null };
        bodyShop: { selected: boolean; amount: number | null };
        showroom: { selected: boolean };
    }>({
        serviceCenter: { selected: false, amount: null },
        bodyShop: { selected: false, amount: null },
        showroom: { selected: false },
    });

    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [districtOptions, setDistrictOptions] = useState<{ value: string; label: string }[]>([]);
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

    // handle create showroom

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validate()) {
            const formData = new FormData();

            // Append all fields
            formData.append('name', name);
            formData.append('phone', phone);
            formData.append('password', password);
            formData.append('showroomId', showroomId);
            formData.append('description', description);
            formData.append('location', location);
            formData.append('latitudeAndLongitude', latitudeAndLongitude);
            formData.append('username', username);
            formData.append('helpline', helpline);
            formData.append('mobile', mobile);
            formData.append('state', state);
            formData.append('district', district);

            // Append services as JSON string
            formData.append('services', JSON.stringify(services));

            // Append image if a new one is selected
            if (profileImage) {
                formData.append('image', profileImage);
            }

            setLoading(true);

            try {
                const response = await axios.post(`${backendUrl}/showroom`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Showroom created successfully',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                navigate('/showroom');
                // Optionally, reset the form here
            } catch (error: unknown) {
                if (error instanceof AxiosError) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error creating showroom',
                        text: error.response?.data?.message || error.message,
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                    // Error is an Axios error
                    console.error('Error creating showroom:', error.response?.data?.message || error.message);
                    setErrors(error.response?.data || {});
                } else if (error instanceof Error) {
                    // Error is a general JavaScript error
                    Swal.fire({
                        icon: 'error',
                        title: 'Error creating showroom',
                        text: error.message,
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                    console.error('Error creating showroom:', error.message);
                    setErrors({ message: error.message });
                } else {
                    // Fallback for unknown error types
                    Swal.fire({
                        icon: 'error',
                        title: 'Unexpected error',
                        text: String(error),
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                    console.error('Unexpected error:', error);
                    setErrors({ message: 'An unexpected error occurred' });
                }
            } finally {
                setLoading(false);
            }
        }
    };

    // getting showroom by id
    useEffect(() => {
        if (!uid) {
            console.error('ID is missing or invalid');
            return;
        }

        const fetchShowroomById = async () => {
            try {
                const response = await axios.get(`${backendUrl}/showroom/${uid}`);
                const data = response.data;

                // Set other fields
                setName(data.name || '');
                setPhone(data.phone || '');
                setPassword(data.password || '');
                setConfirmPassword(data.password || '');
                setImagePreview(`${CLOUD_IMAGE}${data.image}` || '');
                setShowroomId(data.showroomId || '');
                setDescription(data.description || '');
                setLocation(data.location || '');
                setLatitudeAndLongitude(data.latitudeAndLongitude || '');
                setUsername(data.username || '');
                setHelpline(data.helpline || '');
                setMobile(data.mobile || '');
                setState(data.state || '');
                setDistrict(data.district || '');
                setServices({
                    serviceCenter: {
                        selected: data.services?.serviceCenter?.selected || false,
                        amount: data.services?.serviceCenter?.amount || null,
                    },
                    bodyShop: {
                        selected: data.services?.bodyShop?.selected || false,
                        amount: data.services?.bodyShop?.amount || null,
                    },
                    showroom: {
                        selected: data.services?.showroom?.selected || false,
                    },
                });
            } catch (error) {
                console.error('Error fetching provider data:', error);
            }
        };

        fetchShowroomById();
    }, [uid]);

    // handling edit

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validate()) {
            const formData = new FormData();

            // Append all fields
            formData.append('name', name);
            formData.append('phone', phone);
            formData.append('password', password);
            formData.append('showroomId', showroomId);
            formData.append('description', description);
            formData.append('location', location);
            formData.append('latitudeAndLongitude', latitudeAndLongitude);
            formData.append('username', username);
            formData.append('helpline', helpline);
            formData.append('mobile', mobile);
            formData.append('state', state);
            formData.append('district', district);

            // Append services as JSON string
            formData.append('services', JSON.stringify(services));

            // Append image if a new one is selected
            if (profileImage) {
                formData.append('image', profileImage);
            }

            setLoading(true);

            try {
                const response = await axios.put(`${backendUrl}/showroom/${uid}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Updated showroom successfully',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                navigate('/showroom');
            } catch (error: unknown) {
                if (error instanceof AxiosError) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error updating showroom',
                        text: error.response?.data?.message || error.message,
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                    console.error('Error updating showroom:', error.response?.data?.message || error.message);
                    setErrors(error.response?.data || {});
                } else if (error instanceof Error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error updating showroom',
                        text: error.message,
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                    console.error('Error updating showroom:', error.message);
                    setErrors({ message: error.message });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Unexpected error',
                        text: String(error),
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                    console.error('Unexpected error:', error);
                    setErrors({ message: 'An unexpected error occurred' });
                }
            } finally {
                setLoading(false);
            }
        }
    };

    // validation for add or update showroom

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
        // Showrooom ID validation
        if (!showroomId.trim()) {
            formErrors.showroomId = 'Showroom ID is required';
        }
        // Location validation

        if (!location.trim()) {
            formErrors.location = 'Location required';
        }
        // Username validataion
        if (!username.trim()) {
            formErrors.username = 'Username required';
        }

        // Latitude and longitude validataion
        if (!latitudeAndLongitude.trim()) {
            formErrors.latitudeAndLongitude = 'Latitude and longitude required';
        }

        // State validataion
        if (!state.trim()) {
            formErrors.state = 'State required';
        }

        // District validataion
        if (!district.trim()) {
            formErrors.district = 'District required';
        }

        // Services validation

        if (!services.serviceCenter.selected && !services.bodyShop.selected && !services.showroom.selected) {
            formErrors.services = 'At least one service must be selected';
        }
        // Set errors
        setErrors(formErrors);

        // Return true if no errors, false if there are errors
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

    // Handle state selection
    const handleStateChange = (newValue: SingleValue<{ value: string; label: string }>, actionMeta: ActionMeta<{ value: string; label: string }>) => {
        if (newValue) {
            setState(newValue.value); // Set selected state
            setDistrict(''); // Reset district when state changes

            // Find districts for the selected state
            const selectedState = statesData.states.find((item) => item.state === newValue.value);
            if (selectedState) {
                setDistrictOptions(
                    selectedState.districts.map((district) => ({
                        value: district,
                        label: district,
                    }))
                );
            } else {
                setDistrictOptions([]);
            }
        } else {
            setState(''); // Reset state
            setDistrictOptions([]); // Clear district options
        }
    };

    // Handle district selection
    const handleDistrictChange = (newValue: SingleValue<{ value: string; label: string }>, actionMeta: ActionMeta<{ value: string; label: string }>) => {
        if (newValue) {
            setDistrict(newValue.value); // Set selected district
        } else {
            setDistrict(''); // Reset district
        }
    };

    return (
        <div>
            <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black" autoComplete="off">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h6 className="text-lg font-bold mb-5">General Information</h6>
                </div>
                <div className="flex flex-col sm:flex-row">
                    <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5">
                        <img src={imagePreview || defaultImage} alt="Profile" className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto" />
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="form-group col-span-2">
                            <label>Services</label>
                            <div>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={services.serviceCenter.selected}
                                        onChange={(e) =>
                                            setServices((prev) => ({
                                                ...prev,
                                                serviceCenter: { ...prev.serviceCenter, selected: e.target.checked },
                                            }))
                                        }
                                    />
                                    Service Center
                                </label>
                                {services.serviceCenter.selected && (
                                    <input
                                        type="number"
                                        placeholder="Enter amount"
                                        value={services.serviceCenter.amount || ''}
                                        className="form-input mb-2"
                                        autoComplete='off'
                                        onChange={(e) =>
                                            setServices((prev) => ({
                                                ...prev,
                                                serviceCenter: { ...prev.serviceCenter, amount: parseFloat(e.target.value) || null },
                                            }))
                                        }
                                    />
                                )}
                            </div>

                            <div>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={services.bodyShop.selected}
                                        onChange={(e) =>
                                            setServices((prev) => ({
                                                ...prev,
                                                bodyShop: { ...prev.bodyShop, selected: e.target.checked },
                                            }))
                                        }
                                    />
                                    Body Shop
                                </label>
                                {services.bodyShop.selected && (
                                    <input
                                        type="number"
                                        placeholder="Enter amount"
                                        className="form-input mb-2"
                                        autoComplete='off'
                                        value={services.bodyShop.amount || ''}
                                        onChange={(e) =>
                                            setServices((prev) => ({
                                                ...prev,
                                                bodyShop: { ...prev.bodyShop, amount: parseFloat(e.target.value) || null },
                                            }))
                                        }
                                    />
                                )}
                            </div>

                            <div>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={services.showroom.selected}
                                        onChange={(e) =>
                                            setServices((prev) => ({
                                                ...prev,
                                                showroom: { ...prev.showroom, selected: e.target.checked },
                                            }))
                                        }
                                    />
                                    Showroom
                                </label>
                            </div>
                            {errors.services && <p className="text-red-500">{errors.services}</p>}
                        </div>

                        <div>
                            <label htmlFor="name">Name</label>
                            <input id="name" type="text" autoComplete='off' placeholder="Enter Name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                            {errors.name && <p className="text-red-500">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="phone">Phone</label>
                            <input id="phone" type="tel" autoComplete='off' placeholder="Enter Phone Number" className="form-input" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} />
                            {errors.phone_number && <p className="text-red-500">{errors.phone_number}</p>}
                        </div>
                        <div className={styles.container}>
                            <label htmlFor="location">Location</label>
                            <div className={styles.inputContainer}>
                                <input
                                    id="serviceName"
                                    type="text"
                                    autoComplete='off'
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className={styles.input}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                />
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                    Search
                                </a>
                            </div>
                            {errors.location && <p className="text-red-500">{errors.location}</p>}
                        </div>
                        <div>
                            <label htmlFor="latitudeAndLongitude">Latitude and Longitude</label>
                            <input
                                id="latitudeAndLongitude"
                                type="text"
                                placeholder="Enter Latitude and longitude"
                                className="form-input"
                                autoComplete='off'
                                value={latitudeAndLongitude}
                                onChange={(e) => setLatitudeAndLongitude(e.target.value)}
                            />
                            {errors.latitudeAndLongitude && <p className="text-red-500">{errors.latitudeAndLongitude}</p>}
                        </div>
                        <div>
                            <label htmlFor="showroomId">Showroom ID</label>
                            <input id="showroomId" autoComplete='off' type="text" placeholder="Enter Showroom ID" className="form-input" value={showroomId} onChange={(e) => setShowroomId(e.target.value)} />
                            {errors.showroomId && <p className="text-red-500">{errors.showroomId}</p>}
                        </div>

                        <div>
                            <label htmlFor="username">Username</label>
                            <input id="username" type="text" autoComplete='off' placeholder="Enter Username" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} />
                            {errors.username && <p className="text-red-500">{errors.username}</p>}
                        </div>
                        <div>
                            <label htmlFor="helpline">Helpline</label>
                            <input id="helpline" type="text" placeholder="Enter Helpline" className="form-input" value={helpline} onChange={(e) => setHelpline(e.target.value)} />
                            {/* {errors.phone_number && <p className="text-red-500">{errors.phone_number}</p>} */}
                        </div>
                        <div>
                            <label htmlFor="mobile">Mobile number</label>
                            <input maxLength={10}  id="helpline" type="text" placeholder="Enter Mobile number" className="form-input" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                            {/* {errors.phone_number && <p className="text-red-500">{errors.phone_number}</p>} */}
                        </div>
                        <div>
                            <label htmlFor="state">State</label>
                            <Select
                                id="state"
                                options={statesData.states.map((item) => ({
                                    value: item.state,
                                    label: item.state,
                                }))}
                                onChange={handleStateChange}
                                value={state ? { value: state, label: state } : null}
                                placeholder="Select State"
                            />{' '}
                            {errors.state && <p className="text-red-500">{errors.state}</p>}
                        </div>
                        <div>
                            <label htmlFor="district">District</label>
                            <Select
                                id="district"
                                options={districtOptions}
                                onChange={handleDistrictChange}
                                value={district ? { value: district, label: district } : null}
                                placeholder="Select District"
                                isDisabled={!state} // Disable if no state is selected
                            />{' '}
                            {errors.district && <p className="text-red-500">{errors.district}</p>}
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

                        <div>
                            <label htmlFor="profileImage">Profile Image</label>
                            <input id="profileImage" type="file" accept=".jpg, .jpeg, .png" onChange={handleImageChange} className="form-input" />
                        </div>

                        <div>
                            <label htmlFor="description">Description</label>
                            <textarea id="description" placeholder="Description" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
                            {/* {errors.phone_number && <p className="text-red-500">{errors.phone_number}</p>} */}
                        </div>

                        <div className="sm:col-span-2 mt-3">
                            {uid ? (
                                <button type="button" className="btn btn-info mt-5" onClick={handleUpdate}>
                                    Update
                                </button>
                            ) : (
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

export default ShowroomAdd;
