import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeftIcon,
  CheckCircleIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const EditTaskPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [workAssignment, setWorkAssignment] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Fetch assignment data
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${backendUrl}/work/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setWorkAssignment(response.data.data);
          setTasks(response.data.data.tasks);
          setNotes(response.data.data.notes || '');
        }
      } catch (error) {
        console.error('Error fetching assignment:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load assignment data',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
        }).then(() => navigate('/tasks'));
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [id, backendUrl, navigate]);

  // Add new task
  const addTask = () => {
    setTasks([
      ...tasks,
      { 
        title: '', 
        description: '', 
        priority: 'medium', 
        dueDate: '', 
        status: 'pending',
        _id: `temp-${Date.now()}`
      }
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
  const updateTask = (index: number, field: string, value: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const payload = {
        tasks,
        notes
      };

      const response = await axios.put(`${backendUrl}/work/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.data.message || 'Assignment updated successfully',
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 3000,
        background: '#10b981',
        color: 'white',
      });

      navigate('/tasks');
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to update assignment',
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    // If it's a temporary task (not saved yet)
    if (taskId.startsWith('temp-')) {
      setTasks(tasks.filter(task => task._id !== taskId));
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Task?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${backendUrl}/work/${id}/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Remove from local state
        setTasks(tasks.filter(task => task._id !== taskId));

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Task deleted successfully',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 2000,
        });
      } catch (error) {
        console.error('Error deleting task:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to delete task',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading assignment data...</p>
        </div>
      </div>
    );
  }

  if (!workAssignment) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto" />
          <p className="mt-4 text-gray-600 text-lg">Assignment not found</p>
          <button
            onClick={() => navigate('/tasks')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/tasks')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
                Edit Task Assignment
              </h1>
            </div>
            <p className="text-gray-600 ml-10">
              Editing tasks for <span className="font-medium">{workAssignment.staff.name}</span>
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Assignment Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Staff Member</h3>
            <div className="flex items-center gap-3">
              {workAssignment.staff.image ? (
                <img
                  className="h-10 w-10 rounded-full"
                  src={workAssignment.staff.image}
                  alt={workAssignment.staff.name}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{workAssignment.staff.name}</p>
                <p className="text-sm text-gray-500">{workAssignment.staff.userName}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Assigned By</h3>
            <p className="font-medium text-gray-900">{workAssignment.assignedBy.name}</p>
            <p className="text-sm text-gray-500">{workAssignment.assignedBy.email}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Assignment Status</h3>
            <select
              value={workAssignment.overallStatus}
              onChange={(e) => setWorkAssignment({
                ...workAssignment,
                overallStatus: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Tasks ({tasks.length})</h2>
          <button
            onClick={addTask}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add New Task
          </button>
        </div>

        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={task._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-medium text-gray-900">
                  Task {index + 1}
                </h3>
                <button
                  onClick={() => handleDeleteTask(task._id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Delete task"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="Enter task title"
                  />
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
                    value={task.dueDate?.split('T')[0] || ''}
                    onChange={(e) => updateTask(index, 'dueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  />
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

      {/* Notes Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
          placeholder="Add any additional notes or instructions..."
        />
      </div>
    </div>
  );
};

export default EditTaskPage;