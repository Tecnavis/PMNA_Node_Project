import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './showroomAdd.module.css';
import Swal from 'sweetalert2';
import { BASE_URL } from '../../config/axiosConfig';

interface ShowRoomDetailsType {
    id: string;
    name: string;
    location: string;
    image: string;
    helpline: string;
    phone: string;
    state: string;
    district: string;
    uid: string;
}

const ShowRoomDetails: React.FC = () => {

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(true);
    const [isSignIn, setIsSignIn] = useState(true); // New state for switching between forms
    const [showRoomDetails, setShowRoomDetails] = useState<ShowRoomDetailsType>({
        id: '',
        name: '',
        location: '',
        image: '',
        helpline: '',
        phone: '',
        state: '',
        district: '',
        uid: '',
    });

    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [signInData, setSignInData] = useState({ phone: '' }); // New state for sign-in form

    const userRole = sessionStorage.getItem('role'); // Assume 'role' is stored in sessionStorage

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
            uid: queryParams.get('uid') || '',
        });
    }, [location.search]);



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

    const handleNavigation = () => {
        navigate('/addbook', {
            state: {
                uid: showRoomDetails?.uid,
                showroomId: showRoomDetails?.id,
                name: formData.name,
                phone: formData.phone
            }
        });
    };


    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);
        const phone = /^[6-9]\d{9}$/;

        if (!phone.test(formData.phone)) {
            setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
            return;
        }

        if (!showRoomDetails.id || !showRoomDetails.uid) return;
        try {

        } catch (error) {
            setErrorMessage('An error occurred while adding the document.');
        }
    };

    const handleSignInSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);
        const phone = /^[6-9]\d{9}$/;

        if (!phone.test(signInData.phone)) {
            setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
            return;
        }

        try {

        } catch (error) {
            setErrorMessage('An error occurred during sign-in.');
        }
    };

    return (
        <div className="w-full max-w-screen-xl mx-auto mt-10 p-5 bg-white rounded-lg shadow-lg flex flex-col justify-center  gap-5 relative">
            {/* Showroom Header */}
            <div className="text-center mb-5b bg-gray-800 text-white p-2 rounded-md flex justify-center items-center">
                <h1 className="text-3xl font-bold">{showRoomDetails.name}</h1>
            </div>
            <div className='md:flex gap-3 items-center justify-center'>
                {/* Showroom Details */}
                <div className="flex items-center justify-center">
                    <div className='h-full w-[250px]'>
                        <img src={`${BASE_URL}/images/${showRoomDetails.image}`} alt={showRoomDetails.name} className="w-full rounded-lg shadow-md h-[280px] bg-cover object-cover" />
                    </div>
                </div>
                <div className="w-full py-2 ml-6 flex flex-col gap-4 text-lg text-gray-700  rounded-md my-6 md:my-0">
                    <div className="flex justify-between border-b border-gray-400 pb-2 pl-3">
                        <p><strong>Location:</strong> {showRoomDetails.location}</p>
                    </div>
                    <div className="flex justify-between border-b border-gray-400 pb-2 pl-3">
                        <p><strong>Toll-Free:</strong> {showRoomDetails.helpline}</p>
                    </div>
                    <div className="flex justify-between border-b border-gray-400 pb-2 pl-3">
                        <p><strong>Phone Number:</strong> {showRoomDetails.phone}</p>
                    </div>
                    <div className="flex justify-between  pl-3">
                        <p><strong>State:</strong> {showRoomDetails.state}</p>
                    </div>
                </div>
                {/* Hover Form */}
                <div className="w-full  md:w-1/2   bg-gray-200 bg-opacity-90 p-5 rounded-lg shadow-md z-10 flex flex-col gap-3">
                    {isSignIn ? (
                        <div>
                            <h2 className="text-center text-xl font-semibold text-gray-800 mb-3">Sign In Here</h2>
                            <form onSubmit={handleSignInSubmit} className="flex flex-col gap-3">
                                <label htmlFor="phone" className="text-gray-800">Phone Number:</label>
                                <input
                                    type="text"
                                    id="phone"
                                    name="phone"
                                    maxLength={10}
                                    value={signInData.phone}
                                    onChange={handleSignInFormChange}
                                    required
                                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                {errorMessage && <p className="text-red-600">{errorMessage}</p>}
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    Sign In
                                </button>
                            </form>
                            <p className="text-center text-gray-700 mt-3">Are you a new staff?</p>
                            <button
                                onClick={() => setIsSignIn(false)}
                                className="w-full py-2 border border-gray-500 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                            >
                                Register
                            </button>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-center text-xl font-semibold text-gray-800 mb-3">Register Here</h2>
                            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
                                <label htmlFor="name" className="text-gray-800">Name:</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    required
                                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <label htmlFor="phone" className="text-gray-800">Phone Number:</label>
                                <input
                                    type="text"
                                    maxLength={10}
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleFormChange}
                                    required
                                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                {errorMessage && <p className="text-red-600">{errorMessage}</p>}
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    Submit
                                </button>
                            </form>
                            <p className="text-center text-gray-700 mt-3">Are you registered already?</p>
                            <button
                                onClick={() => setIsSignIn(true)}
                                className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                            >
                                Sign In
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Showroom Footer */}
            <div className="text-center mt-5 text-gray-600 text-sm">
                <p>&copy; 2024 Tecnavis Web Solutions. All rights reserved.</p>
            </div>
        </div>
    );
};

export default ShowRoomDetails;