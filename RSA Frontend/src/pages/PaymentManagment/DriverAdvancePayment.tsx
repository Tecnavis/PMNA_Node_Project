import React, { useEffect, useRef, useState } from 'react';
import { Tab } from '@headlessui/react';
import { DataTable } from 'mantine-datatable';
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig';
import Driver from '../Driver/Driver';
import { Booking } from '../Bookings/Bookings';
import IconPrinter from '../../components/Icon/IconPrinter';
import { AdvanceDetailsTableColumn, CashCollectionDetailsTableColumn, colsForAdvance, ReceivedDetailsTableColumn } from './constant';
import { AdvanceData, ReceivedDetails, CashCollectionDetails } from './types';
import './AdvancePayment.module.css';
import Staff from '../Staff/Staff';

import Swal from 'sweetalert2';
import { dateFormate } from '../../utils/dateUtils';
import Loader from '../../components/loader';
import { AxiosRequestConfig, isAxiosError } from 'axios';
import { executeWithRetry, handleNetworkError, offlineQueue } from '../../utils/networkUtils';
const getColorForDateTime = (dateTimeString: string) => {
    // Combine both date and time for hashing
    let hash = 0;
    for (let i = 0; i < dateTimeString.length; i++) {
        hash = dateTimeString.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate a pastel color based on the full hash
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 85%)`;
};
const AdvancePayment: React.FC = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [amount, setAmount] = useState<number | ''>('');
    const [advanceDetails, setAdvanceDetails] = useState<AdvanceData[]>([]);
    const [receivedDetails, setReceivedDetails] = useState<ReceivedDetails[]>([]);
    const [cashCollectionDetails, setCashCollectionDetails] = useState<CashCollectionDetails[]>([]);
    const [staffs, setStaffs] = useState<Staff[]>([]);

    const [inHandAmount, setInHandAmount] = useState<number>(0);
    const [receivedAmount, setReceivedAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [remark, setRemark] = useState<string>('');
    const [receivedUserId, setReceivedUserId] = useState<string>('');

    const [search, setSearch] = useState<string>('');
    const role = localStorage.getItem('role');
 const [driverCashInHand, setDriverCashInHand] = useState<number>(0);
    const [validationError, setValidationError] = useState<string>('');
const [isLoading, setIsLoading] = useState(false);

    const [tabIndex, setTabIndex] = useState(0);
    const printRef = useRef<HTMLDivElement>(null);

    // In your component
const colsForAdvanceDetails = AdvanceDetailsTableColumn;
const colsForCashCollection = CashCollectionDetailsTableColumn(staffs); 
const colsForReceivedDetails = ReceivedDetailsTableColumn(staffs);
 const fetchStaffs = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/staff`);
        setStaffs(response.data);
    } catch (error) {
        console.error('Error fetching staffs:', error);
    }
};

useEffect(() => {
    fetchStaffs();
}, []);
const handlePrint = () => {
        if (!printRef.current) return;

        const printContents = printRef.current.innerHTML;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload();
    };

    const fetchDrivers = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/driver`);
            setDrivers(response.data);
            if (drivers.length) {
                updateNetTotalAmount(response.data);
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const fetchAdvancePayment = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/advance-payment`, {
                params: {
                    driverType: 'Driver',
                    driverId: selectedDriver,
                    search: search,
                },
            });
            setAdvanceDetails(res.data.data);
        } catch (error) {
            console.log('error, error fetching advacen payment', error);
        }
    };

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
                    popup: 'small-toast',
                },
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
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            setIsSubmitting(true)
            try {
                await axios.post(`${BASE_URL}/advance-payment`, {
                    advance: amount,
                    driverId: selectedDriver,
                    remark,
                    type: 'Advance',
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Advance payment settled successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });
                fetchAdvancePayment();
                setRemark('');
                setAmount('');
                fetchDrivers();
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: 'Error settling advance payment. Try again.',
                });
                console.error('Advance payment error:', error);
            } finally {
                setIsSubmitting(false)
            }
        }
    };

    const fetchReceivedData = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/cash-received-details`, {
                params: {
                    search: search,
                    driverId: selectedDriver,
                },
            });
            setReceivedDetails(res.data);
        } catch (error) {}
    };
    const fetchCollectionData = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/cash-collection-details`, {
                params: {
                    search: search,
                    driverId: selectedDriver,
                },
            });
            setCashCollectionDetails(res.data);
        } catch (error) {}
    };
      useEffect(() => {
        if (selectedDriver) {
            const selectedDriverData = drivers.find(d => d._id === selectedDriver);
            if (selectedDriverData) {
                setDriverCashInHand(selectedDriverData.cashInHand || 0);
                setInHandAmount(selectedDriverData.cashInHand || 0);
            }
        }
    }, [selectedDriver, drivers]);

    // Validate when receivedAmount changes
    useEffect(() => {
        if (role === 'Staff' && selectedType !== 'advance' && receivedAmount) {
            const enteredAmount = Number(receivedAmount);
            if (Math.abs(enteredAmount - driverCashInHand) > 0.01) {
                setValidationError(`Amount must exactly match driver's cash in hand: ${driverCashInHand}`);
            } else {
                setValidationError('');
            }
        }
    }, [receivedAmount, driverCashInHand, role, selectedType]);

    // ------------------------------------------------------
 
