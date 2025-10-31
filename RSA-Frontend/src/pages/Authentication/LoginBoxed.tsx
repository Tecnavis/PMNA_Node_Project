import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './loginBoxed.module.css';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconMail from '../../components/Icon/IconMail';
import IconLockDots from '../../components/Icon/IconLockDots';
import IconUser from '../../components/Icon/IconUser';
import IconUsers from '../../components/Icon/IconUsers';
import Swal from 'sweetalert2';
import { IoMdEyeOff } from "react-icons/io";
import { IoMdEye } from "react-icons/io";

const LoginBoxed = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [role, setRole] = useState<string | null>(null); // Role selector (null, admin, or staff)
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [credentials, setCredentials] = useState({ userName: '', email: '', password: '' });
    const [errorMessage, setErrorMessage] = useState('');
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    // Set page title
    useEffect(() => {
        dispatch(setPageTitle('Login Boxed'));
    }, [dispatch]);

    // cheking for token

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token  found in localStorage');
            navigate('/');
        } else {
            console.log('Token not found in localStorage');
        }
    }, []);

    // handlechange for the inputs 

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    // selecting  role for the log-in 

    const selectRole = (selectedRole: string) => {
        setRole(selectedRole);
        setErrorMessage(''); // Clear error message when role changes
    };

    // submitting form for the log-in 

    const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!navigator.onLine) {
            Swal.fire({
                icon: 'error',
                title: 'No Internet Connection',
                text: 'Please check your internet connection and try again.',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            return; // Exit the function early if no internet connection
        }

        const endpoint = role === 'admin' ? `${backendUrl}/admin/login` : `${backendUrl}/staff/login`; // API endpoint
        const payload = role === 'admin' ? { email: credentials.email, password: credentials.password } : { userName: credentials.userName, password: credentials.password };

        try {
            const response = await axios.post(endpoint, payload);
            const { token, message } = response.data;
            if (role === 'admin') {
                // Save role, token, and user info in local storage
                localStorage.setItem('role', role || '');
                localStorage.setItem('token', token);
            } else {
                const { token, role: userRole, name, message } = response.data; // Extract token, role, and name

                // Save role, name, token, and user info in localStorage
                localStorage.setItem('role', userRole || '');
                localStorage.setItem('name', name || '');
                localStorage.setItem('token', token);
            }
            localStorage.setItem('email', credentials.email);


            Swal.fire({
                icon: 'success',
                title: 'Log-in successfully',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            navigate('/', { replace: true }); // Navigate to the dashboard after login
        } catch (error) {
            if (axios.isAxiosError(error)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Login failed',
                    text: error.response?.data?.message,
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                // If the error is from Axios, safely access the response
                setErrorMessage(error.response?.data?.message || 'Login failed. Please try again.');
            } else {
                // Handle unexpected errors
                setErrorMessage('An unexpected error occurred. Please try again.');
                console.log(error)
            }
        }
    };


    // password visibility 


    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState);
    };

    return (
        <div className={styles.main}>
            <div className="absolute inset-0">
                <img src="/assets/images/auth/bg-gradient.png" alt="background" className="h-full w-full object-cover" />
            </div>
            <div className="relative flex min-h-screen items-center justify-center px-6 py-10 bg-cover bg-center">
                <div className="relative w-full max-w-[870px] rounded-md bg-white/60 backdrop-blur-lg p-2">
                    <div className="flex flex-col justify-center rounded-md px-6 py-20">
                        <div className="mx-auto w-full max-w-[440px]">
                            <div className="mb-10 text-center">
                                <h1 className="text-3xl font-extrabold uppercase text-primary">Sign in</h1>
                                {role ? <p className="text-base font-bold"></p> : <p className="text-base font-bold">Choose your role to log in</p>}
                            </div>

                            {/* Role Selection */}
                            {!role ? (
                                <div className="flex justify-center space-x-4">
                                    <button className="btn btn-gradient w-full max-w-[200px]" onClick={() => selectRole('admin')}>
                                        <IconUser fill={true} className="w-6 h-6" /> Admin
                                    </button>
                                    <button className="btn btn-gradient w-full max-w-[200px]" onClick={() => selectRole('staff')}>
                                        <IconUsers fill={true} className="w-6 h-6" /> Staff
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <form className="space-y-5" onSubmit={submitForm}>
                                        {role === 'admin' ? (
                                            <div>
                                                <label htmlFor="Email">Email</label>
                                                <div className="relative">
                                                    <input id="Email" autoComplete='off' type="email" name="email" placeholder="Enter Email" className="form-input ps-10" onChange={handleInputChange} />
                                                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                                        <IconMail fill={true} />
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label htmlFor="UserName">Username</label>
                                                <div className="relative">
                                                    <input id="UserName" type="text" name="userName" placeholder="Enter Username" className="form-input ps-10" onChange={handleInputChange} />
                                                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                                        <IconUser fill={true} />
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label htmlFor="Password">Password</label>
                                            <div className="relative">
                                                <input
                                                    id="Password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password"
                                                    placeholder="Enter Password"
                                                    className="form-input ps-10"
                                                    onChange={handleInputChange}
                                                />
                                                <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                                    <IconLockDots fill={true} />
                                                </span>
                                                <span className="absolute end-4 top-1/2 -translate-y-1/2 cursor-pointer" onClick={togglePasswordVisibility}>
                                                    {showPassword ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
                                                </span>
                                            </div>
                                        </div>
                                        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
                                        <button type="submit" className="btn btn-gradient mt-6 w-full">
                                            Sign in
                                        </button>
                                    </form>
                                    <button className="mt-4 text-sm text-primary underline" onClick={() => setRole(null)}>
                                        Back to Role Selection
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginBoxed;
