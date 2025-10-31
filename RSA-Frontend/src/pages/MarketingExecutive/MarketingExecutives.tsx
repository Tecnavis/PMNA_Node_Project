// @ts-nocheck
import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import { deleteExecutiveById, getAllExecutives } from '../../services';
import { IMarketingExecutives } from '../../interface/Executives';
import { GrNext, GrPrevious } from 'react-icons/gr';
import { SearchIcon } from 'lucide-react';
import { showApiSuccessToast } from '../../utils/errorHandler';
import { toast } from 'react-hot-toast';

export default function MarketingExecutives() {

    const [executives, setExecutives] = useState<IMarketingExecutives[]>([])
    const [selectedExecutive, setSelectedExecutive] = useState<number>(0)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState('');
    const [modal2, setModal2] = useState(false);

    const navigate = useNavigate()

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchExecutives(page);
    };

    const fetchExecutives = async (page = 1, searchText = '') => {
        const result = await getAllExecutives(page, searchText);

        if (result?.success) {
            setExecutives(result.data);
            setTotalPages(result.pagination.totalPages);
            setCurrentPage(result.pagination.page);
        } else {
            setExecutives([]); // Optional: clear on failure
        }
    };

    useEffect(() => {
        fetchExecutives(currentPage, search);
    }, [currentPage, search]);

    const deleteExecutive = async (id: string) => {
        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
            bg-white p-6 rounded-xl shadow-xl border border-gray-200`}
            >
                <div className="flex flex-col space-y-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <svg className="w-6 h-6 text-red-500 mt-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Are you sure you want to delete this executive? This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                try {
                                    const result = await deleteExecutiveById(id);
                                    if (result) {
                                        showApiSuccessToast("Executive deleted successfully");
                                        fetchExecutives(currentPage, search);
                                    }
                                } catch (error) {
                                    showApiErrorToast(error);
                                }
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        ), {
            duration: Infinity,
            position: 'bottom-right',
        });
    };

    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Marketing Executives Details</h5>
                    <div className='flex gap-5 items-center justify-center'>
                        <div className="relative">
                            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                <SearchIcon size={18} className='text-gray-500' />
                            </div>
                            <input value={search} onChange={(e) => setSearch(e.target.value || '')} type="search" id="default-search" className="block w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search..." />
                        </div>
                        <Link to="/new-executive" className="font-semibold text-success hover:text-gray-400 dark:text-gray-500 dark:hover:text-gray-600">
                            <span className="flex items-center">
                                <IconUserPlus className="me-2" />
                                Add New Executive
                            </span>
                        </Link>
                    </div>
                </div>
                <div className="table-responsive mb-5">
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone Number</th>
                                <th className='text-center'>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                executives?.map((executive, index) => (<>
                                    <tr>
                                        <td>{index + 1}</td>
                                        <td>
                                            <img
                                                src={`${executive.image}` || defaultImage}
                                                alt=""
                                                className='rounded-full h-16 w-16 border border-red-500'
                                            />
                                        </td>
                                        <td>{executive.name}</td>
                                        <td>{executive.email}</td>
                                        <td>{executive.phone}</td>
                                        <td>
                                            <ul className="flex items-center justify-center gap-2">
                                                <li>
                                                    <Tippy content="Info">
                                                        <button type="button" onClick={() => { setSelectedExecutive(index); setModal2(true) }}>
                                                            <IconInfoCircle className="text-secondary" />
                                                        </button>
                                                    </Tippy>
                                                </li>
                                                <li>
                                                    <Tippy content="Edit">
                                                        <button type="button" onClick={() => navigate(`/new-executive/${executive._id}`)}>
                                                            <IconPencil className="text-primary" />
                                                        </button>
                                                    </Tippy>
                                                </li>
                                                <li>
                                                    <Tippy content="Delete">
                                                        <button type="button" onClick={() => deleteExecutive(executive._id || '')}>
                                                            <IconTrashLines className="text-danger" />
                                                        </button>
                                                    </Tippy>
                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                </>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
                <ul className="inline-flex items-center space-x-1 rtl:space-x-reverse m-auto">
                    <li>
                        <button
                            type="button"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary"
                        >
                            <GrPrevious />
                        </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, index) => (
                        <li key={index}>
                            <button
                                type="button"
                                onClick={() => handlePageChange(index + 1)}
                                className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${currentPage === index + 1 ? 'bg-primary text-white' : 'bg-white-light text-dark hover:text-white hover:bg-primary'
                                    }`}
                            >
                                {index + 1}
                            </button>
                        </li>
                    ))}
                    <li>
                        <button
                            type="button"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary"
                        >
                            <GrNext />
                        </button>
                    </li>
                </ul>
            </div>
            {/* Enhanced Staff View Modal */}
            <Transition appear show={modal2} as={Fragment}>
                <Dialog as="div" className="relative z-[999]" open={modal2} onClose={() => setModal2(false)}>
                    {/* Backdrop with smoother transition */}
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    </TransitionChild>

                    {/* Modal container */}
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-[#191e3a] text-left align-middle shadow-xl transition-all">
                                    {/* Profile header with gradient */}
                                    <div className="bg-gradient-to-r from-red-600 to-red-400 p-6 text-white">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative">
                                                <img
                                                    src={executives[selectedExecutive]?.image || defaultImage}
                                                    alt="Profile"
                                                    className="w-20 h-20 rounded-full border-4 border-white/30 object-cover shadow-md"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">
                                                    {executives[selectedExecutive || 0]?.name ?
                                                        executives[selectedExecutive || 0].name.charAt(0).toUpperCase() +
                                                        executives[selectedExecutive || 0].name.slice(1) :
                                                        'No Name'}
                                                </h3>
                                                <p className="text-blue-100 text-sm">Marketing Executive</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profile details */}
                                    <div className="p-6 space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center">
                                                <div className="w-8 text-blue-500 dark:text-blue-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                                    </svg>
                                                </div>
                                                <div className="ml-4 flex-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-300">Phone</p>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {executives[selectedExecutive || 0]?.phone || 'Not provided'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                <div className="w-8 text-blue-500 dark:text-blue-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                    </svg>
                                                </div>
                                                <div className="ml-4 flex-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-300">Email</p>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                                        {executives[selectedExecutive || 0]?.email || 'Not provided'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                <div className="w-8 text-blue-500 dark:text-blue-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                    </svg>
                                                </div>
                                                <div className="ml-4 flex-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-300">Username</p>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {executives[selectedExecutive || 0]?.userName || 'Not provided'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                <div className="w-8 text-blue-500 dark:text-blue-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                                    </svg>
                                                </div>
                                                <div className="ml-4 flex-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-300">Address</p>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {executives[selectedExecutive || 0]?.address || 'Not provided'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center">
                                                <div className="w-8 text-blue-500 dark:text-blue-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                                    </svg>
                                                </div>
                                                <div className="ml-4 flex-1 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-300">Password</p>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {executives[selectedExecutive || 0]?.password || 'Not provided'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer with action buttons */}
                                    <div className="bg-gray-50 dark:bg-[#1a1f36] px-6 py-4 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                            onClick={() => setModal2(false)}
                                        >
                                            Close
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                            onClick={() => {
                                                navigate(`/new-executive/${executives[selectedExecutive || 0]._id}`)
                                                setModal2(false);
                                            }}
                                        >
                                            Edit Profile
                                        </button>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    )
}
