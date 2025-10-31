import React, { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition, TransitionChild } from '@headlessui/react';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import { BsAward, BsPhone, BsWhatsapp } from 'react-icons/bs';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';


interface ShowroomStaffModalProps {
    setModal: React.Dispatch<React.SetStateAction<boolean>>,
    modal: boolean,
    shoroomId: string
}

export interface ShowroomStaff {
    _id: string,
    designation: string,
    name: string,
    phoneNumber: number,
    whatsappNumber: number,
    rewardPoints: number,
    showroomId: string,
}

const ShowroomStaffModal: React.FC<ShowroomStaffModalProps> = ({ modal, setModal, shoroomId }) => {

    const [showroomsStaff, setShowroomsStaff] = useState<ShowroomStaff[]>([]);
    const [showroomName, setShowroomName] = useState<string>('');


    // getting all showroomstaff
    const fetchShowroomStaff = async () => {
        try {
            const response = await axiosInstance.get(`${BASE_URL}/showroom/showroom-staff/${shoroomId}`);
            setShowroomsStaff(response.data.data);
            setShowroomName(response.data.showroomName);
        } catch (error) {
            console.error('Error fetching showrooms:', error);
        }
    };

    useEffect(() => {
        fetchShowroomStaff();
    }, [shoroomId]);

    return <Transition appear show={modal} as={Fragment}>
        <Dialog as="div" open={modal} onClose={() => setModal(false)}>
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
                        <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-xl my-8 text-black dark:text-white-dark">
                            <div className="flex bg-slate-50 dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                <h5 className="font-bold text-lg">{showroomName ? showroomName.charAt(0).toUpperCase() + showroomName.slice(1) : 'Loading...'}</h5>
                                <button onClick={() => setModal(false)} type="button" className="text-white-dark hover:text-dark">
                                    <IoIosCloseCircleOutline size={22} />
                                </button>
                            </div>
                            {/* Scrollable Content Area */}
                            <div className="p-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                                {showroomsStaff.length > 0 ? (
                                    showroomsStaff?.map((staff: ShowroomStaff, index) => (
                                        <div key={index} className="panel px-2 py-4 min-w-full min-h-30 rounded-md flex justify-between items-center">
                                            <div className='text-gray-800'>
                                                <h1 className='text-xl'>{staff.name}</h1>
                                                <h6 className='text-sm'>{staff.designation}</h6>
                                            </div>
                                            <div className='text-sm grid gap-1 text-gray-800'>
                                                <h6 className='flex gap-2 items-center'>
                                                    <BsPhone className='text-blue-500' />
                                                    <span>
                                                        +91 {staff.phoneNumber}
                                                    </span>
                                                </h6>
                                                <h6 className='flex gap-2 items-center'>
                                                    <BsWhatsapp className='text-green-500' />
                                                    <span>
                                                        +91 {staff.whatsappNumber}
                                                    </span>
                                                </h6>
                                                <h6 className='flex gap-2 items-center'>
                                                    <BsAward className='text-yellow-500 font-semibold' />
                                                    <span>
                                                        {staff.rewardPoints}
                                                    </span>
                                                </h6>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <span>No staff found for this showroom.</span>
                                )}
                            </div>
                        </Dialog.Panel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </Transition>;
}

export default ShowroomStaffModal;