const settleReceivedAmount = async () => {
  // Add validation check before proceeding
  if (role === 'Staff' && validationError) {
    Swal.fire({
      icon: 'error',
      title: 'Validation Error',
      text: validationError,
    });
    return;
  }

  if (!receivedAmount || !remark.trim()) {
    Swal.fire({
      toast: true,
      position: 'top',
      icon: 'warning',
      title: 'All fields are required',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'small-toast',
      },
    });
    return;
  }

  try {
    // Add confirmation dialog
    const confirmation = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to settle ₹${receivedAmount}. This action cannot be undone.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, settle it!',
      cancelButtonText: 'Cancel',
    });

    if (!confirmation.isConfirmed) return;

    setIsSubmitting(true);

    // Prepare the requests
    const receivedDetailsRequest: AxiosRequestConfig = {
      method: 'POST',
      url: `${BASE_URL}/cash-received-details`,
      data: {
        totalAmount: receivedAmount,
        amount: receivedAmount,
        balance: (Number(inHandAmount) || 0) - (Number(receivedAmount) || 0),
        currentNetAmount: inHandAmount,
        driver: selectedDriver,
        receivedAmount,
        remark,
        receivedUser: role,
        receivedUserId,
      }
    };

    const cashCollectionRequest: AxiosRequestConfig = {
      method: 'POST',
      url: `${BASE_URL}/cash-collection-details`,
      data: {
        driverId: selectedDriver,
        receivedAmount,
        remark,
        receivedUser: role,
        receivedUserId,
        totalDriverAmount: receivedAmount,
        currentCashInHand: inHandAmount,
      }
    };

    // Execute with retry logic
    const [receivedDetailsResponse, cashCollectionResponse] = await executeWithRetry(async () => {
      try {
        const results = await Promise.all([
          axios(receivedDetailsRequest),
          axios(cashCollectionRequest)
        ]);
        return results;
      } catch (error) {
        // If offline, add to queue and throw error to trigger retry
        if (!navigator.onLine) {
          offlineQueue.addToQueue(receivedDetailsRequest);
          offlineQueue.addToQueue(cashCollectionRequest);
          throw error;
        }
        throw error;
      }
    });

    // Refresh data
    await Promise.all([
      executeWithRetry(fetchReceivedData),
      executeWithRetry(fetchCollectionData),
      executeWithRetry(fetchDrivers)
    ]);

    // Get updated driver data
    const driverResponse = await executeWithRetry(() => 
      axios.get(`${BASE_URL}/driver/${selectedDriver}`)
    );
    const updatedDriver = driverResponse.data;

    // Reset form with updated values
    setRemark('');
    setReceivedAmount('');
    setInHandAmount(updatedDriver.cashInHand || 0);

    // Show success message
    Swal.fire({
      title: 'Settlement Complete!',
      html: `
        <div class="text-left">
          <p><b>Amount:</b> ₹${receivedAmount}</p>
          <p><b>Processed Bookings:</b> ${cashCollectionResponse.data.processedBookings || 'N/A'}</p>
          <p><b>Remaining Balance:</b> ₹${cashCollectionResponse.data.remainingAmount || 0}</p>
        </div>
      `,
      icon: 'success',
    });

    console.log('Settlement completed:', {
      receivedDetails: receivedDetailsResponse.data,
      cashCollection: cashCollectionResponse.data,
    });

  } catch (error: any) {
    console.error('Settlement error:', {
      error: error.response?.data || error.message,
      request: {
        driver: selectedDriver,
        amount: receivedAmount,
      },
    });

if (isAxiosError(error) && !error.response) {
      // Network error
      const networkError = handleNetworkError(error, {
        endpoint: 'settleReceivedAmount',
        amount: receivedAmount,
        driver: selectedDriver
      });

      Swal.fire({
        title: networkError.title,
        html: `
          <div>
            <p>${networkError.message}</p>
            <p class="text-sm mt-2">Error ID: ${networkError.errorId}</p>
            <p class="text-sm">Your transaction has been queued and will be processed when you're back online.</p>
          </div>
        `,
        icon: 'warning',
      });
    } else {
      // Other errors
      Swal.fire({
        title: 'Settlement Failed',
        text: error.response?.data?.message || error.message || 'Unknown error',
        icon: 'error',
      });
    }
  } finally {
    setIsSubmitting(false);
  }
};
    useEffect(() => {
        fetchDrivers();
    }, []);


    const updateNetTotalAmount = (driver?: Driver[]) => {
        if (driver?.length) {
            const inHandAmountForSelectedDriver = driver.filter((d) => d._id === selectedDriver);
            setInHandAmount(inHandAmountForSelectedDriver[0]?.cashInHand);
        } else {
            const inHandAmountForSelectedDriver = drivers.filter((driver) => driver._id === selectedDriver);
            setInHandAmount(inHandAmountForSelectedDriver[0]?.cashInHand);
        }
    };

    useEffect(() => {
        updateNetTotalAmount();
    }, [selectedDriver]);

    useEffect(() => {
        setSearch('');
    }, [selectedType]);
