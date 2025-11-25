import { useEffect, useState } from "react";
import { Container, Paper, Title, Modal } from "@mantine/core";
import { DataTable } from 'mantine-datatable';
import { axiosInstance, BASE_URL } from "../../config/axiosConfig";
import { MONTHS_NUMBER, YEARS_FOR_FILTER } from "../Reports/constant";
import Dropdown from "../../components/Dropdown";
import { useSelector } from "react-redux";
import { IRootState } from "../../store";
import { FaEye } from "react-icons/fa";


interface PMNRReport {
    month: number;
    year: number;
    totalAmount: number;
}

const PaymentWorkReport = () => {
    const [reports, setReport] = useState<PMNRReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [opened, setOpened] = useState(false);
    const [monthBookings, setMonthBookings] = useState<any[]>([]);
    const [selectedMonthData, setSelectedMonthData] = useState<{ month: number; year: number } | null>(null); 
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;
    const fetchReportResult = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`${BASE_URL}/pmnr/report`, {
                params: {
                    year: +selectedYear
                }
            });
            setReport(res.data);
        } catch (error: any) {
            console.error("Error fetching report:", error.message);
        } finally {
            setLoading(false);
        }
    };
const handleViewMore = (row: PMNRReport) => {
    setSelectedMonthData({ month: row.month, year: row.year });
    fetchMonthBookings(row.month, row.year);
    setOpened(true); // Open modal
};
  
    const handleYear = (year: number) => {
        setSelectedYear(year);
    };

  const fetchMonthBookings = async (month: number, year: number) => {
    try {
        setLoading(true);
        
        const res = await axiosInstance.get(`${BASE_URL}/pmnr/monthly-bookings`, {
            params: {
                month: month,
                year: year
            }
        });
        
        // The API now returns only PaymentWork bookings, so no client-side filtering needed
        setMonthBookings(res.data.bookings || []);
    } catch (error) {
        console.error("Error fetching monthly bookings:", error);
        setMonthBookings([]);
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        fetchReportResult();
    }, [selectedYear]);
        return (
     <Container size="lg" mt="md">
            <Paper withBorder shadow="sm" radius="md" p="lg">
                <div className="mb-5 flex justify-between">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
                        PMNA Crane Monthly Cash Report
                    </h2>
                    <div className='flex justify-end'>
                        <div className="inline-flex mb-5 dropdown">
                            <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">{selectedYear}</button>
                            <Dropdown
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light h-full"
                                button={<span className="sr-only">All Years</span>}
                            >
                                <ul className="!min-w-[170px]">
                                    <li><button type="button">All Years</button></li>
                                    {YEARS_FOR_FILTER.map((year: number, index: number) => (
                                        <li key={index}>
                                            <button
                                                type="button"
                                                onClick={() => handleYear(year)}
                                            >
                                                {year}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </Dropdown>
                        </div>
                    </div>
                </div>
  <DataTable
    minHeight={250}
    withBorder
    borderRadius="xl"
    highlightOnHover
    striped
    fetching={loading}
    columns={[
        {
            accessor: "month",
            title: "Monthly Report",
            render: ({ month, year }) => (
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">
                                {month}
                            </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-lg">
                            {MONTHS_NUMBER[month] || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                             Year {year}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            accessor: "totalAmount",
            title: "Earnings",
            textAlignment: "right",
            render: ({ totalAmount }) => (
                <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800 mb-1">
                        ₹ {(totalAmount || 0).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                        Payment Work Revenue
                    </div>
                </div>
            ),
        },
        {
            accessor: "actions",
            title: "",
            textAlignment: "center",
            width: 80,
            render: (row) => (
                <button 
                    onClick={() => handleViewMore(row)} 
                    className="w-10 h-10 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl flex items-center justify-center transition-all duration-200 group"
                >
                    <FaEye className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                </button>
            ),
        }
    ]}
    records={reports}
    noRecordsText="No records found" // Simple string
/>
          
            </Paper>
   <Modal
    opened={opened}
    onClose={() => setOpened(false)}
    title={
        <div className="text-center">
            <div className="text-2xl font-bold text-gray-800 mb-1">
                {selectedMonthData ? MONTHS_NUMBER[selectedMonthData.month] || 'Unknown' : ''} {selectedMonthData?.year}
            </div>
            <div className="text-sm text-gray-500 font-medium">
                ORDER COMPLETED BOOKINGS
            </div>
        </div>
    }
    size="xl"
    overflow="inside"
    radius="lg"
    padding="lg"
    overlayBlur={2}
    overlayOpacity={0.6}
    classNames={{
        header: "border-b border-gray-100 pb-4",
        body: "pt-6",
        modal: "shadow-xl", // Use 'modal' instead of 'content'
    }}
>
    <div className="space-y-6">
        {monthBookings.length === 0 ? (
            <div className="text-center py-12">
                <div className="text-gray-400 text-xl mb-3">📊</div>
                <div className="text-gray-500 text-lg font-medium mb-2">No Bookings Found</div>
                <div className="text-gray-400 text-sm">No completed bookings for this period</div>
            </div>
        ) : (
            <>
                {/* Summary Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-sm text-blue-600 font-medium mb-1">TOTAL SUMMARY</div>
                            <div className="text-2xl font-bold text-gray-800">
                                {monthBookings.length} Booking{monthBookings.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-blue-600 font-medium mb-1">TOTAL AMOUNT</div>
                            <div className="text-2xl font-bold text-green-600">
                                ₹ {monthBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0).toLocaleString("en-IN")}
                            </div>
                        </div>
                    </div>
                </div>

                {/* DataTable */}
                <DataTable
                    minHeight={300}
                    withBorder
                    borderRadius="md"
                    striped
                    highlightOnHover
                    fontSize="sm"
                    columns={[
                        {
                            accessor: "index",
                            title: "#",
                            width: 60,
                            textAlignment: "center",
                            render: (record, index) => (
                                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </div>
                            ),
                        },
                        {
                            accessor: "fileNumber",
                            title: "FILE NUMBER",
                            render: ({ fileNumber }) => (
                                <span className="font-mono text-sm font-semibold text-gray-700">
                                    {fileNumber}
                                </span>
                            ),
                        },
                        {
                            accessor: "customerVehicleNumber",
                            title: "VEHICLE NUMBER",
                            render: ({ customerVehicleNumber }) => (
                                <span className="font-medium text-gray-800">
                                    {customerVehicleNumber}
                                </span>
                            ),
                        },
                        {
                            accessor: "totalAmount",
                            title: "AMOUNT",
                            textAlignment: "right",
                            render: ({ totalAmount }) => (
                                <div className="text-right">
                                    <div className="text-green-700 font-bold">
                                        ₹ {(totalAmount || 0).toLocaleString("en-IN")}
                                    </div>
                                </div>
                            ),
                        },
                        {
                            accessor: "createdAt",
                            title: "DATE",
                            render: ({ createdAt }) => (
                                <div className="text-sm">
                                    <div className="font-medium text-gray-800">
                                        {createdAt ? new Date(createdAt).toLocaleDateString('en-IN') : 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {createdAt ? new Date(createdAt).toLocaleTimeString('en-IN', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        }) : ''}
                                    </div>
                                </div>
                            ),
                        },
                    ]}
                    records={monthBookings}
                />
            </>
        )}
    </div>
</Modal>
        </Container>
    );
};

export default PaymentWorkReport;
