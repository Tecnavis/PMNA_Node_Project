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
import { executeWithRetry, handleNetworkError, offlineQueue } from '../../utils/networkUtils';
import { isAxiosError } from 'axios';
import TableExportButtons from '../../components/TableExportButtons';
import { EmptyState, Field, PageHeader, SearchBox, Section, money, tableProps } from '../../components/ui/PageKit';

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
  // Input validation
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

  // Amount validation
  if (Number(receivedAmount) > currentCashInHand) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid Amount',
      text: `Cannot collect more than current balance (₹${currentCashInHand})`,
      confirmButtonColor: '#3085d6',
    });
    return;
  }

  const newBalance = currentCashInHand - Number(receivedAmount);

  // Confirmation dialog
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
    // Prepare the request
    const requestData = {
      staffId: selectedStaff,
      givenAmountToStaff: receivedAmount,
      totalStaffAmount: currentCashInHand,
      remark,
      currentCashInHand,
    };
console.log("requestData.................................",requestData)
    // Execute with retry logic
    const response = await executeWithRetry(async () => {
      try {
        return await axios.post(`${BASE_URL}/cash-received-details-staff`, requestData);
      } catch (error) {
        if (!navigator.onLine) {
          // Queue the request if offline
          offlineQueue.addToQueue({
            method: 'POST',
            url: `${BASE_URL}/cash-received-details-staff`,
            data: requestData
          });
          
          throw error;
        }
        throw error;
      }
    });

    // Refresh data with retry capability
    await Promise.all([
      executeWithRetry(fetchStaffs),
      executeWithRetry(fetchReceivedDetails)
    ]);

    // Reset form
    setReceivedAmount('');
    setRemark('');

    // Success notification
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      html: `
        <div class="text-left">
          <p><strong>Amount Collected:</strong> ₹${receivedAmount}</p>
          <p><strong>Staff:</strong> ${selectedStaffData?.name}</p>
          <p><strong>New Balance:</strong> ₹${newBalance}</p>
          ${response.data.remainingAmount > 0 ? 
            `<p class="text-warning"><strong>Warning:</strong> ₹${response.data.remainingAmount} could not be fully allocated</p>` : 
            ''}
          ${response.data.distribution ? 
            `<div class="mt-2">
              <p><strong>Distribution:</strong></p>
              <p>- Bookings: ₹${response.data.distribution.bookings.total} (${response.data.distribution.bookings.count})</p>
              <p>- Advance Deduction: ₹${response.data.distribution.advanceDeductionApplied}</p>
            </div>` : 
            ''}
        </div>
      `,
      confirmButtonColor: '#3085d6',
    });

  } catch (error: any) {
    console.error('Collection error:', {
      error: error.response?.data || error.message,
      request: {
        staff: selectedStaff,
        amount: receivedAmount,
      },
    });

    if (isAxiosError(error) && !error.response) {
      // Network error handling
      const networkError = handleNetworkError(error, {
        endpoint: 'cash-received-details-staff',
        amount: receivedAmount,
        staff: selectedStaff
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
      let errorMessage = error.response?.data?.message || 'Failed to record cash collection';
      
      // Handle specific backend error codes
      if (error.response?.data?.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = `Staff only has ₹${error.response.data.currentBalance} available`;
      } else if (error.response?.data?.code === 'STAFF_NOT_FOUND') {
        errorMessage = 'Staff member not found in system';
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

    // search the history as the user types (it used to only search when the staff changed)
    useEffect(() => {
        if (!selectedStaff) return;
        const t = setTimeout(() => fetchReceivedDetails(), 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const staffData = staffs.find((s) => s._id === selectedStaff);
    const withCash = staffs.filter((s) => (s.cashInHand || 0) > 0);
    const afterThis = (Number(inHandAmount) || 0) - (Number(receivedAmount) || 0);

    return (
        <div>
            <PageHeader
                title="Staff payments"
                subtitle="Collect cash that staff members are holding"
                actions={
                    <div className="flex gap-4 text-right text-xs">
                        <div>
                            <div className="text-white-dark">Staff holding cash</div>
                            <div className="text-base font-bold">{withCash.length}</div>
                        </div>
                        <div>
                            <div className="text-white-dark">Total with staff</div>
                            <div className="text-base font-bold text-danger">{money(withCash.reduce((a, s) => a + (s.cashInHand || 0), 0))}</div>
                        </div>
                    </div>
                }
            />
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <Section title="Record cash received">
                        <div className="space-y-3">
                            <Field label="Staff member">
                                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="form-select" disabled={isSubmitting} aria-label="Select staff">
                                    <option value="">Select staff</option>
                                    {staffs.map((staff) => (
                                        <option key={staff._id} value={staff._id}>
                                            {staff.name} · {money(staff.cashInHand)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            {staffData && (
                                <div className="rounded-md bg-danger/10 p-2">
                                    <div className="text-[11px] text-white-dark">Current balance with {staffData.name}</div>
                                    <div className="text-lg font-bold text-danger">{money(inHandAmount)}</div>
                                </div>
                            )}
                            <Field
                                label="Amount received (₹)"
                                hint={receivedAmount ? <span className={afterThis < 0 ? 'text-danger' : 'text-white-dark'}>{afterThis < 0 ? 'More than the balance' : `Balance after this: ${money(afterThis)}`}</span> : undefined}
                            >
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    value={receivedAmount}
                                    onChange={(e) => setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="form-input"
                                    disabled={isSubmitting || !selectedStaff}
                                    min="0"
                                    placeholder="0"
                                />
                            </Field>
                            <Field label="Remark">
                                <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className="form-input" disabled={isSubmitting} placeholder="e.g. Handed over at office" />
                            </Field>
                            <button type="button" onClick={settleReceivedAmount} disabled={isSubmitting || !selectedStaff || !receivedAmount} className="btn btn-primary w-full">
                                {isSubmitting ? 'Saving…' : 'Record cash received'}
                            </button>
                        </div>
                    </Section>
                </div>
                <div className="lg:col-span-2 min-w-0">
                    <Section
                        title={staffData ? `${staffData.name}: received history` : 'Received history'}
                        actions={staffData ? <TableExportButtons containerId="staff-pay-table" title={`${staffData.name} - cash received`} /> : undefined}
                        bodyClassName="p-0"
                    >
                        {!staffData ? (
                            <EmptyState title="Choose a staff member" text="Their cash handovers will show here." />
                        ) : (
                            <>
                                <div className="border-b border-white-light p-3 dark:border-[#1b2e4b]">
                                    <SearchBox value={search} onChange={setSearch} placeholder="Search records" className="w-full sm:w-72" />
                                </div>
                                <div id="staff-pay-table" className="datatables">
                                    <DataTable {...tableProps} columns={colsForReceivedDetailsStaff as any} records={receivedDetailsStaff || []} idAccessor="_id" />
                                </div>
                            </>
                        )}
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default PaymentReportStaff;
