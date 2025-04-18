import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import Index from './Index';
import Timer from './Timer';
import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';
import { Booking } from '../Bookings/OpenBooking';
import { formattedTime, dateFormate } from '../../utils/dateUtils';
import { connectSocket, disconnectSocket } from '../../utils/socket';
import { SocketData } from '../Status/Status';
import { Socket } from 'socket.io-client';

// Animations
const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const pulse = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
`;

// Styled Components
const Container = styled.div`
    position: relative;
    padding: 20px;
    background-color: #f8f9fa;
    min-height: 100vh;
    color: #333;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Title = styled.h1`
    font-size: 2.5rem;
    font-weight: 700;
    color: #2c3e50;
    text-align: center;
    margin: 20px 0;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
    font-size: 1.8rem;
    color: #3498db;
    margin: 30px 0 15px;
    padding: 10px 20px;
    background: linear-gradient(90deg, rgba(52,152,219,0.1) 0%, rgba(52,152,219,0) 100%);
    border-left: 5px solid #3498db;
`;

const TableContainer = styled.div`
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
    margin-bottom: 40px;
    background: #fff;
    border: 1px solid #e0e0e0;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    animation: ${fadeIn} 0.5s ease-in-out;
`;

const TableHeader = styled.th`
    background: linear-gradient(135deg, #3498db 0%, #2c3e50 100%);
    color: white;
    padding: 15px;
    font-size: 1.1rem;
    text-align: left;
    position: sticky;
    top: 0;
    z-index: 10;
`;

const TableRow = styled.tr<{ highlight?: boolean; urgent?: boolean }>`
    background-color: ${(props) =>
        props.highlight ? 'rgba(52, 152, 219, 0.1)' :
            props.urgent ? 'rgba(255, 165, 0, 0.1)' :
                'transparent'};
    border-bottom: 1px solid #e0e0e0;
    
    &:nth-child(even) {
        background-color: ${(props) =>
        props.highlight ? 'rgba(52, 152, 219, 0.15)' :
            props.urgent ? 'rgba(255, 165, 0, 0.15)' :
                '#f9f9f9'};
    }
    
    &:hover {
        background-color: ${(props) =>
        props.highlight ? 'rgba(52, 152, 219, 0.2)' :
            props.urgent ? 'rgba(255, 165, 0, 0.2)' :
                '#f5f5f5'};
    }
`;

const TableData = styled.td`
    padding: 15px;
    font-size: 1rem;
    text-align: left;
    color: #333;
`;

const HighlightedTableData = styled(TableData)`
    font-weight: bold;
    color: #3498db;
    background: rgba(52, 152, 219, 0.1);
    border-left: 3px solid #3498db;
    border-right: 3px solid #3498db;
    text-align: center;
`;

const TimeBadge = styled.div`
    display: inline-block;
    padding: 5px 10px;
    border-radius: 15px;
    background: #e3f2fd;
    color: #1976d2;
    font-weight: 500;
    margin: 2px 0;
    font-size: 0.9rem;
`;

const FlexContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const StatusBadge = styled.span<{ status: string }>`
    padding: 5px 12px;
    border-radius: 20px;
    font-weight: bold;
    text-align: center;
    color: white;
    font-size: 0.9rem;
    background-color: ${(props) => {
        switch (props.status) {
            case 'Booking added': return '#3498db';
            case 'called to customer': return '#2980b9';
            case 'Order Received': return '#d4ac0d';
            case 'On the way to pickup location': return '#16a085';
            case 'Vehicle Confirmed': return '#8e44ad';
            case 'Vehicle Picked': return '#e67e22';
            case 'Cancelled': return '#e74c3c';
            case 'To DropOff Location': return '#d35400';
            case 'On the way to dropoff location': return '#c0392b';
            case 'Vehicle Dropped': return '#f1c40f';
            case 'Order Completed': return '#2ecc71';
            case 'Rejected': return '#e74c3c';
            default: return '#7f8c8d';
        }
    }};
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    white-space: nowrap;
    
    &:hover {
        transform: scale(1.03);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    ${props => props.status === 'On the way to pickup location' && css`
        animation: ${pulse} 2s infinite;
    `}
`;

const BlinkingStatusBadge = styled(StatusBadge)`
    animation: ${pulse} 1s infinite;
`;

const ScrollContainer = styled.div`
    height: 500px;
    overflow: auto;
    border-radius: 10px;
    scrollbar-width: thin;
    scrollbar-color: #3498db #f1f1f1;
    
    &::-webkit-scrollbar {
        width: 6px;
    }
    
    &::-webkit-scrollbar-track {
        background: #f1f1f1;
    }
    
    &::-webkit-scrollbar-thumb {
        background-color: #3498db;
        border-radius: 6px;
    }
`;

const StatusTable = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [ongoingBookings, setOngoingBookings] = useState<Booking[]>([]);
    const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
    const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [update, setUdate] = useState<boolean>(false);



    useEffect(() => {
        dispatch(setPageTitle('Driver Status Dashboard'));

        const fetchBookings = async () => {
            try {
                const [ongoingResponse, completedResponse] = await Promise.all([
                    axios.get(`${BASE_URL}/booking/status-based`, {
                        params: { status: 'OngoingBookings', limit: 100000 }
                    }),
                    axios.get(`${BASE_URL}/booking/status-based`, {
                        params: { status: 'Order Completed', limit: 100000 }
                    })
                ]);

                setOngoingBookings(ongoingResponse.data.bookings);
                setCompletedBookings(completedResponse.data.bookings);
            } catch (error) {
                console.error('Error fetching bookings:', error);
            }
        };

        fetchBookings();
        const intervalId = setInterval(fetchBookings, 30000); // Refresh every 30 seconds

        return () => clearInterval(intervalId);
    }, [dispatch]);

    const startScrolling = () => {
        if (scrollIntervalRef.current || !tableContainerRef.current) return;

        scrollIntervalRef.current = setInterval(() => {
            if (tableContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;

                if (scrollDirection === 'down') {
                    if (scrollTop + clientHeight >= scrollHeight - 1) {
                        setScrollDirection('up');
                    } else {
                        tableContainerRef.current.scrollBy({ top: 2, behavior: 'smooth' });
                    }
                } else {
                    if (scrollTop <= 1) {
                        setScrollDirection('down');
                    } else {
                        tableContainerRef.current.scrollBy({ top: -2, behavior: 'smooth' });
                    }
                }
            }
        }, 50);
    };

    const stopScrolling = () => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
    };

    useEffect(() => {
        startScrolling();
        return stopScrolling;
    }, [scrollDirection]);

    const calculatePickupTime = (pickupDistance: string) => {
        const distance = parseFloat(pickupDistance) || 0;
        const speedKmPerMin = 1; // 1 km per minute
        const timeInMinutes = distance / speedKmPerMin;
        return Math.ceil(timeInMinutes) + 15; // Add 15 minutes buffer
    };

    const isUrgent = (record: Booking) => {
        if (record.status !== 'On the way to pickup location') return false;

        const now = new Date();
        const calculatedTime = calculatePickupTime("" + record.totalDistence || "0");
        const startTime = new Date(record.pickupTime || now);
        const endTime = new Date(startTime.getTime() + calculatedTime * 60000);

        return now >= endTime;
    };

    const updateBookingInState = (
        bookings: Booking[],
        bookingId: string,
        updatedBooking: Booking
    ): Booking[] => {
        return bookings.map(booking =>
            booking._id === bookingId ? updatedBooking : booking
        );
    };

    useEffect(() => {
        const socketInstance = connectSocket("test@example.com");
        setSocket(socketInstance);

        const handleNewChanges = async (data: SocketData) => {
            try {
                if (!data?.type) return;

                if (data.type === 'update' && data.status === 'Order Completed') {
                    // Remove from ongoing bookings
                    setOngoingBookings(prev =>
                        prev.filter(booking => booking._id !== data.bookingId)
                    );

                    // @ts-ignore
                    setCompletedBookings(prev => [...prev, data.updatedBooking as Booking]);
                    setUdate(true)
                }

                else if (data.type === 'newBooking') {

                    // @ts-ignore
                    setOngoingBookings(prev => [...prev, data.newBooking as Booking]);
                    setUdate(false)
                }

                else if (data.type === 'update') {

                    const response = await axios.get(`/booking/${data.bookingId}`);
                    const updatedBooking = response.data;

                    if (updatedBooking.status === 'Order Completed') {
                        setCompletedBookings(prev =>
                            updateBookingInState(prev, data.bookingId, updatedBooking)
                        );
                    } else {
                        setOngoingBookings(prev =>
                            updateBookingInState(prev, data.bookingId, updatedBooking)
                        );
                    }
                    setUdate(false)
                }

            } catch (err) {
                console.error("Socket event error:", err);
            }
        };

        socketInstance.on("newChanges", handleNewChanges);

        return () => {
            socketInstance.off("newChanges", handleNewChanges);
            disconnectSocket();
        };
    }, []);


    return (
        <Container>
            <Title>BOOKING STATUS</Title>

            <Index update={update} />

            <SectionTitle>ONGOING BOOKINGS</SectionTitle>
            <TableContainer>
                <ScrollContainer
                    ref={tableContainerRef}
                    onMouseEnter={stopScrolling}
                    onMouseLeave={startScrolling}
                >
                    <Table>
                        <thead>
                            <tr>
                                <TableHeader>Date & Time</TableHeader>
                                <TableHeader>File Number</TableHeader>
                                <TableHeader>Driver</TableHeader>
                                <TableHeader>Vehicle</TableHeader>
                                <TableHeader>Pickup Time</TableHeader>
                                <TableHeader>Dropoff Time</TableHeader>
                                <TableHeader>Status</TableHeader>
                            </tr>
                        </thead>
                        <tbody>
                            {ongoingBookings.map((record) => (
                                <TableRow
                                    key={record._id}
                                    highlight={record?.bookingStatus === 'showroom'}
                                    urgent={isUrgent(record)}
                                >
                                    <TableData>
                                        <TimeBadge>{dateFormate("" + record.createdAt)}</TimeBadge>
                                        <TimeBadge>{formattedTime("" + record.createdAt)}</TimeBadge>
                                    </TableData>
                                    <TableData>{record.fileNumber}</TableData>
                                    <TableData>{record.driver?.name || 'N/A'}</TableData>
                                    <TableData>{record.customerVehicleNumber}</TableData>
                                    <HighlightedTableData>
                                        {record.pickupDate ? (
                                            <>
                                                <div>{dateFormate("" + record.pickupDate)}</div>
                                                <div>{formattedTime("" + record.pickupDate)}</div>
                                            </>
                                        ) : 'N/A'}
                                    </HighlightedTableData>
                                    <HighlightedTableData>
                                        {record.dropoffTime ? formattedTime("" + record.dropoffTime) : 'N/A'}
                                    </HighlightedTableData>
                                    <TableData>
                                        <FlexContainer>
                                            {isUrgent(record) ? (
                                                <BlinkingStatusBadge status={record.status || 'Unknown'}>
                                                    {record.status}
                                                </BlinkingStatusBadge>
                                            ) : (
                                                <StatusBadge status={record.status || 'Unknown'}>
                                                    {record.status}
                                                </StatusBadge>
                                            )}
                                            {record.status === 'On the way to pickup location' && (
                                                <Timer
                                                    pickupDistance={"" + record.totalDistence}
                                                    onTimeUp={() => console.log('Time is up!')}
                                                />
                                            )}
                                        </FlexContainer>
                                    </TableData>
                                </TableRow>
                            ))}
                        </tbody>
                    </Table>
                </ScrollContainer>
            </TableContainer>

            <SectionTitle>COMPLETED BOOKINGS</SectionTitle>
            <TableContainer>
                <Table>
                    <thead>
                        <tr>
                            <TableHeader>Date & Time</TableHeader>
                            <TableHeader>File Number</TableHeader>
                            <TableHeader>Driver</TableHeader>
                            <TableHeader>Vehicle</TableHeader>
                            <TableHeader>Pickup Time</TableHeader>
                            <TableHeader>Dropoff Time</TableHeader>
                            <TableHeader>Status</TableHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {completedBookings.map((record) => (
                            <TableRow key={record._id}>
                                <TableData>
                                    <TimeBadge>{dateFormate("" + record.createdAt)}</TimeBadge>
                                    <TimeBadge>{formattedTime("" + record.createdAt)}</TimeBadge>
                                </TableData>
                                <TableData>{record.fileNumber}</TableData>
                                <TableData>{record.driver?.name || 'N/A'}</TableData>
                                <TableData>{record.customerVehicleNumber}</TableData>
                                <HighlightedTableData>
                                    {record.pickupTime ? formattedTime("" + record.pickupTime) : 'N/A'}
                                </HighlightedTableData>
                                <HighlightedTableData>
                                    {record.dropoffTime ? formattedTime("" + record.dropoffTime) : 'N/A'}
                                </HighlightedTableData>
                                <TableData>
                                    <StatusBadge status={record.status || 'Completed'}>
                                        {record.status || 'Completed'}
                                    </StatusBadge>
                                </TableData>
                            </TableRow>
                        ))}
                    </tbody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default StatusTable;