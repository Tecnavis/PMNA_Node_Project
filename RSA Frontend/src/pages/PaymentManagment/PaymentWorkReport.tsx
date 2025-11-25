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
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

        const res = await axiosInstance.get(`${BASE_URL}/booking/getordercompleted`, {
            params: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                all: true,
                workType: 'PaymentWork' // Add workType filter
            }
        });
        
        // Additional client-side filtering as backup
        const paymentWorkBookings = (res.data.bookings || []).filter(
            (booking: any) => booking.workType === 'PaymentWork'
        );
        
        setMonthBookings(paymentWorkBookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
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
                    borderRadius="md"
                    highlightOnHover
                    striped
                    fetching={loading}
                    columns={[
                        {
                            accessor: "month",
                            title: "Month",
                            render: ({ month, year }) => (
                                <span className="text">
                                    {MONTHS_NUMBER[month] || 'Unknown'} {year}
                                </span>
                            ),
                        },
                        {
                            accessor: "totalAmount",
                            title: "Total Amount (₹)",
                            textAlignment: "right",
                            render: ({ totalAmount }) => (
                                <span className="text-green-600 font-semibold">
                                    ₹ {(totalAmount || 0).toLocaleString("en-IN")}
                                </span>
                            ),
                        },
                        {
                            accessor: "actions",
                            title: "View More",
                            textAlignment: "right",
                            render: (row) => (
                                <button 
                                    onClick={() => handleViewMore(row)} 
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <FaEye />
                                </button>
                            ),
                        }
                    ]}
                    records={reports}
                    noRecordsText="No report data available"
                />
          
            </Paper>
       <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title={`Order Completed Bookings - ${selectedMonthData ? MONTHS_NUMBER[selectedMonthData.month] || 'Unknown' : ''} ${selectedMonthData?.year}`}
                size="xl"
                overflow="inside"
            >
                <div className="space-y-4">
                    {monthBookings.length === 0 ? (
                        <p>No bookings found for this month.</p>
                    ) : (
                        <DataTable
                            minHeight={200}
                            withBorder
                            striped
                            highlightOnHover
                            columns={[
                                {
                                    accessor: "fileNumber",
                                    title: "File Number",
                                },
                                {
                                    accessor: "customerVehicleNumber",
                                    title: "Vehicle No.",
                                },
                                {
                                    accessor: "totalAmount",
                                    title: "Amount (₹)",
                                    render: ({ totalAmount }) => (
                                        <span className="text-green-600 font-semibold">
                                            ₹ {(totalAmount || 0).toLocaleString("en-IN")}
                                        </span>
                                    ),
                                },
                                {
                                    accessor: "createdAt",
                                    title: "Date",
                                    render: ({ createdAt }) => (
                                        <span>
                                            {createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A'}
                                        </span>
                                    ),
                                },
                            ]}
                            records={monthBookings}
                        />
                    )}
                </div>
            </Modal>
        </Container>
    );
};

export default PaymentWorkReport;
