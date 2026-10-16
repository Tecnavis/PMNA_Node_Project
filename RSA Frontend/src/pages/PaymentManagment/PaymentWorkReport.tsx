import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { MONTHS_NUMBER, YEARS_FOR_FILTER } from '../Reports/constant';
import TableExportButtons from '../../components/TableExportButtons';
import { EmptyState, PageHeader, Section, StatCard, StatGrid, money, tableProps } from '../../components/ui/PageKit';

interface PMNRReport {
    month: number;
    year: number;
    totalAmount: number;
}

const PaymentWorkReport = () => {
    const [reports, setReport] = useState<PMNRReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [monthLoading, setMonthLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [opened, setOpened] = useState(false);
    const [monthBookings, setMonthBookings] = useState<any[]>([]);
    const [selectedMonthData, setSelectedMonthData] = useState<{ month: number; year: number } | null>(null);

    const fetchReportResult = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`${BASE_URL}/pmnr/report`, { params: { year: +selectedYear } });
            const sortedReports = (res.data || []).sort((a: PMNRReport, b: PMNRReport) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
            setReport(sortedReports);
        } catch (error: any) {
            console.error('Error fetching report:', error.message);
            setReport([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthBookings = async (month: number, year: number) => {
        try {
            setMonthLoading(true);
            const res = await axiosInstance.get(`${BASE_URL}/pmnr/monthly-bookings`, { params: { month, year } });
            setMonthBookings(res.data.bookings || []);
        } catch (error) {
            console.error('Error fetching monthly bookings:', error);
            setMonthBookings([]);
        } finally {
            setMonthLoading(false);
        }
    };

    const handleViewMore = (row: PMNRReport) => {
        setSelectedMonthData({ month: row.month, year: row.year });
        setMonthBookings([]);
        fetchMonthBookings(row.month, row.year);
        setOpened(true);
    };

    useEffect(() => {
        fetchReportResult();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    const yearTotal = useMemo(() => reports.reduce((s, r) => s + (r.totalAmount || 0), 0), [reports]);
    const best = useMemo(() => reports.reduce<PMNRReport | null>((b, r) => (!b || (r.totalAmount || 0) > (b.totalAmount || 0) ? r : b), null), [reports]);
    const activeMonths = reports.filter((r) => (r.totalAmount || 0) > 0).length;
    const maxMonth = best?.totalAmount || 0;
    const monthTotal = monthBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const monthName = selectedMonthData ? MONTHS_NUMBER[selectedMonthData.month] || '' : '';

    return (
        <div>
            <PageHeader
                title="Payment work report"
                subtitle="PMNA crane: monthly cash from payment-work bookings"
                actions={
                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-white-dark">Year</span>
                        <select className="form-select w-28" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                            {[...YEARS_FOR_FILTER].reverse().map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </label>
                }
            />

            <StatGrid cols="grid-cols-2 md:grid-cols-4">
                <StatCard label={`Total ${selectedYear}`} value={money(yearTotal)} tone="success" />
                <StatCard label="Months with work" value={activeMonths} />
                <StatCard label="Best month" value={best ? MONTHS_NUMBER[best.month] : '—'} hint={best ? money(best.totalAmount) : undefined} tone="primary" />
                <StatCard label="Monthly average" value={money(activeMonths ? yearTotal / activeMonths : 0)} />
            </StatGrid>

            <Section title="By month" actions={<TableExportButtons containerId="pmnr-months" title={`Payment work report ${selectedYear}`} />} bodyClassName="p-0">
                <div id="pmnr-months" className="datatables">
                    <DataTable
                        {...tableProps}
                        fetching={loading}
                        idAccessor="month"
                        onRowClick={(row) => handleViewMore(row)}
                        rowClassName={() => 'cursor-pointer'}
                        noRecordsText={`No payment work in ${selectedYear}`}
                        columns={[
                            {
                                accessor: 'month',
                                title: 'Month',
                                render: ({ month, year }) => (
                                    <span className="font-semibold">
                                        {MONTHS_NUMBER[month] || 'Unknown'} {year}
                                    </span>
                                ),
                            },
                            {
                                accessor: 'share',
                                title: 'Share of year',
                                render: ({ totalAmount }) => (
                                    <div className="flex min-w-[140px] items-center gap-2">
                                        <div className="h-2 flex-1 rounded-full bg-white-light dark:bg-[#1b2e4b]">
                                            <div className="h-2 rounded-full bg-success" style={{ width: `${maxMonth ? Math.round(((totalAmount || 0) / maxMonth) * 100) : 0}%` }} />
                                        </div>
                                        <span className="w-10 text-right text-xs text-white-dark">{yearTotal ? Math.round(((totalAmount || 0) / yearTotal) * 100) : 0}%</span>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'totalAmount',
                                title: 'Amount',
                                textAlignment: 'right',
                                render: ({ totalAmount }) => <span className="font-bold">{money(totalAmount)}</span>,
                            },
                            {
                                accessor: 'actions',
                                title: '',
                                textAlignment: 'right',
                                width: 110,
                                render: (row) => (
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewMore(row);
                                        }}
                                    >
                                        Bookings
                                    </button>
                                ),
                            },
                        ]}
                        records={reports}
                    />
                </div>
            </Section>

            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title={
                    <div>
                        <div className="text-lg font-semibold">
                            {monthName} {selectedMonthData?.year}
                        </div>
                        <div className="text-xs text-white-dark">Completed payment-work bookings</div>
                    </div>
                }
                size="xl"
                overflow="inside"
                radius="md"
                padding="lg"
            >
                {monthLoading ? (
                    <div className="py-12 text-center text-sm text-white-dark">Loading…</div>
                ) : monthBookings.length === 0 ? (
                    <EmptyState title="No bookings found" text="No completed bookings for this month." />
                ) : (
                    <>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm">
                                <b>{monthBookings.length}</b> booking{monthBookings.length !== 1 ? 's' : ''} · <b className="text-success">{money(monthTotal)}</b>
                            </div>
                            <TableExportButtons containerId="pmnr-month-bookings" title={`Payment work ${monthName} ${selectedMonthData?.year}`} />
                        </div>
                        <div id="pmnr-month-bookings" className="datatables">
                            <DataTable
                                {...tableProps}
                                idAccessor="_id"
                                columns={[
                                    { accessor: 'index', title: '#', width: 50, render: (_r, i) => i + 1 },
                                    { accessor: 'fileNumber', title: 'File number', render: ({ fileNumber }) => <span className="font-semibold">{fileNumber}</span> },
                                    { accessor: 'customerVehicleNumber', title: 'Vehicle number' },
                                    {
                                        accessor: 'createdAt',
                                        title: 'Date',
                                        render: ({ createdAt }) => (createdAt ? new Date(createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'),
                                    },
                                    { accessor: 'totalAmount', title: 'Amount', textAlignment: 'right', render: ({ totalAmount }) => <span className="font-semibold">{money(totalAmount)}</span> },
                                ]}
                                records={monthBookings}
                            />
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default PaymentWorkReport;
