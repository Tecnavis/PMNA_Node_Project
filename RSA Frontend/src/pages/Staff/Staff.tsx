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
import { CLOUD_IMAGE } from '../../constants/status';

export interface User {
    _id: string;
    name: string;
    email: string;
    address: string;
    phone: string;
    userName: string;
    password: string;
    image?: string;
    role: {
        _id: string;
        name: string;
    };
}
interface Staff {
    image: string;
    name: string;
    phone: string;
    email: string;
    userName: string;
    password: string;
    address: string;
    role: {
        _id: string;
        name: string;
    };
}
const Staff: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [items, setItems] = useState<User[]>([]);
    const [modal2, setModal2] = useState(false);
    const [staff, setStaff] = useState<Staff | null>(null);
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

    // getting all staff

    const fetchStaff = async () => {
        try {
            const response = await axios.get(`${backendUrl}/staff`); // Adjust the API endpoint as necessary
            setItems(response.data); // Update state with the fetched staff data
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Something went wrong';
        }
    };

    useEffect(() => {
        gettingToken();
        fetchStaff();
    }, []);

    // deleting staff

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
                axios.delete(`${backendUrl}/staff/${itemId}`);
                // Remove role logic
                setItems((prev) => prev.filter((role) => role._id !== itemId));
                Swal.fire('Deleted!', 'The staff has been deleted.', 'success');
            }
        });
    };

    // getting staff

    const fetchStaffById = async (id: any) => {
        setModal2(true);
        try {
            const response = await axios.get(`${backendUrl}/staff/${id}`);
            setStaff(response.data);
        } catch (error) {
            console.error('Error fetching staffs:', error);
        }
    };

    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Staffs Details</h5>
                    <Link to="/staffadd" className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600">
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
                                <th>Email</th>
                                {/* <th>Address</th> */}
                                <th>Phone Number</th>
                                {/* <th>User Name</th>
                                <th>Password </th> */}
                                <th className="!text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item._id}>
                                    <td>
                                        <div className="w-14 h-14 rounded-full overflow-hidden">
                                            <img src={item.image ? `${CLOUD_IMAGE}${item.image}` : defaultImage} className="w-full h-full object-cover" alt="Profile" />{' '}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="whitespace-nowrap">{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</div>
                                        <p className="text-white-dark" style={{ fontSize: '12px' }}>
                                            {item.role.name}
                                        </p>
                                    </td>
                                    <td>{item.email}</td>
                                    {/* <td>{item.address}</td> */}
                                    <td>{item.phone}</td>
                                    {/* <td>{item.userName}</td>
                                    <td>{item.password}</td> */}
                                    <td className="text-center">
                                        <ul className="flex items-center justify-center gap-2">
                                            <li>
                                                <Tippy content="Info">
                                                    <button type="button" onClick={() => fetchStaffById(item._id)}>
                                                        <IconInfoCircle className="text-secondary" />
                                                    </button>
                                                </Tippy>
                                            </li>
                                            <li>
                                                <Tippy content="Edit">
                                                    <button type="button" onClick={() => navigate(`/staffadd/${item._id}`)}>
                                                        <IconPencil className="text-primary" />
                                                    </button>
                                                </Tippy>
                                            </li>
                                            <li>
                                                <Tippy content="Delete">
                                                    <button type="button" onClick={() => handleDelete(item._id)}>
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

            {/* modal for staff view  */}
            <Transition appear show={modal2} as={Fragment}>
                <Dialog as="div" open={modal2} onClose={() => setModal2(false)}>
                    <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0" />
                    </TransitionChild>
                    <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen px-4">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel as="div" className="panel border-0 p-0 rounded-lg overflow-hidden max-w-lg my-8 text-black dark:text-white-dark">
                                    {/* the second card  */}

                                    <div className="flex items-center justify-center">
                                        <div className="max-w-[30rem] w-full bg-white shadow-[4px_6px_10px_-3px_#bfc9d4] rounded border border-white-light dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none">
                                            <div className="p-5 flex items-center flex-col sm:flex-row">
                                                <div className="mb-5 w-20 h-20 rounded-full overflow-hidden">
                                                    <img src={`${CLOUD_IMAGE}${staff?.image}`} alt="profile" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 ltr:sm:pl-5 rtl:sm:pr-5 text-center sm:text-left">
                                                    <h5 className="text-[#3b3f5c] text-[15px] font-semibold mb-2 dark:text-white-light">
                                                        {staff?.name ? staff.name.charAt(0).toUpperCase() + staff.name.slice(1) : ''}
                                                    </h5>
                                                    <p className="mb-2 text-white-dark">{staff?.role ? staff.role.name.charAt(0).toUpperCase() + staff.role.name.slice(1) : ''}</p>
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>
                                                                    <p className="text-white-dark">Field</p>
                                                                </th>
                                                                <th>
                                                                    <p className="text-white-dark">Value</p>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td style={{ padding: '0px' }}>
                                                                    <p className="text-white-dark">Phone number:</p>
                                                                </td>
                                                                <td style={{ padding: '0px' }}>
                                                                    <p className="text-white-dark">{staff?.phone}</p>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ padding: '0px' }}>
                                                                    <p className="text-white-dark">Email:</p>
                                                                </td>
                                                                <td style={{ padding: '0px' }}>
                                                                    <p className="text-white-dark">{staff?.email}</p>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <p className="text-white-dark">User name:</p>
                                                                </td>
                                                                <td>
                                                                    <p className="text-white-dark">{staff?.userName}</p>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <p className="text-white-dark">Password:</p>
                                                                </td>
                                                                <td>
                                                                    <p className="text-white-dark">{staff?.password}</p>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>
                                                                    <p className="text-white-dark">Address:</p>
                                                                </td>
                                                                <td>
                                                                    <p className="text-white-dark">{staff?.address}</p>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <button type="button" className="btn btn-danger mt-6" onClick={() => setModal2(false)}>
                                                            Close
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default Staff;
