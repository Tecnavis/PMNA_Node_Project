import React, { useState, useEffect } from 'react';
import { getBookings } from '../../../service/booking';
import { statusConditions } from '../ServiceCenter/PendingBookings';
import { IBooking } from '../../../interface/booking';
import BookingsTable from '../BookingsTable';

const CompleteShowRoom: React.FC = () => {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const showroomId = localStorage.getItem('showroomId');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      if (showroomId) {
        const data = await getBookings({
          status: 'Order Completed',
          serviceCategory: 'showroom',
          showroom: showroomId,
          page,
          limit: pageSize
        });
        if (data) {
          setBookings(data.data.bookings);
          setPageSize(data.data.pagination?.total || 0);
          setPage(data.data.pagination?.page || 0);
          setTotalRecords(data.data.pagination?.totalPages || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [showroomId, page, pageSize]);

  return (
    <BookingsTable
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

export default CompleteShowRoom;
