import React, { useEffect, useState } from 'react';
import { Card, Tooltip, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { Button } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDriverForDropDown, getProviderForDropDown } from '../../services/driverService';
import { DriverDropdownItem } from '../../interface/Driver';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import Loader from '../../components/loader';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';

interface ITransaction {
    _id: string;
    driver: {
        _id: string;
        name: string;
    };
    userModel: 'Driver' | 'Provider';
    transactionId: string;
    amount: number;
    createdAt: string;
    bookingIds?: string[];
}

const TransactionList = () => {
    const [transactions, setTransactions] = useState<ITransaction[]>([]);
    const [drivers, setDrivers] = useState<DriverDropdownItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filterLoading, setFilterLoading] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

    // Filter states
    const [driverType, setDriverType] = useState<'Driver' | 'Provider' | ''>('Driver');
    const [driverId, setDriverId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            setFilterLoading(true);

            const params = new URLSearchParams();
            if (driverType) params.append('driverType', driverType);
            if (driverId) params.append('driverId', driverId);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await axiosInstance.get(`${BASE_URL}/transactions/?driverType=${driverType}&driverId=${driverId}`);
            setTransactions(response.data.data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setFilterLoading(false);
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchTransactions()
    }, [driverId])

    const fetchDrivers = async () => {
        try {
            let driverList
            if (driverType == 'Driver') {
                driverList = await getDriverForDropDown();
            } else {
                driverList = await getProviderForDropDown();
            }
            setDrivers(driverList);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchTransactions();
    };

    const handleResetFilters = () => {
        setDriverType('');
        setDriverId('');
        setStartDate('');
        setEndDate('');
        fetchTransactions();
    };

    useEffect(() => {
        fetchTransactions();
        fetchDrivers();
    }, []);

    useEffect(() => {
        fetchDrivers();
    }, [driverType]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="p-6 shadow-xl rounded-2xl bg-white">
                <div className="flex justify-between items-center mb-6">
                    <motion.h2
                        className="text-2xl font-semibold text-indigo-700"
                        initial={{ x: -20 }}
                        animate={{ x: 0 }}
                    >
                        Driver Transactions
                    </motion.h2>
                    <Button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                    >
                        Filters
                    </Button>
                </div>

                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <Card className="py-4 px-1 shadow-sm">
                                <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Driver Type</InputLabel>
                                        <Select
                                            value={driverType}
                                            label="Driver Type"
                                            onChange={(e) => setDriverType(e.target.value as 'Driver' | 'Provider')}
                                        >
                                            <MenuItem value="">All Types</MenuItem>
                                            <MenuItem value="Driver">Driver</MenuItem>
                                            <MenuItem value="Provider">Provider</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth size="small">
                                        <InputLabel>Driver Name</InputLabel>
                                        <Select
                                            value={driverId}
                                            label="Driver Name"
                                            onChange={(e) => setDriverId(e.target.value)}
                                            disabled={!driverType}
                                        >
                                            <MenuItem value="">All Drivers</MenuItem>
                                            {drivers
                                                .map((driver) => (
                                                    <MenuItem key={driver._id} value={driver._id}>
                                                        {driver?.label}
                                                    </MenuItem>
                                                ))}
                                        </Select>
                                    </FormControl>

                                    {/* <FormControl fullWidth size="small">
                                        <InputLabel shrink>Start Date</InputLabel>
                                        <input
                                            type="date"
                                            className="border rounded-md p-2 mt-2 w-full"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </FormControl>

                                    <FormControl fullWidth size="small">
                                        <InputLabel shrink>End Date</InputLabel>
                                        <input
                                            type="date"
                                            className="border rounded-md p-2 mt-2 w-full"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={startDate}
                                        />
                                    </FormControl> */}

                                    <div className="flex items-end gap-2 h-10 col-span-2">
                                        <Button
                                            type="submit"
                                            className={`bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg w-full flex items-center justify-center ${filterLoading ? 'text-xs px-0 gap-1' : 'px-4'}`}
                                        >
                                            Apply Filters {filterLoading && <Loader />}
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleResetFilters}
                                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2.5 rounded-lg w-full"
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-600">
                        <thead className="bg-indigo-50 border-b text-indigo-700">
                            <tr>
                                <th className="px-4 py-3">Transaction ID</th>
                                <th className="px-4 py-3">Driver Type</th>
                                <th className="px-4 py-3">Driver Name</th>
                                <th className="px-4 py-3">Amount (₹)</th>
                                <th className="px-4 py-3">Date</th>
                                {/* <th className="px-4 py-3">Bookings Count</th> */}
                                {/* <th className="px-4 py-3 text-center">Action</th> */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center">
                                        <Loader />
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((transaction) => (
                                    <motion.tr
                                        key={transaction._id}
                                        className="hover:bg-gray-50"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <td className="px-4 py-3 font-medium">{transaction.transactionId}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${transaction.userModel === 'Driver'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {transaction.userModel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Tooltip title={`Driver ID: ${transaction.driver._id}`}>
                                                <span className="cursor-help">{transaction.driver.name}</span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-green-700">
                                            ₹{transaction.amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {dateFormate(transaction?.createdAt as unknown as string)}, {formattedTime(transaction?.createdAt as unknown as string)}
                                        </td>
                                        {/* <td className="px-4 py-3 text-center">
                                            {transaction.bookingIds?.length || 0}
                                        </td> */}
                                        {/* <td className="px-4 py-3 text-center">
                                            <Button
                                                onClick={() => downloadReceipt(transaction._id)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 mx-auto"
                                            >
                                                <Download size={16} />
                                                Receipt
                                            </Button>
                                        </td> */}
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </motion.div>
    );
};

export default TransactionList;