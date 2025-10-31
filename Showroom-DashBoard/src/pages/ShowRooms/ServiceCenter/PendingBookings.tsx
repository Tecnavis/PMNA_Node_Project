import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Text } from '@mantine/core';
import { getBookings } from '../../../service/booking';
import { IBooking } from '../../../interface/booking';
import { dateFormate, formattedTime } from '../../../utils/dateUtils';
import IconUser from '../../../components/Icon/IconUser';
import BookingsTable from '../BookingsTable';

export const statusConditions = [
  'Booking Added',
  'called to customer',
  'Order Received',
  'On the way to pickup location',
  'Vehicle Picked',
  'Vehicle Confirmed',
  'On the way to dropoff location',
  'Vehicle Dropped',
  'Cancelled',
];
export const pendingStatusConditions = [
  'Booking Added',
  'Contacted Customer',
  'Vehicle Picked',
  'Vehicle Confirmed',
  'To DropOff Location',
  'Vehicle dropoff'
];

const PendingBookings: React.FC = () => {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const showroomId = localStorage.getItem('showroomId');


  const fetchPendingBookings = async () => {
    setLoading(true);
    try {
      if (showroomId) {
        const data = await getBookings({
          status: pendingStatusConditions,
          serviceCategory: 'serviceCenter',
          showroom: showroomId,
          page,
          limit: pageSize
        });
        if (data) {
          setBookings(data.data.bookings);
          setPageSize(data.data.pagination?.total || 0);
          setPage(data.data.pagination?.page || 0);
          setTotalRecords(data.data.pagination?.totalPages || 0);
        } else {
          console.error('Showroom document does not exist');
        }
      } else {
        console.error('showroomId is not available');
      }
    } catch (error) {
      console.error('Error fetching bookings and staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
  }, [showroomId, page, pageSize]);

  const cols = [
    {
      accessor: 'createdAt',
      title: 'Date & Time',
      render: (booking: IBooking) => (
        booking.createdAt ? `${dateFormate('' + booking.createdAt)}, ${formattedTime('' + booking.createdAt)}` : 'N/A'
      )
    },
    {
      accessor: 'fileNumber',
      title: 'File Number',
      render: (booking: IBooking) => (
        <Anchor component={Link} to={`/showrm/viewmore/${booking._id}`}>
          {booking.fileNumber}
        </Anchor>
      )
    },
    {
      accessor: 'customerName',
      title: 'Customer Name'
    },
    {
      accessor: 'phone',
      title: 'Phone/Mobile',
      render: (booking: IBooking) => booking.mob1 || booking.mob2 || 'N/A'
    },
    {
      accessor: 'status',
      title: 'Status',
      render: (booking: IBooking) => (
        <p >
          <Text>{status}</Text>
          {booking.createdBy === 'showroomStaff' && <IconUser />}
        </p>
      ),
      cellsStyle: { backgroundColor: 'rgba(255, 165, 0, 0.2)' }
    }
  ];


  return (
    <BookingsTable
      bookings={bookings}
      isLoading={isLoading}
      title="Pending"
      page={page}
      pageSize={pageSize}
      totalRecords={totalRecords}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
    />
  );
};

export default PendingBookings;
