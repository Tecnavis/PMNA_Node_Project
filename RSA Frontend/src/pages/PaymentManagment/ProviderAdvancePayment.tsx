import React, { useEffect, useRef, useState } from 'react';
import { Tab } from '@headlessui/react';
import { DataTable } from 'mantine-datatable';
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig';
import { Booking } from '../Bookings/Bookings';
import Provider from '../Provider/Provider';

import IconPrinter from '../../components/Icon/IconPrinter';
import { AdvanceDetailsTableColumn, CashCollectionDetailsTableColumn, colsForAdvance, ReceivedDetailsTableColumn } from './constant';
import { AdvanceData, ReceivedDetails, CashCollectionDetails } from './types';
import './AdvancePayment.module.css';
import CashDesk from './CashDesk';
import Staff from '../Staff/Staff';

import Swal from 'sweetalert2';
import { dateFormate } from '../../utils/dateUtils';
import Loader from '../../components/loader';

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
interface Provider {
  _id: string;
  name: string;
  cashInHand: number;
  advance?: number;
    companyName: string;
    baseLocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    };
    idNumber: string;
    creditAmountLimit: number;
    phone: string;
    personalPhoneNumber: string;
    image: string;
}
const AdvancePayment: React.FC = () => {
const [providers, setProviders] = useState<Provider[]>([]); // Use proper Provider type
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('salary');
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
const [providerCashInHand, setProviderCashInHand] = useState<number>(0); // Renamed from driverCashInHand
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
// Add this function to fetch all providers
const fetchAllProviders = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/provider`);
    setProviders(response.data);
      if (providers.length) {
                updateNetTotalAmount(response.data);
            }
  } catch (error) {
    console.error('Error fetching providers:', error);
  }
};


   const fetchProviderData = async () => {
    if (!selectedProvider) return;
    try {
        const response = await axios.get(`${BASE_URL}/provider/${selectedProvider}`);
        const updatedProvider = response.data;
        setProviderCashInHand(updatedProvider.cashInHand || 0);
        setInHandAmount(updatedProvider.cashInHand || 0);
    } catch (error) {
        console.error('Error fetching provider data:', error);
    }
};
// Update your useEffect to call the correct function
useEffect(() => {
  fetchAllProviders(); // Changed from fetchProviderData()
}, []);
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
                    driverId: selectedProvider,
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
                fetchProviderData();
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
                    providerId: selectedProvider,
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
                    providerId: selectedProvider,
                },
            });
            setCashCollectionDetails(res.data);
        } catch (error) {}
    };
      useEffect(() => {
        if (selectedProvider) {
            const selectedDriverData = providers.find(d => d._id === selectedProvider);
            if (selectedDriverData) {
                setProviderCashInHand(selectedDriverData.cashInHand || 0);
                setInHandAmount(selectedDriverData.cashInHand || 0);
            }
        }
    }, [selectedProvider, providers]);

    // Validate when receivedAmount changes
   useEffect(() => {
    if (role === 'Staff' && selectedType !== 'advance' && receivedAmount) {
        const enteredAmount = Number(receivedAmount);
        if (Math.abs(enteredAmount - providerCashInHand) > 0.01) {
            setValidationError(`Amount must exactly match provider's cash in hand: ${providerCashInHand}`);
        } else {
            setValidationError('');
        }
    }
}, [receivedAmount, providerCashInHand, role, selectedType]);
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
        try {
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

            if (confirmation.isConfirmed) {
                            setIsSubmitting(true); // Start loading

                // First create the cash received details
                 const receivedDetailsResponse = await axios.post(`${BASE_URL}/cash-received-details`, {
            totalAmount: receivedAmount,
            amount: receivedAmount,
            balance: (Number(inHandAmount) || 0) - (Number(receivedAmount) || 0),
            currentNetAmount: inHandAmount,
            provider: selectedProvider, // Changed from driver to provider
            receivedAmount,
            remark,
            receivedUser: role,
            receivedUserId,
        });

                // Then create cash collection record
                const cashCollectionResponse = await axios.post(`${BASE_URL}/cash-collection-details`, {
           providerId: selectedProvider, // Changed from providerId to match backend
  receivedAmount, // Ensure number
  remark,
  receivedUser: role,
  receivedUserId,
 totalDriverAmount: receivedAmount, // Changed from totalDriverAmount
  currentCashInHand: inHandAmount,
});

                // Refresh data
                await Promise.all([fetchReceivedData(), fetchCollectionData(), fetchProviderData()]);
 // Get the updated driver data to set the new inHandAmount
            const driverResponse = await axios.get(`${BASE_URL}/provider/${selectedProvider}`);
            const updatedDriver = driverResponse.data;
            
            // Reset form with updated values
            setRemark('');
            setReceivedAmount('');
            setInHandAmount(updatedDriver.cashInHand || 0); // Set to current cash in hand

                Swal.fire({
                    title: 'Settlement Complete!',
                    html: `
                    <div class="text-left">
                        <p><b>Amount:</b> ₹${receivedAmount}</p>
                        <p><b>Processed Bookings:</b> ${cashCollectionResponse.data.processedBookings}</p>
                        <p><b>Remaining Balance:</b> ₹${cashCollectionResponse.data.remainingAmount || 0}</p>
                    </div>
                `,
                    icon: 'success',
                });

                console.log('Settlement completed:', {
                    receivedDetails: receivedDetailsResponse.data,
                    cashCollection: cashCollectionResponse.data,
                });
            }
        } catch (error: any) {
            console.error('Settlement error:', {
                error: error.response?.data || error.message,
                request: {
                    driver: selectedProvider,
                    amount: receivedAmount,
                },
            });

            Swal.fire({
                title: 'Settlement Failed',
                text: error.response?.data?.message || error.message || 'Unknown error',
                icon: 'error',
            });
         } finally {
        setIsSubmitting(false); // Stop loading regardless of success/error
    }
    };

    useEffect(() => {
        fetchProviderData()
    }, []);


    const updateNetTotalAmount = (provider?: Provider[]) => {
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
        updateNetTotalAmount();
    }, [selectedProvider]);

    useEffect(() => {
        setSearch('');
    }, [selectedType]);
