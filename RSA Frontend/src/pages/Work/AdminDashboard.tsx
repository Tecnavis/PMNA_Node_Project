// components/DailyWork/AdminDashboard.tsx - Fixed version
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  PlaylistAddCheck as PlaylistAddCheckIcon,
  Group as GroupIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  PendingActions as PendingActionsIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import StaffTaskManager from './StaffTaskManager';
import DailyReport from './DailyReport';

interface Staff {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  staffType?: string;
}

interface DailyWork {
  _id: string;
  staff: Staff;
  staffType: string;
  date: string;
  works: any[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  data?: DailyWork[] | any;
  message?: string;
  statistics?: any;
}

const AdminDashboard: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dailyWorks, setDailyWorks] = useState<DailyWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    completionRate: 0
  });
  const [taskManagerOpen, setTaskManagerOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

 const fetchDashboardData = async () => {
  try {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    
    console.log('1. Fetching staff list...');
    
    // Fetch staff list - try multiple endpoints
    let staffData: Staff[] = [];
    
    try {
      // Try work endpoint first
      const staffResponse = await axios.get('/work/staff-list', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Work staff-list response:', staffResponse.data);
      
      if (Array.isArray(staffResponse.data)) {
        staffData = staffResponse.data;
      } else if (staffResponse.data && Array.isArray(staffResponse.data.data)) {
        staffData = staffResponse.data.data;
      }
    } catch (workError) {
      console.log('Work endpoint failed, trying staff endpoint...');
      
      // Fallback to staff endpoint
      try {
        const staffResponse = await axios.get('/staff', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Staff endpoint response:', staffResponse.data);
        
        if (Array.isArray(staffResponse.data)) {
          // Transform staff data to include staffType
          staffData = staffResponse.data.map((staff: any) => ({
            _id: staff._id,
            name: staff.name,
            email: staff.email,
            phone: staff.phone,
            staffType: staff.staffType || getStaffTypeFromRole(staff.role?.name),
            role: staff.role
          }));
        }
      } catch (staffError) {
        console.error('Both endpoints failed:', staffError);
      }
    }
    
    console.log('Final staffData:', staffData);
    setStaffList(staffData);

    // Fetch today's daily works
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching daily works for date:', today);
    
    const worksResponse = await axios.get('/work/daily-report-by-date', {
      params: { 
        date: today,
        // staffId: '' // Optional: uncomment to filter by specific staff
      },
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Daily works API response:', worksResponse.data);

    // Extract works data safely
    let worksData = [];
    if (worksResponse.data) {
      if (Array.isArray(worksResponse.data)) {
        worksData = worksResponse.data;
      } else if (worksResponse.data.data && Array.isArray(worksResponse.data.data)) {
        worksData = worksResponse.data.data;
      } else if (worksResponse.data.success && Array.isArray(worksResponse.data.data)) {
        worksData = worksResponse.data.data;
      }
    }

    console.log('Extracted works data:', worksData);
    setDailyWorks(worksData);

    // Calculate statistics
    const totalStaff = worksData.length;
    const totalTasks = worksData.reduce((sum: number, work: DailyWork) => 
      sum + (work.totalTasks || 0), 0);
    const completedTasks = worksData.reduce((sum: number, work: DailyWork) => 
      sum + (work.completedTasks || 0), 0);
    const pendingTasks = worksData.reduce((sum: number, work: DailyWork) => 
      sum + (work.pendingTasks || 0), 0);
    const completionRate = totalTasks > 0 ? 
      Math.round((completedTasks / totalTasks) * 100) : 0;

    setStats({
      totalStaff,
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate
    });

 } catch (error: any) {
    console.error('Error in fetchDashboardData:', error);
    setError(error.message);
    showSnackbar('Failed to load data', 'error');
  } finally {
    setLoading(false);
  }
};

// Helper function
const getStaffTypeFromRole = (roleName: string): string => {
  if (!roleName) return 'operations';
  
  const roleMap: Record<string, string> = {
    'Accountant': 'accountant',
    'Operations': 'operations', 
    'Coordinator': 'coordinator',
    'Showroom': 'showroom',
    'Admin': 'admin'
  };
  
  return roleMap[roleName] || 'operations';
};

  const handleGenerateAll = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/work/generate-all-daily`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData();
      showSnackbar('Daily work generated for all staff', 'success');
    } catch (error: any) {
      console.error('Error generating daily work for all:', error);
      showSnackbar('Error generating daily work', 'error');
    }
  };

  const handleExportData = async () => {
    try {
      const csvData = dailyWorks.map(work => ({
        Staff: work.staff.name,
        Type: work.staffType,
        'Total Tasks': work.totalTasks,
        'Completed Tasks': work.completedTasks,
        'Pending Tasks': work.pendingTasks,
        'Completion Rate': `${Math.round((work.completedTasks / work.totalTasks) * 100)}%`,
        Date: new Date(work.date).toLocaleDateString()
      }));

      const csvHeaders = ['Staff', 'Type', 'Total Tasks', 'Completed Tasks', 'Pending Tasks', 'Completion Rate', 'Date'];
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-work-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      showSnackbar('Data exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      showSnackbar('Error exporting data', 'error');
    }
  };

  const getStaffCompletionRate = (staff: DailyWork) => {
    if (!staff.totalTasks || staff.totalTasks === 0) return 0;
    return Math.round((staff.completedTasks / staff.totalTasks) * 100);
  };

  if (loading) {
    return (
      <Container sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh' 
      }}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          icon={<ErrorIcon />}
          action={
            <Button color="inherit" size="small" onClick={fetchDashboardData}>
              Retry
            </Button>
          }
        >
          <Typography variant="h6" gutterBottom>
            Error Loading Dashboard
          </Typography>
          <Typography>{error}</Typography>
        </Alert>
        <Paper sx={{ p: 4, mt: 3, textAlign: 'center' }}>
          <Typography variant="body1" gutterBottom>
            Check if the backend API is running and accessible.
          </Typography>
          <Button
            variant="contained"
            onClick={fetchDashboardData}
            startIcon={<RefreshIcon />}
            sx={{ mt: 2 }}
          >
            Refresh Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlaylistAddCheckIcon color="primary" />
              Daily Work Admin Dashboard
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Manage daily tasks for all staff members
            </Typography>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchDashboardData}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<GroupIcon />}
              onClick={handleGenerateAll}
            >
              Generate All
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="overline">
                    Total Staff
                  </Typography>
                  <Typography variant="h4">{stats.totalStaff}</Typography>
                </Box>
                <GroupIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="overline">
                    Tasks Assigned
                  </Typography>
                  <Typography variant="h4">{stats.totalTasks}</Typography>
                </Box>
                <AssignmentTurnedInIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="overline">
                    Tasks Pending
                  </Typography>
                  <Typography variant="h4" color="warning.main">{stats.pendingTasks}</Typography>
                </Box>
                <PendingActionsIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="overline">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4">{stats.completionRate}%</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.completionRate}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        <Grid item>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setTaskManagerOpen(true)}
          >
            Manage Task Templates
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => setReportDialogOpen(true)}
          >
            View Detailed Report
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportData}
            disabled={dailyWorks.length === 0}
          >
            Export Data
          </Button>
        </Grid>
      </Grid>

      {/* Staff Progress Table */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Staff Progress - Today ({dailyWorks.length} staff)
          </Typography>
        </Box>
        {dailyWorks.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No daily work records found for today.
            </Typography>
            <Button
              variant="contained"
              startIcon={<GroupIcon />}
              onClick={handleGenerateAll}
              sx={{ mt: 2 }}
            >
              Generate Daily Work for All Staff
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Tasks</TableCell>
                  <TableCell>Completed</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyWorks.map((work) => (
                  <TableRow key={work._id || work.staff?._id || Math.random()}>
                    <TableCell>
                      <Typography fontWeight="medium">
                        {work.staff?.name || 'Unknown Staff'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={work.staffType || 'No Type'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography>{work.totalTasks || 0} total</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="success.main">
                        {work.completedTasks || 0} / {work.totalTasks || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={getStaffCompletionRate(work)}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2">
                          {getStaffCompletionRate(work)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStaffCompletionRate(work) === 100 ? 'Completed' : 'In Progress'}
                        color={getStaffCompletionRate(work) === 100 ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            // Implement view details
                            showSnackbar(`Viewing details for ${work.staff?.name}`, 'info');
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Task Manager Dialog */}
      <StaffTaskManager
        open={taskManagerOpen}
        onClose={() => setTaskManagerOpen(false)}
        staffList={staffList}
      />

      {/* Report Dialog */}
      <DailyReport
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminDashboard;