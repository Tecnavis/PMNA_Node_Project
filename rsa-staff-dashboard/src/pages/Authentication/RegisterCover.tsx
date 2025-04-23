import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { BASE_URL, axiosInstance } from '../../config/axiosConfig';
import IconUser from '../../components/Icon/IconUser';

interface ShowRoomDetailsType {
    id: string;
    name: string;
    location: string;
    image: string;
    helpline: string;
    phone: string;
    state: string;
    district: string;
}

interface SignupData {
    name: string,
    phone: string,
    designation: string,
    whatsappNumber: string
}

interface SigninData {
    phone: string,
}

const RegisterCover = () => {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [registeringData, setRegisteringData] = useState({});
    const [isSignIn, setIsSignIn] = useState(true);
    const [showRoomDetails, setShowRoomDetails] = useState<ShowRoomDetailsType>({
        id: '',
        name: '',
        location: '',
        image: '',
        helpline: '',
        phone: '',
        state: '',
        district: '',
    });
    const [formData, setFormData] = useState<SignupData>({
        name: '',
        phone: '',
        designation: '',
        whatsappNumber: '',
    });
    const [signupErrors, setSignupErrors] = useState<SignupData>({
        name: '',
        phone: '',
        designation: '',
        whatsappNumber: '',
    });
    const [signInData, setSignInData] = useState<SigninData>({ phone: '' });

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        setShowRoomDetails({
            id: queryParams.get('id') || '',
            name: queryParams.get('name') || '',
            location: queryParams.get('location') || '',
            image: queryParams.get('image') || '',
            helpline: queryParams.get('helpline') || '',
            phone: queryParams.get('phone') || '',
            state: queryParams.get('state') || '',
            district: queryParams.get('district') || '',
        });
    }, [location.search]);

    const validateForm = () => {
        const errors: SignupData = { name: '', phone: '', designation: '', whatsappNumber: '' };
        let isValid = true;

        if (!formData.name.trim()) {
            errors.name = "Name is required.";
            isValid = false;
        }

        if (!formData.phone.trim()) {
            errors.phone = "Phone number is required.";
            isValid = false;
        } else if (!/^\d{10}$/.test(formData.phone)) {
            errors.phone = "Invalid phone number format.";
            isValid = false;
        }

        if (!formData.designation.trim()) {
            errors.designation = "Designation is required.";
            isValid = false;
        }

        if (!formData.whatsappNumber.trim()) {
            errors.whatsappNumber = "WhatsApp number is required.";
            isValid = false;
        }

        if (formData.whatsappNumber && !/^\d{10}$/.test(formData.whatsappNumber)) {
            errors.designation = "Invalid WhatsApp number format.";
            isValid = false;
        }

        setSignupErrors(errors);
        return isValid;
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSignInFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSignInData({
            ...signInData,
            [e.target.name]: e.target.value,
        });
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            const res = await axiosInstance.post(`${BASE_URL}showroom/staff-signup`, {
                ...formData,
                showroomId: showRoomDetails.id
            });

            Swal.fire({
                icon: 'success',
                title: 'Registration successful. Please login.',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            setIsSignIn(!isSignIn)
        } catch (error: any) {
            if (error?.response?.data?.message) {
                setSignupErrors((prevErrors) => ({
                    ...prevErrors,
                    phone: error.response.data.message.includes("User with this phone number already exists.")
                        ? "User with this phone number already exists."
                        : prevErrors.phone,
                }));
            }

            Swal.fire({
                icon: 'error',
                title: 'An error occurred during sign-up.',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        }
    }

    const handleSignInSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null)
        if (!signInData.phone.trim()) {
            setErrorMessage("Phone number is required.")
            return
        } else if (!/^\d{10}$/.test(signInData.phone)) {
            setErrorMessage("Invalid phone number format.")
            return
        }

        try {
            const res = await axiosInstance.post(`${BASE_URL}showroom/staff-signin`, {
                phoneNumber: signInData.phone,
                showroom: showRoomDetails.id
            })
            Swal.fire({
                icon: 'success',
                title: 'Login successfull',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            localStorage.setItem('token', res.data.token)
            localStorage.setItem('role', res.data.role)
            localStorage.setItem('showroomIcon', showRoomDetails.image)
            localStorage.setItem('showroomId', showRoomDetails.id)
            localStorage.setItem('name', res.data.name)

            navigate('/bookings')
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'registeration failed',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        }
    };

    useEffect(() => {
        if (!showRoomDetails?.id) {
            Swal.fire({
                icon: 'warning',
                title: 'Please scan Showroom QR then login.',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                width: '100%',
                customClass: {
                    popup: 'swal-popup',
                    title: 'swal-title'
                },
            });
        }
    }, [showRoomDetails?.id]);

    return (
        <div className="relative min-h-screen">
            {/* Background Elements */}
            <div className="absolute inset-0">
                <img src="/assets/images/auth/bg-gradient.png" alt="background" className="h-full w-full object-cover" />
            </div>

            <div className={`relative flex min-h-screen items-center justify-center bg-[url(/assets/images/auth/map.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16`}>
                <img src="/assets/images/auth/coming-soon-object1.png" alt="decoration" className="absolute left-0 top-1/2 h-full max-h-[893px] -translate-y-1/2" />
                <img src="/assets/images/auth/coming-soon-object3.png" alt="decoration" className="absolute right-0 top-0 h-[300px]" />
                <img src="/assets/images/auth/polygon-object.svg" alt="decoration" className="absolute bottom-0 end-[28%]" />

                {/* Main Content Container */}
                <div className="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 lg:min-h-[758px] lg:flex-row lg:gap-10 xl:gap-0">
                    {/* Showroom Details Panel */}
                    <div className="relative hidden w-full items-start justify-start p-5 lg:inline-flex lg:max-w-[1090px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]"
                        style={{ background: 'linear-gradient(225deg, rgba(255, 255, 255, 1) 0%, rgba(255, 0, 0, 1) 100%)' }}>

                        <div className="absolute inset-y-0 w-16 from-primary/10 via-transparent to-transparent ltr:-right-10 ltr:bg-gradient-to-r rtl:-left-10 rtl:bg-gradient-to-l xl:w-16 ltr:xl:-right-20 rtl:xl:-left-20"></div>

                        <div className="ltr:xl:-skew-x-[14deg] rtl:xl:skew-x-[14deg] w-full mt-10">
                            <div className='flex flex-col items-center justify-center w-full ml-12'>
                                {/* Showroom Name */}
                                <h1 className='text-center text-4xl text-danger font-bold mb-4'>
                                    {showRoomDetails.name}
                                </h1>

                                {/* Showroom Image */}
                                <div className="mt-5 w-full max-w-[445px]">
                                    <img
                                        src={`${BASE_URL}/images/${showRoomDetails.image}`}
                                        alt="Showroom"
                                        className="w-full  rounded-md shadow-lg border-4  object-fill"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = 'https://via.placeholder.com/445x300?text=Showroom+Image';
                                        }}
                                    />
                                </div>

                                {/* Showroom Info */}
                                <div className='mt-8 w-full max-w-[449px] space-y-4'>
                                    <div className="bg-white/90 rounded-lg p-4 shadow-md">
                                        <div className="flex items-center gap-3">
                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Location</p>
                                                <p className="text-lg font-semibold text-gray-900">{showRoomDetails.location}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/90 rounded-lg p-4 shadow-md">
                                        <div className="flex items-center gap-3">
                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Help Line</p>
                                                <p className="text-lg font-semibold text-gray-900">{showRoomDetails.helpline}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/90 rounded-lg p-4 shadow-md">
                                        <div className="flex items-center gap-3">
                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Phone Number</p>
                                                <p className="text-lg font-semibold text-gray-900">{showRoomDetails.phone}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/90 rounded-lg p-4 shadow-md">
                                        <div className="flex items-center gap-3">
                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">State</p>
                                                <p className="text-lg font-semibold text-gray-900">{showRoomDetails.state}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Auth Form Panel */}
                    <div className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16  sm:px-6 lg:max-w-[667px]">
                        <div className="w-full max-w-[440px] lg:mt-10">

                            <div className="mb-10">
                                <h1 className="text-3xl font-extrabold uppercase !leading-snug text-danger md:text-4xl">
                                    {isSignIn ? 'Sign In' : 'Sign Up'}
                                </h1>
                                <p className="text-base font-bold leading-normal text-white-dark">
                                    {isSignIn ? 'Enter your phone number to login' : 'Enter your details to register'}
                                </p>
                            </div>

                            {isSignIn ? (
                                <form className="space-y-5 dark:text-white" onSubmit={handleSignInSubmit}>
                                    <div>
                                        <label htmlFor="phone">Phone Number</label>
                                        <div className="relative text-white-dark">
                                            <input
                                                id="phone"
                                                type="text"
                                                name="phone"
                                                placeholder="Enter Phone Number"
                                                className="form-input ps-10 placeholder:text-white-dark"
                                                value={signInData.phone}
                                                onChange={handleSignInFormChange}
                                                maxLength={10}
                                            />
                                            <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                                <IconUser />
                                            </span>
                                        </div>
                                        {errorMessage && <p className="text-red-600">{errorMessage}</p>}
                                    </div>
                                    <button
                                        type="submit"
                                        className="btn !mt-6 w-full border-0 uppercase text-white shadow-[0_10px_20px_-10px_rgba(255, 0, 0, 0.44)]"
                                        style={{
                                            background: 'linear-gradient(2deg, rgba(255, 255, 255, 1) 0%, rgba(255, 0, 0, 1) 100%)',
                                        }}
                                    >
                                        Sign In
                                    </button>
                                </form>
                            ) : (
                                <form className="space-y-5 dark:text-white" onSubmit={handleFormSubmit}>
                                    <div>
                                        <label htmlFor="name">Full Name</label>
                                        <div className="relative text-white-dark">
                                            <input
                                                id="name"
                                                type="text"
                                                name="name"
                                                placeholder="Enter Full Name"
                                                className="form-input ps-10 placeholder:text-white-dark"
                                                value={formData.name}
                                                onChange={handleFormChange}
                                            />
                                            <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                                <IconUser fill={true} />
                                            </span>
                                        </div>
                                        {signupErrors.name && <p className="text-red-600">{signupErrors.name}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="phone">Phone Number</label>
                                        <div className="relative text-white-dark">
                                            <input
                                                id="phone"
                                                type="text"
                                                name="phone"
                                                placeholder="Enter Phone Number"
                                                className="form-input ps-10 placeholder:text-white-dark"
                                                value={formData.phone}
                                                onChange={handleFormChange}
                                                maxLength={10}
                                            />
                                            <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                                <IconUser fill={true} />
                                            </span>
                                        </div>
                                        {signupErrors.phone && <p className="text-red-600">{signupErrors.phone}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="designation">Designation</label>
                                        <div className="relative text-white-dark">
                                            <input
                                                id="designation"
                                                type="text"
                                                name="designation"
                                                placeholder="Enter Designation"
                                                className="form-input ps-10 placeholder:text-white-dark"
                                                value={formData.designation}
                                                onChange={handleFormChange}
                                            />
                                            <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                                <IconUser fill={true} />
                                            </span>
                                        </div>
                                        {signupErrors.designation && <p className="text-red-600">{signupErrors.designation}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="whatsappNumber">WhatsApp Number</label>
                                        <div className="relative text-white-dark">
                                            <input
                                                id="whatsappNumber"
                                                type="text"
                                                name="whatsappNumber"
                                                placeholder="Enter WhatsApp Number"
                                                className="form-input ps-10 placeholder:text-white-dark"
                                                value={formData.whatsappNumber}
                                                onChange={handleFormChange}
                                                maxLength={10}
                                            />
                                            <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                                <IconUser fill={true} />
                                            </span>
                                        </div>
                                        {signupErrors.whatsappNumber && <p className="text-red-600">{signupErrors.whatsappNumber}</p>}
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn !mt-6 w-full border-0 uppercase text-white shadow-[0_10px_20px_-10px_rgba(255, 0, 0, 0.44)]"
                                        style={{
                                            background: 'linear-gradient(2deg, rgba(255, 255, 255, 1) 0%, rgba(255, 0, 0, 1) 100%)',
                                        }}
                                    >
                                        Sign Up
                                    </button>
                                </form>
                            )}

                            <div className="text-center dark:text-white mt-4">
                                {isSignIn ? (
                                    <>
                                        Don't have an account?&nbsp;
                                        <button
                                            onClick={() => setIsSignIn(false)}
                                            className="uppercase text-primary underline transition hover:text-black dark:hover:text-white cursor-pointer"
                                        >
                                            SIGN UP
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?&nbsp;
                                        <button
                                            onClick={() => setIsSignIn(true)}
                                            className="uppercase text-primary underline transition hover:text-black dark:hover:text-white cursor-pointer"
                                        >
                                            SIGN IN
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <p className="absolute bottom-6 w-full text-center dark:text-white">© {new Date().getFullYear()}.Tecnavis All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterCover;