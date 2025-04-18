import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import Index from './Index';
import Timer from './Timer'; // Import Timer component
import axios from 'axios';

// Define keyframes for animations
const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;
const HighlightedTableData = styled.td`
    padding: 20px;
    font-size: 1.1rem;
    text-align: center;
    border: 2px solid #4CAF50; /* Bold green border */
    border-radius: 10px; /* Rounded corners */
    box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.2); /* Stronger shadow */
    background: linear-gradient(135deg, #e0ffe0, #f9f9f9); /* Gradient background */
    color: #333; /* Darker text for readability */
    font-weight: bold; /* Bold text */
    transition: transform 0.2s, box-shadow 0.2s; /* Smooth hover effects */

    &:hover {
        transform: scale(1.05); /* Slight zoom on hover */
        box-shadow: 6px 6px 15px rgba(0, 0, 0, 0.3); /* Stronger shadow on hover */
    }
`;

const FlexContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 10px; /* Adds space between the status and timer */
`;

const PickedTimeText = styled.span`
    font-size: 0.9rem;     
    color: #555;           
    font-weight: 500;      
`;
// Styled-components for layout and styling
const Container = styled.div`
    position: relative;
    padding: 20px;
    background-color: #f0f4f7;
    min-height: 100vh;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    animation: ${fadeIn} 0.5s ease-in-out;
`;

const TableHeader = styled.th`
    background-color: #f39c12;
    color: white;
    padding: 15px;
    font-size: 1.2rem;
    text-align: left;
`;

const TableRow = styled.tr<{ highlight?: boolean }>`
    background-color: ${(props) => (props.highlight ? 'lightblue' : 'white')};
    &:nth-child(even) {
        background-color: #f2f2f2;
    }
`;

const TableData = styled.td`
    padding: 15px;
    font-size: 1rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
`;

const Title = styled.h1`
    font-size: 2.5rem;
    font-weight: 700;
    color: #333;
    text-align: center;
    margin-bottom: 20px;
`;


const StatusBadge = styled.span<{ status: string }>`
    padding: 4px 15px;
    border-radius: 25px;
    font-weight: bold;
    text-align: center;
    color: white;
    background-color: ${(props) => {
        switch (props.status) {
            case 'Booking added':
                return '#3498db';
            case 'called to customer':
                return '#2980b9';
            case 'Order Received':
                return '#d4ac0d';
            case 'On the way to pickup location':
                return '#16a085';
            case 'Vehicle Confirmed':
                return '#8e44ad';
            case 'Vehicle Picked':
                return '#e67e22';
            case 'Cancelled':
                return 'red';
            case 'To DropOff Location':
                return '#d35400';
            case 'On the way to dropoff location':
                return '#c0392b';
            case 'Vehicle Dropped':
                return '#f1c40f';
            case 'Order Completed':
                return '#2ecc71';
            case 'Rejected':
                return '#e74c3c';
            default:
                return '#f39c12';
        }
    }};
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s ease, transform 0.3s ease;
    &:hover {
        transform: scale(1.05);
        background-color: ${(props) => {
        switch (props.status) {
            case 'Rejected':
                return '#c0392b';
            case 'Order Completed':
                return '#2ecc71';
            case 'pending':
                return '#e67e22';
            default:
                return '#e67e22';
        }
    }};
    }
    animation: ${fadeIn} 1.5s ease-in-out;
    letter-spacing: 1px;
