// components/DailyWork/StaffTaskManager.tsx
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';

interface Staff {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  staffType?: string;
}

interface TaskTemplate {
  _id?: string;
  taskName: string;
  description?: string;
  estimatedTime?: string;
  priority: number;
  requiresCount: boolean;
  requiresTimeTracking?: boolean;
}

interface StaffTaskTemplate {
  _id?: string;
  staff: Staff;
  staffType: string;
  dailyTasks: TaskTemplate[];
  isActive: boolean;
  createdAt?: string;
}

interface StaffTaskManagerProps {
  open: boolean;
  onClose: () => void;
  staffList: Staff[];
}

const StaffTaskManager: React.FC<StaffTaskManagerProps> = ({ open, onClose, staffList }) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [templates, setTemplates] = useState<StaffTaskTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<StaffTaskTemplate | null>(null);
  const [newTask, setNewTask] = useState<TaskTemplate>({
    taskName: '',
    priority: 1,
    requiresCount: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const getMockStaffList = (): Staff[] => {
  return [
    {
      _id: '1',
      name: 'ASWANI',
      email: 'pmnacrs@gmail.com',
      phone: '9526562247',
      staffType: 'accountant'
    },
    {
      _id: '2',
      name: 'VINEETHA',
      email: 'pmnacrs@gmail.com',
      phone: '9072558609',
      staffType: 'operations'
    },
    {
      _id: '3',
      name: 'SARASWATHI',
      email: 'pmnacrs@gmail.com',
      phone: '7025100777',
      staffType: 'showroom'
    }
  ];
};
  const displayStaffList = staffList.length > 0 ? staffList : getMockStaffList();

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/work/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    console.log('StaffTaskManager - staffList received:', staffList);
    console.log('StaffList type:', typeof staffList);
    console.log('Is array?', Array.isArray(staffList));
    if (Array.isArray(staffList)) {
      console.log('StaffList length:', staffList.length);
      console.log('StaffList items:', staffList);
    }
  }, [staffList, open]);

  const handleStaffChange = async (staffId: string) => {
    setSelectedStaff(staffId);
    const template = templates.find(t => t.staff._id === staffId);
    
    if (template) {
      setCurrentTemplate(template);
    } else {
      const staff = staffList.find(s => s._id === staffId);
      setCurrentTemplate({
        staff: staff!,
        staffType: staff?.staffType || 'operations',
        dailyTasks: [],
        isActive: true
      });
    }
  };

  const handleAddTask = () => {
    if (!newTask.taskName.trim()) {
      setMessage({ text: 'Task name is required', type: 'error' });
      return;
    }

    if (!currentTemplate) return;

    const updatedTasks = [
      ...currentTemplate.dailyTasks,
      {
        ...newTask,
        priority: currentTemplate.dailyTasks.length + 1
      }
    ];

    setCurrentTemplate({
      ...currentTemplate,
      dailyTasks: updatedTasks
    });

    setNewTask({
      taskName: '',
      priority: 1,
      requiresCount: false
    });
  };

  const handleRemoveTask = (index: number) => {
    if (!currentTemplate) return;

    const updatedTasks = currentTemplate.dailyTasks.filter((_, i) => i !== index);
    // Reassign priorities
    const reorderedTasks = updatedTasks.map((task, idx) => ({
      ...task,
      priority: idx + 1
    }));

    setCurrentTemplate({
      ...currentTemplate,
      dailyTasks: reorderedTasks
    });
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplate || !selectedStaff) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const payload = {
        staff: selectedStaff,
        staffType: currentTemplate.staffType,
        dailyTasks: currentTemplate.dailyTasks,
        isActive: true
      };

      if (currentTemplate._id) {
        // Update existing template
        await axios.put(`/work/templates/${currentTemplate._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage({ text: 'Template updated successfully', type: 'success' });
      } else {
       // In StaffTaskManager.tsx, fix line 147:
await axios.post('/work/templates', payload, {  // Remove extra backtick
  headers: { Authorization: `Bearer ${token}` }
});
        setMessage({ text: 'Template created successfully', type: 'success' });
      }

      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({ text: 'Error saving template', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!currentTemplate || !currentTemplate._id) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/work/templates/${currentTemplate._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ text: 'Template deleted successfully', type: 'success' });
      setCurrentTemplate(null);
      setSelectedStaff('');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      setMessage({ text: 'Error deleting template', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const moveTask = (index: number, direction: 'up' | 'down') => {
    if (!currentTemplate) return;

    const tasks = [...currentTemplate.dailyTasks];
    if (direction === 'up' && index > 0) {
      [tasks[index], tasks[index - 1]] = [tasks[index - 1], tasks[index]];
    } else if (direction === 'down' && index < tasks.length - 1) {
      [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
    }

    // Update priorities
    const reorderedTasks = tasks.map((task, idx) => ({
      ...task,
      priority: idx + 1
    }));

    setCurrentTemplate({
      ...currentTemplate,
      dailyTasks: reorderedTasks
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Staff Task Template Management</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Staff Selection */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Select Staff</InputLabel>
             <Select
    value={selectedStaff}
    label="Select Staff"
    onChange={(e) => handleStaffChange(e.target.value)}
  >
    <MenuItem value="">-- Select Staff --</MenuItem>
    {displayStaffList.map((staff:any) => (
      <MenuItem key={staff._id} value={staff._id}>
        {staff.name} ({staff.staffType || 'No type'})
      </MenuItem>
    ))}
  </Select>
          </FormControl>
        </Box>

        {currentTemplate && (
          <>
            {/* Staff Info */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Typography variant="subtitle1">
                    <strong>{currentTemplate.staff.name}</strong>
                  </Typography>
                </Grid>
                <Grid item>
                  <Chip
                    label={currentTemplate.staffType}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs>
                  <Typography variant="body2" color="textSecondary">
                    {currentTemplate.dailyTasks.length} tasks configured
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Add New Task */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Add New Task
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Task Name"
                    value={newTask.taskName}
                    onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                    placeholder="Enter task name"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Estimated Time"
                    value={newTask.estimatedTime || ''}
                    onChange={(e) => setNewTask({ ...newTask, estimatedTime: e.target.value })}
                    placeholder="e.g., 10:00 AM"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Count</InputLabel>
                    <Select
                      value={newTask.requiresCount ? 'yes' : 'no'}
                      label="Count"
                      onChange={(e) => setNewTask({ ...newTask, requiresCount: e.target.value === 'yes' })}
                    >
                      <MenuItem value="no">No Count</MenuItem>
                      <MenuItem value="yes">Requires Count</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddTask}
                    disabled={!newTask.taskName.trim()}
                  >
                    Add Task
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Task List */}
            {currentTemplate.dailyTasks.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width="50px">#</TableCell>
                      <TableCell width="60px">Move</TableCell>
                      <TableCell>Task Name</TableCell>
                      <TableCell width="120px">Time</TableCell>
                      <TableCell width="100px">Count</TableCell>
                      <TableCell width="80px">Priority</TableCell>
                      <TableCell width="80px">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentTemplate.dailyTasks.map((task, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">{index + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <Tooltip title="Move Up">
                              <IconButton
                                size="small"
                                onClick={() => moveTask(index, 'up')}
                                disabled={index === 0}
                              >
                                <DragIcon sx={{ transform: 'rotate(-90deg)' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Move Down">
                              <IconButton
                                size="small"
                                onClick={() => moveTask(index, 'down')}
                                disabled={index === currentTemplate.dailyTasks.length - 1}
                              >
                                <DragIcon sx={{ transform: 'rotate(90deg)' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{task.taskName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {task.estimatedTime || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={task.requiresCount ? 'Yes' : 'No'}
                            size="small"
                            color={task.requiresCount ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`P${task.priority}`}
                            size="small"
                            color={
                              task.priority <= 3 ? 'error' :
                              task.priority <= 6 ? 'warning' : 'success'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Remove Task">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveTask(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="textSecondary">
                  No tasks configured. Add tasks using the form above.
                </Typography>
              </Paper>
            )}

            {/* Save/Delete Buttons */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              {currentTemplate._id && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteTemplate}
                  disabled={loading}
                >
                  Delete Template
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveTemplate}
                disabled={loading || !currentTemplate.dailyTasks.length}
              >
                {loading ? 'Saving...' : 'Save Template'}
              </Button>
            </Box>
          </>
        )}

        {!selectedStaff && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">
              Select a staff member to manage their daily tasks
            </Typography>
          </Paper>
        )}
      </DialogContent>

      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage(null)}
          severity={message?.type}
          sx={{ width: '100%' }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default StaffTaskManager;