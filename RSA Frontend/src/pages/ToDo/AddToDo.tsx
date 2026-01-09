import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  PlusIcon, 
  TrashIcon, 
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Staff {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  userName: string;
  image?: string;
}

interface Task {
  _id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

interface Errors {
  staff?: string;
  tasks?: string;
  [key: string]: string | undefined;
}

const AddToDo: React.FC = () => {
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  
  // Debug: Check if backend URL is loaded
  console.log('Backend URL:', backendUrl);
  console.log('Environment variables:', import.meta.env);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([
    { 
      title: '', 
      description: '', 
      priority: 'medium', 
      dueDate: '', 
      status: 'pending' 
    }
  ]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [connectionError, setConnectionError] = useState<boolean>(false);

  // Function to get auth token
  const getAuthToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found in localStorage');
      Swal.fire({
        icon: 'warning',
        title: 'Session Expired',
        text: 'Please login again',
        timer: 3000,
      }).then(() => {
        navigate('/auth/boxed-signin');
      });
      return null;
    }
    return token;
  };

  // Fetch staff list with retry logic
  const fetchStaff = async (retry = 0) => {
    try {
      setLoadingStaff(true);
      setConnectionError(false);
      
      const token = getAuthToken();
      if (!token) return;

      console.log(`Fetching staff from: ${backendUrl}/staff`);
      console.log('Auth token present:', !!token);
      
      const response = await axios.get(`${backendUrl}/staff`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000, // 10 second timeout
      });
      
      console.log('Staff response:', response.data);
      setStaffList(response.data);
      
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      
      // Log detailed error information
      if (error.response) {
        // Server responded with error status
        console.error('Response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        if (error.response.status === 401) {
          // Unauthorized - token expired
          localStorage.removeItem('token');
          Swal.fire({
            icon: 'error',
            title: 'Session Expired',
            text: 'Please login again',
          }).then(() => {
            navigate('/auth/boxed-signin');
          });
          return;
        }
        
        if (error.response.status === 404) {
          // Endpoint not found
          Swal.fire({
            icon: 'error',
            title: 'API Error',
            text: 'Staff endpoint not found. Please check backend configuration.',
          });
          return;
        }
      } else if (error.request) {
        // Request made but no response
        console.error('No response received:', error.request);
        setConnectionError(true);
        
        // Retry logic
        if (retry < 3) {
          console.log(`Retrying staff fetch... Attempt ${retry + 1}`);
          setTimeout(() => fetchStaff(retry + 1), 2000 * (retry + 1)); // Exponential backoff
          return;
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Connection Error',
          text: 'Cannot connect to server. Please check if backend is running.',
          footer: `<div class="text-left">
            <p class="text-sm">Troubleshooting steps:</p>
            <ul class="text-xs mt-2 space-y-1">
              <li>1. Ensure backend server is running</li>
              <li>2. Check if port ${backendUrl.split(':').pop()} is not blocked</li>
              <li>3. Verify backend URL in .env file</li>
              <li>4. Check network connection</li>
            </ul>
          </div>`
        });
      } else {
        // Other errors
        console.error('Setup error:', error.message);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load staff list',
        });
      }
      
      // Set empty staff list on error
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Initial fetch with useEffect
  useEffect(() => {
    fetchStaff();
  }, []);

  // Manual retry function
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchStaff();
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Errors = {};
    let isValid = true;

    if (!selectedStaff) {
      newErrors.staff = 'Please select a staff member';
      isValid = false;
    }

    if (tasks.length === 0) {
      newErrors.tasks = 'At least one task is required';
      isValid = false;
    }

    tasks.forEach((task, index) => {
      if (!task.title.trim()) {
        newErrors[`task_${index}_title`] = 'Task title is required';
        isValid = false;
      }
      if (task.dueDate && new Date(task.dueDate) < new Date()) {
        newErrors[`task_${index}_dueDate`] = 'Due date cannot be in the past';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Add new task
  const addTask = () => {
    setTasks([
      ...tasks,
      { title: '', description: '', priority: 'medium', dueDate: '', status: 'pending' }
    ]);
  };

  // Remove task
  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      const newTasks = [...tasks];
      newTasks.splice(index, 1);
      setTasks(newTasks);
    }
  };

  // Update task
  const updateTask = (index: number, field: keyof Task, value: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
    
    // Clear error for this field
    if (errors[`task_${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`task_${index}_${field}`];
      setErrors(newErrors);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const payload = {
        staff: selectedStaff,
        tasks: tasks.map(task => ({
          title: task.title.trim(),
          description: task.description.trim(),
          priority: task.priority,
          dueDate: task.dueDate || null,
          status: task.status
        })),
        notes: notes.trim()
      };

      console.log('Submitting payload:', payload);

      const response = await axios.post(`${backendUrl}/work`, payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.data.message || 'Tasks assigned successfully',
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 3000,
        background: '#10b981',
        color: 'white',
      });

      // Reset form
      setSelectedStaff('');
      setTasks([{ title: '', description: '', priority: 'medium', dueDate: '', status: 'pending' }]);
      setNotes('');
      setErrors({});

      // Navigate to tasks page
      navigate('/todo');

    } catch (error: any) {
      console.error('Error assigning tasks:', error);
      
      let errorMessage = 'Failed to assign tasks';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: errorMessage,
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Connection error UI
  if (connectionError) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">
            Cannot connect to the server at {backendUrl}
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Steps:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>1. Ensure backend server is running on port 9000</li>
              <li>2. Check if the server started without errors</li>
              <li>3. Verify no firewall blocking port 9000</li>
              <li>4. Try restarting the backend server</li>
              <li>5. Check console for backend errors</li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Retry Connection (Attempt {retryCount + 1})
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
          
          <div className="mt-8 text-xs text-gray-500">
            <p>Backend URL configured: <code className="bg-gray-100 px-2 py-1 rounded">{backendUrl}</code></p>
            <p className="mt-2">Make sure your backend is running and accessible at this URL.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Debug info - remove in production */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <div className="flex justify-between items-center">
          <span className="text-blue-700">
            Backend: <code className="font-mono">{backendUrl}</code>
          </span>
          <button 
            onClick={handleRetry}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
          >
            <ArrowPathIcon className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
              Assign Tasks
            </h1>
            <p className="text-gray-600 mt-2">Assign multiple tasks to staff members</p>
          </div>
          <button
            onClick={() => navigate('/tasks')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View All Tasks
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5" />
                Select Staff Member *
              </span>
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => {
                setSelectedStaff(e.target.value);
                if (errors.staff) {
                  setErrors({ ...errors, staff: '' });
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors ${
                errors.staff ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loadingStaff}
            >
              <option value="">Select a staff member...</option>
              {loadingStaff ? (
                <option value="" disabled>Loading staff list...</option>
              ) : staffList.length === 0 ? (
                <option value="" disabled>No staff members found</option>
              ) : (
                staffList.map(staff => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name} ({staff.userName}) - {staff.phone}
                  </option>
                ))
              )}
            </select>
            {errors.staff && (
              <p className="mt-1 text-sm text-red-600">{errors.staff}</p>
            )}
            {loadingStaff && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                Loading staff list...
              </div>
            )}
            {!loadingStaff && staffList.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  No staff members available. Please add staff first.
                </p>
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  Tasks *
                </span>
              </label>
              <button
                type="button"
                onClick={addTask}
                className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-2 text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add Task
              </button>
            </div>

            {errors.tasks && (
              <p className="text-sm text-red-600 mb-4">{errors.tasks}</p>
            )}

            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium text-gray-900">
                      Task {index + 1}
                    </h3>
                    {tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove task"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Task Title */}
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTask(index, 'title', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors ${
                          errors[`task_${index}_title`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter task title"
                      />
                      {errors[`task_${index}_title`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`task_${index}_title`]}</p>
                      )}
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Priority
                      </label>
                      <select
                        value={task.priority}
                        onChange={(e) => updateTask(index, 'priority', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">
                        Description
                      </label>
                      <textarea
                        value={task.description}
                        onChange={(e) => updateTask(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                        placeholder="Enter task description"
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          Due Date
                        </span>
                      </label>
                      <input
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => updateTask(index, 'dueDate', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors ${
                          errors[`task_${index}_dueDate`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      {errors[`task_${index}_dueDate`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`task_${index}_dueDate`]}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        value={task.status}
                        onChange={(e) => updateTask(index, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              placeholder="Add any additional notes or instructions..."
            />
          </div>

          {/* Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-medium text-indigo-900 mb-2">Assignment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-4 w-4 text-indigo-500" />
                <span className="text-gray-600">Staff:</span>
                <span className="font-medium">
                  {selectedStaff ? staffList.find(s => s._id === selectedStaff)?.name : 'Not selected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-4 w-4 text-indigo-500" />
                <span className="text-gray-600">Tasks:</span>
                <span className="font-medium">{tasks.length} task(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-indigo-500" />
                <span className="text-gray-600">Due:</span>
                <span className="font-medium">
                  {tasks.filter(t => t.dueDate).length} with deadlines
                </span>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || staffList.length === 0}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Assigning Tasks...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Assign Tasks
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToDo;