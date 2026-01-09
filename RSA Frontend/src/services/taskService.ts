import axios from 'axios';
import { Task, TaskFilters, TaskStats } from '../pages/ToDo/task';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export const taskService = {
  // Create task
  async createTask(taskData: any): Promise<Task> {
    const response = await axios.post(`${API_URL}/api/tasks`, taskData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.data;
  },

  // Get all tasks with filters
  async getTasks(filters: TaskFilters = {}): Promise<{ data: Task[]; pagination: any }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await axios.get(`${API_URL}/api/tasks?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Get tasks by staff
  async getTasksByStaff(staffId: string, filters?: any): Promise<Task[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await axios.get(`${API_URL}/api/tasks/staff/${staffId}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data;
  },

  // Get task by ID
  async getTaskById(id: string): Promise<Task> {
    const response = await axios.get(`${API_URL}/api/tasks/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data;
  },

  // Update task
  async updateTask(id: string, taskData: any): Promise<Task> {
    const response = await axios.put(`${API_URL}/api/tasks/${id}`, taskData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.data;
  },

  // Delete task
  async deleteTask(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/tasks/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  },

  // Add comment
  async addComment(taskId: string, comment: string): Promise<Task> {
    const response = await axios.post(
      `${API_URL}/api/tasks/${taskId}/comments`,
      { text: comment },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data;
  },

  // Get task stats
  async getTaskStats(): Promise<TaskStats> {
    const response = await axios.get(`${API_URL}/api/tasks/stats/summary`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data;
  },

  // Get dashboard data
  async getDashboardData(): Promise<any> {
    const response = await axios.get(`${API_URL}/api/tasks/stats/dashboard`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data;
  }
};