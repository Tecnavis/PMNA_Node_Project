//@ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from 'mantine-datatable';
import { Anchor, Text, Group } from '@mantine/core';
import { IBooking } from '../../interface/booking';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import IconUser from '../../components/Icon/IconUser';

interface BookingsTableProps {
    bookings: IBooking[];
    isLoading: boolean;
    title: string;
    page?: number;
    pageSize?: number;
    totalRecords?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    showPagination?: boolean;
}

const BookingsTable: React.FC<BookingsTableProps> = ({
    bookings,
    isLoading,
    title,
    page = 1,
    pageSize = 10,
    totalRecords = 0,
    onPageChange,
    onPageSizeChange,
    showPagination = true,
}) => {
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
        { accessor: 'customerName', title: 'Customer Name' },
        {
            accessor: 'phone',
            title: 'Phone/Mobile',
            render: (booking: IBooking) => booking.mob1 || booking.mob2 || 'N/A'
        },
        {
            accessor: 'status',
            title: 'Status',
            render: (booking: IBooking) => (
                <div className='text-gray-700 uppercase'>
                    <Text>{booking.status}</Text>
                    {booking.createdBy === 'showroomStaff' && <IconUser />}
                </div>
            ),
            cellsStyle: { backgroundColor: 'rgba(255, 165, 0, 0.2)' }
        }
    ];

    return (
        <div style={{ overflowX: 'auto', fontFamily: 'Arial, sans-serif' }}>
            <h2 className='text-3xl text-center mb-5 text-gray-700 uppercase'>
                {title}
            </h2>
            <DataTable
                fetching={isLoading}
                totalRecords={showPagination ? totalRecords : 0}
                recordsPerPage={showPagination ? pageSize : bookings.length}
                page={showPagination ? page : 1}
                onPageChange={onPageChange || ((page: number) => { })}
                recordsPerPageOptions={showPagination ? [10, 20, 50] : undefined}
                onRecordsPerPageChange={onPageSizeChange || (() => { })}
                withColumnBorders
                verticalAlignment="center"
                highlightOnHover
                striped
                minHeight={300}
                columns={cols}
                records={bookings}
                withBorder
            />
        </div>
    );
};

export default BookingsTable;