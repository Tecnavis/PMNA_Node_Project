import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import Index from './Index';
import Timer from './Timer';
import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';
import { Booking } from '../Screen/types';
import { formattedTime, dateFormate } from '../../utils/dateUtils';
import { connectSocket, disconnectSocket } from '../../utils/socket';
import { SocketData } from '../Status/Status';
import { Socket } from 'socket.io-client';
import { FaArrowDown, FaArrowUp, FaCompress, FaExpand } from 'react-icons/fa';

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

// Styled components
const ExpandButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 10px;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

interface TableContainerProps {
  isExpanded?: boolean;
}

const TableContainer = styled.div<TableContainerProps>`
  position: relative;
  max-height: ${props => props.isExpanded ? '90vh' : '400px'};
  overflow: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: all 0.3s ease;
  
  ${props => props.isExpanded && `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    height:100%;
    z-index: 1000;
    background: white;
    box-shadow: 0 0 20px rgba(0,0,0,0.3);
  `}
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
`;

const Table = styled.table<{ isExpanded?: boolean }>`
    width: 100%;
    border-collapse: collapse;
    animation: ${fadeIn} 0.5s ease-in-out;
 ${props => props.isExpanded && `
        font-size: 0.9rem;
    `}
`;

const TableHeader = styled.th<{ isExpanded?: boolean }>`
      background: linear-gradient(135deg, #3498db 0%, #2c3e50 100%);
    color: white;
    padding: ${props => props.isExpanded ? '10px 8px' : '15px'};
    font-size: ${props => props.isExpanded ? '0.95rem' : '1.1rem'};
    text-align: left;
    position: sticky;
    top: 0;
    z-index: 10;
`;

const TableRow = styled.tr<{ highlight?: boolean; urgent?: boolean; isExpanded?: boolean }>`
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
    
    ${props => props.isExpanded && `
        height: 40px;
    `}
`;


const TableData = styled.td<{ isExpanded?: boolean }>`
    padding: ${props => props.isExpanded ? '8px' : '15px'};
    font-size: ${props => props.isExpanded ? '0.85rem' : '1rem'};
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

const TimeBadge = styled.div<{ isExpanded?: boolean }>`
    display: inline-block;
    padding: ${props => props.isExpanded ? '3px 6px' : '5px 10px'};
    border-radius: 15px;
    background: #e3f2fd;
    color: #1976d2;
    font-weight: 500;
    margin: ${props => props.isExpanded ? '1px 0' : '2px 0'};
    font-size: ${props => props.isExpanded ? '0.8rem' : '0.9rem'};
`;

const FlexContainer = styled.div<{ isExpanded?: boolean }>`
    display: flex;
    align-items: center;
    gap: ${props => props.isExpanded ? '5px' : '10px'};
    flex-wrap: ${props => props.isExpanded ? 'wrap' : 'nowrap'};
`;

const StatusBadge = styled.span<{ status: string; isExpanded?: boolean }>`
    padding: ${props => props.isExpanded ? '3px 8px' : '5px 12px'};
    border-radius: 20px;
    font-weight: bold;
    text-align: center;
    color: white;
    font-size: ${props => props.isExpanded ? '0.8rem' : '0.9rem'};
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

const ScrollContainer = styled.div<{ isExpanded?: boolean }>`
    height: ${props => props.isExpanded ? 'calc(100% - 40px)' : '500px'};
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

const ScrollControls = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 8px;
`;

const ScrollButton = styled.button`
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
    
    &:hover {
        background: #e0e0e0;
    }
`;

