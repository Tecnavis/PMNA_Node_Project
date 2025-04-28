import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import axios from 'axios';
import Swal from 'sweetalert2';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import { CLOUD_IMAGE } from '../../constants/status';


export interface Provider {
    _id: string;
    name: string;
    companyName: string;
    baseLocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    };
    idNumber: string;
    creditAmountLimit: number;
    phone: string;
    personalPhoneNumber: string;
    password: string;
    serviceDetails: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
}

const Provider: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [providers, setProviders] = useState<Provider[]>([]);
    const [provider, setProvider] = useState<Provider | null>(null);
    const [modal5, setModal5] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const navigate = useNavigate();

    // checking the token

    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token  found in localStorage');
        } else {
            navigate('/auth/boxed-signin');
            console.log('Token not found in localStorage');
        }
    };

    // getting all provider

    const fetchProviders = async () => {
        try {
            const response = await axios.get(`${backendUrl}/provider`);
            setProviders(response.data);
        } catch (error) {
            console.error('Error fetching provider:', error);
        }
    };

    // deleting Provider

    const handleDelete = (itemId: any) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
        }).then((result) => {
            if (result.isConfirmed) {
                axios.delete(`${backendUrl}/provider/${itemId}`);
                // Remove role logic
                setProviders((prev) => prev.filter((role) => role._id !== itemId));
                Swal.fire('Deleted!', 'The provider has been deleted.', 'success');
            }
        });
    };

    // getting provider by id in modal

    const handleOpen = async (id: any) => {
        setModal5(true);
        const response = await axios.get(`${backendUrl}/provider/${id}`);
        const data = response.data;
        console.log(data.image);
        setProvider(data);
    };

    useEffect(() => {
        gettingToken();
        fetchProviders();
    }, []);

    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Provider Details</h5>
                    <Link to="/provideradd" className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600">
                        <span className="flex items-center">
                            <IconUserPlus className="me-2" />
                            Add New
                        </span>
                    </Link>
                </div>
                <div className="table-responsive mb-5">
                    <table>
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>ID Number</th>
                                {/* <th>Address</th> */}
                                <th>Phone</th>
                                {/* <th>User Name</th>
                                <th>Password </th> */}
                                <th className="!text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {providers.map((items, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="w-14 h-14 rounded-full overflow-hidden">
                                            <img src={items.image ? `${CLOUD_IMAGE}${items.image}` : defaultImage} className="w-full h-full object-cover" alt="Profile" />{' '}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="whitespace-nowrap">{items.name.charAt(0).toLocaleUpperCase() + items.name.slice(1)}</div>
                                        <p className="text-white-dark" style={{ fontSize: '12px' }}>
                                            {items.companyName}
                                        </p>
                                    </td>
                                    <td>{items.idNumber}</td>
                                    {/* <td>{item.address}</td> */}
                                    <td>{items.phone}</td>
                                    {/* <td>{item.userName}</td>
                                    <td>{item.password}</td> */}
                                    <td className="text-center">
                                        <ul className="flex items-center justify-center gap-2">
                                            <li>
                                                <Tippy content="Info">
                                                    <button type="button" onClick={() => handleOpen(items._id)}>
                                                        <IconInfoCircle className="text-secondary" />
                                                    </button>
                                                </Tippy>
                                            </li>
                                            <li>
                                                <Tippy content="Edit">
                                                    <button type="button" onClick={() => navigate(`/provideradd/${items._id}`)}>
                                                        <IconPencil className="text-primary" />
                                                    </button>
                                                </Tippy>
                                            </li>
                                            <li>
                                                <Tippy content="Delete">
                                                    <button type="button" onClick={() => handleDelete(items._id)}>
                                                        <IconTrashLines className="text-danger" />
                                                    </button>
                                                </Tippy>
                                            </li>
                                        </ul>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Transition appear show={modal5} as={Fragment}>
                <Dialog as="div" open={modal5} onClose={() => setModal5(false)}>
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
                                <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-5xl my-8 text-black dark:text-white-dark">
                                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                        <h5 className="font-bold text-lg">{provider && provider.name ? provider.name.charAt(0).toLocaleUpperCase() + provider.name.slice(1) : 'Loading...'}</h5>
                                        <button onClick={() => setModal5(false)} type="button" className="text-white-dark hover:text-dark">
                                            <IoIosCloseCircleOutline size={22} />
                                        </button>
                                    </div>
                                    {/* Scrollable Content Area */}
                                    <div className="p-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                                        <div className="container">
                                            <div className="row">
                                                <div className="col-12">
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <img
                                                            style={{
                                                                objectFit: 'cover',
                                                                width: '100px',
                                                                height: '100px',
                                                                borderRadius: '50%',
                                                            }}
                                                            src={provider?.image ? `${CLOUD_IMAGE}${provider?.image}` : defaultImage}
                                                            alt=""
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <table>
                                                            <tbody>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Company name:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {provider?.companyName}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Baselocation:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {provider?.baseLocation.baseLocation}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            ID Number:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {provider?.idNumber}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Credit Amount Limit:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {provider?.creditAmountLimit}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Phone:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {provider?.phone}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Personal Phone Number:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                            }}
                                                                        >
                                                                            {provider?.personalPhoneNumber}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                            }}
                                                                        >
                                                                            Password:
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'flex-start',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                            onClick={() => {
                                                                                setIsVisible(true);
                                                                                setTimeout(() => setIsVisible(false), 4000); // Hide password after 4 seconds
                                                                            }}
                                                                            title="Click to view password"
                                                                        >
                                                                            {isVisible ? provider?.password : provider?.password?.replace(/./g, '*')}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Service Type</th>
                                                                    <th>Basic Amount</th>
                                                                    <th>KM For Basic Amount</th>
                                                                    <th>Over Ride Charge</th>
                                                                    <th>Vehicle Number</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {provider?.serviceDetails.map((items, index) => (
                                                                    <tr key={index}>
                                                                        <td>{items.serviceType.serviceName}</td>
                                                                        <td>{items.basicAmount}</td>
                                                                        <td>{items.kmForBasicAmount}</td>
                                                                        <td>{items.overRideCharge}</td>
                                                                        <td>{items.vehicleNumber}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end items-center mt-8 mb-3 mr-3">
                                        <button onClick={() => navigate(`/provideradd/${provider?._id}`)} type="button" className="btn btn-outline-primary mr-3">
                                            <IconPencil />
                                        </button>
                                        <button onClick={() => setModal5(false)} type="button" className="btn btn-outline-danger">
                                            Discard
                                        </button>

                                        {/* <button type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4">
                                            More info
                                        </button> */}
                                    </div>
                                </Dialog.Panel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default Provider;
