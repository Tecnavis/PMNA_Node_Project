import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { approveRedeem, getAllRedeems, rejectRedeem } from '../../services/rewardService';
import { CLOUD_IMAGE } from '../../constants/status';
import { IRedemption, IReward } from '../../interface/Rewards';

const Redeems = () => {
    const [redemptions, setRedemptions] = useState<IRedemption[]>([]);
    const [filterdRedemptions, setFilterdRedemptions] = useState<IRedemption[]>([]);
    const [selectedRedemption, setSelectedRedemption] = useState<IRedemption | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [isApproving, setIsApproving] = useState<boolean>(false);
    const [isRejecting, setIsRejecting] = useState<boolean>(false);

    const fetchRedemptions = async () => {
        const response = await getAllRedeems();
        setRedemptions(response || []);
        setFilterdRedemptions(response || []);
    };
    useEffect(() => {

        fetchRedemptions();
    }, []);

    const handleApprove = async (id: string) => {
        setIsApproving(true);
        try {
            const data = await approveRedeem(id);
            if (data) {
                toast.success('Redemption approved successfully!', {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                });
                setSelectedRedemption(null);
                fetchRedemptions()
                // You might want to refresh the redemption list here
            }
        } catch (error) {
            toast.error('Failed to approve redemption. Please try again.', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async (id: string) => {
        setIsRejecting(true);
        try {
            const data = await rejectRedeem(id);
            if (data) {
                toast.success('Redemption rejected successfully!', {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                });
                setSelectedRedemption(null);
                fetchRedemptions()
            }
        } catch (error) {
            toast.error('Failed to reject redemption. Please try again.', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
        } finally {
            setIsRejecting(false);
        }
    };

    useEffect(() => {
        if (filter === 'all') {
            setFilterdRedemptions(redemptions)
        } else if (filter === 'pending') {
            const filterdData = redemptions?.filter((item) => item.approval === false)
            setFilterdRedemptions(filterdData)
        } else {
            const filterdData = redemptions?.filter((item) => item.approval === true)
            setFilterdRedemptions(filterdData)
        }

    }, [filter])

    return (
        <div className="min-h-screen bg-gray-50">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-gray-900">Redemptions</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Filters and Search */}
                <div className="px-4 py-4 bg-white shadow rounded-lg mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('pending')}
                                className={`px-4 py-2 rounded-md ${filter === 'pending' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border'}`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => setFilter('approved')}
                                className={`px-4 py-2 rounded-md ${filter === 'approved' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border'}`}
                            >
                                Approved
                            </button>
                        </div>
                    </div>
                </div>

                {/* Redemptions List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <ul className="divide-y divide-gray-200">
                        {filterdRedemptions && filterdRedemptions.length > 0 ? (
                            filterdRedemptions?.map((redemption) => {
                                const reward: IReward = typeof redemption.reward === 'string'
                                    ? JSON.parse(redemption.reward) as IReward
                                    : redemption.reward as IReward;
                                return (
                                    <li key={redemption._id} className="hover:bg-gray-50">
                                        <div
                                            className="px-4 py-4 sm:px-6 cursor-pointer"
                                            onClick={() => setSelectedRedemption(redemption)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    {reward.image && (
                                                        <img
                                                            className="h-16 w-16 rounded-md object-cover mr-4"
                                                            src={`${CLOUD_IMAGE}${reward.image}`}
                                                            alt={reward.name}
                                                        />
                                                    )}
                                                    <div>
                                                        <h3 className="text-lg font-medium text-gray-900">
                                                            {reward?.name || 'Unknown Reward'}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">
                                                            Redeemed by: {typeof redemption.user === 'string' ? redemption.user : redemption.user.name} ({redemption?.redeemByModel})
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {redemption?.address?.fullName} - {redemption?.address?.city}, {redemption?.address?.state}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${redemption.approval ? 'bg-green-500' : 'bg-red-500'}`}>
                                                        {redemption.approval ? 'Approved' : "Pending"}
                                                    </span>
                                                    <span className="ml-4 text-sm text-gray-500">
                                                        {new Date(redemption.createdAt || '').toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="px-4 py-6 text-center text-gray-500">
                                No redemptions found matching your criteria.
                            </li>
                        )}
                    </ul>
                </div>
            </main>

            {selectedRedemption && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-white">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Redemption Details</h3>
                                <div className="flex items-center mt-1">
                                    {/* <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${selectedRedemption.approval === 'approved' ? 'bg-green-100 text-green-800' : selectedRedemption.approval === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {selectedRedemption.approval}
                                    </span> */}
                                    <span className="ml-3 text-sm text-gray-500">
                                        {new Date(selectedRedemption.createdAt || '').toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedRedemption(null)}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Reward Section */}
                            <div className="bg-gray-50 rounded-lg p-5 mb-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {typeof selectedRedemption.reward !== 'string' && selectedRedemption.reward.image && (
                                        <div className="relative h-40 w-40 flex-shrink-0">
                                            <img
                                                className="h-full w-full rounded-lg object-cover border border-gray-200"
                                                src={`${CLOUD_IMAGE}${selectedRedemption.reward.image}`}
                                                alt={selectedRedemption.reward.name}
                                            />
                                            <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                {typeof selectedRedemption.reward !== 'string' ? selectedRedemption.reward.pointsRequired : 'N/A'} pts
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xl font-bold text-gray-900 mb-2">
                                                {typeof selectedRedemption.reward !== 'string' ? selectedRedemption.reward.name : 'Unknown Reward'}
                                            </h4>
                                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                                {selectedRedemption.redeemByModel}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-4">
                                            {typeof selectedRedemption.reward !== 'string' ? selectedRedemption.reward.description : 'No description available'}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Price Value</p>
                                                <p className="font-semibold">
                                                    ${typeof selectedRedemption.reward !== 'string' ? selectedRedemption.reward.price.toFixed(2) : 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Stock Available</p>
                                                <p className="font-semibold">
                                                    {typeof selectedRedemption.reward !== 'string' ? selectedRedemption.reward.stock : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* User & Shipping Info - Two Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                                {/* User Information Card */}
                                <div className="border border-gray-200 rounded-lg p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h5 className="text-lg font-semibold text-gray-900">Address</h5>
                                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${selectedRedemption.address.addressType === 'Home' ? 'bg-blue-100 text-blue-800' :
                                                selectedRedemption.address.addressType === 'Work' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {selectedRedemption.address.addressType}
                                            </span>
                                    </div>
                                    {/* Shipping Address Card */}
                                    <div className="border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Contact Information */}
                                            <div className="space-y-3">
                                                <h6 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Contact</h6>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Full Name</p>
                                                        <p className="font-medium text-gray-900 truncate" title={selectedRedemption.address.fullName}>
                                                            {selectedRedemption.address.fullName}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Phone</p>
                                                        <p className="font-medium text-gray-900">{selectedRedemption.address.phone}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">WhatsApp</p>
                                                        <p className="font-medium text-gray-900">{selectedRedemption.address.whatsappNumber}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Email</p>
                                                        <a
                                                            href={`mailto:${selectedRedemption.address.email}`}
                                                            className="font-medium text-red-600 hover:underline truncate block"
                                                            title={selectedRedemption.address.email}
                                                        >
                                                            {selectedRedemption.address.email}
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address Information */}
                                            <div className="space-y-3">
                                                <h6 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Location</h6>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Address Line 1</p>
                                                        <p
                                                            className="font-medium text-gray-900 break-words truncate-multiline"
                                                            title={selectedRedemption.address.addressLine1}
                                                            style={{
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                maxWidth: '100%'
                                                            }}
                                                        >
                                                            {selectedRedemption.address.addressLine1}
                                                        </p>
                                                    </div>
                                                    {selectedRedemption.address.addressLine2 && (
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">Address Line 2</p>
                                                            <p
                                                                className="font-medium text-gray-900 break-words truncate-multiline"
                                                                title={selectedRedemption.address.addressLine2}
                                                                style={{
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    maxWidth: '100%'
                                                                }}
                                                            >
                                                                {selectedRedemption.address.addressLine2}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">City</p>
                                                            <p className="font-medium text-gray-900 truncate" title={selectedRedemption.address.city}>
                                                                {selectedRedemption.address.city}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">State</p>
                                                            <p className="font-medium text-gray-900 truncate" title={selectedRedemption.address.state}>
                                                                {selectedRedemption.address.state}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">Pin Code</p>
                                                            <p className="font-medium text-gray-900">{selectedRedemption.address.pinCode}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">Country</p>
                                                            <p className="font-medium text-gray-900 truncate" title={selectedRedemption.address.country}>
                                                                {selectedRedemption.address.country}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                                Last updated: {new Date(selectedRedemption.updatedAt || selectedRedemption.createdAt || '').toLocaleString()}
                            </div>
                            <div className="flex space-x-3">
                                <ToastContainer />
                                {/* Modal content... */}
                                {!selectedRedemption.approval && (

                                    <button
                                        onClick={() => handleApprove(selectedRedemption._id)}
                                        disabled={isApproving}
                                        className={`px-5 py-2.5 bg-red-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center ${isApproving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'
                                            }`}
                                    >
                                        {isApproving ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Approve
                                            </>
                                        )}
                                    </button>
                                )}
                                {selectedRedemption.approval && (
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => handleReject(selectedRedemption._id)}
                                            disabled={isRejecting}
                                            className={`px-5 py-2.5 border border-red-600 text-red-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center ${isRejecting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-50'
                                                }`}
                                        >
                                            {isRejecting ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Pending
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedRedemption(null)}
                                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Redeems;