// --------
 
 // Add selectedType to dependencies
const fetchData = async () => {
    if (!selectedDriver || !selectedType) return;
    
    setIsLoading(true);
    try {
        if (selectedType === 'advance') {
            await fetchAdvancePayment();
        } else {
            await Promise.all([fetchReceivedData(), fetchCollectionData()]);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        setIsLoading(false);
    }
};

// Main data fetching effect
useEffect(() => {
    fetchData();
}, [selectedType, selectedDriver]);

// Search effect
useEffect(() => {
    if (selectedDriver && selectedType) {
        fetchData();
    }
}, [search]);
// -----------------------------------------------
    return (
        <main className="flex flex-col items-center justify-center">
            <div className="rounded-md shadow-md min-w-[85%] p-5">
                <p className="text-4xl text-gray-700 uppercase text-center mb-4 font-bold">Payment Management</p>
                <div className="my-3">
                    <label htmlFor="driverDropdown" className="mb-2 text-base">
                        Select Driver :
                    </label>
                    <select
                        id="driverDropdown"
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
                    <select
                        id="typeDropdown"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
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
                {selectedType !== '' && (
                    <div className="mt-10">
                        {selectedType === 'advance' ? (
                            <>
                                <label htmlFor="dateField" className="my-3 font-semibold">
                                    Advance Amount :{' '}
                                </label>
                                <input
                                    type="text"
                                    id="dateField"
                                    value={amount}
                                    onChange={(e) => setAmount(+e.target.value)}
                                    className="appearance-none bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                                />
                            </>
                        ) : (
                            <>
                                <label htmlFor="dateField" className="my-3 font-semibold">
                                    Received Amount:
                                </label>
                                <input
                                    type="number"
                                    id="dateField"
                                    value={receivedAmount}
                                    onChange={(e) => setReceivedAmount(e.target.value)}
                                   className="appearance-none bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                    />
                                <label htmlFor="dateField" className="my-3 font-semibold">
                                    Net Total Amount In Hand:
                                </label>
                                <input
                                    type="number"
                                    id="dateField"
                                    value={inHandAmount}
                                    onChange={(e) => setInHandAmount(+e.target.value)}
                                    className="appearance-none  bg-white bg-no-repeat bg-right pr-10 border-2 border-gray-300 p-2 w-full rounded-lg text-base transition-all focus:outline-none"
                                />
                                  {validationError && (
                        <div className="text-red-500 text-sm mt-1">{validationError}</div>
                    )}
                            </>
                        )}
                    </div>
                )}
                {selectedType !== '' && (
                    <>
                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="amountField" className="my-3 font-semibold">
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
                            disabled={isSubmitting}
                        >
                            {
                                isSubmitting ? (
                                    <Loader />
                                ) : (
                                    /* Show normal button text when not submitting */
                                    selectedType === 'advance' ? 'Add And Settle Amount' : 'Settle Received Amount'
                                )
                            }
                        </button></>)
                }
            </div>
            {/* Tabs and Tables */}
            {/* Tabs and Tables */}

            {selectedType !== '' && (
                <section className="w-full min-w-[85%] my-7 rounded-md shadow-md p-5 overflow-x-auto">
                    <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
                        <Tab.List className="mt-5 flex justify-evenly w-full">
                            {selectedType === 'advance' ? (
                                <>
                                    <Tab
                                        as="button"
                                        className={({ selected }) => `
                                                        ${selected ? 'text-gray-700 !outline-none before:!w-full bg-gray-100' : ''} 
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
                                                        ${selected ? 'text-gray-700 !outline-none before:!w-full bg-gray-100' : ''} 
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
                                                        ${selected ? 'text-gray-700 !outline-none before:!w-full bg-gray-100' : ''} 
                                                        relative flex justify-center text-3xl w-full p-3 rounded   
                                                        before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto 
                                                        before:inline-block before:h-[1px] before:w-0 before:bg-gray-700 
                                                        before:transition-all before:duration-700 hover:text-gray-700 hover:before:w-full
                                    `}
                                    >
                                        Cash Collection
                                    </Tab>
                                    <Tab
                                        as="button"
                                        className={({ selected }) => `
                                                        ${selected ? 'text-gray-700 !outline-none before:!w-full bg-gray-100' : ''} 
                                                        relative flex justify-center text-3xl w-full p-3 rounded
                                                        before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto 
                                                        before:inline-block before:h-[1px] before:w-0 before:bg-gray-700 
                                                        before:transition-all before:duration-700 hover:text-gray-700 hover:before:w-full
                                `}
                                    >
                                        Received Details
                                    </Tab>
                                </>
                            )}
                        </Tab.List>
                        <Tab.Panels className="mt-5">
                            <div className="my-5 flex flex-row gap-2">
                                {selectedType !== 'advance' && (
                                    <button type="button" className="btn btn-primary gap-2" onClick={handlePrint}>
                                        <IconPrinter />
                                        Print
                                    </button>
                                )}
                                <input
                                    type="text"
                                    placeholder="Search by Driver or File Number"
                                    className="p-3 w-full rounded-md border-2 "
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            {selectedType === 'advance' ? (
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
                                            rowStyle={(record) => ({
                                                backgroundColor: getColorForDateTime(record.createdAt.toString()),

                                            })}
                                        />
                                    </Tab.Panel>
                                    <Tab.Panel className="overflow-x-auto">
                                        <DataTable minHeight={300} withBorder withColumnBorders striped highlightOnHover columns={colsForAdvance} records={advanceDetails} />
                                    </Tab.Panel>
                                </>
                            ) : (
                                <>
                                    <div ref={tabIndex === 0 ? printRef : null} className="">
                                        <h1 className="hidden print:block text-2xl font-bold text-center mb-2">Received Details</h1>
                                           <Tab.Panel className="overflow-x-auto">
                                            <DataTable
                                                withBorder
                                                withColumnBorders
                                                striped
                                                highlightOnHover
                                                columns={colsForCashCollection}
                                                records={cashCollectionDetails}
                                                rowStyle={(record) => ({
                                                    backgroundColor: getColorForDateTime(record.createdAt.toString()),

                                                })}
                                            />
                                        </Tab.Panel>
                                    </div>
                                    <div ref={tabIndex === 1 ? printRef : null} className="w-full overflow-x-auto print:overflow-visible print:w-full print:whitespace-normal print:text-sm">
                                        <h1 className="hidden print:block text-2xl font-bold text-center mb-2">Cash Collection</h1>
                                        <Tab.Panel className="overflow-x-auto">
                                            <DataTable
                                                withBorder
                                                withColumnBorders
                                                striped
                                                highlightOnHover
                                                columns={colsForReceivedDetails}
                                                records={receivedDetails}
                                                rowStyle={(record) => ({
                                                    backgroundColor: getColorForDateTime(record.createdAt.toString()),

                                                })}
                                            />
                                        </Tab.Panel>
                                    </div>
                                </>
                            )}
                        </Tab.Panels>
                    </Tab.Group>
                </section>
            )}
        </main>
    );
};

export default AdvancePayment;