// Compact Timer Wrapper for expanded view
const CompactTimerWrapper = styled.div<{ isExpanded?: boolean }>`
    ${props => props.isExpanded && `
        font-size: 0.8rem;
        padding: 2px 4px;
    `}
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
const [isExpanded, setIsExpanded] = useState(false);



    useEffect(() => {
        dispatch(setPageTitle('Driver Status Dashboard'));

  const fetchBookings = async () => {
    try {
        const [ongoingResponse, completedResponse] = await Promise.all([
            axios.get(`${BASE_URL}/booking/status-based`, {
                params: { 
                    status: 'OngoingBookings', 
                    limit: 100000 
                }
            }),
            axios.get(`${BASE_URL}/booking/status-based`, {
                params: { 
                    status: 'Order Completed', 
                    limit: 100000
                }
            })
        ]);

        // Filter completed bookings to only show last week's
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentCompleted = completedResponse.data.bookings.filter((booking: Booking) => {
            const bookingDate = new Date(booking.createdAt || booking.updatedAt);
            return bookingDate >= oneWeekAgo;
        });

        setOngoingBookings(ongoingResponse.data.bookings);
        setCompletedBookings(recentCompleted);
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
};

        fetchBookings();
        const intervalId = setInterval(fetchBookings, 30000); // Refresh every 30 seconds

        return () => clearInterval(intervalId);
    }, [dispatch]);

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
            setOngoingBookings(prev =>
                prev.filter(booking => booking._id !== data.bookingId)
            );

            // Type assertion solution:
            const updatedBooking = data.updatedBooking as unknown as Booking;
            
            // Only add to completed if it's recent
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const bookingDate = new Date(updatedBooking?.createdAt || new Date());
            
            if (bookingDate >= oneWeekAgo) {
                setCompletedBookings(prev => [...prev, updatedBooking]);
            }
            setUdate(true);
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

            <SectionTitle>
  ONGOING BOOKINGS
  <ExpandButton 
    onClick={() => setIsExpanded(!isExpanded)}
    title={isExpanded ? "Minimize table" : "Expand table"}
  >
    {isExpanded ? <FaCompress size={20} /> : <FaExpand size={25} />}
  </ExpandButton>
</SectionTitle>
            <TableContainer isExpanded={isExpanded} ref={tableContainerRef}>

               <ScrollControls>
    <ScrollButton 
        onClick={() => tableContainerRef.current?.scrollBy({ top: -100, behavior: 'smooth' })}
    >
        <FaArrowUp size={26} />
    </ScrollButton>
    <ScrollButton 
        onClick={() => tableContainerRef.current?.scrollBy({ top: 100, behavior: 'smooth' })}
    >
        <FaArrowDown size={26} />
    </ScrollButton>
</ScrollControls>
                <ScrollContainer isExpanded={isExpanded}
                    ref={tableContainerRef}
                >
                    <Table isExpanded={isExpanded}>
                        <thead>
                            <tr>
                                <TableHeader isExpanded={isExpanded}>Index</TableHeader>
                                <TableHeader isExpanded={isExpanded}>Date and Time</TableHeader>
                                <TableHeader isExpanded={isExpanded}>File Number</TableHeader>
                                <TableHeader isExpanded={isExpanded}>Driver</TableHeader>
                                <TableHeader isExpanded={isExpanded}>Vehicle</TableHeader>
                                <TableHeader isExpanded={isExpanded}>Pickup Time</TableHeader>
                                <TableHeader isExpanded={isExpanded}>Dropoff Time</TableHeader>
                                <TableHeader isExpanded={isExpanded}>Status</TableHeader>
                            </tr>
                        </thead>
                        <tbody>
                            {ongoingBookings
                            // Sort bookings to show "Booking Added" status at the top
                            .sort((a, b) => {
                                if (a.status === 'Booking Added' && b.status !== 'Booking Added') return -1;
                                if (a.status !== 'Booking Added' && b.status === 'Booking Added') return 1;
                                return 0;
                            })
                            .map((record, index) => (
                                <TableRow
                                    key={record._id}
                                    highlight={record?.bookingStatus === 'showroom'}
                                    urgent={isUrgent(record)}
                                    isExpanded={isExpanded}
                                >
                                    <TableData isExpanded={isExpanded}>{index+1}</TableData>
                                    <TableData isExpanded={isExpanded}>
                                        <TimeBadge isExpanded={isExpanded}>{dateFormate("" + record.createdAt)}</TimeBadge>
                                        <TimeBadge isExpanded={isExpanded}>{formattedTime("" + record.createdAt)}</TimeBadge>
                                    </TableData>
                                    <TableData isExpanded={isExpanded}>{record.fileNumber}</TableData>
                                    <TableData isExpanded={isExpanded}>{record.driver?.name || 'N/A'}</TableData>
                                    <TableData isExpanded={isExpanded}>{record.customerVehicleNumber}</TableData>
                                    <HighlightedTableData isExpanded={isExpanded}>
                                        {record.pickupTime ? (
                                            <>
                                                <div>{dateFormate("" + record.pickupTime)}</div>
                                                <div>{formattedTime("" + record.pickupTime)}</div>
                                            </>
                                        ) : 'N/A'}
                                    </HighlightedTableData>
                                    <HighlightedTableData isExpanded={isExpanded}>
                                        {record.dropoffTime ? formattedTime("" + record.dropoffTime) : 'N/A'}
                                    </HighlightedTableData>
                                    <TableData isExpanded={isExpanded}>
                                        <FlexContainer isExpanded={isExpanded}>
                                            {isUrgent(record) ? (
                                                <BlinkingStatusBadge status={record.status || 'Unknown'} isExpanded={isExpanded}>
                                                    {record.status}
                                                </BlinkingStatusBadge>
                                            ) : (
                                                <StatusBadge status={record.status || 'Unknown'} isExpanded={isExpanded}>
                                                    {record.status}
                                                </StatusBadge>
                                            )}
                                            {record.status === 'On the way to pickup location' && (
                                                <CompactTimerWrapper isExpanded={isExpanded}>
                                                    <Timer
                                                        pickupDistance={"" + record.totalDistence}
                                                        onTimeUp={() => console.log('Time is up!')}
                                                    />
                                                </CompactTimerWrapper>
                                            )}
                                        </FlexContainer>
                                    </TableData>
                                </TableRow>
                            ))}
                    </tbody>
                </Table>
            </ScrollContainer>
        </TableContainer>
        {isExpanded && <Overlay onClick={() => setIsExpanded(false)} />}

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