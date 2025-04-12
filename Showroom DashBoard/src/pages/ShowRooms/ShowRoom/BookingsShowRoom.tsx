import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
// import { IoPersonOutline } from "react-icons/io5";
import IconUser from '../../../components/Icon/IconUser';
import { Link } from 'react-router-dom';
// import { IoPersonOutline } from "react-icons/io5";

// Define the Booking type
interface Booking {
  id: string;
  dateTime: string;
  fileNumber: string;
  customerName: string;
  serviceType: string;
  phoneNumber: string;
  status: string;
  createdBy?: string;
}

const BookingsShowRoom: React.FC = () => {
  // const IoPersonOutline = require('react-icons/io5')
  const [bookings, setBookings] = useState<Booking[]>([]);
  const showroomId = localStorage.getItem('showroomId') || '';
  const uid = import.meta.env.VITE_REACT_APP_UID;

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const db = getFirestore();
        if (showroomId) {
          const statusConditions = [



            'booking added',
            'called to customer',
            'Order Received',
            'On the way to pickup location',
            'Vehicle Picked',
            'Vehicle Confirmed',

            'On the way to dropoff location',
            'Vehicle Dropped',
            'Cancelled',
          ];
          const q = query(
            collection(db, `user/${uid}/bookings`),
            where('serviceCategory', '==', 'ShowRooms'),
            where('showroomId', '==', showroomId),
            where('status', 'in', statusConditions)

          );
          const querySnapshot = await getDocs(q);
          const bookingsData: Booking[] = [];
          querySnapshot.forEach((doc) => {
            const booking = doc.data();
            bookingsData.push({
              id: doc.id,
              dateTime: booking.dateTime,
              fileNumber: booking.fileNumber,
              customerName: booking.customerName,
              serviceType: booking.serviceType,
              phoneNumber: booking.phoneNumber,
              status: booking.status,
              createdBy: booking.createdBy
            });
          });
          setBookings(bookingsData);
        } else {
          console.error('showroomId is not available');
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      }
    };

    fetchBookings();
  }, [showroomId, uid]);

  return (
    <div style={{ padding: '30px', overflowX: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <style>
        {`
          .loading-spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-left-color: #3498db;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-left: 5px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .table-header {
            background-color: #3e4e5e;
            color:rgb(91, 92, 92);
            text-transform: uppercase;
          }

          .table-row:hover {
            background-color: #e0e0e0;
            cursor: pointer;
          }

          .table-cell {
            padding: 12px;
            border: 1px solid #ddd;
            word-wrap: break-word;
            font-size: 14px;
          }

          .table-button {
            background-color: #e74c3c;
            color: white;
            padding: 6px 12px;
            border: none;
            cursor: pointer;
            border-radius: 4px;
            transition: background-color 0.3s ease;
          }

          .table-button:hover {
            background-color: #c0392b;
          }
        `}
      </style>

      <h2
        style={{
          textAlign: 'center',
          marginBottom: '20px',
          fontSize: '32px', // Slightly larger font size for emphasis
          color: '#2c3e50', // Darker color for better readability
          fontWeight: '600', // Slightly bolder text for better prominence
          letterSpacing: '1px', // Add some spacing between letters for a more elegant look
          textTransform: 'uppercase', // Makes the text stand out more
          lineHeight: '1.4', // More comfortable line height
          fontFamily: "'Roboto', sans-serif", // Use a modern sans-serif font
        }}
      >
        Bookings
      </h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
        <thead>
          <tr className="table-header">
            <th className="table-cell">Date & Time</th>
            <th className="table-cell">File Number</th>
            <th className="table-cell">Customer Name</th>
            <th className="table-cell">Phone/Mobile</th>
            <th className="table-cell">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="table-row">
              <td className="table-cell">{booking.dateTime}</td>
              <td className="table-cell">
                <Link
                  to={`/showrm/viewmore/${booking.id}`}
                  style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}
                >
                  {booking.fileNumber}
                </Link>
              </td>                     <td className="table-cell">{booking.customerName}</td>
              <td className="table-cell">{booking.phoneNumber}</td>
              <td className="table-cell" style={{ backgroundColor: 'orange' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p>{booking.status}</p>  {booking.createdBy === 'showroomStaff' && (
                    <IconUser />
                  )}
                </div>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookingsShowRoom;
