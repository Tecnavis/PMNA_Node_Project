import { useEffect, useState } from "react";
import { Container, Paper, Title } from "@mantine/core";
import { DataTable } from 'mantine-datatable';
import { axiosInstance, BASE_URL } from "../../config/axiosConfig";
import { MONTHS_NUMBER, YEARS_FOR_FILTER } from "../Reports/constant";
import Dropdown from "../../components/Dropdown";
import { useSelector } from "react-redux";
import { IRootState } from "../../store";

interface PMNRReport {
    month: number;
    year: number;
    totalAmount: number;
}

const PaymentWorkReport = () => {
    const [reports, setReport] = useState<PMNRReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
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

    const handleMonth = (month: string) => {
        setSelectedMonth(month);
    };

    const handleYear = (year: number) => {
        setSelectedYear(year);
    };

    useEffect(() => {
        fetchReportResult();
    }, []);
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
                        {/* <div className="inline-flex mb-5 mr-2">
                            <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">{selectedMonth}</button>
                            <div className="dropdown">
                                <Dropdown
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light h-full"
                                >
                                    <ul className="!min-w-[170px]">
                                        {
                                            MONTHS.map((month: string, index: number) => (
                                                <li
                                                    key={index}
                                                >
                                                    <button
                                                        onClick={() => handleMonth(month)}
                                                        type="button"
                                                    >
                                                        {month}
                                                    </button>
                                                </li>
                                            ))
                                        }
                                    </ul>
                                </Dropdown>
                            </div>
                        </div> */}
                        <div className="inline-flex mb-5 dropdown">
                            <button className="btn btn-outline-primary ltr:rounded-r-none rtl:rounded-l-none">{selectedYear}</button>
                            <Dropdown
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="btn btn-outline-primary ltr:rounded-l-none rtl:rounded-r-none dropdown-toggle before:border-[5px] before:border-l-transparent before:border-r-transparent before:border-t-inherit before:border-b-0 before:inline-block hover:before:border-t-white-light h-full"
                                button={<span className="sr-only">All Years</span>}
                            >
                                <ul className="!min-w-[170px]">
                                    <li><button type="button">All Years</button></li>
                                    {
                                        YEARS_FOR_FILTER.map((year: number, index: number) => (
                                            <li key={index}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleYear(year)}
                                                >
                                                    {year}
                                                </button>
                                            </li>
                                        ))
                                    }
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
                            render: ({ month, year }) => <span className="text"> {MONTHS_NUMBER[month]}  {year}</span>,
                        },
                        {
                            accessor: "totalAmount",
                            title: "Total Salary (₹)",
                            textAlignment: "right",
                            render: ({ totalAmount }) => (
                                <span className="text-green-600 font-semibold">
                                    ₹ {totalAmount.toLocaleString("en-IN")}
                                </span>
                            ),
                        },
                    ]}
                    records={reports}
                    noRecordsText="No report data available"
                />
            </Paper>
        </Container>
    );
};

export default PaymentWorkReport;