`;

interface BookingRecord {
    id: string;
    dateTime?: string;
    status?: string;
    bookingStatus?: string;
    fileNumber?: string;
    driver?: string;
    vehicleNumber?: string;
    selectedDriver?: string;
    pickupDistance?: string;
    pickedTime: Date | null | undefined;
    droppedTime: Date | null | undefined;
}

const StatusTable = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [recordsData, setRecordsData] = useState<BookingRecord[]>([]);
    const [drivers, setDrivers] = useState<{ [key: string]: any }>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Status'));

        const fetchBookings = async () => {
            const ongoingBookings = await axios.get()
            setRecordsData([]);
        };

        fetchBookings(); // Initial fetch

    }, []);

    const startScrolling = () => {
        if (scrollIntervalRef.current) return; // Prevent multiple intervals
        scrollIntervalRef.current = setInterval(() => {
            if (tableContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;

                console.log({ scrollTop, scrollHeight, clientHeight });

                if (scrollDirection === 'down') {
                    if (scrollTop + clientHeight >= scrollHeight - 1) {
                        setScrollDirection('up');
                    } else {
                        tableContainerRef.current.scrollBy({ top: 10 });
                    }
                } else {
                    if (scrollTop <= 1) {
                        setScrollDirection('down');
                    } else {
                        tableContainerRef.current.scrollBy({ top: -10 });
                    }
                }
            }
        }, 300); // Adjust speed as needed
    };

    const stopScrolling = () => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
    };

    useEffect(() => {
        startScrolling();
        return stopScrolling; // Cleanup on component unmount
    }, [scrollDirection]);


    const filteredRecordsData = recordsData
        .filter((record) =>
            Object.values(record).some((value) =>
                value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
        .filter((record) => record.status !== 'Approved'); // Exclude "Approved" status

    const sortedRecordsData = filteredRecordsData.slice().sort((a, b) => {
        const dateA = new Date(a.dateTime || '');
        const dateB = new Date(b.dateTime || '');
        return dateB.getTime() - dateA.getTime();
    });

    const completedBookings = sortedRecordsData.filter((record) => record.status === 'Order Completed');
    const ongoingBookings = sortedRecordsData.filter((record) => record.status !== 'Order Completed');
    const formatTimestamp = (timestamp: Date | null | undefined): string => {
        if (!timestamp) return "";

        // Convert Firestore timestamp to JavaScript Date object
        const date = timestamp

        // Define the options for formatting
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true, // 12-hour format with AM/PM
        };

        // Use Intl.DateTimeFormat for proper formatting
        return new Intl.DateTimeFormat('en-IN', options).format(date);
    };


    const calculatePickupTime = (pickupDistance: string) => {
        console.log("Pickup distance input:", pickupDistance);

        const speedKmPerMin = 60 / 60; // 1 km per minute
        console.log("Speed in km per minute:", speedKmPerMin);

        const distance = parseFloat(pickupDistance);
        console.log("Parsed pickup distance (in km):", distance);

        const timeInMinutes = distance / speedKmPerMin;
        console.log("Calculated time to reach (in minutes):", timeInMinutes);

        const totalTimeInMinutes = Math.ceil(timeInMinutes) + 15; // Add 15 minutes buffer
        console.log("Total time with 15-minute buffer (in minutes):", totalTimeInMinutes);

        return totalTimeInMinutes;
    };


    const shouldBlink = (record: BookingRecord) => {
        const now = new Date();
        const calculatedTime = calculatePickupTime(record.pickupDistance || "0");
        const startTime = new Date(record.dateTime || now);
        const endTime = new Date(startTime.getTime() + calculatedTime * 60000); // Add the calculated time in milliseconds

        return now >= endTime && record.status === "On the way to pickup location";
    };
    return (
        <Container style={{ padding: '40px' }}>
            <Title>Driver Status</Title>
            <Index />
            <div
                ref={tableContainerRef}
                onMouseEnter={stopScrolling}
                onMouseLeave={startScrolling}
                style={{
                    height: '600px',
                    overflow: 'auto',
                    border: '.5px solid black',
                }}
                className='mb-10'
            >


                <Table>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                        <tr>
                            <TableHeader>Date & Time</TableHeader>
                            <TableHeader>File Number</TableHeader>
                            <TableHeader>Driver Name</TableHeader>
                            <TableHeader>Vehicle Number</TableHeader>
                            <TableHeader>Picked Time</TableHeader>
                            <TableHeader>Dropped Time</TableHeader>

                            <TableHeader>Status</TableHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {ongoingBookings.map((record) => (
                            <TableRow key={record.id} highlight={record.bookingStatus === 'ShowRoom Booking'}>
                                <TableData>{record.dateTime}</TableData>
                                <TableData>{record.fileNumber}</TableData>
                                <TableData>{record.driver}</TableData>
                                <TableData>{record.vehicleNumber}</TableData>
                                <HighlightedTableData>{formatTimestamp(record?.pickedTime)}</HighlightedTableData>
                                <HighlightedTableData>{formatTimestamp(record?.droppedTime)}</HighlightedTableData>
                                <TableData>
                                    <FlexContainer>
                                        <StatusBadge
                                            className={shouldBlink(record) ? 'blinking' : ''}
                                            status={record.status || 'Unknown'}
                                        >
                                            {record.status}
                                        </StatusBadge>
                                        {record.status === 'On the way to pickup location' && (
                                            <Timer pickupDistance={record.pickupDistance} onTimeUp={() => console.log('Time is up!')} />
                                        )}
                                    </FlexContainer>
                                </TableData>
                            </TableRow>
                        ))}
                    </tbody>
                </Table>
            </div>
            <Title>Order Completed</Title>
            <Table>
                <thead>
                    <tr>
                        <TableHeader>Date & Time</TableHeader>
                        <TableHeader>fileNumber</TableHeader>
                        <TableHeader>Driver Name</TableHeader>
                        <TableHeader>Vehicle Number</TableHeader>
                        <TableHeader>Picked Time</TableHeader>
                        <TableHeader>Dropped Time</TableHeader>
                        <TableHeader>Status</TableHeader>
                    </tr>
                </thead>
                <tbody>
                    {completedBookings.map((record) => (
                        <TableRow key={record.id}>
                            <TableData>{record.dateTime}</TableData>
                            <TableData>{record.fileNumber}</TableData>
                            <TableData>{record.driver}</TableData>
                            <TableData>{record.vehicleNumber}</TableData>
                            <HighlightedTableData>{formatTimestamp(record?.pickedTime)}</HighlightedTableData>
                            <HighlightedTableData>{formatTimestamp(record?.droppedTime)}</HighlightedTableData>
                            <TableData>
                                <StatusBadge
                                    style={{ display: "flex" }}

                                    status={record.status || 'Completed'}>
                                    {record.status || 'Completed'}
                                </StatusBadge>
                            </TableData>
                        </TableRow>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
};

export default StatusTable;