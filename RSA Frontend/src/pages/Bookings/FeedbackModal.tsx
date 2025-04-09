import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { IoIosCloseCircleOutline } from 'react-icons/io';

interface Feedback {
    _id: string;
    question: string;
    yesPoint: number;
    noPoint: number;
}

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    feedbacks: Feedback[];
    selectedResponses: { [key: string]: string };
    onChange: (feedbackId: string, value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    feedbacks,
    selectedResponses,
    onChange,
    onSubmit,
}) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0" />
                </Transition.Child>
                <div className="fixed inset-0 bg-[black]/60 z-[999]">
                    <div className="flex items-start justify-center min-h-screen px-4">
                        <Transition.Child
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
                                    <h5 className="font-bold text-lg">Feedback Questions</h5>
                                    <button onClick={onClose} type="button" className="text-white-dark hover:text-dark">
                                        <IoIosCloseCircleOutline size={24} />
                                    </button>
                                </div>
                                <div style={{ height: '500px', overflowY: 'auto' }}>
                                    <form onSubmit={onSubmit} className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black mt-3">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                {feedbacks.map((feedback) => (
                                                    <div key={feedback._id} className="mb-4">
                                                        <label className="block text-sm font-medium mb-2">{feedback.question}</label>
                                                        <div className="flex space-x-4">
                                                            <label className="inline-flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    name={`feedback_${feedback._id}`}
                                                                    className="form-radio text-success"
                                                                    value="yes"
                                                                    onChange={() => onChange(feedback._id, 'yes')}
                                                                    checked={selectedResponses[feedback._id] === 'yes'}
                                                                />
                                                                <span className="ml-2">Yes ({feedback.yesPoint} points)</span>
                                                            </label>
                                                            <label className="inline-flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    name={`feedback_${feedback._id}`}
                                                                    className="form-radio text-danger"
                                                                    value="no"
                                                                    onChange={() => onChange(feedback._id, 'no')}
                                                                    checked={selectedResponses[feedback._id] === 'no'}
                                                                />
                                                                <span className="ml-2">No ({feedback.noPoint} points)</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md mt-4">
                                            Save Feedback
                                        </button>
                                    </form>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default FeedbackModal;
