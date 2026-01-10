// StaffDailyCheck.tsx
import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography,
  Box, Chip, Button, Dialog,
  DialogTitle, DialogContent, TextField,
  IconButton, CircularProgress, Paper,
  Divider, Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CloseIcon from '@mui/icons-material/Close';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { Staff, StaffDailyWork } from './workTypes';
import axios from 'axios';
import { format } from 'date-fns';

const StaffDailyCheck: React.FC = () => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dailyWorks, setDailyWorks] = useState<StaffDailyWork[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffDailyWork | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchStaffs();
    fetchDailyWorks();
  }, [selectedDate]);

  const fetchStaffs = async () => {
    try {
      const response = await axios.get(`${backendUrl}/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStaffs(response.data);
    } catch (error) {
      console.error('Error fetching staffs:', error);
    }
  };

  const fetchDailyWorks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/work/all-daily?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDailyWorks(response.data.staffsWithWork || []);
    } catch (error) {
      console.error('Error fetching daily works:', error);
      setDailyWorks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDailyWork = async (staffId: string) => {
    try {
      await axios.post(
        `${backendUrl}/work/generate-daily`,
        { staffId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      fetchDailyWorks(); // Refresh the list
    } catch (error) {
      console.error('Error generating daily work:', error);
      alert('Failed to generate daily work');
    }
  };

  const handleTaskStatusUpdate = async (taskIndex: number, status: string, remarks?: string) => {
    if (!selectedStaff) return;

    try {
      setUpdating(true);
      const response = await axios.put(
        `${backendUrl}/work/update-status/${selectedStaff._id}`,
        {
          workIndex: taskIndex,
          status,
          remarks: remarks || selectedStaff.works[taskIndex].remarks
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        // Update the selected staff data
        setSelectedStaff(response.data.data);
        // Update in the list
        setDailyWorks(prev =>
          prev.map(work =>
            work._id === selectedStaff._id ? response.data.data : work
          )
        );
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    } finally {
      setUpdating(false);
    }
  };

  const updateTaskRemarks = (taskIndex: number, remarks: string) => {
    if (!selectedStaff) return;
    
    const updatedWorks = [...selectedStaff.works];
    updatedWorks[taskIndex].remarks = remarks;
    
    setSelectedStaff({
      ...selectedStaff,
      works: updatedWorks
    });
  };

  const getStaffWorkStatus = (staffId: string) => {
    return dailyWorks.find(work => work.staff._id === staffId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'partially-completed': return 'warning';
      case 'pending': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'partially-completed': return <PendingIcon color="warning" />;
      default: return <PendingIcon color="error" />;
    }
  };

  return (
    <Box>
      {/* Header with Date Selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h6">
              Daily Task Check - {format(new Date(selectedDate), 'dd MMM yyyy')}
            </Typography>
          </Grid>
          <Grid item>
            <TextField
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Statistics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent>
                  <Typography variant="h4" color="primary.contrastText" align="center">
                    {staffs.length}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText" align="center">
                    Total Staff
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography variant="h4" color="success.contrastText" align="center">
                    {dailyWorks.filter(w => w.overallStatus === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="success.contrastText" align="center">
                    Completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent>
                  <Typography variant="h4" color="warning.contrastText" align="center">
                    {dailyWorks.filter(w => w.overallStatus === 'partially-completed').length}
                  </Typography>
                  <Typography variant="body2" color="warning.contrastText" align="center">
                    In Progress
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent>
                  <Typography variant="h4" color="error.contrastText" align="center">
                    {staffs.length - dailyWorks.length}
                  </Typography>
                  <Typography variant="body2" color="error.contrastText" align="center">
                    Not Started
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Staff Cards Grid */}
          <Grid container spacing={2}>
            {staffs.map((staff) => {
              const staffWork = getStaffWorkStatus(staff._id);
              const hasWork = !!staffWork;

              return (
                <Grid item xs={12} sm={6} md={4} key={staff._id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: hasWork ? '2px solid' : '1px solid #e0e0e0',
                      borderColor: hasWork ? `${getStatusColor(staffWork?.overallStatus || 'pending')}.main` : 'transparent',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s'
                      }
                    }}
                    onClick={() => {
                      if (staffWork) {
                        setSelectedStaff(staffWork);
                        setDialogOpen(true);
                      }
                    }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        {hasWork && getStatusIcon(staffWork.overallStatus)}
                        <Typography variant="h6" sx={{ ml: hasWork ? 1 : 0 }}>
                          {staff.name}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {staff.role?.name || 'No role'}
                      </Typography>

                      {hasWork ? (
                        <>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                            <Chip
                              label={staffWork.overallStatus.toUpperCase()}
                              color={getStatusColor(staffWork.overallStatus)}
                              size="small"
                            />
                            <Typography variant="caption">
                              {staffWork.completedPercentage}% complete
                            </Typography>
                          </Box>
                          
                          <Box sx={{ mt: 1 }}>
                            {staffWork.works.slice(0, 3).map((task, idx) => (
                              <Box key={idx} display="flex" alignItems="center" mb={0.5}>
                                <TaskAltIcon 
                                  fontSize="small" 
                                  color={task.status === 'completed' ? 'success' : 'disabled'}
                                  sx={{ mr: 0.5 }}
                                />
                                <Typography variant="caption" noWrap>
                                  {task.taskName}
                                </Typography>
                              </Box>
                            ))}
                            {staffWork.works.length > 3 && (
                              <Typography variant="caption" color="textSecondary">
                                +{staffWork.works.length - 3} more tasks
                              </Typography>
                            )}
                          </Box>
                        </>
                      ) : (
                        <Alert 
                          severity="info" 
                          sx={{ mt: 1 }}
                          action={
                            <Button 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateDailyWork(staff._id);
                              }}
                            >
                              Generate
                            </Button>
                          }
                        >
                          No work for today
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* Task Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {selectedStaff?.staff.name}'s Tasks
            </Typography>
            <IconButton onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedStaff && (
            <>
              {/* Staff Info */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle1">
                  {selectedStaff.staff.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedStaff.staff.role?.name} • {selectedStaff.staff.phone}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <Chip
                    label={selectedStaff.overallStatus.toUpperCase()}
                    color={getStatusColor(selectedStaff.overallStatus)}
                    size="small"
                  />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    {selectedStaff.completedPercentage}% Complete
                  </Typography>
                </Box>
              </Box>

              {/* Tasks List */}
              {selectedStaff.works.map((task, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">
                        {task.taskName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Assigned: {format(new Date(task.assignedAt || selectedStaff.date), 'hh:mm a')}
                      </Typography>
                      {task.completedAt && (
                        <Typography variant="caption" color="success.main" display="block">
                          Completed: {format(new Date(task.completedAt), 'hh:mm a')}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant={task.status === 'pending' ? 'contained' : 'outlined'}
                            color="error"
                            onClick={() => handleTaskStatusUpdate(index, 'pending')}
                            disabled={updating}
                          >
                            Pending
                          </Button>
                          <Button
                            size="small"
                            variant={task.status === 'in-progress' ? 'contained' : 'outlined'}
                            color="warning"
                            onClick={() => handleTaskStatusUpdate(index, 'in-progress')}
                            disabled={updating}
                          >
                            In Progress
                          </Button>
                          <Button
                            size="small"
                            variant={task.status === 'completed' ? 'contained' : 'outlined'}
                            color="success"
                            onClick={() => handleTaskStatusUpdate(index, 'completed')}
                            disabled={updating}
                          >
                            Complete
                          </Button>
                        </Box>

                        <TextField
                          size="small"
                          placeholder="Add remarks..."
                          value={task.remarks || ''}
                          onChange={(e) => updateTaskRemarks(index, e.target.value)}
                          onBlur={() => handleTaskStatusUpdate(index, task.status, task.remarks)}
                          disabled={updating}
                          fullWidth
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StaffDailyCheck;