import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

interface ShowroomModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShowroomModal: React.FC<ShowroomModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [latitudeAndLongitude, setLatitudeAndLongitude] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [location, setLocation] = useState<string>('');
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // crating showroom 

    const handleSubmit = async (e:any) => {
        e.preventDefault();
        const showroomId = uuidv4();
        // Construct the data object
        if (validate()) {
            const data = {
                name,
                description,
                latitudeAndLongitude,
                location,
                showroomId: showroomId,
                username: '',
                password: '',
                helpline: '',
                phone: '',
                mobile: '',
                state: '',
                district: '',
                services: {}, // or provide the proper service structure
              };
              

        try {
            // Make the POST request
            const response = await axios.post(`${backendUrl}/showroom`, data);
            console.log('Showroom created:', response.data);
            onClose();
            setLatitudeAndLongitude('');
            setDescription('');
            setName('');
            setLocation('');
            Swal.fire({
                icon: 'success',
                title: 'Showroom added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            console.error('Error creating showroom:', error);
            alert('Failed to create showroom.');
        }
    }
    };

    // validating

    const validate = (): boolean => {
        let formErrors: Record<string, string> = {};

        // Name validation
        if (!name.trim()) {
            formErrors.name = 'Name is required';
        }
     
        if (!location.trim()) {
            formErrors.location = 'Location is required';
        }
     
        if (!latitudeAndLongitude.trim()) {
            formErrors.latitudeAndLongitude = 'Latitude and longitude  is required';
        }
     

        setErrors(formErrors);

        return Object.keys(formErrors).length === 0;
    };


    return (
        <Transition appear show={isOpen} as={React.Fragment}>
            <Dialog as="div" open={isOpen} onClose={onClose}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen px-4">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8 text-black dark:text-white-dark">
                                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                        <h5 className="font-bold text-lg">Create Showroom</h5>
                                        <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
                                            <IoIosCloseCircleOutline size={20} />
                                        </button>
                                    </div>
                                    <div className="p-5">
                                    <div>
                                            <label htmlFor="name">Showroom name</label>
                                            <input
                                                id="showroomName"
                                                type="text"
                                                placeholder="Enter showroom name"
                                                className="form-input"
                                                autoComplete="off"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                            {errors.name && <p className="text-red-500">{errors.name}</p>}
                                        </div>
                                        <div className="mb-5">
                                            <label htmlFor="addonsRight">Location</label>
                                            <div className="flex">
                                                <input
                                                    id="addonsRight"
                                                    type="text"
                                                    placeholder=""
                                                     autoComplete="off"
                                                    className="form-input ltr:rounded-r-none rtl:rounded-l-none"
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank', 'noopener,noreferrer');
                                                        }
                                                    }}
                                                />
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary ltr:rounded-l-none rtl:rounded-r-none">
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
                                                autoComplete="off"
                                                value={latitudeAndLongitude}
                                                onChange={(e) => setLatitudeAndLongitude(e.target.value)}
                                            />
                                            {errors.latitudeAndLongitude && <p className="text-red-500">{errors.latitudeAndLongitude}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="description">Description</label>
                                            <textarea id="description" placeholder="Description" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
                                        </div>

                                        <div className="flex justify-end items-center mt-8">
                                            <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                                                Discard
                                            </button>
                                            <button type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4" onClick={handleSubmit}>
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Transition.Child>
            </Dialog>
        </Transition>
    );
};

export default ShowroomModal;
