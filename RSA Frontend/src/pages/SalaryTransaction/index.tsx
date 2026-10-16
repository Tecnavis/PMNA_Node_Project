import { useEffect, useMemo, useState } from 'react';
import { DataTable } from 'mantine-datatable';
import { getDriverForDropDown, getProviderForDropDown } from '../../services/driverService';
import { DriverDropdownItem } from '../../interface/Driver';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { Badge, DataExportButtons, Field, PageHeader, SearchBox, Section, StatCard, StatGrid, money, tableProps, usePaged } from '../../components/ui/PageKit';

interface ITransaction {
    _id: string;
    driver: {
        _id: string;
        name: string;
    };
    userModel: 'Driver' | 'Provider';
    transactionId: string;
    amount: number;
    createdAt: string;
    bookingIds?: string[];
}

const dayKey = (d: string | Date) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const TransactionList = () => {
    const [transactions, setTransactions] = useState<ITransaction[]>([]);
    const [drivers, setDrivers] = useState<DriverDropdownItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [driverType, setDriverType] = useState<'Driver' | 'Provider' | ''>('Driver');
    const [driverId, setDriverId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [search, setSearch] = useState('');

    const fetchTransactions = async (type = driverType, id = driverId) => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`${BASE_URL}/transactions/?driverType=${type}&driverId=${id}`);
            setTransactions(response.data.data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions(driverType, driverId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverType, driverId]);

    useEffect(() => {
        (async () => {
            try {
                if (driverType === 'Driver') setDrivers(await getDriverForDropDown());
                else if (driverType === 'Provider') setDrivers(await getProviderForDropDown());
                else setDrivers([]);
            } catch (error) {
                console.error('Error fetching drivers:', error);
            }
        })();
    }, [driverType]);

    const resetFilters = () => {
        setDriverType('Driver');
        setDriverId('');
        setStartDate('');
        setEndDate('');
        setSearch('');
    };

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return transactions.filter((t) => {
            const k = t.createdAt ? dayKey(t.createdAt) : '';
            if (startDate && k < startDate) return false;
            if (endDate && k > endDate) return false;
            if (q && !`${t.transactionId || ''} ${t.driver?.name || ''}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [transactions, startDate, endDate, search]);

    const totalAmount = rows.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const now = new Date();
    const thisMonth = rows.filter((t) => {
        const d = new Date(t.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const people = new Set(rows.map((t) => t.driver?._id)).size;
    const filtered = !!(startDate || endDate || search || driverId);
    const { pageRows, paging } = usePaged(rows, 50);
    const exportCols = [
        { key: 'transactionId', label: 'Transaction ID' },
        { key: 'userModel', label: 'Type' },
        { key: 'name', label: 'Name', value: (t: ITransaction) => t.driver?.name || '' },
        { key: 'amount', label: 'Amount', numeric: true, value: (t: ITransaction) => Number(t.amount) || 0 },
        { key: 'createdAt', label: 'Date', value: (t: ITransaction) => (t.createdAt ? `${dateFormate(t.createdAt)} ${formattedTime(t.createdAt)}` : '') },
    ];
    const exportSubtitle = [driverType || 'All types', drivers.find((d) => d._id === driverId)?.label, startDate && `from ${startDate}`, endDate && `to ${endDate}`].filter(Boolean).join(' · ');

    return (
        <div>
            <PageHeader title="Salary transactions" subtitle="Salary paid to drivers and providers" actions={<DataExportButtons title="Salary transactions" subtitle={exportSubtitle} columns={exportCols} rows={rows} totals={{ 'Total paid': money(totalAmount) }} />} />

            <StatGrid>
                <StatCard label="Transactions" value={rows.length.toLocaleString('en-IN')} hint={filtered ? 'matching filters' : undefined} />
                <StatCard label="Total paid" value={money(totalAmount)} tone="success" />
                <StatCard label="Paid this month" value={money(thisMonth.reduce((s, t) => s + (Number(t.amount) || 0), 0))} hint={`${thisMonth.length} transactions`} tone="primary" />
                <StatCard label={driverType === 'Provider' ? 'Providers paid' : driverType === 'Driver' ? 'Drivers paid' : 'People paid'} value={people} />
            </StatGrid>

            <Section bodyClassName="p-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                    <Field label="Type">
                        <select
                            className="form-select"
                            value={driverType}
                            onChange={(e) => {
                                setDriverType(e.target.value as 'Driver' | 'Provider' | '');
                                setDriverId('');
                            }}
                        >
                            <option value="">All types</option>
                            <option value="Driver">Driver</option>
                            <option value="Provider">Provider</option>
                        </select>
                    </Field>
                    <Field label="Name" className="col-span-2 md:col-span-1">
                        <select className="form-select" value={driverId} onChange={(e) => setDriverId(e.target.value)} disabled={!driverType}>
                            <option value="">All</option>
                            {drivers.map((d) => (
                                <option key={d._id} value={d._id}>
                                    {d?.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="From">
                        <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || undefined} />
                    </Field>
                    <Field label="To">
                        <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
                    </Field>
                    <Field label="Search" className="col-span-2 md:col-span-1">
                        <SearchBox value={search} onChange={setSearch} placeholder="Transaction ID or name" />
                    </Field>
                    <div className="col-span-2 flex items-end md:col-span-1">
                        <button type="button" className="btn btn-outline-secondary w-full" onClick={resetFilters} disabled={!filtered && driverType === 'Driver'}>
                            Reset
                        </button>
                    </div>
                </div>
            </Section>

            <Section bodyClassName="p-0">
                <div id="salary-tx-table" className="datatables">
                    <DataTable
                        {...tableProps}
                        fetching={loading}
                        idAccessor="_id"
                        records={pageRows}
                        {...paging}
                        noRecordsText={filtered ? 'No transactions match these filters' : 'No transactions found'}
                        columns={[
                            { accessor: 'transactionId', title: 'Transaction ID', render: (t) => <span className="font-semibold">{t.transactionId}</span> },
                            { accessor: 'userModel', title: 'Type', render: (t) => <Badge tone={t.userModel === 'Driver' ? 'primary' : 'info'}>{t.userModel}</Badge> },
                            { accessor: 'driver.name', title: 'Name', render: (t) => t.driver?.name || 'N/A' },
                            { accessor: 'amount', title: 'Amount', textAlignment: 'right', render: (t) => <span className="font-semibold text-success">{money(t.amount)}</span> },
                            { accessor: 'createdAt', title: 'Date', render: (t) => (t.createdAt ? `${dateFormate(t.createdAt)}, ${formattedTime(t.createdAt)}` : 'N/A') },
                        ]}
                    />
                </div>
                {rows.length > 0 && (
                    <div className="flex justify-end border-t border-white-light px-4 py-2 text-sm dark:border-[#1b2e4b]">
                        Total: <b className="text-success ltr:ml-2 rtl:mr-2">{money(totalAmount)}</b>
                    </div>
                )}
            </Section>
        </div>
    );
};

export default TransactionList;