// --------
 
 // Add selectedType to dependencies
const fetchData = async () => {
    if (!selectedProvider || !selectedType) return;
    
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
}, [selectedType, selectedProvider]);

// Search effect
useEffect(() => {
    if (selectedProvider && selectedType) {
        fetchData();
    }
}, [search]);
// -----------------------------------------------
    const partyList = providers.map((d: any) => ({ _id: d._id, name: d.name, cashInHand: d.cashInHand, advance: d.advance, phone: d.phone }));
    const historyTabs =
        selectedType === 'advance'
            ? [
                  { label: 'Advance details', columns: colsForAdvanceDetails as any, records: advanceDetails },
                  { label: 'Salary deductions', columns: colsForAdvance as any, records: advanceDetails },
              ]
            : [
                  { label: 'Cash collection', columns: colsForCashCollection as any, records: cashCollectionDetails },
                  { label: 'Received details', columns: colsForReceivedDetails as any, records: receivedDetails },
              ];
    return (
        <CashDesk
            title="Provider payments"
            subtitle="Collect cash from service providers"
            partyLabel="Provider"
            parties={partyList}
            selectedId={selectedProvider}
            onSelect={setSelectedProvider}
            types={[{ value: 'salary', label: 'Cash collection' }]}
            selectedType={selectedType}
            onType={(t) => {
                setSelectedType(t);
                setTabIndex(0);
            }}
            amount={amount}
            setAmount={setAmount}
            receivedAmount={receivedAmount}
            setReceivedAmount={setReceivedAmount}
            inHandAmount={inHandAmount}
            setInHandAmount={setInHandAmount}
            validationError={validationError}
            remark={remark}
            setRemark={setRemark}
            isSubmitting={isSubmitting}
            onSubmit={selectedType === 'advance' ? createAdvancePayment : settleReceivedAmount}
            tabs={historyTabs}
            tabIndex={tabIndex}
            setTabIndex={setTabIndex}
            search={search}
            setSearch={setSearch}
            loading={isLoading}
        />
    );
};

export default AdvancePayment;
