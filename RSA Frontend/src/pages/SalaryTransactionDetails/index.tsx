import React, { useEffect, useState } from 'react';
import { Card, Tooltip, MenuItem, Select, FormControl, InputLabel, Tabs, Tab, Box } from '@mui/material';
import { Button } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDriverForDropDown, getProviderForDropDown } from '../../services/driverService';
import { DriverDropdownItem } from '../../interface/Driver';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import Loader from '../../components/loader';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TransactionDetails = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [advances, setAdvances] = useState<any[]>([]);
    const [receivedDetails, setReceivedDetails] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<DriverDropdownItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filterLoading, setFilterLoading] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

    // Filter states
    const [driverType, setDriverType] = useState<'Driver' | 'Provider' | ''>('Driver');
    const [driverId, setDriverId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
// Add these to your existing state
const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
const [selectedYear, setSelectedYear] = useState<number | ''>(new Date().getFullYear());
 const fetchAllData = async () => {
    try {
        setLoading(true);
        setFilterLoading(true);

        const params = new URLSearchParams();
        if (driverId) params.append('driverId', driverId);
        if (driverType) params.append('driverType', driverType);
        if (selectedMonth) params.append('month', selectedMonth.toString());
        if (selectedYear) params.append('year', selectedYear.toString());

        const [advancesRes, receivedRes, expensesRes] = await Promise.all([
            axiosInstance.get(`/advance-payment/?${params.toString()}`),
            axiosInstance.get(`/cash-received-details/?${params.toString()}`),
            axiosInstance.get(`/expense/?${params.toString()}`)
        ]);

        setAdvances(advancesRes.data.data || []);
        setReceivedDetails(receivedRes.data || []);
        setExpenses(expensesRes.data.expenseData || expensesRes.data || []);
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        setFilterLoading(false);
        setLoading(false);
    }
};

    useEffect(() => {
        fetchAllData();
    }, [driverId, driverType]);

    const fetchDrivers = async () => {
        try {
            let driverList;
            if (driverType === 'Driver') {
                driverList = await getDriverForDropDown();
            } else if (driverType === 'Provider') {
                driverList = await getProviderForDropDown();
            } else {
                // If no type selected, get both?
                const [drivers, providers] = await Promise.all([
                    getDriverForDropDown(),
                    getProviderForDropDown()
                ]);
                driverList = [...drivers, ...providers];
            }
            setDrivers(driverList);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAllData();
    };

    const handleResetFilters = () => {
        setDriverType('Driver');
        setDriverId('');
        setStartDate('');
        setEndDate('');
        fetchAllData();
    };

    useEffect(() => {
        fetchDrivers();
    }, [driverType]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const renderTable = (data: any[], columns: any[], emptyMessage: string) => {
        if (loading) {
            return (
                <tr>
                    <td colSpan={columns.length} className="px-4 py-6 text-center">
                        <Loader />
                    </td>
                </tr>
            );
        }
        
        if (data.length === 0) {
            return (
                <tr>
                    <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-500">
                        {emptyMessage}
                    </td>
                </tr>
            );
        }

        return data.map((item) => (
            <motion.tr
                key={item._id}
                className="hover:bg-gray-50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {columns.map((column) => (
                    <td key={column.field} className="px-4 py-3">
                        {column.render ? column.render(item) : item[column.field]}
                    </td>
                ))}
            </motion.tr>
        ));
    };

 const advanceColumns = [
    { 
        field: 'createdAt', 
        header: 'Date', 
        render: (item: any) => (
            item.createdAt ? (
                <span>
                    {dateFormate(item.createdAt)}, {formattedTime(item.createdAt)}
                </span>
            ) : 'N/A'
        )
    },
    { 
        field: 'addedAdvance', 
        header: 'Added Advance (₹)', 
       render: (item: any) => (
    <span className={`font-semibold ${
        item.addedAdvance > 0 ? 'text-green-700' : 'text-red-700'
    }`}>
        ₹{Math.abs(item.addedAdvance || 0).toLocaleString()}
    </span>
)
    },
    { 
        field: 'advance', 
        header: 'Balance Advance (₹)', 
        render: (item: any) => (
            <span className="font-semibold">
                ₹{(item.advance || 0).toLocaleString()}
            </span>
        )
    },
 {
    field: 'filesNumbers',
    header: 'File Numbers',
    render: (item: any) => (
        <Tooltip title={item.filesNumbers?.join(', ') || 'No files'}>
            <div className="flex flex-col gap-1">
                {item.filesNumbers?.length ? (
                    <>
                        {item.filesNumbers.slice(0, 3).map((file: string, index: number) => (
                            <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {file}
                            </span>
                        ))}
                        {item.filesNumbers.length > 3 && (
                            <span className="text-xs text-gray-500">
                                +{item.filesNumbers.length - 3} more
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-xs font-medium text-blue-600">
                        Added to advance
                    </span>
                )}
            </div>
        </Tooltip>
    )
},
  { 
    field: 'driverSalary', 
    header: 'Driver Salary (₹)', 
    render: (item: any) => (
        <Tooltip 
        title={item.driverSalary
          ?.map((s: number) => `₹${s?.toLocaleString() || '0'}`)
          .join(', ') || 'No salaries'
        }>
            <div className="flex flex-col gap-1">
                {item.driverSalary?.slice(0, 3).map((salary: number, index: number) => (
                    <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        ₹{salary?.toLocaleString() || '0'}
                    </span>
                ))}
                {item.driverSalary?.length > 3 && (
                    <span className="text-xs text-gray-500">
                        +{item.driverSalary.length - 3} more
                    </span>
                )}
            </div>
        </Tooltip>
    )
},
       { 
        field: 'transferdSalary', 
        header: 'Transferred Salary (₹)', 
        render: (item: any) => (
            // <div className="flex flex-col gap-1">
            //     {item.transferdSalary?.map((salary: number, index: number) => (
            //         <span key={index} className="text-xs">
            //             ₹{salary?.toLocaleString() || '0'}
            //         </span>
            //     ))}
            // </div>
             <Tooltip 
        title={item.transferdSalary
          ?.map((s: number) => `₹${s?.toLocaleString() || '0'}`)
          .join(', ') || 'No salaries'
        }>
            <div className="flex flex-col gap-1">
                {item.transferdSalary?.slice(0, 3).map((salary: number, index: number) => (
                    <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        ₹{salary?.toLocaleString() || '0'}
                    </span>
                ))}
                {item.transferdSalary?.length > 3 && (
                    <span className="text-xs text-gray-500">
                        +{item.transferdSalary.length - 3} more
                    </span>
                )}
            </div>
        </Tooltip>
        )
    },
    // { 
    //     field: 'type', 
    //     header: 'Transaction Type' 
    // },
    { 
        field: 'remark', 
        header: 'Remarks' 
    },
    { 
        field: 'userModel', 
        header: 'User Type', 
        render: (item: any) => (
            <span className={`px-2 py-1 rounded-full text-xs ${
                item.userModel === 'Driver' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}>
                {item.userModel}
            </span>
        )
    },
    { 
        field: 'driver.name', 
        header: 'Driver Name', 
        render: (item: any) => (
            <Tooltip title={`Driver ID: ${item.driver?._id}`}>
                <span className="cursor-help">{item.driver?.name || 'N/A'}</span>
            </Tooltip>
        )
    }
];

const receivedDetailsColumns = [
     { 
        field: 'createdAt', 
        header: 'Date', 
        render: (item: any) => (
            item.createdAt ? (
                <div className="flex flex-col">
                    <span>{dateFormate(item.createdAt)}</span>
                    <span className="text-xs text-gray-500">
                        {formattedTime(item.createdAt)}
                    </span>
                </div>
            ) : 'N/A'
        )
    },
    { 
        field: 'fileNumber', 
        header: 'File Number',
        render: (item: any) => (
            <span className="font-medium">
                {item.fileNumber || 'N/A'}
            </span>
        )
    },
 
     { 
        field: 'totalAmount', 
        header: 'Current Net (₹)', 
        render: (item: any) => (
            <span className="font-semibold">
                ₹{(item.totalAmount || 0).toLocaleString()}
            </span>
        )
    },
    { 
        field: 'amount', 
        header: 'Booking Amount (₹)', 
        render: (item: any) => {
            const amount = typeof item.amount === 'string' 
                ? parseFloat(item.amount) 
                : item.amount;
            return (
                <span className="font-semibold text-green-700">
                    ₹{(amount || 0).toLocaleString()}
                </span>
            );
        }
    },
    { 
        field: 'receivedAmount', 
        header: 'Received Amount (₹)', 
        render: (item: any) => {
            const amount = typeof item.receivedAmount === 'string' 
                ? parseFloat(item.receivedAmount) 
                : item.receivedAmount;
            return (
                <span className="font-semibold text-blue-700">
                    ₹{(amount || 0).toLocaleString()}
                </span>
            );
        }
    },
    { 
        field: 'balance', 
        header: 'Balance (₹)', 
        render: (item: any) => {
            const balance = typeof item.balance === 'string' 
                ? parseFloat(item.balance) 
                : item.balance;
            return (
                <span className={`font-semibold ${
                    (balance || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                    ₹{Math.abs(balance || 0).toLocaleString()}
                </span>
            );
        }
    },
   
    { 
        field: 'remark', 
        header: 'Remarks',
        render: (item: any) => (
            <Tooltip title={item.remark || 'No remarks'}>
                <span className="line-clamp-1 max-w-[150px]">
                    {item.remark || 'N/A'}
                </span>
            </Tooltip>
        )
    },
      { 
        field: 'driver.name', 
        header: 'Driver Name', 
        render: (item: any) => (
            <Tooltip title={`Driver ID: ${item.driver?._id}`}>
                <span className="cursor-help font-medium">
                    {item.driver?.name || 'N/A'}
                </span>
            </Tooltip>
        )
    },
];

const expenseColumns = [
     { field: 'createdAt', header: 'Date', render: (item: any) => (
        item.createdAt ? (
            <span>
                {dateFormate(item.createdAt)}, {formattedTime(item.createdAt)}
            </span>
        ) : 'N/A'
    )},
    { field: 'amount', header: 'Amount (₹)', render: (item: any) => (
        <span className="font-semibold text-red-700">
            ₹{(item.amount || 0).toLocaleString()}
        </span>
    )},
  
     { field: 'description', header: 'Description' },
    { field: 'driver.name', header: 'Driver Name', render: (item: any) => (
        <Tooltip title={`Driver ID: ${item.driver?._id}`}>
            <span className="cursor-help">{item.driver?.name || 'N/A'}</span>
        </Tooltip>
    )},
];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="p-6 shadow-xl rounded-2xl bg-white">
                <div className="flex justify-between items-center mb-6">
                    <motion.h2
                        className="text-2xl font-semibold text-indigo-700"
                        initial={{ x: -20 }}
                        animate={{ x: 0 }}
                    >
                        Driver Financial Records
                    </motion.h2>
                    <Button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                    >
                        Filters
                    </Button>
                </div>

                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <Card className="py-4 px-1 shadow-sm">
                                <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormControl fullWidth size="small">
        <InputLabel>Month</InputLabel>
        <Select
            value={selectedMonth}
            label="Month"
            onChange={(e) => setSelectedMonth(e.target.value as number | '')}
        >
            <MenuItem value="">All Months</MenuItem>
            {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </MenuItem>
            ))}
        </Select>
    </FormControl>

    <FormControl fullWidth size="small">
        <InputLabel>Year</InputLabel>
        <Select
            value={selectedYear}
            label="Year"
            onChange={(e) => setSelectedYear(e.target.value as number | '')}
        >
            {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                    <MenuItem key={year} value={year}>
                        {year}
                    </MenuItem>
                );
            })}
        </Select>
    </FormControl>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Driver Type</InputLabel>
                                        <Select
                                            value={driverType}
                                            label="Driver Type"
                                            onChange={(e) => setDriverType(e.target.value as 'Driver' | 'Provider')}
                                        >
                                            <MenuItem value="Driver">Driver</MenuItem>
                                            <MenuItem value="Provider">Provider</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth size="small">
                                        <InputLabel>Driver Name</InputLabel>
                                        <Select
                                            value={driverId}
                                            label="Driver Name"
                                            onChange={(e) => setDriverId(e.target.value)}
                                        >
                                            <MenuItem value="">All Drivers</MenuItem>
                                            {drivers.map((driver) => (
                                                <MenuItem key={driver._id} value={driver._id}>
                                                    {driver?.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <div className="flex items-end gap-2 h-10 col-span-2">
                                        <Button
                                            type="submit"
                                            className={`bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg w-full flex items-center justify-center ${filterLoading ? 'text-xs px-0 gap-1' : 'px-4'}`}
                                        >
                                            Apply Filters {filterLoading && <Loader />}
                                        </Button>
                                        <Button
                                            type="button"
  onClick={() => {
                setSelectedMonth('');
                setSelectedYear(new Date().getFullYear());
                handleResetFilters();
            }}                                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2.5 rounded-lg w-full"
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Box sx={{ width: '100%' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={activeTab} onChange={handleTabChange} aria-label="financial records tabs">
                            <Tab label="Advances" />
                            <Tab label="Received Details" />
                            <Tab label="Expenses" />
                        </Tabs>
                    </Box>
                    <TabPanel value={activeTab} index={0}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left text-gray-600">
                                <thead className="bg-indigo-50 border-b text-indigo-700">
                                    <tr>
                                        {advanceColumns.map((col) => (
                                            <th key={col.field} className="px-4 py-3">{col.header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {renderTable(advances, advanceColumns, 'No advances found')}
                                </tbody>
                            </table>
                        </div>
                    </TabPanel>
                    <TabPanel value={activeTab} index={1}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left text-gray-600">
                                <thead className="bg-indigo-50 border-b text-indigo-700">
                                    <tr>
                                        {receivedDetailsColumns.map((col) => (
                                            <th key={col.field} className="px-4 py-3">{col.header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {renderTable(receivedDetails, receivedDetailsColumns, 'No received details found')}
                                </tbody>
                            </table>
                        </div>
                    </TabPanel>
                    <TabPanel value={activeTab} index={2}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left text-gray-600">
                                <thead className="bg-indigo-50 border-b text-indigo-700">
                                    <tr>
                                        {expenseColumns.map((col) => (
                                            <th key={col.field} className="px-4 py-3">{col.header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {renderTable(expenses, expenseColumns, 'No expenses found')}
                                </tbody>
                            </table>
                        </div>
                    </TabPanel>
                </Box>
            </Card>
        </motion.div>
    );
};

export default TransactionDetails;