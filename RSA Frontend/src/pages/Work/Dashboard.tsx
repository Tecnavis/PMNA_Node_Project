// components/DailyWork/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  AlertColor
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  AccessTime as AccessTimeIcon,
  BarChart as BarChartIcon,
  Person as PersonIcon
} from '@mui/icons-material';
// Remove AuthContext import if it doesn't exist - using localStorage instead
import TaskCard from './TaskCard';
import DailyReport from './DailyReport';
import TaskUpdateDialog from './TaskUpdateDialog';
import './Dashboard.css';

// Define TypeScript interfaces
interface User {
  id: string;
  name: string;
  email?: string;
  role?: string;
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
}

interface DailyWork {
  _id: string;
  staff: User;
  staffType: 'accountant' | 'operations' | 'coordinator' | 'showroom';
  date: string | Date;
  works: Task[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface UpdateDialogState {
  open: boolean;
  taskIndex: number | null;
  task: Task | null;
}

interface TaskUpdateData {
  status: Task['status'];
  count: number;
  remarks: string;
  startTime?: Date;
  endTime?: Date;
}

const Dashboard: React.FC = () => {
  // Get user from localStorage or use mock data
  const getUserFromStorage = (): User => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    // Return default user if none exists
    return {
      id: 'user-123',
      name: 'Staff Member',
      email: 'staff@example.com',
      role: 'staff'
    };
  };

  const [user] = useState<User>(getUserFromStorage());
  const [dailyWork, setDailyWork] = useState<DailyWork | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [updateDialog, setUpdateDialog] = useState<UpdateDialogState>({ 
    open: false, 
    taskIndex: null, 
    task: null 
  });
  const [reportDialog, setReportDialog] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    completionRate: 0
  });

  useEffect(() => {
    fetchTodayWork();
  }, []);

  const fetchTodayWork = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get<DailyWork>('/api/work/my-today-work', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data._id) {
        setDailyWork(response.data);
        calculateStats(response.data);
      } else {
        setDailyWork(null);
      }
    } catch (error) {
      console.error('Error fetching today work:', error);
      showSnackbar('Error fetching daily work', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (workData: DailyWork): void => {
    if (!workData || !workData.works) return;
    
    const total = workData.works.length;
    const completed = workData.works.filter(task => task.status === 'completed').length;
    const pending = workData.works.filter(task => task.status === 'pending').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    setStats({
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: pending,
      completionRate: rate
    });
  };

  const generateDailyWork = async (): Promise<void> => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');
      const response = await axios.post<{ message: string; data: DailyWork }>(
        '/api/work/generate-daily', 
        { staffId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDailyWork(response.data.data);
      calculateStats(response.data.data);
      showSnackbar(response.data.message, 'success');
    } catch (error: any) {
      console.error('Error generating daily work:', error);
      showSnackbar(
        error.response?.data?.message || 'Error generating daily work', 
        'error'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskClick = (taskIndex: number, task: Task): void => {
    setUpdateDialog({ open: true, taskIndex, task });
  };

  const handleTaskUpdate = async (updatedTask: TaskUpdateData): Promise<void> => {
    if (!dailyWork) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put<{ data: DailyWork }>(
        '/api/work/update-task', 
        {
          dailyWorkId: dailyWork._id,
          taskIndex: updateDialog.taskIndex,
          ...updatedTask
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDailyWork(response.data.data);
      calculateStats(response.data.data);
      setUpdateDialog({ open: false, taskIndex: null, task: null });
      showSnackbar('Task updated successfully', 'success');
    } catch (error) {
      console.error('Error updating task:', error);
      showSnackbar('Error updating task', 'error');
    }
  };

  const showSnackbar = (message: string, severity: AlertColor = 'success'): void => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (): void => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  const formatTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon color="primary" />
              Daily Work Management
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {!dailyWork && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={generateDailyWork}
                  disabled={generating}
                >
                  {generating ? 'Generating...' : 'Generate Daily Work'}
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<BarChartIcon />}
                onClick={() => setReportDialog(true)}
              >
                View Report
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchTodayWork}
              >
                Refresh
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {!dailyWork ? (
        // No work assigned view
        <Card sx={{ textAlign: 'center', p: 6, mt: 4 }}>
          <CardContent>
            <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Daily Work Assigned
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              You don't have any tasks assigned for today. Click the button below to generate your daily work tasks.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<AddIcon />}
              onClick={generateDailyWork}
              disabled={generating}
              sx={{ mt: 2 }}
            >
              {generating ? 'Generating Tasks...' : 'Generate Daily Tasks'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Total Tasks
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.totalTasks}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" color="textSecondary">
                      Assigned Today
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Completed
                  </Typography>
                  <Typography variant="h4" component="div" color="success.main">
                    {stats.completedTasks}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="body2" color="textSecondary">
                      Tasks Done
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Pending
                  </Typography>
                  <Typography variant="h4" component="div" color="warning.main">
                    {stats.pendingTasks}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <PendingIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="body2" color="textSecondary">
                      Tasks Remaining
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.completionRate}%
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.completionRate} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Staff Info */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.default' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <PersonIcon color="action" />
              </Grid>
              <Grid item xs>
                <Typography variant="subtitle1">
                  <strong>{user.name}</strong> • {dailyWork.staffType ? 
                    dailyWork.staffType.charAt(0).toUpperCase() + dailyWork.staffType.slice(1) : 
                    'Staff'}
                </Typography>
              </Grid>
              <Grid item>
                <Chip 
                  label={dailyWork.date ? formatDate(dailyWork.date) : 'Today'}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Tasks Grid */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Today's Tasks ({stats.completedTasks}/{stats.totalTasks} Completed)
          </Typography>
          
          <Grid container spacing={3}>
            {dailyWork.works.map((task: Task, index: number) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <TaskCard
                  task={task}
                  index={index}
                  onClick={() => handleTaskClick(index, task)}
                />
              </Grid>
            ))}
          </Grid>

          {/* Progress Summary */}
          <Paper sx={{ p: 3, mt: 4, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Daily Progress Summary
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.completionRate} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="h6" color="primary">
                {stats.completionRate}%
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                {stats.completedTasks} completed • {stats.pendingTasks} pending
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last updated: {dailyWork.updatedAt ? formatTime(dailyWork.updatedAt) : 'N/A'}
              </Typography>
            </Box>
          </Paper>
        </>
      )}

      {/* Task Update Dialog */}
      <TaskUpdateDialog
        open={updateDialog.open}
        task={updateDialog.task}
        onClose={() => setUpdateDialog({ open: false, taskIndex: null, task: null })}
        onUpdate={handleTaskUpdate}
      />

      {/* Daily Report Dialog */}
      <DailyReport
        open={reportDialog}
        onClose={() => setReportDialog(false)}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Dashboard;