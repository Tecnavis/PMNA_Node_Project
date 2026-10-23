import React, { useEffect, useState, Fragment } from 'react';
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
import A4Page from '../../components/A4Page';
import ShowroomStaffModal from './ShowroomStaffModal';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import { CLOUD_IMAGE } from '../../constants/status';
import { GrNext, GrPrevious } from 'react-icons/gr';
import { QRCodeSVG } from 'qrcode.react'; // Fixed import



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
    currentMonthVerified?: boolean;
        downloadFlowUrl?: string;

}

const Showroom: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [showrooms, setShowrooms] = useState<Showroom[]>([]);
    const [filteredShowrooms, setFilteredShowrooms] = useState<Showroom[]>([]);
    const [showroom, setShowroom] = useState<Showroom | null>(null);
    const [modal5, setModal5] = useState(false);
    const [modal, setModal] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [search, setSearch] = useState('');
        const [a4ModalOpen, setA4ModalOpen] = useState<boolean>(false); // New state for A4 modal
 const [selectedShowroomForA4, setSelectedShowroomForA4] = useState<Showroom | null>(null);
    const [isModalVisible, setModalVisible] = useState<boolean>(false);
     const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
      const [showroomId, setShowroomId] = useState<string>('');
    const [selectedShowroom, setSelectedShowroom] = useState<Showroom | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const sp = useServerPaging({ storageKey: 'showrooms', pageSize: 25 });
    const searchTerm = sp.search;
    const [listLoading, setListLoading] = useState(false);
    const loadSeq = React.useRef(0);
    const [showAllMode, setShowAllMode] = useState(false);
    // per-showroom activity: bookings this month, last booking, points, executive visit
    const [insights, setInsights] = useState<Record<string, { bookingsThisMonth: number; bookingsTotal: number; openBookings: number; lastBookingAt: string | null; rewardPoints: number; executive: string; lastVisitAt: string | null; visitedThisMonth: boolean }>>({});
    const navigate = useNavigate();
 const showroomStaffUrl = import.meta.env.VITE_STAFF_DASHBOARD_URL || 'https://showroomstaff.rsakerala.com';

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
    // args kept for old callers; the list always loads the current page / search
    const fetchShowroom = async (..._ignored: unknown[]) => {
        const seq = ++loadSeq.current;
        setListLoading(true);
        try {
            const response = await axios.get(`${backendUrl}/showroom/all-showrooms`, {
                params: { search: sp.search, page: sp.page, limit: sp.pageSize },
            });
            if (seq !== loadSeq.current) return; // an older request answered late
            const rows = Array.isArray(response.data?.data) ? response.data.data : [];
            setShowrooms(rows);
            setFilteredShowrooms(rows);
            setTotalPages(response.data?.totalPages || 0);
            setCurrentPage(response.data?.page || sp.page);
            setTotalCount(response.data?.totalCount || 0);
            sp.setTotal(Number(response.data?.totalCount) || 0);
        } catch (error) {
            if (seq === loadSeq.current) console.error('Error fetching showrooms:', error);
        } finally {
            if (seq === loadSeq.current) setListLoading(false);
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
                axios.delete(`${backendUrl}/showroom/${itemId}`)
                    .then(() => {
                        setFilteredShowrooms((prev) => prev.filter((item) => item._id !== itemId));
                        Swal.fire('Deleted!', 'The showroom has been deleted.', 'success');
                    })
                    .catch((e) => Swal.fire('Not deleted', e?.response?.data?.message || 'Could not delete the showroom.', 'error'));
            }
        });
    };

    // getting showroom by id in modal
    const handleOpen = async (id: any) => {
        setModal5(true);
        const response = await axios.get(`${backendUrl}/showroom/${id}`);
        const data = response.data;

        setShowroom(data);
    };

    useEffect(() => {
        gettingToken();
        axios.get(`${backendUrl}/reports/showrooms`).then((r) => setInsights(r.data?.data || {})).catch(() => setInsights({}));
    }, []);

    const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);
    const insightList = Object.values(insights);
    const quietCount = insightList.filter((x) => { const d = daysSince(x.lastBookingAt); return d === null || d > 30; }).length;

    useEffect(() => {
        fetchShowroom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sp.page, sp.pageSize, sp.search]);
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
                ?.map((item) => {
                    return `
                        <tr>
                            <td>
                                <div class="w-14 h-14 rounded-full overflow-hidden">
                                    <img src="${item.image ? getImageUrl(item.image) : defaultImage}" class="w-full h-full object-cover" alt="Profile" />
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

    // open staff modal
    const openStaffModal = (id: string) => {
        setModal(true);
        setShowroomId(id)
    }  



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
                    <input type="search" className="form-input w-full sm:w-72" placeholder="Search name, ID, location, phone…" value={sp.searchInput} onChange={(e) => sp.setSearchInput(e.target.value)} />
                </div>
                {insightList.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="rounded-md border border-white-light dark:border-[#1b2e4b] p-3"><div className="text-[11px] uppercase text-white-dark font-semibold">Showrooms</div><div className="text-xl font-bold">{totalCount || insightList.length}</div></div>
                        <div className="rounded-md border border-white-light dark:border-[#1b2e4b] p-3"><div className="text-[11px] uppercase text-white-dark font-semibold">Booked this month</div><div className="text-xl font-bold text-success">{insightList.filter((x) => x.bookingsThisMonth > 0).length}</div></div>
                        <div className="rounded-md border border-white-light dark:border-[#1b2e4b] p-3" title="No booking in the last 30 days — worth a call or visit"><div className="text-[11px] uppercase text-white-dark font-semibold">Quiet 30+ days</div><div className="text-xl font-bold text-danger">{quietCount}</div></div>
                        <div className="rounded-md border border-white-light dark:border-[#1b2e4b] p-3"><div className="text-[11px] uppercase text-white-dark font-semibold">Not visited this month</div><div className="text-xl font-bold text-warning">{insightList.filter((x) => !x.visitedThisMonth).length}</div></div>
                    </div>
                )}
                <div className="table-responsive mb-5">
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>Activity</th>
                                <th>Staffs</th>
                                <th>Location</th>
                                <th>Helpline</th>
                                <th>Phone</th>
                                <th>QR</th>
                                <th className="!text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShowrooms?.map((items, index) => (
                                <tr key={index}>
                                    <td>{sp.rowNumber(index)}</td>
                                    <td>
                                        <div className="w-14 h-14 rounded-full overflow-hidden">
                                            <img
                                                src={items.image ? getImageUrl(items.image) : defaultImage}
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
                                        {(() => {
                                            const x = insights[items._id];
                                            if (!x) return <span className="text-white-dark text-xs">—</span>;
                                            const d = daysSince(x.lastBookingAt);
                                            return (
                                                <div className="text-xs whitespace-nowrap leading-5">
                                                    <div><b>{x.bookingsThisMonth}</b> this month · {x.bookingsTotal} total{x.openBookings ? <span className="text-info"> · {x.openBookings} live</span> : null}</div>
                                                    <div className={d === null || d > 30 ? 'text-danger' : 'text-white-dark'}>{d === null ? 'No bookings yet' : d === 0 ? 'Last booking today' : `Last booking ${d} d ago`}</div>
                                                    <div className="text-white-dark">{x.rewardPoints} pts{x.executive ? ` · ${x.executive}` : ''} · <span className={x.visitedThisMonth ? 'text-success' : 'text-warning'}>{x.visitedThisMonth ? 'visited' : 'visit due'}</span></div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td>
                                        <button type="button" className="hover:text-primary" title="Showroom staff" onClick={() => openStaffModal(items._id)}>
                                            <IconUsersGroup />
                                        </button>
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
                          <button
    onClick={() => {
        setSelectedShowroomForA4(items);
        setA4ModalOpen(true);
    }}
    className="btn btn-primary btn-sm flex items-center gap-2"
>
    <FaQrcode size={16} /> QR Code
</button>
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
                            {filteredShowrooms.length === 0 && (
                                <tr>
                                    <td colSpan={20} className="py-8 text-center text-white-dark">
                                        {listLoading ? 'Loading…' : sp.search ? `No showrooms match "${sp.search}".` : 'No showrooms yet.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager {...sp.pager} loading={listLoading} sizes={[10, 25, 50, 100, 500]} />
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
                                                            src={showroom?.image ? getImageUrl(showroom.image) : defaultImage}
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
            <ShowroomStaffModal modal={modal} setModal={setModal} shoroomId={showroomId} />


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
              
  <A4Page 
                modalOpen={a4ModalOpen}
                setModalOpen={setA4ModalOpen}
                showroom={selectedShowroomForA4}
                backendUrl={backendUrl}
            />
      </div >
    );
};

export default Showroom;

import { getImageUrl } from '../../utils/imageUrl';
import { Pager, useServerPaging } from '../../components/ui/ListControls';