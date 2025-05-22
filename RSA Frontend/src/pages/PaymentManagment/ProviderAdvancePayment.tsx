import React, { useEffect, useRef, useState } from 'react'
import { Tab } from '@headlessui/react';
import { DataTable } from 'mantine-datatable';
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig';
import Driver from '../Driver/Driver';
import IconPrinter from '../../components/Icon/IconPrinter';
import { AdvanceDetailsTableColumn, CashCollectionDetailsTableColumn, colsForAdvance, ReceivedDetailsTableColumn } from './constant'
import { AdvanceData, ReceivedDetails } from './types';
import './AdvancePayment.module.css'
import Swal from 'sweetalert2';

const AdvancePayment: React.FC = () => {

    const [providers, setProviders] = useState<Driver[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [amount, setAmount] = useState<number | ''>('');
    const [advanceDetails, setAdvanceDetails] = useState<AdvanceData[]>([]);
    const [receivedDetails, setReceivedDetails] = useState<ReceivedDetails[]>([]);
    const [inHandAmount, setInHandAmount] = useState<number>(0);
    const [receivedAmount, setReceivedAmount] = useState<string>('');
    const [remark, setRemark] = useState<string>('');
    const [search, setSearch] = useState<string>('');

    const [tabIndex, setTabIndex] = useState(0);
    const printRef = useRef<HTMLDivElement>(null);

    // creating columns 
    const colsForAdvanceDetails = AdvanceDetailsTableColumn.map((col) => col)
    const colsForCashCollection = CashCollectionDetailsTableColumn.map((col) => col)
    const colsForReceivedDetails = ReceivedDetailsTableColumn.map((col) => col)

    const handlePrint = () => {
        if (!printRef.current) return;

        const printContents = printRef.current.innerHTML;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload();
    };

    const fetchProviders = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/provider`);
            setProviders(response.data);
            if (providers.length) {
                updateNetTotalAmount(response.data)
            }
        } catch (error) {
            console.error('Error fetching providers:', error);
        }
    };

    const fetchAdvancePayment = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/advance-payment`, {
                params: {
                    driverType: "Provider",
                    driverId: selectedProvider,
                    search: search
                }
            })
            setAdvanceDetails(res.data.data);
        } catch (error) {
            console.log('error, error fetching advacen payment', error)
        }
    }

    const createAdvancePayment = async () => {
        if (!amount || !remark.trim()) {
            Swal.fire({
                toast: true,
                position: 'top',
                icon: 'warning',
                title: 'All fields are required',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                customClass: {
                    popup: 'small-toast'
                }
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to settle an advance payment of ₹${amount}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, confirm',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                await axios.post(`${BASE_URL}/advance-payment`, {
                    advance: amount,
                    driverId: selectedProvider,
                    remark,
                    type: 'Advance'
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Advance payment settled successfully',
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchAdvancePayment();
                setRemark('');
                setAmount('');
                fetchProviders();
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: 'Error settling advance payment. Try again.',
                });
                console.error('Advance payment error:', error);
            }
        }
    };

    const fetchReceivedData = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/cash-received-details`, {
                params: {
                    search: search,
                    driverId: selectedProvider,
                }
            })
            setReceivedDetails(res.data)
        } catch (error) {

        }
    }

    const settleReceivedAmount = async () => {
        try {
            if (!receivedAmount || !remark.trim()) {
                Swal.fire({
                    toast: true,
                    position: 'top',
                    icon: 'warning', // or 'success', 'error', 'info'
                    title: 'All fields are required',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    // background: '#fff',
                    customClass: {
                        popup: 'small-toast'
                    }
                });
                return
            }

            const res = await axios.post(`${BASE_URL}/cash-received-details`, {
                amount: receivedAmount,
                balance: ((Number(inHandAmount) || 0) - (Number(receivedAmount) || 0)),
                currentNetAmount: inHandAmount,
                driver: selectedProvider,
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
        fetchProviders()
        fetchAdvancePayment()
        fetchReceivedData()
    }, [])

    const updateNetTotalAmount = (provider?: Driver[]) => {
        if (provider?.length) {
            const inHandAmountForSelectedProvider = provider.filter((d) => d._id === selectedProvider)
            console.log('inHandAmountForSelectedProvider', inHandAmountForSelectedProvider[0]?.cashInHand)
            setInHandAmount(inHandAmountForSelectedProvider[0]?.cashInHand)
        } else {

            const inHandAmountForSelectedProvider = providers?.filter((provider) => provider._id === selectedProvider)
            setInHandAmount(inHandAmountForSelectedProvider[0]?.cashInHand)
        }
    }

    useEffect(() => {
        updateNetTotalAmount()
    }, [selectedProvider])


    useEffect(() => {
        fetchProviders()
    }, [])

    useEffect(() => {
        if (selectedType !== '' || selectedProvider !== '') {
            fetchAdvancePayment()
            fetchReceivedData()
        }
    }, [selectedType, selectedProvider])

    useEffect(() => {
        setSearch('')
    }, [selectedType])

    useEffect(() => {
        if (selectedType == 'advance') {
            fetchAdvancePayment()
        } else {
            fetchReceivedData()
        }
    }, [search])

    return (
        <main className='flex flex-col items-center justify-center'>
            <div className='rounded-md shadow-md min-w-[85%] p-5'>
                <p className='text-4xl text-gray-700 uppercase text-center mb-4 font-bold'>Payment Management</p>
                <div className="my-3">
                    <label htmlFor="driverDropdown" className='mb-2 text-base'>Select Provider :</label>
                    <select id="driverDropdown"
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="appearance-none bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                    >
                        <option value="" disabled>
                            -- Select a Provider --
                        </option>
                        {providers?.map((provider) => (
                            <option key={provider._id} value={provider._id}>
                                {provider.name}
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
                        {/* <option value="salary">Cash Collection</option>
                        <option value="">Expense</option> */}
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
                                    value={amount}
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
                                    value={receivedAmount}
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
                    <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
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
                                        Advance
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
                                {
                                    selectedType !== 'advance' && (
                                        <button
                                            type="button"
                                            className="btn btn-primary gap-2"
                                            onClick={handlePrint}
                                        >
                                            <IconPrinter />
                                            Print
                                        </button>)
                                }
                                <input
                                    type="text"
                                    placeholder='Search by Driver or File Number'
                                    className='p-3 w-full rounded-md border-2 '
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
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
                                    <Tab.Panel className="overflow-x-auto">
                                        <DataTable
                                            minHeight={300}
                                            withBorder
                                            withColumnBorders
                                            striped
                                            highlightOnHover
                                            columns={colsForAdvance}
                                            records={advanceDetails}
                                        />
                                    </Tab.Panel>
                                </>
                            ) : (
                                <>
                                    <div ref={tabIndex === 0 ? printRef : null} className=''>
                                        <h1 className="hidden print:block text-2xl font-bold text-center mb-2">
                                            Received Details
                                        </h1>
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
                                    </div>
                                    <div ref={tabIndex === 1 ? printRef : null} className='w-full overflow-x-auto print:overflow-visible print:w-full print:whitespace-normal print:text-sm'>
                                        <h1 className="hidden print:block text-2xl font-bold text-center mb-2">
                                            Cash Collection
                                        </h1>
                                        <Tab.Panel className="overflow-x-auto">
                                            <DataTable
                                                withBorder
                                                withColumnBorders
                                                striped
                                                highlightOnHover
                                                columns={colsForCashCollection}
                                                records={receivedDetails}
                                            />
                                        </Tab.Panel>
                                    </div>
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