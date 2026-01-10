import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Card, CardContent, Typography, Grid,
  TextField, Button, Box, MenuItem,
  IconButton, Paper, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { Staff, Task, StaffTaskTemplate } from './workTypes';
import axios from 'axios';

const StaffWorkTemplate: React.FC = () => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [tasks, setTasks] = useState<Task[]>([
    { taskName: '', description: '', priority: 'medium', estimatedTime: '' }
  ]);
  const [existingTemplates, setExistingTemplates] = useState<StaffTaskTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string;
  const token = localStorage.getItem('token');

  // Fetch all staffs and existing templates
  useEffect(() => {
    fetchStaffs();
    fetchExistingTemplates();
  }, []);

  const fetchStaffs = async (): Promise<void> => {
    try {
      const response = await axios.get(`${backendUrl}/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStaffs(response.data);
    } catch (error) {
      console.error('Error fetching staffs:', error);
    }
  };

  const fetchExistingTemplates = async (): Promise<void> => {
    try {
      const response = await axios.get(`${backendUrl}/work/all-templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setExistingTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchStaffTemplate = async (staffId: string): Promise<void> => {
    try {
      const response = await axios.get(`${backendUrl}/work/template/${staffId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data && response.data.dailyTasks) {
        setTasks(response.data.dailyTasks);
      } else {
        setTasks([{ taskName: '', description: '', priority: 'medium', estimatedTime: '' }]);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      setTasks([{ taskName: '', description: '', priority: 'medium', estimatedTime: '' }]);
    }
  };

  const handleAddTask = (): void => {
    setTasks([...tasks, { taskName: '', description: '', priority: 'medium', estimatedTime: '' }]);
  };

  const handleRemoveTask = (index: number): void => {
    if (tasks.length > 1) {
      const newTasks = tasks.filter((_, i) => i !== index);
      setTasks(newTasks);
    }
  };

  const handleTaskChange = (
    index: number, 
    field: keyof Task, 
    value: string
  ): void => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const handleSaveTemplate = async (): Promise<void> => {
    if (!selectedStaff) {
      alert('Please select a staff member');
      return;
    }

    const filteredTasks = tasks.filter(t => t.taskName.trim() !== '');
    if (filteredTasks.length === 0) {
      alert('Please add at least one task');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${backendUrl}/work/assign-template`,
        {
          staffId: selectedStaff._id,
          dailyTasks: filteredTasks
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.status === 200) {
        alert('Tasks saved successfully!');
        fetchExistingTemplates(); // Refresh the list
        // Clear form
        setSelectedStaff(null);
        setTasks([{ taskName: '', description: '', priority: 'medium', estimatedTime: '' }]);
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(error.response?.data?.error || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaffs = staffs.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.role?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = existingTemplates.filter(template =>
    template.staff.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStaffClick = (staff: Staff): void => {
    setSelectedStaff(staff);
    fetchStaffTemplate(staff._id);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  };

  return (
    <Grid container spacing={3}>
      {/* Left Panel - Staff List */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Staff List
            </Typography>
            
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {filteredStaffs.map((staff) => (
                <Paper
                  key={staff._id}
                  sx={{
                    p: 2,
                    mb: 1,
                    cursor: 'pointer',
                    border: selectedStaff?._id === staff._id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    bgcolor: selectedStaff?._id === staff._id ? 'action.selected' : 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => handleStaffClick(staff)}
                >
                  <Typography variant="subtitle1">
                    {staff.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {staff.role?.name || 'No role'}
                  </Typography>
                  {existingTemplates.some(t => t.staff._id === staff._id) && (
                    <Chip 
                      label="Has Template" 
                      size="small" 
                      color="success" 
                      sx={{ mt: 1 }}
                    />
                  )}
                </Paper>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Existing Templates Preview */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Existing Templates
            </Typography>
            <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
              {filteredTemplates.map((template) => (
                <Box key={template._id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <Typography variant="subtitle2">
                    {template.staff.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {template.dailyTasks.length} tasks
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {template.dailyTasks.slice(0, 2).map((task, idx) => (
                      <Chip
                        key={idx}
                        label={task.taskName}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    {template.dailyTasks.length > 2 && (
                      <Chip
                        label={`+${template.dailyTasks.length - 2} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Right Panel - Task Management */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            {selectedStaff ? (
              <>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="primary.contrastText">
                    {selectedStaff.name}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    {selectedStaff.role?.name || 'No role'} • {selectedStaff.phone}
                  </Typography>
                </Box>

                <Typography variant="h6" gutterBottom>
                  Daily Tasks Template
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  These tasks will be assigned to {selectedStaff.name} every day
                </Typography>

                {tasks.map((task, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={5}>
                        <TextField
                          label="Task Name *"
                          value={task.taskName}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => 
                            handleTaskChange(index, 'taskName', e.target.value)
                          }
                          fullWidth
                          required
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          select
                          label="Priority"
                          value={task.priority}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => 
                            handleTaskChange(index, 'priority', e.target.value as Task['priority'])
                          }
                          fullWidth
                          size="small"
                        >
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Est. Time"
                          value={task.estimatedTime || ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => 
                            handleTaskChange(index, 'estimatedTime', e.target.value)
                          }
                          fullWidth
                          placeholder="e.g., 30 mins"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={1}>
                        <IconButton 
                          onClick={() => handleRemoveTask(index)} 
                          color="error"
                          disabled={tasks.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Description (Optional)"
                          value={task.description || ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => 
                            handleTaskChange(index, 'description', e.target.value)
                          }
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ))}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddTask}
                    variant="outlined"
                  >
                    Add Task
                  </Button>

                  <Button
                    startIcon={<SaveIcon />}
                    variant="contained"
                    color="primary"
                    onClick={handleSaveTemplate}
                    disabled={loading || tasks.some(t => !t.taskName.trim())}
                  >
                    {loading ? 'Saving...' : 'Save Template'}
                  </Button>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  Select a staff member to manage their tasks
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Click on any staff from the left panel to view or edit their daily tasks
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default StaffWorkTemplate;