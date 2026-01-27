// components/DailyWork/DailyReport.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Divider,
  Avatar,
  Badge
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Check as CheckIcon,
  Circle as CircleIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import CustomDatePicker from '../Common/CustomDatePicker';

// Define interfaces
interface Staff {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  staffType?: string;
}

interface Task {
  _id?: string;
  taskName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  count?: number;
  remarks?: string;
  priority?: number;
  time?: string;
  estimatedTime?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  order?: number;
}

interface DailyWorkReport {
  _id: string;
  staff: Staff;
  staffType: string;
  date: string;
  works: Task[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  createdAt: string;
  updatedAt: string;
}

interface ReportStatistics {
  totalStaff: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
}

interface ReportData {
  message: string;
  data: DailyWorkReport[];
  statistics: ReportStatistics;
  date: string;
}

interface DailyReportProps {
  open: boolean;
  onClose: () => void;
}

// Mock data based on your images
const MOCK_STAFF_DATA = [
  {
    name: "ASWANI",
    tasks: [
      { taskName: "COMPANY BILLING", order: 6 },
      { taskName: "NEW CASE UPDATION IN EXCEL", order: 5 },
      { taskName: "DRIVERS CASE UPDATION IN EXCEL", order: 4 },
      { taskName: "INVOICE NUMBER ADD", order: 3 },
      { taskName: "FUEL BILL CHECKING & TRACKING IN PORTAL", order: 2 },
      { taskName: "COMPANY CASES ADDED IN EXCEL", order: 1 }
    ]
  },
  {
    name: "VINECHTHA",
    tasks: [
      { taskName: "NIGHT/TOMORROW CASES BOOKING", order: 1 },
      { taskName: "NIGHT/TOMORROW CASES CLOSING", order: 2 },
      { taskName: "NEW ADDE CASES TRANSLATING & CALL TO BOOKING", order: 3 },
      { taskName: "FEDERAL CALLING", order: 4 },
      { taskName: "CALL TO CUSTOMER FOR CASH PENDING", order: 5 },
      { taskName: "SUD CHECKING", order: 6 },
      { taskName: "REMARKS CHECKING", order: 7 },
      { taskName: "LEAST TRAVELING", order: 8 },
      { taskName: "LOUISIANA", order: 9 }
    ]
  },
  {
    name: "MUNEERA",
    tasks: [
      { taskName: "CASES CROSS CHECKING FOR", order: 1 },
      { taskName: "COMPANY BILLING (Group & App)", order: 2 },
      { taskName: "PAYMENT MANAGEMENT", order: 3 },
      { taskName: "EXPENSE CHECKING & TRACKING", order: 4 },
      { taskName: "ACCOUNT TRANSACTION", order: 5 },
      { taskName: "DRIVER COMPLETED CASES TRACKING", order: 6 },
      { taskName: "PHOTOS CROSS CHECKING", order: 7 },
      { taskName: "ACCOUNT STATE VERIFY", order: 8 },
      { taskName: "CASE UPDATION IN GROUP PORTAL", order: 9 }
    ]
  },
  {
    name: "SARASWATHI",
    tasks: [
      { taskName: "NET ADDED CLASS SERVICE", order: 1 },
      { taskName: "NIGHT/TOMORROW CLASS BOOKING ADJ", order: 2 },
      { taskName: "PENDING CLASS CLOSING", order: 3 },
      { taskName: "NEW ADDE CLASS START", order: 4 },
      { taskName: "DRIVER COMPLETE CLASS SERVICE", order: 5 },
      { taskName: "DUE DATE TRACKING & PROCEDURE", order: 6 },
      { taskName: "SPECIAL TAX & INSURANCE", order: 7 },
      { taskName: "SHOWROOM ADJ", order: 8 },
      { taskName: "INVOICE AMOUNT ADJ", order: 9 },
      { taskName: "CASH PENDING CLOSING", order: 10 }
    ]
  }
];

// Default statistics
const DEFAULT_STATISTICS: ReportStatistics = {
  totalStaff: 0,
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  completionRate: 0
};

// Default report data
const DEFAULT_REPORT_DATA: ReportData = {
  message: '',
  data: [],
  statistics: DEFAULT_STATISTICS,
  date: new Date().toISOString()
};

const DailyReport: React.FC<DailyReportProps> = ({ open, onClose }) => {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [useMockData, setUseMockData] = useState<boolean>(false);
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      fetchReport();
    }
  }, [open]);

  const fetchReport = async () => {
    if (useMockData) {
      // Use mock data
      setLoading(true);
      setTimeout(() => {
        const mockReport: ReportData = {
          message: "Report generated successfully",
          data: MOCK_STAFF_DATA.map((staffData, index) => ({
            _id: `staff-${index}`,
            staff: { 
              _id: `staff-${index}`, 
              name: staffData.name,
              staffType: staffData.name === 'ASWANI' ? 'accountant' : 
                        staffData.name === 'VINECHTHA' ? 'operations' :
                        staffData.name === 'MUNEERA' ? 'coordinator' : 'showroom'
            },
            staffType: staffData.name === 'ASWANI' ? 'accountant' : 
                      staffData.name === 'VINECHTHA' ? 'operations' :
                      staffData.name === 'MUNEERA' ? 'coordinator' : 'showroom',
            date: date.toISOString(),
            works: staffData.tasks.map((task, taskIndex) => ({
              taskName: task.taskName,
              status: Math.random() > 0.5 ? 'completed' : 'pending',
              count: Math.floor(Math.random() * 10),
              priority: task.order,
              time: `${9 + taskIndex}:00 AM`,
              order: task.order
            })),
            totalTasks: staffData.tasks.length,
            completedTasks: Math.floor(staffData.tasks.length * 0.7),
            pendingTasks: Math.ceil(staffData.tasks.length * 0.3),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })),
          statistics: {
            totalStaff: MOCK_STAFF_DATA.length,
            totalTasks: MOCK_STAFF_DATA.reduce((sum, staff) => sum + staff.tasks.length, 0),
            completedTasks: Math.floor(MOCK_STAFF_DATA.reduce((sum, staff) => sum + staff.tasks.length, 0) * 0.7),
            pendingTasks: Math.ceil(MOCK_STAFF_DATA.reduce((sum, staff) => sum + staff.tasks.length, 0) * 0.3),
            completionRate: 70
          },
          date: date.toISOString()
        };
        setReport(mockReport);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get<ReportData>(`/work/daily-report`, {
        params: {
          date: date.toISOString().split('T')[0],
          staffName: selectedStaff
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      // Fallback to mock data if API fails
      setUseMockData(true);
      fetchReport();
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (newDate: Date) => {
    setDate(newDate);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('daily-report-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Daily Work Report - ${date.toLocaleDateString()}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .staff-section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
                .staff-header { background-color: #f2f2f2; padding: 10px; margin-bottom: 10px; }
                .task-list { width: 100%; border-collapse: collapse; }
                .task-list td { border: 1px solid #ddd; padding: 8px; }
                .task-list th { background-color: #e8e8e8; padding: 8px; }
                .completed { background-color: #d4edda; }
                .pending { background-color: #fff3cd; }
                .header { text-align: center; margin-bottom: 30px; }
                .timestamp { text-align: right; font-size: 12px; color: #666; margin-top: 20px; }
                @media print {
                  .no-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>DAILY WORK REPORT</h1>
                <h3>Date: ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              </div>
              ${printContent.innerHTML}
              <div class="timestamp">
                Generated on ${new Date().toLocaleString()}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const handleExport = () => {
    if (!report || !report.data) return;

    // Create CSV content
    const headers = ['Staff Name', 'Task Name', 'Status', 'Priority', 'Count', 'Time'];
    const rows: string[][] = [];

    report.data.forEach(staffReport => {
      staffReport.works.forEach(task => {
        rows.push([
          staffReport.staff?.name || 'Unknown',
          task.taskName,
          task.status,
          task.priority?.toString() || '',
          task.count?.toString() || '',
          task.time || ''
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-work-report-${date.toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'in-progress':
        return <PendingIcon sx={{ color: 'info.main', fontSize: 20 }} />;
      default:
        return <CircleIcon sx={{ color: 'text.disabled', fontSize: 20 }} />;
    }
  };

  const toggleStaffExpansion = (staffId: string) => {
    setExpandedStaff(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }));
  };

  const formatDate = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStaffCompletionRate = (staffReport: DailyWorkReport) => {
    if (!staffReport || staffReport.totalTasks === 0) return 0;
    return Math.round((staffReport.completedTasks / staffReport.totalTasks) * 100);
  };

  // Safe access to report data
  const safeReport = report || DEFAULT_REPORT_DATA;
  const safeStatistics = safeReport.statistics || DEFAULT_STATISTICS;
  const safeData = safeReport.data || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          DAILY WORK REPORT
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip 
            icon={<CalendarIcon />}
            label={date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            size="small"
            variant="outlined"
          />
          <IconButton onClick={handlePrint} size="small" title="Print Report" disabled={!report}>
            <PrintIcon />
          </IconButton>
          <IconButton onClick={handleExport} size="small" title="Export as CSV" disabled={!report || safeData.length === 0}>
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <CustomDatePicker
                label="Select Date"
                value={date}
                onChange={handleDateChange}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Staff Name</InputLabel>
                <Select
                  value={selectedStaff}
                  label="Staff Name"
                  onChange={(e) => setSelectedStaff(e.target.value)}
                >
                  <MenuItem value="">All Staff</MenuItem>
                  <MenuItem value="ASWANI">ASWANI</MenuItem>
                  <MenuItem value="VINECHTHA">VINECHTHA</MenuItem>
                  <MenuItem value="MUNEERA">MUNEERA</MenuItem>
                  <MenuItem value="SARASWATHI">SARASWATHI</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                onClick={fetchReport}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
          
          {useMockData && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="caption" color="warning.dark">
                Using mock data. Connect to backend API to see real data.
              </Typography>
            </Box>
          )}
        </Paper>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading report...</Typography>
          </Box>
        ) : (
          <Box id="daily-report-content">
            {/* Summary Statistics - Only show if we have data */}
            {safeData.length > 0 && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'primary.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main">
                        {safeStatistics.totalStaff}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Staff
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'success.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {safeStatistics.completedTasks}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Tasks Done
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'warning.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {safeStatistics.pendingTasks}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Tasks Pending
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'info.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {safeStatistics.completionRate}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Completion Rate
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Staff-wise Reports */}
            {safeData.length > 0 ? (
              safeData.map((staffReport) => (
                <Paper 
                  key={staffReport._id} 
                  sx={{ 
                    mb: 3, 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}
                >
                  {/* Staff Header */}
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => toggleStaffExpansion(staffReport._id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                        {staffReport.staff?.name?.charAt(0) || 'S'}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {staffReport.staff?.name || 'Unknown Staff'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {staffReport.staffType || 'Staff'} • {formatDate(staffReport.date)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip 
                        label={`${staffReport.completedTasks || 0}/${staffReport.totalTasks || 0}`}
                        color={getStaffCompletionRate(staffReport) === 100 ? 'success' : 'warning'}
                        size="small"
                      />
                      <LinearProgress 
                        variant="determinate" 
                        value={getStaffCompletionRate(staffReport)}
                        sx={{ width: 100, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {getStaffCompletionRate(staffReport)}%
                      </Typography>
                    </Box>
                  </Box>

                  {/* Task List */}
                  {expandedStaff[staffReport._id] && (
                    <Box sx={{ p: 2 }}>
                      {/* Task Table Header */}
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '40px 60px 1fr 100px 80px 100px',
                        gap: 1,
                        p: 1,
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        mb: 1
                      }}>
                        <Typography variant="caption" fontWeight="bold" textAlign="center">SL</Typography>
                        <Typography variant="caption" fontWeight="bold" textAlign="center">Status</Typography>
                        <Typography variant="caption" fontWeight="bold">TASK NAME</Typography>
                        <Typography variant="caption" fontWeight="bold" textAlign="center">TIME</Typography>
                        <Typography variant="caption" fontWeight="bold" textAlign="center">COUNT</Typography>
                        <Typography variant="caption" fontWeight="bold" textAlign="center">PRIORITY</Typography>
                      </Box>

                      {/* Task Items */}
                      {staffReport.works && staffReport.works.length > 0 ? (
                        staffReport.works
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((task, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '40px 60px 1fr 100px 80px 100px',
                              gap: 1,
                              p: 1.5,
                              alignItems: 'center',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:hover': {
                                bgcolor: 'action.hover'
                              },
                              ...(task.status === 'completed' && {
                                bgcolor: 'success.50'
                              })
                            }}
                          >
                            {/* Serial Number */}
                            <Typography variant="body2" textAlign="center" fontWeight="medium">
                              {index + 1}
                            </Typography>

                            {/* Status Icon */}
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              {getStatusIcon(task.status)}
                            </Box>

                            {/* Task Name */}
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {task.taskName}
                            </Typography>

                            {/* Time */}
                            <Typography variant="body2" textAlign="center" color="textSecondary">
                              {task.time || '-'}
                            </Typography>

                            {/* Count */}
                            <Typography variant="body2" textAlign="center" fontWeight="medium">
                              {task.count || 0}
                            </Typography>

                            {/* Priority */}
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              <Chip 
                                label={`P${task.priority || index + 1}`}
                                size="small"
                                variant="outlined"
                                color={
                                  (task.priority || 0) <= 3 ? 'error' :
                                  (task.priority || 0) <= 6 ? 'warning' : 'success'
                                }
                              />
                            </Box>
                          </Box>
                        ))
                      ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="body2" color="textSecondary">
                            No tasks assigned for this staff member
                          </Typography>
                        </Box>
                      )}

                      {/* Staff Summary */}
                      <Box sx={{ 
                        mt: 2, 
                        p: 2, 
                        bgcolor: 'grey.50', 
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="body2">
                          <strong>Last Updated:</strong> {formatDate(staffReport.updatedAt)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Completion:</strong> {staffReport.completedTasks || 0} of {staffReport.totalTasks || 0} tasks ({getStaffCompletionRate(staffReport)}%)
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Paper>
              ))
            ) : (
              /* No Data State */
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    No Report Data Available
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {report ? 
                      "No data found for the selected date. Try a different date or check if staff have been assigned tasks." :
                      "Click 'Generate Report' to load data or use sample data below."
                    }
                  </Typography>
                </Box>
                
                {/* Preview of sample staff report */}
                {!report && MOCK_STAFF_DATA.slice(0, 2).map((staff, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2, border: '1px dashed', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                        {staff.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {staff.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {staff.tasks.length} tasks • Sample preview
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 1 }}>
                      {staff.tasks.slice(0, 3).map((task, taskIndex) => (
                        <React.Fragment key={taskIndex}>
                          <Typography variant="body2" textAlign="center">
                            {task.order}
                          </Typography>
                          <Typography variant="body2">
                            {task.taskName}
                          </Typography>
                        </React.Fragment>
                      ))}
                    </Box>
                  </Paper>
                ))}
                
                {!report && (
                  <Button 
                    variant="contained" 
                    onClick={() => {
                      setUseMockData(true);
                      fetchReport();
                    }}
                    sx={{ mt: 2 }}
                  >
                    Load Sample Report
                  </Button>
                )}
              </Box>
            )}

            {/* Overall Summary - Only show if we have data */}
            {safeData.length > 0 && (
              <Paper sx={{ p: 3, mt: 3, bgcolor: 'primary.50' }}>
                <Typography variant="h6" gutterBottom>
                  Overall Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Date:</strong> {date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Staff:</strong> {safeStatistics.totalStaff}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Tasks:</strong> {safeStatistics.totalTasks}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Completed:</strong> {safeStatistics.completedTasks} tasks
                    </Typography>
                    <Typography variant="body2">
                      <strong>Pending:</strong> {safeStatistics.pendingTasks} tasks
                    </Typography>
                    <Typography variant="body2">
                      <strong>Overall Rate:</strong> {safeStatistics.completionRate}%
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button 
          variant="contained" 
          onClick={fetchReport}
          disabled={loading}
        >
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DailyReport;