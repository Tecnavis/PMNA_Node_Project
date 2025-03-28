import React, { useEffect, useState, Fragment, useRef } from 'react';
import { Dialog, Transition, TransitionChild } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import Tippy from '@tippyjs/react';
import * as XLSX from 'xlsx';
import 'tippy.js/dist/tippy.css';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import axios from 'axios';
import Swal from 'sweetalert2';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import { BsBuildingAdd } from 'react-icons/bs';
import IconPrinter from '../../components/Icon/IconPrinter';
import IconFile from '../../components/Icon/IconFile';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { FaQrcode } from 'react-icons/fa';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import A4Page from '../../components/A4Page';



export interface Showroom {
    _id: string;
    bookingPoints: string
    rewardPoints: string
    name: string;
    showroomId: string;
    location: string;
    description: string;
    showroomLink: string;
    latitudeAndLongitude: string;
    username: string;
    password: string;
    helpline: string;
    phone: string;
    mobile: string;
    state: string;
    district: string;
    image: string;
    services: {
        serviceCenter: {
            selected: boolean;
            amount: number;
        };
        bodyShop: {
            selected: boolean;
            amount: number;
        };
        showroom: {
            selected: boolean;
        };
    };
}

const Showroom: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [showrooms, setShowrooms] = useState<Showroom[]>([]);
    const [filteredShowrooms, setFilteredShowrooms] = useState<Showroom[]>([]);
    const [showroom, setShowroom] = useState<Showroom | null>(null);
    const [modal5, setModal5] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [search, setSearch] = useState('');
    const [isModalVisible, setModalVisible] = useState<boolean>(false);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [url, setUrl] = useState<string>('');


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

    // getting all showroom
    const fetchShowroom = async () => {
        try {
            const response = await axios.get(`${backendUrl}/showroom`);
            setShowrooms(response.data);
            setFilteredShowrooms(response.data); // Initialize filteredShowrooms with all data
        } catch (error) {
            console.error('Error fetching showrooms:', error);
        }
    };

    // deleting showroom
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
                axios.delete(`${backendUrl}/showroom/${itemId}`);
                // Remove role logic
                setFilteredShowrooms((prev) => prev.filter((item) => item._id !== itemId));
                Swal.fire('Deleted!', 'The showroom has been deleted.', 'success');
            }
        });
    };

    // getting showroom by id in modal
    const handleOpen = async (id: any) => {
        setModal5(true);
        const response = await axios.get(`${backendUrl}/showroom/${id}`);
        const data = response.data;
        console.log(data, 'this is the data');
        setShowroom(data);
    };

    useEffect(() => {
        gettingToken();
        fetchShowroom();
    }, []);

    // Download excel sheet
    const handleDownloadExcel = () => {
        // Convert the data to JSON format suitable for Excel
        const dataForExcel = showrooms.map((showroom) => ({
            ID: showroom._id,
            Name: showroom.name,
            Showroom_ID: showroom.showroomId,
            Description: showroom.description,
            Location: showroom.location,
            Latitude_Longitude: showroom.latitudeAndLongitude,
            Username: showroom.username,
            Password: showroom.password,
            Helpline: showroom.helpline,
            Phone: showroom.phone,
            Mobile: showroom.mobile,
            State: showroom.state,
            District: showroom.district,
            Image: showroom.image,
            ServiceCenter_Selected: showroom.services.serviceCenter.selected,
            ServiceCenter_Amount: showroom.services.serviceCenter.amount,
            BodyShop_Selected: showroom.services.bodyShop.selected,
            BodyShop_Amount: showroom.services.bodyShop.amount,
            Showroom_Selected: showroom.services.showroom.selected,
        }));

        // Create a worksheet and workbook
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Showrooms');

        // Write the Excel file
        XLSX.writeFile(workbook, 'showrooms.xlsx');
    };

    // Print the table
    const handlePrint = () => {
        // Create a new window to hold the table for printing
        const printWindow = window.open('', '', 'height=500, width=800');

        // Check if the print window is successfully opened
        if (printWindow) {
            // Generate the table rows from the showroom data
            const tableRows = showrooms
                .map((item) => {
                    return `
                        <tr>
                            <td>
                                <div class="w-14 h-14 rounded-full overflow-hidden">
                                    <img src="${item.image ? `${backendUrl}/images/${item.image}` : defaultImage}" class="w-full h-full object-cover" alt="Profile" />
                                </div>
                            </td>
                            <td>${item.name.charAt(0).toUpperCase() + item.name.slice(1)}</td>
                            <td>${item.location}</td>
                            <td>${item.helpline}</td>
                            <td>${item.phone}</td>
                            <td>${item.state}</td>
                            <td>${item.district}</td>
                            
                        </tr>
                    `;
                })
                .join('');

            // Create the full table HTML
            const tableHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Helpline</th>
                            <th>Phone</th>
                            <th>State</th>
                            <th>District</th>
                            
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;

            // Style the table for better printing
            const styles = `
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                    }
                 
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f4f4f4;
                    }
                    img {
                        max-width: 50px;
                        max-height: 50px;
                    }
                         /* Print-specific styles */
                @page {
                    size: landscape;
                    margin: 20mm;
                }

                /* Ensure the table and content are properly scaled to fit the page */
                table {
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                }
                </style>
            `;

            // Write the HTML structure to the new window
            printWindow.document.write('<html><head><title>Showroom Table</title>' + styles + '</head><body>');
            printWindow.document.write(tableHTML);
            printWindow.document.write('</body></html>');

            // Ensure the content is loaded before triggering the print dialog
            printWindow.document.close();
            printWindow.print();
        }
    };


    // Handle search input change
    const handleSearchChange = (e: any) => {
        const value = e.target.value;
        setSearch(value);

        // Filter showrooms based on the search criteria
        const filtered = showrooms.filter((showroom) =>
            showroom.showroomId.toLowerCase().includes(value.toLowerCase()) ||
            showroom.name.toLowerCase().includes(value.toLowerCase()) ||
            showroom.location.toLowerCase().includes(value.toLowerCase()) ||
            showroom.latitudeAndLongitude.toLowerCase().includes(value.toLowerCase()) ||
            showroom.phone.toLowerCase().includes(value.toLowerCase()) ||
            showroom.state.toLowerCase().includes(value.toLowerCase()) ||
            showroom.district.toLowerCase().includes(value.toLowerCase())
        );

        setFilteredShowrooms(filtered);
    };

    // opening modal for delete confirmation 
    const openDeleteModal = (item: string) => {
        setItemToDelete(item);
        setModalVisible(true);
    };

    // closing modal for delete confirmation 
    const closeModal = () => {
        setModalVisible(false);
        setItemToDelete(null);
    };

    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Showroom Details</h5>
                    <Link to="/showroomadd" className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600">
                        <span className="flex items-center">
                            <BsBuildingAdd className="me-2" />
                            Add New
                        </span>
                    </Link>
                </div>
                <div className="flex md:items-center justify-between md:flex-row flex-col mb-4.5 gap-5">
                    <div className="flex items-center flex-wrap">
                        <button type="button" className="btn btn-primary btn-sm m-1" onClick={handleDownloadExcel}>
                            <IconFile className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                            EXCEL
                        </button>

                        <button type="button" className="btn btn-primary btn-sm m-1" onClick={handlePrint}>
                            <IconPrinter className="ltr:mr-2 rtl:ml-2" />
                            PRINT
                        </button>
                    </div>

                    <input type="text" className="form-input w-auto" placeholder="Search..." value={search} onChange={handleSearchChange} />
                </div>
                <div className="table-responsive mb-5">
                    <table>
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>Location</th>
                                <th>Helpline</th>
                                <th>Phone</th>
                                <th>QR</th>
                                <th className="!text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShowrooms.map((items, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="w-14 h-14 rounded-full overflow-hidden">
                                            <img
                                                src={items.image ? `${backendUrl}/images/${items.image}` : defaultImage}
                                                className="w-full h-full object-cover"
                                                alt="Profile"
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="whitespace-nowrap">
                                            {items.name.charAt(0).toLocaleUpperCase() + items.name.slice(1)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="whitespace-nowrap">{items.location}</div>
                                        <p className="text-white-dark" style={{ fontSize: '12px' }}>
                                            {items.latitudeAndLongitude}
                                        </p>
                                    </td>
                                    <td>{items.helpline}</td>
                                    <td>{items.phone}</td>
                                    <td>
                                        {items?.showroomLink ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    {/* View QR Button (Opens Modal) */}
                                                    <button
                                                        onClick={() => {
                                                            setModalOpen(true)
                                                            setUrl(items.showroomLink)
                                                        }}
                                                        style={{
                                                            backgroundColor: '#007bff',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            padding: '10px 14px',
                                                            fontSize: '1rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            transition: 'all 0.3s ease-in-out',
                                                            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                                                        }}
                                                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0056b3')}
                                                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#007bff')}
                                                    >
                                                        <FaQrcode size={18} /> View QR
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p>No QR Available</p>
                                        )}
                                    </td>
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
                                                    <button type="button" onClick={() => navigate(`/showroomadd/${items._id}`)}>
                                                        <IconPencil className="text-primary" />
                                                    </button>
                                                </Tippy>
                                            </li>
                                            <li>
                                                <Tippy content="Delete">
                                                    <button type="button" onClick={() => openDeleteModal(items._id)}>
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
            </div >
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
                                        <h5 className="font-bold text-lg">{showroom?.name ? showroom.name.charAt(0).toUpperCase() + showroom.name.slice(1) : 'Loading...'}</h5>
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
                                                            src={showroom?.image ? `${backendUrl}/images/${showroom.image}` : defaultImage}
                                                            alt="Showroom"
                                                        />
                                                    </div>
                                                    <div className="col-12">
                                                        <table>
                                                            <tbody>
                                                                {/* Name Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Name:</td>
                                                                    <td>{showroom?.name}</td>
                                                                </tr>

                                                                {/* Showroom ID Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Showroom ID:</td>
                                                                    <td>{showroom?.showroomId}</td>
                                                                </tr>

                                                                {/* Description Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Description:</td>
                                                                    <td>{showroom?.description}</td>
                                                                </tr>

                                                                {/* Location Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Location:</td>
                                                                    <td>{showroom?.location}</td>
                                                                </tr>

                                                                {/* Latitude and Longitude Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Latitude & Longitude:</td>
                                                                    <td>{showroom?.latitudeAndLongitude}</td>
                                                                </tr>

                                                                {/* Username Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Username:</td>
                                                                    <td>{showroom?.username}</td>
                                                                </tr>

                                                                {/* Password Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Password:</td>
                                                                    <td
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                        }}
                                                                        onClick={() => {
                                                                            setIsVisible(true);
                                                                            setTimeout(() => setIsVisible(false), 4000); // Hide password after 4 seconds
                                                                        }}
                                                                        title="Click to view password"
                                                                    >
                                                                        {isVisible ? showroom?.password : showroom?.password?.replace(/./g, '*')}
                                                                    </td>
                                                                </tr>

                                                                {/* Helpline Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Helpline:</td>
                                                                    <td>{showroom?.helpline}</td>
                                                                </tr>

                                                                {/* Phone Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Phone:</td>
                                                                    <td>{showroom?.phone}</td>
                                                                </tr>

                                                                {/* Mobile Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Mobile:</td>
                                                                    <td>{showroom?.mobile}</td>
                                                                </tr>

                                                                {/* State Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>State:</td>
                                                                    <td>{showroom?.state}</td>
                                                                </tr>

                                                                {/* District Row */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>District:</td>
                                                                    <td>{showroom?.district}</td>
                                                                </tr>

                                                                {/* Services Section */}
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Service Center:</td>
                                                                    <td>
                                                                        {showroom?.services?.serviceCenter?.selected
                                                                            ? `Selected (Amount: ₹${showroom?.services?.serviceCenter?.amount})`
                                                                            : 'Not Selected'}
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Body Shop:</td>
                                                                    <td>{showroom?.services?.bodyShop?.selected ? `Selected (Amount: ₹${showroom?.services?.bodyShop?.amount})` : 'Not Selected'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td style={{ textAlign: 'center' }}>Showroom Service:</td>
                                                                    <td>{showroom?.services?.showroom?.selected ? 'Selected' : 'Not Selected'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end items-center mt-8 mb-3 mr-3">
                                        <button onClick={() => navigate(`/showroomadd/${showroom?._id}`)} type="button" className="btn btn-outline-primary mr-3">
                                            <IconPencil />
                                        </button>
                                        <button onClick={() => setModal5(false)} type="button" className="btn btn-outline-danger">
                                            Discard
                                        </button>

                                        <button type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4">
                                            More info
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            {/* Delete confirmation modal  */}

            <ConfirmationModal
                isVisible={isModalVisible}
                onConfirm={() => {
                    if (itemToDelete) {
                        handleDelete(itemToDelete);
                    }
                }}
                onCancel={closeModal}
            />
            <A4Page url={url} modalOpen={modalOpen} setModalOpen={setModalOpen} />
        </div >
    );
};

export default Showroom;
