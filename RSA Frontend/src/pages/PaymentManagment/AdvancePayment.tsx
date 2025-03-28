import React, { Fragment, useEffect, useState } from 'react'
import Driver from '../Driver/Driver';
import { Booking } from '../Bookings/Bookings';
import { AdvanceDetailsTableColumn, CashCollectionDetailsTableColumn, ReceivedDetailsTableColumn } from './constant'
import { Tab } from '@headlessui/react';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import IconPrinter from '../../components/Icon/IconPrinter';
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig';

export interface AdvanceData {
    _id: string;
    addedAdvance: number;
    advance: number;
    driver: {
        name: string
        _id: string
    } | string
    type: string;
    createdAt: string,
    updatedAt: string
}

export interface ReceivedDetails {
    _id: string;
    amount: string;
    balance: string;
    currentNetAmount: number;
    driver: { name: string };  
    receivedAmount: number;
    createdAt: string;  
    remark?: string; 
}

const AdvancePayment: React.FC = () => {

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [amount, setAmount] = useState<number | ''>('');
    const [advanceDetails, setAdvanceDetails] = useState<AdvanceData[]>([]);
    const [receivedDetails, setReceivedDetails] = useState<ReceivedDetails[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [inHandAmount, setInHandAmount] = useState<number>(0);
    const [receivedAmount, setReceivedAmount] = useState<string>('');
    const [remark, setRemark] = useState<string>('');

    const colsForAdvanceDetails = AdvanceDetailsTableColumn.map((col) => col)
    const colsForCashCollection = CashCollectionDetailsTableColumn.map((col) => col)
    const colsForReceivedDetails = ReceivedDetailsTableColumn.map((col) => col)

    const fetchDrivers = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/driver`);
            setDrivers(response.data);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const fetchAdvancePayment = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/advance-payment`)
            setAdvanceDetails(res.data.data);
        } catch (error) {
            console.log('error, error fetching advacen payment', error)
        }
    }

    const createAdvancePayment = async () => {
        try {
            const res = await axios.post(`${BASE_URL}/advance-payment`, {
                advance: amount,
                driverId: selectedDriver,
                remark,
                type: 'Advance'
            });
            fetchAdvancePayment()
            setRemark('')
            setAmount('')
        } catch (error) {

        }
    }

    const fetchCashCollection = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/booking`)
            setBookings(res.data.bookings)
        } catch (error) {

        }
    }

    const fetchReceivedData = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/cash-received-details`)
            setReceivedDetails(res.data)
        } catch (error) {

        }
    }

    const settleReceivedAmount = async () => {
        try {
            const res = await axios.post(`${BASE_URL}/cash-received-details`, {
                amount: receivedAmount,
                balance: ((Number(inHandAmount) || 0) - (Number(receivedAmount) || 0)),
                currentNetAmount: inHandAmount,
                driver: selectedDriver,
                receivedAmount,
                remark
            })
            fetchReceivedData()
            setRemark('')
            setReceivedAmount('')
        } catch (error: any) {
            console.error("erro settling the received amount", error.message)
            if (error instanceof Error) {
                console.error("Error settling the received amount:", error.message);
            }
        }
    }
    useEffect(() => {
        fetchDrivers()
        fetchAdvancePayment()
        fetchCashCollection()
        fetchReceivedData()
    }, [])

    useEffect(() => {
        const inHandAmountForSelectedDriver = drivers.filter((driver) => driver._id === selectedDriver)
        setInHandAmount(inHandAmountForSelectedDriver[0]?.cashInHand ?? 0)
    }, [selectedDriver])

    return (
        <main className='flex flex-col items-center justify-center'>
            <div className='rounded-md shadow-md min-w-[85%] p-5'>
                <p className='text-4xl text-gray-700 uppercase text-center mb-4 font-bold'>Payment Management</p>
                <div className="my-3">
                    <label htmlFor="driverDropdown" className='mb-2 text-base'>Select Driver :</label>
                    <select id="driverDropdown"
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        className="appearance-none bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                    >
                        <option value="" disabled>
                            -- Select a Driver --
                        </option>
                        {drivers?.map((driver) => (
                            <option key={driver._id} value={driver._id}>
                                {driver.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group my-3">
                    <label htmlFor="typeDropdown">Types :</label>
                    <select id="typeDropdown" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                        className="appearance-none bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                    >
                        <option value="" disabled>
                            -- Select a Type --
                        </option>
                        <option value="advance">Advance</option>
                        <option value="salary">Cash Collection</option>
                        <option value="">Expense</option>
                    </select>
                </div>
                {
                    selectedType !== '' && <div className='mt-10'>
                        {
                            selectedType === 'advance' ? (<>
                                <label htmlFor="dateField"
                                    className='my-3 font-semibold'
                                >
                                    Advance Amount : </label>
                                <input
                                    type="text"
                                    id="dateField"
                                    value={amount} // Use the 'date' state variable instead of 'formattedDate'
                                    onChange={(e) => setAmount(+e.target.value)}
                                    className="appearance-none bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                                />
                            </>) : (<>
                                <label htmlFor="dateField"
                                    className='my-3 font-semibold'
                                >
                                    Received Amount:
                                </label>
                                <input
                                    type="number"
                                    id="dateField"
                                    value={receivedAmount} // Use the 'date' state variable instead of 'formattedDate'
                                    onChange={(e) => setReceivedAmount(e.target.value)}
                                    className="appearance-none bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                                />
                                <label htmlFor="dateField"
                                    className='my-3 font-semibold'
                                >
                                    Net Total Amount In Hand:
                                </label>
                                <input
                                    type="number"
                                    id="dateField"
                                    value={inHandAmount}
                                    onChange={(e) => setInHandAmount(+e.target.value)}
                                    className="appearance-none  bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                                />
                            </>)}
                    </div>
                }
                {
                    selectedType !== '' && (<><div style={{ marginBottom: '16px' }}>
                        <label
                            htmlFor="amountField"
                            className='my-3 font-semibold'
                        >
                            Remark
                        </label>
                        <input
                            type="text"
                            id="amountField"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder={'Enter remark'}
                            className="appearance-none bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                        />
                    </div>

                        <button
                            className="w-full btn btn-primary py-3 rounded-md"
                            onClick={selectedType === 'advance' ? createAdvancePayment : settleReceivedAmount}
                        >
                            {selectedType === 'advance' ? 'Add And Settle Amount' : 'Settle Received Amount'}
                        </button></>)
                }
            </div>
            {/* Tabs and Tables */}
            {
                selectedType !== '' && <section className="w-full min-w-[85%] my-7 rounded-md shadow-md p-5 overflow-x-auto">
                    <Tab.Group>
                        <Tab.List className="mt-5 flex justify-evenly w-full">
                            {selectedType === "advance" ? (
                                <>
                                    <Tab
                                        as="button"
                                        className={({ selected }) => `
                                                        ${selected ? "text-gray-700 !outline-none before:!w-full bg-gray-100" : ""} 
                                                        relative flex justify-center text-3xl w-full p-3 rounded   
                                                        before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto 
                                                        before:inline-block before:h-[1px] before:w-0 before:bg-gray-700 
                                                        before:transition-all before:duration-700 hover:text-gray-700 hover:before:w-full
                                        `}
                                    >
                                        Advance Details
                                    </Tab>
                                </>
                            ) : (
                                <>
                                    <Tab
                                        as="button"
                                        className={({ selected }) => `
                                                        ${selected ? "text-gray-700 !outline-none before:!w-full bg-gray-100" : ""} 
                                                        relative flex justify-center text-3xl w-full p-3 rounded   
                                                        before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto 
                                                        before:inline-block before:h-[1px] before:w-0 before:bg-gray-700 
                                                        before:transition-all before:duration-700 hover:text-gray-700 hover:before:w-full
                                    `}
                                    >
                                        Received Details
                                    </Tab>
                                    <Tab
                                        as="button"
                                        className={({ selected }) => `
                                                        ${selected ? "text-gray-700 !outline-none before:!w-full bg-gray-100" : ""} 
                                                        relative flex justify-center text-3xl w-full p-3 rounded
                                                        before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto 
                                                        before:inline-block before:h-[1px] before:w-0 before:bg-gray-700 
                                                        before:transition-all before:duration-700 hover:text-gray-700 hover:before:w-full
                                `}
                                    >
                                        Cash Collection
                                    </Tab>
                                </>
                            )}
                        </Tab.List>
                        <Tab.Panels className="mt-5">
                            <div className='my-5 flex flex-row gap-2'>
                                <button type="button" className="btn btn-primary gap-2">
                                    <IconPrinter />
                                    Print
                                </button>
                                <input type="text" placeholder='Search by Date, Driver, File Number or Received Amount' className='p-3 w-full rounded-md border-2 ' />
                            </div>
                            {selectedType === "advance" ? (
                                <>
                                    <Tab.Panel className="overflow-x-auto">
                                        <DataTable
                                            minHeight={300}
                                            withBorder
                                            withColumnBorders
                                            striped
                                            highlightOnHover
                                            columns={colsForAdvanceDetails}
                                            records={advanceDetails}
                                        />
                                    </Tab.Panel>
                                </>
                            ) : (
                                <>
                                    <Tab.Panel className="overflow-x-auto">
                                        <DataTable
                                            withBorder
                                            withColumnBorders
                                            striped
                                            highlightOnHover
                                            columns={colsForReceivedDetails}
                                            records={receivedDetails}
                                        />
                                    </Tab.Panel>
                                    <Tab.Panel className="overflow-x-auto">
                                        <DataTable
                                            withBorder
                                            withColumnBorders
                                            striped
                                            highlightOnHover
                                            columns={colsForCashCollection}
                                            records={bookings}
                                        />
                                    </Tab.Panel>
                                </>
                            )}
                        </Tab.Panels>
                    </Tab.Group>
                </section>
            }
        </main>
    )
}

export default AdvancePayment