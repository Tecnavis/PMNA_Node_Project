import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layouts/Header';
import '../ShowRooms/ShowRm.css';

interface Booking {
  id: string;
  dateTime: string;
  vehicleSection: string;
  vehicleModel: string;
  showroomLocation: string;
  fileNumber: string;
  insuranceAmountBody: number;
  amount: string;
  updatedTotalSalary: number;
  createdAt: Timestamp;
  showroomAmount: number;
  balanceshowroom: number;
  paidToRSA: boolean;
  status: string;
  approveStatus: string;
}



const CashReport: React.FC = () => {
  const showroomId = localStorage.getItem('showroomId');
  const uid = import.meta.env.VITE_REACT_APP_UID;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [viewFilter, setViewFilter] = useState<"monthly" | "yearly" | "all">(
    "monthly"
  );
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [monthlyTotalAmount, setMonthlyTotalAmount] = useState<number>(0);
  const navigate = useNavigate();
  const [balanceMonthlyTotal, setBalanceMonthlyTotal] = useState<number>(0);
  const [balanceTotal, setBalanceTotal] = useState<number>(0);

  
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const db = getFirestore();
     
        const q = query(
          collection(db, `user/${uid}/bookings`),
          where('showroomId', '==', showroomId),
            where('status', '==', 'Order Completed') // Add this where clause
        );

        const querySnapshot = await getDocs(q);
        const bookingsData: Booking[] = [];

        querySnapshot.forEach((doc) => {
          const booking = doc.data() as Omit<Booking, 'id'>;
          bookingsData.push({
            id: doc.id,
            ...booking,
          });
        });

        const now = new Date();
        const filteredBookings = bookingsData.filter(booking => {
          const bookingDate = booking.createdAt.toDate();
          if (viewFilter === 'monthly') {
            if (selectedMonth === null) return false;
            return bookingDate.getFullYear() === now.getFullYear() && bookingDate.getMonth() === selectedMonth;
          } else if (viewFilter === 'yearly') {
            return bookingDate.getFullYear() === now.getFullYear();
          } else {
            return true;
          }
        });

        const sortedBookingsData = filteredBookings.slice().sort((a, b) => {
          const dateA = a.createdAt.toDate();
          const dateB = b.createdAt.toDate();
          return dateB.getTime() - dateA.getTime();
        });

          // Calculate total and monthly sums (ensure values are treated as numbers and NaN is handled as 0)
const total = bookingsData.reduce((sum, booking) => 
  sum + (Number(booking.insuranceAmountBody) || 0) + (Number(booking.showroomAmount) || 0), 0);

const monthlyTotal = sortedBookingsData.reduce((sum, booking) => 
  sum + (Number(booking.balanceshowroom) || 0) + (Number(booking.showroomAmount) || 0), 0);

const balanceTotal = bookingsData.reduce((sum, booking) => 
  sum + (Number(booking.balanceshowroom) || 0), 0);

const balanceMonthlyTotal = sortedBookingsData.reduce((sum, booking) => 
  sum + (Number(booking.balanceshowroom) || 0), 0);

setBalanceTotal(balanceTotal);
setBalanceMonthlyTotal(balanceMonthlyTotal);

setTotalAmount(total);
setMonthlyTotalAmount(monthlyTotal);
setBookings(sortedBookingsData);

         } catch (error) {
           console.error('Error fetching bookings:', error);
         }
       };

    if (showroomId) {
      fetchBookings();
    } else {
      console.error('showroomId is not available');
    }
  }, [showroomId, uid, viewFilter, selectedMonth]);
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString("en-GB", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit",
        hour12: true 
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);
  const formatDateTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    };

    return new Intl.DateTimeFormat('en-GB', options).format(date);
  };

  return (
       

    <div className="w-full max-w-5xl mx-auto px-4 py-6">
  <h2 className="text-center uppercase text-3xl font-semibold text-gray-900 p-5 shadow-sm rounded-lg bg-white border border-gray-200 tracking-wide">
  Cash Report
</h2>




      {/* Tabs for Monthly, Yearly, All */}
      <div className="flex justify-center space-x-3 my-4">
        {["monthly", "yearly", "all"].map((filter) => (
          <button
            key={filter}
            onClick={() => setViewFilter(filter as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
              viewFilter === filter
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)} View
          </button>
        ))}
      </div>

      {/* Monthly Tabs */}
      {viewFilter === "monthly" && (
        <div className="flex flex-wrap justify-center gap-2 my-4">
          {months.map((month, index) => (
            <button
              key={index}
              onClick={() => setSelectedMonth(index)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                selectedMonth === index
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      )}
   
 

   <thead className="bg-gray-50 border-b border-gray-300">
  <tr className="bg-gray-100">
    <td colSpan={5} className="text-right px-6 py-3 font-medium text-gray-700">
      {selectedMonth !== null ? `Monthly Total (${months[selectedMonth]}):` : "Monthly Total:"}
    </td>
    <td colSpan={5} className="text-left px-6 py-3 font-semibold text-gray-900 bg-gray-200 rounded-md shadow-xs">
      {monthlyTotalAmount.toFixed(2)}
    </td>
  </tr>

  <tr className="bg-gray-100">
    <td colSpan={5} className="text-right px-6 py-3 font-medium text-gray-700">
      {selectedMonth !== null ? `Monthly Total Balance (${months[selectedMonth]}):` : "Monthly Total Balance:"}
    </td>
    <td colSpan={5} className="text-left px-6 py-3 font-semibold text-gray-900 bg-gray-200 rounded-md shadow-xs">
      {balanceMonthlyTotal.toFixed(2)}
    </td>
  </tr>

  <tr className="bg-gray-100">
    <td colSpan={5} className="text-right px-6 py-3 font-medium text-gray-700">
      Whole Total:
    </td>
    <td colSpan={5} className="text-left px-6 py-3 font-semibold text-gray-900 bg-gray-200 rounded-md shadow-xs">
      {totalAmount.toFixed(2)}
    </td>
  </tr>

  <tr className="bg-gray-100">
    <td colSpan={5} className="text-right px-6 py-3 font-medium text-gray-700">
      Whole Total Balance:
    </td>
    <td colSpan={5} className="text-left px-6 py-3 font-semibold text-gray-900 bg-gray-200 rounded-md shadow-xs">
      {balanceTotal.toFixed(2)}
    </td>
  </tr>
</thead>



      <table className="w-full border-collapse shadow-md table-fixed">
        <thead className="bg-gray-200 border-b-2 border-gray-300">
          <tr>
            <th>SI No</th>
            <th className="px-4 py-2 text-left font-bold">Date</th>
            <th className="px-4 py-2 text-left font-bold">File Number</th>
            <th className="px-4 py-2 text-left font-bold">Vehicle Section</th>
            <th className="px-4 py-2 text-left font-bold">Vehicle Model</th>
            <th className="px-4 py-2 text-left font-bold">Insurance Amount</th>
            <th className="px-4 py-2 text-left font-bold">Showroom Amount</th>
            <th className="px-4 py-2 text-left font-bold">Total Payable Amount</th>
            <th className="px-4 py-2 text-left font-bold">Balance Payable Amount</th>
            <th className="px-4 py-2 text-left font-bold">Paid/UnPaid</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking, index) => (
            <tr key={booking.id} className="border-b">
              <td>{index + 1}</td>
              <td className="px-4 py-2">{formatDateTime(booking.createdAt)}</td>
              <td className="px-4 py-2">{booking.fileNumber}</td>
              <td className="px-4 py-2">{booking.vehicleSection}</td>
              <td className="px-4 py-2">{booking.vehicleModel}</td>
              <td className="px-4 py-2">
        {isNaN(booking.insuranceAmountBody) ? '0' : booking.insuranceAmountBody}
      </td>          
      <td className="px-4 py-2">
        {isNaN(booking.showroomAmount) ? '0' : booking.showroomAmount}
      </td>              <td className="px-4 py-2">
        {isNaN(booking.insuranceAmountBody) || isNaN(booking.showroomAmount)
          ? '0'
          : Number(booking.insuranceAmountBody) + Number(booking.showroomAmount)}
      </td>
      <td className="px-4 py-2">
        {isNaN(booking.balanceshowroom) ? '0' : booking.balanceshowroom}
      </td>
              <td className="px-4 py-2">
                <span className={`inline-block px-3 py-1 rounded text-white ${booking.approveStatus === 'Approved' ? 'bg-green-500' : 'bg-red-500'}`}>{booking.approveStatus === 'Approved' ? 'Paid' : 'Pending'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      


      </table>
    </div>
 
  );
};

export default CashReport;
