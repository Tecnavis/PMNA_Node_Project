import React, { useEffect, useRef, useState } from 'react';
import { DataTable } from 'mantine-datatable';
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig';
import Swal from 'sweetalert2';
import Loader from '../../components/loader';
import { executeWithRetry, handleNetworkError, offlineQueue } from '../../utils/networkUtils';
import { isAxiosError } from 'axios';
import { PaymentTransaction, Showroom } from './types'; // Import from types
import { PaymentTransactionsColumns } from './constant';
import TableExportButtons from '../../components/TableExportButtons';
import { EmptyState, Field, PageHeader, SearchBox, Section, money, tableProps, usePaged } from '../../components/ui/PageKit';

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

  useEffect(() => {
    if (!selectedShowroom) return;
    const t = setTimeout(() => fetchPaymentTransactions(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const [showroomFilter, setShowroomFilter] = useState('');
  const showroomData = showrooms.find((s) => s._id === selectedShowroom);
  const { pageRows: payRows, paging: payPaging } = usePaged(paymentTransactions || [], 50);
  const withBalance = showrooms.filter((s) => (s.cashInHand || 0) > 0);
  const visibleShowrooms = (() => {
    const q = showroomFilter.trim().toLowerCase();
    const list = q ? showrooms.filter((s) => (s.name || '').toLowerCase().includes(q)) : showrooms;
    return showroomData && !list.includes(showroomData) ? [showroomData, ...list] : list;
  })();
  const afterThis = (Number(currentBalance) || 0) - (Number(collectedAmount) || 0);
  const collectedTotal = paymentTransactions.reduce((a, t: any) => a + (Number(t.collectedAmount) || 0), 0);
  const refLabel = paymentMode === 'bank_transfer' ? 'Transaction reference' : paymentMode === 'upi' ? 'UPI reference' : 'Cheque number';

  return (
    <div>
      <PageHeader
        title="Showroom payments"
        subtitle="Collect amounts that showrooms owe"
        actions={
          <div className="flex gap-4 text-right text-xs">
            <div>
              <div className="text-white-dark">Showrooms with balance</div>
              <div className="text-base font-bold">{withBalance.length}</div>
            </div>
            <div>
              <div className="text-white-dark">Total outstanding</div>
              <div className="text-base font-bold text-danger">{money(withBalance.reduce((a, s) => a + (s.cashInHand || 0), 0))}</div>
            </div>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Section title="Record a collection">
            <div className="space-y-3">
              <Field label="Showroom">
                {showrooms.length > 12 && (
                  <input className="form-input form-input-sm mb-1" placeholder="Filter showrooms…" value={showroomFilter} onChange={(e) => setShowroomFilter(e.target.value)} />
                )}
                <select value={selectedShowroom} onChange={(e) => setSelectedShowroom(e.target.value)} className="form-select" disabled={isSubmitting} aria-label="Select showroom">
                  <option value="">Select showroom</option>
                  {visibleShowrooms.map((showroom) => (
                    <option key={showroom._id} value={showroom._id}>
                      {showroom.name} · {money(showroom.cashInHand)}
                    </option>
                  ))}
                </select>
              </Field>
              {showroomData && (
                <div className="rounded-md bg-danger/10 p-2">
                  <div className="text-[11px] text-white-dark">Current balance</div>
                  <div className="text-lg font-bold text-danger">{money(currentBalance)}</div>
                </div>
              )}
              <Field
                label="Amount collected (₹)"
                hint={collectedAmount ? <span className={afterThis < 0 ? 'text-danger' : 'text-white-dark'}>{afterThis < 0 ? 'More than the balance' : `Balance after this: ${money(afterThis)}`}</span> : undefined}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={collectedAmount}
                  onChange={(e) => setCollectedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="form-input"
                  disabled={isSubmitting || !selectedShowroom}
                  min="0"
                  placeholder="0"
                />
              </Field>
              <Field label="Payment mode">
                <div className="grid grid-cols-4 gap-1">
                  {[
                    ['cash', 'Cash'],
                    ['upi', 'UPI'],
                    ['bank_transfer', 'Bank'],
                    ['cheque', 'Cheque'],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setPaymentMode(v)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${paymentMode === v ? 'border-primary bg-primary/10 text-primary' : 'border-white-light dark:border-[#253b5c]'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              {paymentMode !== 'cash' && (
                <Field label={refLabel}>
                  <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="form-input" disabled={isSubmitting} placeholder={`Enter ${refLabel.toLowerCase()}`} />
                </Field>
              )}
              <Field label="Remark">
                <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className="form-input" disabled={isSubmitting} placeholder="Optional" />
              </Field>
              <button type="button" onClick={collectPayment} disabled={isSubmitting || !selectedShowroom || !collectedAmount} className="btn btn-primary w-full">
                {isSubmitting ? 'Saving…' : 'Record collection'}
              </button>
            </div>
          </Section>
        </div>
        <div className="lg:col-span-2 min-w-0">
          <Section
            title={showroomData ? `${showroomData.name}: payment history` : 'Payment history'}
            actions={showroomData ? <TableExportButtons containerId="showroom-pay-table" title={`${showroomData.name} - payments`} /> : undefined}
            bodyClassName="p-0"
          >
            {!showroomData ? (
              <EmptyState title="Choose a showroom" text="Its collections will show here." />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white-light p-3 dark:border-[#1b2e4b]">
                  <SearchBox value={search} onChange={setSearch} placeholder="Search payment records" className="w-full sm:w-72" />
                  <div className="text-xs text-white-dark">
                    {paymentTransactions.length} {paymentTransactions.length === 1 ? 'payment' : 'payments'} · collected <b className="text-success">{money(collectedTotal)}</b>
                  </div>
                </div>
                <div id="showroom-pay-table" className="datatables">
                  <DataTable {...tableProps} columns={PaymentTransactionsColumns as any} records={payRows} {...payPaging} idAccessor="_id" />
                </div>
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

export default ShowroomPaymentManagement;