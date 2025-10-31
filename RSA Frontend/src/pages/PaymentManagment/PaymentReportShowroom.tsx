import React, { useEffect, useRef, useState } from 'react';
import { DataTable } from 'mantine-datatable';
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig';
import Swal from 'sweetalert2';
import Loader from '../../components/loader';
import { executeWithRetry, handleNetworkError, offlineQueue } from '../../utils/networkUtils';
import { isAxiosError } from 'axios';
import { PaymentTransaction, Showroom } from './types'; // Import from types
import { PaymentTransactionsColumns } from './constant';

const getColorForDateTime = (dateTimeString: string) => {
  let hash = 0;
  for (let i = 0; i < dateTimeString.length; i++) {
    hash = dateTimeString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 85%)`;
};

const ShowroomPaymentManagement: React.FC = () => {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [selectedShowroom, setSelectedShowroom] = useState<string>('');
  const [collectedAmount, setCollectedAmount] = useState<number | ''>('');
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [remark, setRemark] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  const fetchShowrooms = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/showroom`);
      setShowrooms(response.data);
    } catch (error) {
      console.error('Error fetching showrooms:', error);
      Swal.fire('Error', 'Failed to load showroom data', 'error');
    }
  };

const fetchPaymentTransactions = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/showroom-payments`, {
      params: {
        search,
        showroomId: selectedShowroom,
      },
    });
    
    console.log('API response:', res.data); // Debug log
    
    // Change this line:
    setPaymentTransactions(res.data.data); // If backend returns { data: payments }
    // To:
    setPaymentTransactions(res.data.data || []); // Or whatever the actual structure is
  } catch (error) {
    console.error('Error fetching payment transactions:', error);
    Swal.fire('Error', 'Failed to load payment history', 'error');
  }
};

  const collectPayment = async () => {
    // Input validation
    if (!selectedShowroom || !collectedAmount || collectedAmount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select a showroom and enter a valid amount',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const selectedShowroomData = showrooms.find((s) => s._id === selectedShowroom);
    const currentCashInHand = selectedShowroomData?.cashInHand || 0;

    // Amount validation
    if (Number(collectedAmount) > currentCashInHand) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Amount',
        text: `Cannot collect more than current balance (₹${currentCashInHand})`,
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const newBalance = currentCashInHand - Number(collectedAmount);

    // Confirmation dialog
    const confirmation = await Swal.fire({
      title: 'Confirm Payment Collection',
      html: `
        <div class="text-left">
          <p><strong>Showroom:</strong> ${selectedShowroomData?.name}</p>
          <p><strong>Amount Collected:</strong> ₹${collectedAmount}</p>
          <p><strong>Current Balance:</strong> ₹${currentCashInHand}</p>
          <p><strong>New Balance:</strong> ₹${newBalance}</p>
          <p><strong>Payment Mode:</strong> ${paymentMode}</p>
          ${referenceNumber ? `<p><strong>Reference:</strong> ${referenceNumber}</p>` : ''}
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
      // Prepare the request
      const requestData = {
        showroomId: selectedShowroom,
        collectedAmount,
        previousBalance: currentCashInHand,
        newBalance,
        paymentMode,
        referenceNumber,
        remark,
      };

      // Execute with retry logic
      const response = await executeWithRetry(async () => {
        try {
          return await axios.post(`${BASE_URL}/showroom-payments`, requestData);
        } catch (error) {
          if (!navigator.onLine) {
            // Queue the request if offline
            offlineQueue.addToQueue({
              method: 'POST',
              url: `${BASE_URL}/showroom-payments`,
              data: requestData
            });
            
            throw error;
          }
          throw error;
        }
      });

      // Refresh data with retry capability
      await Promise.all([
        executeWithRetry(fetchShowrooms),
        executeWithRetry(fetchPaymentTransactions)
      ]);

      // Reset form
      setCollectedAmount('');
      setRemark('');
      setReferenceNumber('');
      setPaymentMode('cash');

      // Success notification
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        html: `
          <div class="text-left">
            <p><strong>Amount Collected:</strong> ₹${collectedAmount}</p>
            <p><strong>Showroom:</strong> ${selectedShowroomData?.name}</p>
            <p><strong>New Balance:</strong> ₹${newBalance}</p>
            <p><strong>Payment Mode:</strong> ${paymentMode}</p>
          </div>
        `,
        confirmButtonColor: '#3085d6',
      });

    } catch (error: any) {
      console.error('Collection error:', {
        error: error.response?.data || error.message,
        request: {
          showroom: selectedShowroom,
          amount: collectedAmount,
        },
      });

      if (isAxiosError(error) && !error.response) {
        // Network error handling
        const networkError = handleNetworkError(error, {
          endpoint: 'showroom-payments',
          amount: collectedAmount,
          showroom: selectedShowroom
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
        // Other error handling
        let errorMessage = error.response?.data?.message || 'Failed to record payment collection';
        
        // Handle specific backend error codes
        if (error.response?.data?.code === 'INSUFFICIENT_FUNDS') {
          errorMessage = `Showroom only has ₹${error.response.data.currentBalance} available`;
        } else if (error.response?.data?.code === 'SHOWROOM_NOT_FOUND') {
          errorMessage = 'Showroom not found in system';
        }

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonColor: '#3085d6',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchShowrooms();
  }, []);

  useEffect(() => {
    if (selectedShowroom) {
      const selected = showrooms.find((s) => s._id === selectedShowroom);
      setCurrentBalance(selected?.cashInHand || 0);
      fetchPaymentTransactions();
    }
  }, [selectedShowroom, showrooms]);

  return (
    <main className="flex flex-col items-center justify-center">
      <div className="rounded-md shadow-md min-w-[85%] p-5">
        <h1 className="text-4xl text-gray-700 uppercase text-center mb-4 font-bold">Showroom Payment Management</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-2 text-sm font-medium">Select Showroom</label>
            <select 
              value={selectedShowroom} 
              onChange={(e) => setSelectedShowroom(e.target.value)} 
              className="w-full p-2 border rounded-lg" 
              disabled={isSubmitting}
            >
              <option value="">-- Select Showroom --</option>
              {showrooms.map((showroom) => (
                <option key={showroom._id} value={showroom._id}>
                  {showroom.name} (₹{showroom.cashInHand || 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Current Balance</label>
            <input 
              type="number" 
              value={currentBalance} 
              readOnly 
              className="w-full p-2 border rounded-lg bg-gray-100" 
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Collected Amount</label>
            <input
              type="number"
              value={collectedAmount}
              onChange={(e) => setCollectedAmount(Number(e.target.value))}
              className="w-full p-2 border rounded-lg"
              disabled={isSubmitting || !selectedShowroom}
              min="0"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full p-2 border rounded-lg"
              disabled={isSubmitting}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {paymentMode !== 'cash' && (
            <div>
              <label className="block mb-2 text-sm font-medium">
                {paymentMode === 'bank_transfer' ? 'Transaction Reference' : 
                 paymentMode === 'upi' ? 'UPI Reference' : 'Cheque Number'}
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full p-2 border rounded-lg"
                disabled={isSubmitting}
                placeholder={`Enter ${paymentMode === 'bank_transfer' ? 'transaction reference' : 
                paymentMode === 'upi' ? 'UPI reference' : 'cheque number'}`}
              />
            </div>
          )}

          <div>
            <label className="block mb-2 text-sm font-medium">Remarks</label>
            <input 
              type="text" 
              value={remark} 
              onChange={(e) => setRemark(e.target.value)} 
              className="w-full p-2 border rounded-lg" 
              disabled={isSubmitting} 
              placeholder="Enter remarks" 
            />
          </div>
        </div>

        <button
          onClick={collectPayment}
          disabled={isSubmitting || !selectedShowroom || !collectedAmount}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {isSubmitting ? <Loader /> : 'Record Payment Collection'}
        </button>
      </div>

      {/* Payment Transactions Table */}
      <div className="w-full min-w-[85%] my-7 rounded-md shadow-md p-5">
        <div className="mb-4">
          <input 
            type="text" 
            placeholder="Search payment records..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full p-2 border rounded-lg" 
          />
        </div>

        <div ref={printRef}>
          <DataTable
            withBorder
            withColumnBorders
            striped
            highlightOnHover
            columns={PaymentTransactionsColumns}
            records={paymentTransactions}
            rowStyle={(record) => ({
              backgroundColor: getColorForDateTime(record.createdAt.toString()),
            })}
          />
        </div>
      </div>
    </main>
  );
};

export default ShowroomPaymentManagement;