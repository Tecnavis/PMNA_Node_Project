import React, { useState, useEffect } from 'react';
import { getBookings } from '../../../service/booking';
import { IBooking } from '../../../interface/booking';
import BookingsTable from '../BookingsTable';
import Bookings from '../Bookings';

const CompletedShowRoom: React.FC = () => {
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
          status: 'Order Completed',
          serviceCategory: 'showroom',
          showroom: showroomId,
          
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


  return (
    <Bookings
      bookings={bookings}
      isLoading={isLoading}
      title="Completed"
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

export default CompletedShowRoom;
