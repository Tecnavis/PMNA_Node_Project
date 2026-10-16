import { useEffect, useMemo, useState } from 'react';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import { getDriverForDropDown, getProviderForDropDown } from '../../services/driverService';
import { DriverDropdownItem } from '../../interface/Driver';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import { axiosInstance } from '../../config/axiosConfig';
import { ExportColumn } from '../../utils/exportTable';
import { Badge, DataExportButtons, Field, PageHeader, SearchBox, Section, SegTabs, StatCard, StatGrid, money, tableProps, usePaged } from '../../components/ui/PageKit';

const num = (v: unknown) => (typeof v === 'string' ? parseFloat(v) : Number(v)) || 0;
const when = (v?: string) => (v ? `${dateFormate(v)}, ${formattedTime(v)}` : 'N/A');

/** Shows up to 3 values as chips, the rest as "+N more"; the full list is in the tooltip. */
const Chips = ({ values, empty }: { values?: (string | number)[]; empty?: React.ReactNode }) =>
    values?.length ? (
        <div className="flex flex-wrap gap-1" title={values.join(', ')}>
            {values.slice(0, 3).map((v, i) => (
                <span key={i} className="rounded bg-white-light px-1.5 py-0.5 text-[11px] dark:bg-[#1b2e4b]">
                    {v}
                </span>
            ))}
            {values.length > 3 && <span className="text-[11px] text-white-dark">+{values.length - 3} more</span>}
        </div>
    ) : (
        <>{empty ?? <span className="text-white-dark">—</span>}</>
    );

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString('en-IN', { month: 'long' }));

