// components/DailyWork/TaskUpdateDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';

// Define TypeScript interfaces
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
  requiresCount?: boolean;
  requiresTimeTracking?: boolean;
}

interface TaskUpdateData {
  status: Task['status'];
  count: number;
  remarks: string;
  startTime?: Date;
  endTime?: Date;
}

interface TaskUpdateDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onUpdate: (updatedData: TaskUpdateData) => void;
}

const TaskUpdateDialog: React.FC<TaskUpdateDialogProps> = ({ 
  open, 
  task, 
  onClose, 
  onUpdate 
}) => {
  const [status, setStatus] = useState<Task['status']>(task?.status || 'pending');
  const [count, setCount] = useState<number>(task?.count || 0);
  const [remarks, setRemarks] = useState<string>(task?.remarks || '');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [trackingTime, setTrackingTime] = useState<number>(0);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setCount(task.count || 0);
      setRemarks(task.remarks || '');
    }
  }, [task]);

  const handleStartTracking = () => {
    setIsTracking(true);
    // In real app, you would start a timer and update backend
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    // In real app, you would stop timer and save time
  };

  const handleSubmit = () => {
    const updateData: TaskUpdateData = {
      status,
      count,
      remarks,
      ...(status === 'in-progress' && !task?.startTime && { startTime: new Date() }),
      ...(status === 'completed' && !task?.endTime && { endTime: new Date() })
    };
    onUpdate(updateData);
  };

  const getStatusOptions = (): Array<Task['status']> => {
    const baseOptions: Array<Task['status']> = ['pending', 'in-progress', 'completed', 'delayed'];
    return baseOptions.filter(opt => opt !== task?.status);
  };

  const getChipColor = (status: Task['status']): 'success' | 'info' | 'error' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'delayed':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Update Task</Typography>
          {task && (
            <Chip 
              label={task.status.replace('-', ' ')}
              size="small"
              color={getChipColor(task.status)}
            />
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {task ? (
          <>
            {/* Task Info */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                {task.taskName}
              </Typography>
              {task.priority && (
                <Typography variant="body2" color="textSecondary">
                  Priority: {task.priority}
                </Typography>
              )}
              {task.time && (
                <Typography variant="body2" color="textSecondary">
                  Estimated Time: {task.time}
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Status Update */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={(e) => setStatus(e.target.value as Task['status'])}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="delayed">Delayed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Count"
                  type="number"
                  size="small"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks"
                  multiline
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any notes or comments..."
                />
              </Grid>
            </Grid>

            {/* Time Tracking */}
            {status === 'in-progress' && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon fontSize="small" />
                  Time Tracking
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6">
                      {Math.floor(trackingTime / 60)}:{(trackingTime % 60).toString().padStart(2, '0')}
                    </Typography>
                    {isTracking ? (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<StopIcon />}
                        onClick={handleStopTracking}
                        size="small"
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={handleStartTracking}
                        size="small"
                      >
                        Start Timer
                      </Button>
                    )}
                  </Box>
                  {task.startTime && (
                    <Typography variant="caption" color="textSecondary">
                      Started: {new Date(task.startTime).toLocaleTimeString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="textSecondary">No task selected</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          startIcon={<CheckCircleIcon />}
          disabled={!task}
        >
          Update Task
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskUpdateDialog;