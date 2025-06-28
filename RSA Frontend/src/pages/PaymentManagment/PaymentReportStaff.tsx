import React, { useEffect, useRef, useState } from 'react';
import { Tab } from '@headlessui/react';
import { DataTable } from 'mantine-datatable';
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig';
import Staff from '../Staff/Staff';
import { Booking } from '../Bookings/Bookings';
import IconPrinter from '../../components/Icon/IconPrinter';
import { CashCollectionDetailsTableColumn, ReceivedDetailsStaffTableColumn } from './constant';
import { ReceivedDetails, ReceivedDetailsStaff, CashCollectionDetails } from './types';
import Swal from 'sweetalert2';
import Loader from '../../components/loader';

const getColorForDateTime = (dateTimeString: string) => {
    let hash = 0;
    for (let i = 0; i < dateTimeString.length; i++) {
        hash = dateTimeString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 85%)`;
};

const PaymentReportStaff: React.FC = () => {
    const [staffs, setStaffs] = useState<Staff[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [receivedAmount, setReceivedAmount] = useState<number | ''>('');
    const [receivedDetailsStaff, setReceivedDetailsStaff] = useState<ReceivedDetailsStaff[]>([]);
    const [cashCollectionDetails, setCashCollectionDetails] = useState<CashCollectionDetails[]>([]);
    const [inHandAmount, setInHandAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [remark, setRemark] = useState<string>('');
    const [search, setSearch] = useState<string>('');
    const [tabIndex, setTabIndex] = useState(0);
    const printRef = useRef<HTMLDivElement>(null);
    const role = localStorage.getItem('role');

    // const colsForCashCollection = CashCollectionDetailsTableColumn;
    const colsForReceivedDetailsStaff = ReceivedDetailsStaffTableColumn;
    const fetchStaffs = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/staff`);
            setStaffs(response.data);
        } catch (error) {
            console.error('Error fetching staffs:', error);
            Swal.fire('Error', 'Failed to load staff data', 'error');
        }
    };

    const fetchReceivedDetails = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/cash-received-details-staff`, {
                params: {
                    search,
                    staffId: selectedStaff,
                },
            });
            setReceivedDetailsStaff(res.data.data);
        } catch (error) {
            console.error('Error fetching received details:', error);
            Swal.fire('Error', 'Failed to load received details', 'error');
        }
    };

    const settleReceivedAmount = async () => {
        if (!selectedStaff || !receivedAmount || receivedAmount <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please select a staff member and enter a valid amount',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        const selectedStaffData = staffs.find((s) => s._id === selectedStaff);
        const currentCashInHand = selectedStaffData?.cashInHand || 0;
        const newBalance = currentCashInHand - Number(receivedAmount);

        const confirmation = await Swal.fire({
            title: 'Confirm Cash Collection',
            html: `
            <div class="text-left">
                <p><strong>Staff:</strong> ${selectedStaffData?.name}</p>
                <p><strong>Amount Collected:</strong> ₹${receivedAmount}</p>
                <p><strong>Current Balance:</strong> ₹${currentCashInHand}</p>
                <p><strong>New Balance:</strong> ₹${newBalance}</p>
            </div>
        `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Confirm Collection',
            cancelButtonText: 'Cancel',
        });

        if (!confirmation.isConfirmed) return;

        setIsSubmitting(true);

        try {
            // Create cash collection record
            const response = await axios.post(`${BASE_URL}/cash-received-details-staff`, {
                staffId: selectedStaff,
                givenAmountToStaff: receivedAmount,
                totalStaffAmount: currentCashInHand,
                remark,
                currentCashInHand,
            });

            // Refresh data
            await Promise.all([fetchStaffs(), fetchReceivedDetails()]);

            // Reset form
            setReceivedAmount('');
            setRemark('');

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                html: `
                <div class="text-left">
                    <p><strong>Amount Collected:</strong> ₹${receivedAmount}</p>
                    <p><strong>Staff:</strong> ${selectedStaffData?.name}</p>
                    <p><strong>New Balance:</strong> ₹${newBalance}</p>
                </div>
            `,
                confirmButtonColor: '#3085d6',
            });
        } catch (error: any) {
            console.error('Collection error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to record cash collection',
                confirmButtonColor: '#3085d6',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    // --------------------------------------------------

    // `${BASE_URL}/cash-received-details-staff/cash-received-details-staff`,

    useEffect(() => {
        fetchStaffs();
    }, []);

    useEffect(() => {
        if (selectedStaff) {
            const selected = staffs.find((s) => s._id === selectedStaff);
            setInHandAmount(selected?.cashInHand || 0);
            fetchReceivedDetails();
        }
    }, [selectedStaff, staffs]);

    return (
        <main className="flex flex-col items-center justify-center">
            <div className="rounded-md shadow-md min-w-[85%] p-5">
                <h1 className="text-4xl text-gray-700 uppercase text-center mb-4 font-bold">Staff Cash Management</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block mb-2 text-sm font-medium">Select Staff</label>
                        <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="w-full p-2 border rounded-lg" disabled={isSubmitting}>
                            <option value="">-- Select Staff --</option>
                            {staffs.map((staff) => (
                                <option key={staff._id} value={staff._id}>
                                    {staff.name} (₹{staff.cashInHand || 0})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium">Current Balance</label>
                        <input type="number" value={inHandAmount} readOnly className="w-full p-2 border rounded-lg bg-gray-100" />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium">Received Amount</label>
                        <input
                            type="number"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(Number(e.target.value))}
                            className="w-full p-2 border rounded-lg"
                            disabled={isSubmitting || !selectedStaff}
                            min="0"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium">Remarks</label>
                        <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full p-2 border rounded-lg" disabled={isSubmitting} placeholder="Enter remarks" />
                    </div>
                </div>

                <button
                    onClick={settleReceivedAmount}
                    disabled={isSubmitting || !selectedStaff || !receivedAmount}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                    {isSubmitting ? <Loader /> : 'Record Cash Received'}
                </button>
            </div>
            {/* Received Details Table */}
            <div className="w-full min-w-[85%] my-7 rounded-md shadow-md p-5">
                <div className="mb-4">
                    <input type="text" placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full p-2 border rounded-lg" />
                </div>

                <div ref={printRef}>
                    <DataTable
                        withBorder
                        withColumnBorders
                        striped
                        highlightOnHover
                        columns={colsForReceivedDetailsStaff}
                        records={receivedDetailsStaff}
                        rowStyle={(record) => ({
                            backgroundColor: getColorForDateTime(record.createdAt.toString()),
                        })}
                    />
                </div>
            </div>
            {/* Report Tabs */}
            {/* <div className="w-full min-w-[85%] my-7 rounded-md shadow-md p-5">
                <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
                    <Tab.List className="flex border-b mb-4">
                        <Tab className={({ selected }) => 
                            `px-4 py-2 font-medium ${selected ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`
                        }>
                            Cash Collection
                        </Tab>
                        <Tab className={({ selected }) => 
                            `px-4 py-2 font-medium ${selected ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`
                        }>
                            Received Details
                        </Tab>
                    </Tab.List>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>

                    <Tab.Panels>
                        <Tab.Panel>
                            <div ref={printRef}>
                                <DataTable
                                    withBorder
                                    withColumnBorders
                                    striped
                                    highlightOnHover
                                    columns={colsForCashCollection}
                                    records={cashCollectionDetails}
                                    rowStyle={(record) => ({
                                        backgroundColor: getColorForDateTime(record.createdAt.toString())
                                    })}
                                />
                            </div>
                        </Tab.Panel>
                        <Tab.Panel>
                            <div ref={printRef}>
                                <DataTable
                                    withBorder
                                    withColumnBorders
                                    striped
                                    highlightOnHover
                                    columns={colsForReceivedDetailsStaff}
                                    records={receivedDetailsStaff}
                                    rowStyle={(record) => ({
                                        backgroundColor: getColorForDateTime(record.createdAt.toString())
                                    })}
                                />
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div> */}
        </main>
    );
};

export default PaymentReportStaff;