const TransactionDetails = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [advances, setAdvances] = useState<any[]>([]);
    const [receivedDetails, setReceivedDetails] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<DriverDropdownItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [driverType, setDriverType] = useState<'Driver' | 'Provider' | ''>('Driver');
    const [driverId, setDriverId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
    const [selectedYear, setSelectedYear] = useState<number | ''>(new Date().getFullYear());
    const [search, setSearch] = useState('');

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (driverId) params.append('driverId', driverId);
            if (driverType) params.append('driverType', driverType);
            if (selectedMonth) params.append('month', selectedMonth.toString());
            if (selectedYear) params.append('year', selectedYear.toString());

            const [advancesRes, receivedRes, expensesRes] = await Promise.allSettled([
                axiosInstance.get(`/advance-payment/?${params.toString()}`),
                axiosInstance.get(`/cash-received-details/?${params.toString()}`),
                axiosInstance.get(`/expense/?${params.toString()}`),
            ]);
            setAdvances(advancesRes.status === 'fulfilled' ? advancesRes.value.data.data || [] : []);
            setReceivedDetails(receivedRes.status === 'fulfilled' ? receivedRes.value.data || [] : []);
            setExpenses(expensesRes.status === 'fulfilled' ? expensesRes.value.data.expenseData || expensesRes.value.data || [] : []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverId, driverType, selectedMonth, selectedYear]);

    useEffect(() => {
        (async () => {
            try {
                if (driverType === 'Driver') setDrivers(await getDriverForDropDown());
                else if (driverType === 'Provider') setDrivers(await getProviderForDropDown());
                else {
                    const [d, p] = await Promise.all([getDriverForDropDown(), getProviderForDropDown()]);
                    setDrivers([...d, ...p]);
                }
            } catch (error) {
                console.error('Error fetching drivers:', error);
            }
        })();
    }, [driverType]);

    const resetFilters = () => {
        setDriverType('Driver');
        setDriverId('');
        setSelectedMonth('');
        setSelectedYear(new Date().getFullYear());
        setSearch('');
    };

    const match = (item: any) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const hay = [item.driver?.name, item.fileNumber, item.remark, item.description, ...(item.filesNumbers || [])].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
    };
    const advRows = useMemo(() => (Array.isArray(advances) ? advances : []).filter(match), [advances, search]); // eslint-disable-line react-hooks/exhaustive-deps
    const recRows = useMemo(() => (Array.isArray(receivedDetails) ? receivedDetails : []).filter(match), [receivedDetails, search]); // eslint-disable-line react-hooks/exhaustive-deps
    const expRows = useMemo(() => (Array.isArray(expenses) ? expenses : []).filter(match), [expenses, search]); // eslint-disable-line react-hooks/exhaustive-deps

    const advTotal = advRows.reduce((s, a) => s + num(a.addedAdvance), 0);
    const recTotal = recRows.reduce((s, r) => s + num(r.receivedAmount), 0);
    const expTotal = expRows.reduce((s, e) => s + num(e.amount), 0);

    const nameCol = (label = 'Name'): DataTableColumn<any> => ({ accessor: 'driver.name', title: label, render: (i) => <span className="font-medium">{i.driver?.name || 'N/A'}</span> });

    const advanceColumns: DataTableColumn<any>[] = [
        { accessor: 'createdAt', title: 'Date', render: (i) => when(i.createdAt) },
        nameCol(),
        { accessor: 'userModel', title: 'Type', render: (i) => (i.userModel ? <Badge tone={i.userModel === 'Driver' ? 'primary' : 'info'}>{i.userModel}</Badge> : '—') },
        { accessor: 'addedAdvance', title: 'Added advance', textAlignment: 'right', render: (i) => <span className={`font-semibold ${num(i.addedAdvance) > 0 ? 'text-success' : 'text-danger'}`}>{money(Math.abs(num(i.addedAdvance)))}</span> },
        { accessor: 'advance', title: 'Balance advance', textAlignment: 'right', render: (i) => <span className="font-semibold">{money(i.advance)}</span> },
        { accessor: 'filesNumbers', title: 'File numbers', render: (i) => <Chips values={i.filesNumbers} empty={<span className="text-[11px] font-medium text-primary">Added to advance</span>} /> },
        { accessor: 'driverSalary', title: 'Driver salary', render: (i) => <Chips values={(i.driverSalary || []).map((s: number) => money(s))} /> },
        { accessor: 'transferdSalary', title: 'Transferred salary', render: (i) => <Chips values={(i.transferdSalary || []).map((s: number) => money(s))} /> },
        { accessor: 'remark', title: 'Remarks', render: (i) => <span className="block max-w-[200px] truncate" title={i.remark}>{i.remark || '—'}</span> },
    ];

    const receivedColumns: DataTableColumn<any>[] = [
        { accessor: 'createdAt', title: 'Date', render: (i) => when(i.createdAt) },
        nameCol(),
        { accessor: 'fileNumber', title: 'File number', render: (i) => <span className="font-medium">{i.fileNumber || 'N/A'}</span> },
        { accessor: 'totalAmount', title: 'Amount from driver', textAlignment: 'right', render: (i) => money(i.totalAmount) },
        { accessor: 'amount', title: 'Booking amount', textAlignment: 'right', render: (i) => <span className="text-success">{money(num(i.amount))}</span> },
        { accessor: 'receivedAmount', title: 'Received', textAlignment: 'right', render: (i) => <span className="font-semibold text-primary">{money(num(i.receivedAmount))}</span> },
        { accessor: 'balance', title: 'Balance', textAlignment: 'right', render: (i) => <span className={`font-semibold ${num(i.balance) >= 0 ? 'text-success' : 'text-danger'}`}>{money(Math.abs(num(i.balance)))}</span> },
        { accessor: 'remark', title: 'Remarks', render: (i) => <span className="block max-w-[200px] truncate" title={i.remark}>{i.remark || '—'}</span> },
    ];

    const expenseColumns: DataTableColumn<any>[] = [
        { accessor: 'createdAt', title: 'Date', render: (i) => when(i.createdAt) },
        nameCol(),
        { accessor: 'amount', title: 'Amount', textAlignment: 'right', render: (i) => <span className="font-semibold text-danger">{money(i.amount)}</span> },
        { accessor: 'description', title: 'Description', render: (i) => <span className="block max-w-[320px] truncate" title={i.description}>{i.description || '—'}</span> },
    ];

    const exportAdv: ExportColumn<any>[] = [
        { key: 'createdAt', label: 'Date', value: (i) => when(i.createdAt) },
        { key: 'name', label: 'Name', value: (i) => i.driver?.name || '' },
        { key: 'userModel', label: 'Type' },
        { key: 'addedAdvance', label: 'Added advance', numeric: true, value: (i) => num(i.addedAdvance) },
        { key: 'advance', label: 'Balance advance', numeric: true, value: (i) => num(i.advance) },
        { key: 'filesNumbers', label: 'File numbers', value: (i) => (i.filesNumbers || []).join(', ') },
        { key: 'driverSalary', label: 'Driver salary', value: (i) => (i.driverSalary || []).join(', ') },
        { key: 'transferdSalary', label: 'Transferred salary', value: (i) => (i.transferdSalary || []).join(', ') },
        { key: 'remark', label: 'Remarks' },
    ];
    const exportRec: ExportColumn<any>[] = [
        { key: 'createdAt', label: 'Date', value: (i) => when(i.createdAt) },
        { key: 'name', label: 'Name', value: (i) => i.driver?.name || '' },
        { key: 'fileNumber', label: 'File number' },
        { key: 'totalAmount', label: 'Amount from driver', numeric: true, value: (i) => num(i.totalAmount) },
        { key: 'amount', label: 'Booking amount', numeric: true, value: (i) => num(i.amount) },
        { key: 'receivedAmount', label: 'Received', numeric: true, value: (i) => num(i.receivedAmount) },
        { key: 'balance', label: 'Balance', numeric: true, value: (i) => num(i.balance) },
        { key: 'remark', label: 'Remarks' },
    ];
    const exportExp: ExportColumn<any>[] = [
        { key: 'createdAt', label: 'Date', value: (i) => when(i.createdAt) },
        { key: 'name', label: 'Name', value: (i) => i.driver?.name || '' },
        { key: 'amount', label: 'Amount', numeric: true, value: (i) => num(i.amount) },
        { key: 'description', label: 'Description' },
    ];

    const views = [
        { label: 'Advances', rows: advRows, columns: advanceColumns, exportCols: exportAdv, total: advTotal, totalLabel: 'Total advance added', empty: 'No advances found' },
        { label: 'Received', rows: recRows, columns: receivedColumns, exportCols: exportRec, total: recTotal, totalLabel: 'Total received', empty: 'No received details found' },
        { label: 'Expenses', rows: expRows, columns: expenseColumns, exportCols: exportExp, total: expTotal, totalLabel: 'Total expenses', empty: 'No expenses found' },
    ];
    const view = views[activeTab];
    const { pageRows, paging } = usePaged(view.rows, 50);

    const period = selectedMonth ? `${MONTHS[Number(selectedMonth) - 1]} ${selectedYear || ''}` : selectedYear ? `${selectedYear}` : 'All time';
    const who = drivers.find((d) => d._id === driverId)?.label || (driverType ? `All ${driverType.toLowerCase()}s` : 'Everyone');
    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div>
            <PageHeader
                title="Transaction details"
                subtitle={`${who} · ${period}`}
                actions={
                    <DataExportButtons
                        title={`${view.label} - ${who}`}
                        subtitle={period}
                        columns={view.exportCols}
                        rows={view.rows}
                        totals={{ [view.totalLabel]: money(view.total) }}
                    />
                }
            />

            <StatGrid cols="grid-cols-1 sm:grid-cols-3">
                <StatCard label="Advances added" value={money(advTotal)} hint={`${advRows.length} ${advRows.length === 1 ? "entry" : "entries"}`} tone="warning" onClick={() => setActiveTab(0)} active={activeTab === 0} />
                <StatCard label="Cash received" value={money(recTotal)} hint={`${recRows.length} ${recRows.length === 1 ? "entry" : "entries"}`} tone="primary" onClick={() => setActiveTab(1)} active={activeTab === 1} />
                <StatCard label="Expenses" value={money(expTotal)} hint={`${expRows.length} ${expRows.length === 1 ? "entry" : "entries"}`} tone="danger" onClick={() => setActiveTab(2)} active={activeTab === 2} />
            </StatGrid>

            <Section bodyClassName="p-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                    <Field label="Month">
                        <select className="form-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">All months</option>
                            {MONTHS.map((m, i) => (
                                <option key={m} value={i + 1}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Year">
                        <select className="form-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}>
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Type">
                        <select
                            className="form-select"
                            value={driverType}
                            onChange={(e) => {
                                setDriverType(e.target.value as 'Driver' | 'Provider');
                                setDriverId('');
                            }}
                        >
                            <option value="Driver">Driver</option>
                            <option value="Provider">Provider</option>
                        </select>
                    </Field>
                    <Field label="Name">
                        <select className="form-select" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                            <option value="">All</option>
                            {drivers.map((d) => (
                                <option key={d._id} value={d._id}>
                                    {d?.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Search">
                        <SearchBox value={search} onChange={setSearch} placeholder="Name, file no., remark" />
                    </Field>
                    <div className="flex items-end">
                        <button type="button" className="btn btn-outline-secondary w-full" onClick={resetFilters}>
                            Reset
                        </button>
                    </div>
                </div>
            </Section>

            <Section bodyClassName="p-0">
                <div className="border-b border-white-light p-3 dark:border-[#1b2e4b]">
                    <SegTabs tabs={views.map((v, i) => ({ key: i, label: v.label, count: v.rows.length }))} value={activeTab} onChange={(k) => setActiveTab(Number(k))} />
                </div>
                <div className="datatables">
                    <DataTable {...tableProps} fetching={loading} idAccessor="_id" columns={view.columns} records={pageRows} {...paging} noRecordsText={view.empty} />
                </div>
                {view.rows.length > 0 && (
                    <div className="flex justify-end border-t border-white-light px-4 py-2 text-sm dark:border-[#1b2e4b]">
                        {view.totalLabel}: <b className="ltr:ml-2 rtl:mr-2">{money(view.total)}</b>
                    </div>
                )}
            </Section>
        </div>
    );
};

export default TransactionDetails;
