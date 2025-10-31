import { useState, useEffect } from 'react';
import axios from 'axios';
import { IconX, IconExternalLink, IconCalendar, IconUser, IconCheck, IconX as IconCross } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BASE_URL } from '../../config/axiosConfig';
import { Verification } from '../../interface/ShowroomVerification';
import { getVerificationDocsForShowroom } from '../../services';

interface VerificationModalProps {
    showroomId: string;
    onClose: () => void;
}

const VerificationModal = ({ showroomId, onClose }: VerificationModalProps) => {
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentMonthStatus, setCurrentMonthStatus] = useState<'verified' | 'pending'>('pending');
    const [expandedVerification, setExpandedVerification] = useState<string | null>(null);

    useEffect(() => {
        const fetchVerifications = async () => {
            try {
                setLoading(true);
                const data = await getVerificationDocsForShowroom(showroomId)   ;
                setVerifications(data);

                // Check current month verification status
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const hasCurrentMonthVerification = data.some((v: Verification) => {
                    const date = new Date(v.verificationDate);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                });

                setCurrentMonthStatus(hasCurrentMonthVerification ? 'verified' : 'pending');
            } catch (err: any) {
                setError(err.response.data.erros.message || 'Failed to fetch verification data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchVerifications();
    }, [showroomId]);

    // Group verifications by month and year
    const groupedVerifications = verifications.reduce((acc, verification) => {
        const date = new Date(verification.verificationDate);
        const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;

        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }

        acc[monthYear].push(verification);
        return acc;
    }, {} as Record<string, Verification[]>);

    const openGoogleMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    const toggleVerificationDetails = (id: string) => {
        setExpandedVerification(expandedVerification === id ? null : id);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
                <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800 text-white p-5">
                    <div>
                        <h2 className="text-2xl font-bold">Showroom Verification History</h2>
                        <h2 className="text-sm ">
                            Showroom Created At {new Date(verifications[0]?.showroom?.createdAt).toLocaleDateString() || 'N/A'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <IconX size={28} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto max-h-[80vh]">
                    {/* Current Month Status */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`mb-6 p-5 rounded-xl shadow-sm ${currentMonthStatus === 'verified' ?
                            'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200' :
                            'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'}`}
                    >
                        <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                            {currentMonthStatus === 'verified' ? (
                                <IconCheck className="text-green-600" size={24} />
                            ) : (
                                <IconCross className="text-red-600" size={24} />
                            )}
                            Current Month Status
                        </h3>
                        <p className="text-lg font-medium">
                            {currentMonthStatus === 'verified' ? (
                                <span className="flex items-center gap-3">
                                    <span className="inline-block w-4 h-4 bg-green-500 rounded-full animate-pulse"></span>
                                    Verified - This showroom has been verified for the current month
                                </span>
                            ) : (
                                <span className="flex items-center gap-3">
                                    <span className="inline-block w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
                                    Pending Verification - Needs to be verified this month
                                </span>
                            )}
                        </p>
                    </motion.div>

                    {loading ? (
                        <div className="space-y-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="border border-gray-200 rounded-xl p-5">
                                    <div className="h-8 w-40 bg-gray-200 rounded mb-4 animate-pulse"></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[...Array(2)].map((_, j) => (
                                            <div key={j} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex gap-4">
                                                    <div className="w-32 h-32 bg-gray-200 rounded-md animate-pulse"></div>
                                                    <div className="flex-grow space-y-3">
                                                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                                                        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                                                        <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                                                        <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center"
                        >
                            <div className="text-xl font-medium mb-2">Error Loading Data</div>
                            <p className="mb-4">{error}</p>
                        </motion.div>
                    ) : verifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-blue-50 border border-blue-200 text-blue-700 p-6 rounded-xl text-center"
                        >
                            <div className="text-xl font-medium mb-2">No Verification Records Found</div>
                            <p>This showroom hasn't been verified yet.</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedVerifications).map(([monthYear, monthVerifications]) => (
                                <motion.div
                                    key={monthYear}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 100 }}
                                    className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm"
                                >
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-xl font-semibold text-blue-700 flex items-center gap-2">
                                            <IconCalendar size={20} />
                                            {monthYear}
                                        </h3>
                                        <span className="text-sm text-gray-500">
                                            {monthVerifications.length} verification{monthVerifications.length > 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {monthVerifications.map((verification) => (
                                            <motion.div
                                                key={verification._id}
                                                whileHover={{ scale: 1.01 }}
                                                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
                                            >
                                                <div
                                                    className="p-4 cursor-pointer"
                                                    onClick={() => toggleVerificationDetails(verification._id)}
                                                >
                                                    <div className="flex flex-col sm:flex-row gap-4">
                                                        <div className="flex-shrink-0 relative">
                                                            <img
                                                                src={verification.image}
                                                                alt="Verification"
                                                                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = 'https://via.placeholder.com/128';
                                                                    e.currentTarget.className = 'w-32 h-32 object-contain rounded-lg border border-gray-200 bg-gray-100 p-2';
                                                                }}
                                                            />
                                                            {verification.isVerified ? (
                                                                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                                    <IconCheck size={14} /> Verified
                                                                </span>
                                                            ) : (
                                                                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                                    <IconCross size={14} /> Not Verified
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex-grow">
                                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                                <div>
                                                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                                                        <IconUser size={16} /> Verified by:
                                                                    </p>
                                                                    <p className="font-medium">{verification.executive.name}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-500">Date:</p>
                                                                    <p className="font-medium">
                                                                        {new Date(verification.verificationDate).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'long',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-500">Accuracy:</p>
                                                                    <p className="font-medium">{verification.accuracy.toFixed(2)} meters</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-500">Added by:</p>
                                                                    <p className="font-medium">
                                                                        {verification.verificationAddedBy.userType}: {verification.verificationAddedBy.user.email}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openGoogleMaps(
                                                                        verification.geoTag.coordinates[1],
                                                                        verification.geoTag.coordinates[0]
                                                                    );
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                                                            >
                                                                <IconExternalLink size={16} />
                                                                View Location on Google Maps
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {expandedVerification === verification._id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-4 pb-4 pt-0 border-t border-gray-200 bg-gray-50">
                                                                <h4 className="font-medium mb-2 text-gray-700 mt-3">Additional Details</h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <p className="text-sm text-gray-500">Verification ID:</p>
                                                                        <p className="font-mono text-sm">{verification._id}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-gray-500">Coordinates:</p>
                                                                        <p className="font-mono text-sm">
                                                                            {verification.geoTag.coordinates[1]}, {verification.geoTag.coordinates[0]}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-gray-500">Created At:</p>
                                                                        <p className="text-sm">
                                                                            {new Date(verification.verificationDate).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default VerificationModal;