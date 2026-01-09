import axios from 'axios';
import { BASE_URL } from '../config/axiosConfig';
import Staff from '../pages/Staff/Staff';


export const staffService = {
  // Get all staff
  async getAllStaff(): Promise<Staff[]> {
    const response = await axios.get(`${BASE_URL}/api/staff`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Get staff by ID
  async getStaffById(id: string): Promise<Staff> {
    const response = await axios.get(`${BASE_URL}/api/staff/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  }
};