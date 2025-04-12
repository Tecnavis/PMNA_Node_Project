import React, { useState, useEffect } from 'react';
import IconUser from '../../../components/Icon/IconUser';
import { Link } from 'react-router-dom';
import { getBookings } from '../../../service/booking';
import { statusConditions } from './PendingBookings';
import { IBooking } from '../../../interface/booking';
import { dateFormate, formattedTime } from '../../../utils/dateUtils'

// Define the Booking and Staff types
interface Staff {
  id: string;
  name: string;
  position: string;
  phoneNumber: string;
}

const ServiceCenter: React.FC = () => {
  // const IoPersonOutline = require('react-icons/io5')
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]); // State to hold staff data
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const showroomId = localStorage.getItem('showroomId');
  const uid = import.meta.env.VITE_REACT_APP_UID;


  // Fetch bookings and staff data from Firestore
  useEffect(() => {
    const fetchBookingsAndStaff = async () => {
      try {
        if (showroomId) {
          const data = await getBookings({
            status: statusConditions,
            serviceCategory: 'Service Center',
            showroom: showroomId
          })
          if (data) {
            // setBookings(data.booking);
          } else {
            console.error('Showroom document does not exist');
          }
        } else {
          console.error('showroomId is not available');
        }
      } catch (error) {
        console.error('Error fetching bookings and staff:', error);
      }
    };


    fetchBookingsAndStaff();
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
          {bookings?.map((booking) => (
            <tr key={booking._id} className="table-row">
              <td className="table-cell">
                {`${dateFormate('' + booking?.createdAt)}, ${formattedTime('' + booking?.createdAt)}`}
              </td>
              <td className="table-cell">
                <Link
                  to={`/showrm/viewmore/${booking._id}`}
                  style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}
                >
                  {booking.fileNumber}
                </Link>
              </td>
              <td className="table-cell">{booking.customerName}</td>
              <td className="table-cell">{booking.mob1 || booking.mob2}</td>
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

export default ServiceCenter;
