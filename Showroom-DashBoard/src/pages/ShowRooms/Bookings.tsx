//@ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from 'mantine-datatable';
import { Anchor, Text, Group } from '@mantine/core';
import { IBooking } from '../../interface/booking';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import IconUser from '../../components/Icon/IconUser';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { redeemReward } from '../../service/showroom';

const MySwal = withReactContent(Swal);
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

const Bookings: React.FC<BookingsTableProps> = ({
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

    const showroomRewardPoints = localStorage.getItem('showroomRewardPoints')
    const showroomId = localStorage.getItem('showroomId') || ''

    const handleRedeemReward = async (booking: IBooking) => {
        try {
            
            const result = await MySwal.fire({
                title: 'Are you sure?',
                text: "Do you want to redeem the reward?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, confirm it!'
            });
            
            if (result.isConfirmed) {
                await redeemReward(showroomId, booking._id)
                Swal.fire('Confirmed!', 'The reward redeemed successfull.', 'success');
            }
        } catch (error:any) {
            Swal.fire('Warning', error?.message || "Reward redeem unsccessfull", 'warning');
        }
    }

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
            accessor: 'totalDistence',
            title: 'Distance',
            render: (booking: IBooking) => booking.totalDistence || 'N/A'
        },
        {
            accessor: 'showroomAmount',
            title: 'Amount By Showroom',
            render: (booking: IBooking) => booking.showroomAmount || 'N/A'
        },
        {
            accessor: 'status',
            title: 'Redeem Reward',
            render: (booking: IBooking) => (
                <div className='text-gray-700 uppercase'>
                    <button
                        disabled={booking.totalDistence < 50 || booking?.rewardAmount}
                        className={`
                            relative flex items-center gap-2 px-5 py-2 text-lg font-semibold rounded-lg 
                            shadow-lg transition transform duration-300 ease-in-out
                            ${booking.totalDistence < 50 || booking?.rewardAmount
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'text-white bg-gradient-to-r from-yellow-500 to-orange-600 hover:shadow-xl hover:scale-105'}
                            `}
                        onClick={() => handleRedeemReward(booking)}
                    >
                        🎁 Redeem Reward
                    </button>
                </div>
            ),
            cellsStyle: { backgroundColor: 'rgba(255, 165, 0, 0.2)' }
        }
    ];

    return (
        <div style={{ overflowX: 'auto', fontFamily: 'Arial, sans-serif' }}>
            <div className="ml-auto w-72 bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6 rounded-2xl shadow-xl border border-gray-200">
                {/* Premium Badge */}
                <div className="bg-white text-yellow-600 text-xs font-bold px-3 py-1 rounded-full shadow-lg mb-2">
                    PREMIUM
                </div>

                {/* Reward Points Title */}
                <h3 className="text-lg font-semibold tracking-wide uppercase text-center">
                    Reward Points
                </h3>

                {/* Points Display */}
                <p className="text-4xl font-extrabold mt-2 text-center">
                    {showroomRewardPoints}
                </p>
            </div>

            <br />
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

export default Bookings;