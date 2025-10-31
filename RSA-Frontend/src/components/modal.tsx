import { Dialog, Transition } from '@headlessui/react';
import { Fragment, ReactNode } from 'react';
import { IoIosCloseCircleOutline } from 'react-icons/io';

type ModalButton = {
    text: string;
    onClick: () => void;
    className?: string;
    icon?: ReactNode;
};

type ReusableModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    buttons?: ModalButton[];
};

const ReusableModal: React.FC<ReusableModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    buttons = [],
}) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" open={isOpen} onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 z-40" />
                </Transition.Child>

                <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 overflow-y-auto ml-20">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-2xl bg-white dark:bg-[#121c2c] text-black dark:text-white-dark rounded-lg overflow-hidden shadow-xl">
                            <div className="flex justify-between items-center px-5 py-3 border-b dark:border-white/10">
                                <h2 className="font-bold text-lg">{title}</h2>
                                <button onClick={onClose} className="text-white-dark hover:text-dark">
                                    <IoIosCloseCircleOutline size={22} />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto max-h-[83vh]">{children}</div>

                            {buttons.length > 0 && (
                                <div className="flex justify-end items-center gap-3 px-5 py-4 border-t dark:border-white/10">
                                    {buttons.map((btn, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={btn.onClick}
                                            className={btn.className || 'btn btn-primary'}
                                        >
                                            {btn.icon && <span className="mr-1">{btn.icon}</span>}
                                            {btn.text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ReusableModal;
