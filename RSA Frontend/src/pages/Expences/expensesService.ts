import axios from 'axios';

// Use the correct backend URL
// const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9000';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9000';
// ----------------------------------------------------
// Define TypeScript interfaces
interface CompanyExpense {
  _id: string;
  expenseId: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  vendor?: string;
  employee?: string;
  image: string; // Make sure this matches your backend
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

interface CompanyExpenseResponse {
  success: boolean;
  data: CompanyExpense[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface CreateExpenseData {
  title: string;
  description: string;
  category: string;
  amount: number;
  vendor?: string;
  employee?: string;
  image?: File | null; // Allow null as well as undefined
}

interface UpdateExpenseData {
  title?: string;
  description?: string;
  category?: string;
  amount?: number;
  vendor?: string;
  employee?: string;
}

// Get all company expenses with filters
export const getCompanyExpenses = async (
  month: string = '',
  year: string = '',
  category: string = '',
  employee: string = '',
  page: number = 1,
  limit: number = 10,
  showAll: boolean = false
): Promise<CompanyExpenseResponse> => {
  const params = new URLSearchParams();
  
  if (month) params.append('month', month);
  if (year) params.append('year', year);
  if (category) params.append('category', category);
  if (employee) params.append('employee', employee);
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  if (showAll) params.append('showAll', showAll.toString());

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_BASE_URL}/company-expenses?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};

// In your expensesService.ts - update createCompanyExpense function
export const createCompanyExpense = async (
  expenseData: CreateExpenseData, 
  retries = 3, 
  delay = 1000
): Promise<{ success: boolean; data: CompanyExpense; message: string }> => {
  
  const attemptUpload = async (attempt: number): Promise<any> => {
    const formData = new FormData();
    
    formData.append('title', expenseData.title.trim());
    formData.append('description', expenseData.description.trim());
    formData.append('category', expenseData.category);
    formData.append('amount', expenseData.amount.toString());
    
    if (expenseData.vendor) formData.append('vendor', expenseData.vendor.trim());
    if (expenseData.employee) formData.append('employee', expenseData.employee.trim());
    
    // Append image only if it exists and is not null
    if (expenseData.image) {
      formData.append('image', expenseData.image);
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log(`Frontend upload attempt ${attempt}/${retries + 1}`);

      const response = await axios.post(`${API_BASE_URL}/company-expenses`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 45000, // 45 second timeout
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      });
      
      return response.data;

    } catch (error: any) {
      console.error(`Frontend upload attempt ${attempt} failed:`, error.message);
      
      // Don't retry for these error types
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error; // Client errors, no retry
      }
      
      if (attempt < retries) {
        const nextDelay = delay * attempt; // Exponential backoff
        console.log(`Retrying in ${nextDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, nextDelay));
        return attemptUpload(attempt + 1);
      } else {
        throw error;
      }
    }
  };

  try {
    const response = await attemptUpload(1);
    return response;
  } catch (error: any) {
    console.error('API Error Details after all retries:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    throw error;
  }
};

// Update company expense
export const updateCompanyExpense = async (
  expenseId: string, 
  updateData: UpdateExpenseData
): Promise<{ success: boolean; data: CompanyExpense; message: string }> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(`${API_BASE_URL}/company-expenses/${expenseId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};

// Approve company expense
export const approveCompanyExpense = async (
  expenseId: string, 
  status: 'Approved' | 'Rejected'
): Promise<{ success: boolean; data: CompanyExpense; message: string }> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.patch(`${API_BASE_URL}/company-expenses/${expenseId}/status`, {
      status
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};

// Get expense statistics
export const getExpenseStats = async (
  year: string = '', 
  month: string = ''
): Promise<{ 
  success: boolean; 
  data: { 
    summary: {
      totalExpenses: number;
      expenseCount: number;
      categoryBreakdown: Array<{
        category: string;
        totalAmount: number;
        count: number;
      }>;
    };
    statusStats: Array<{
      _id: string;
      count: number;
      totalAmount: number;
    }>;
  } 
}> => {
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (month) params.append('month', month);

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${API_BASE_URL}/company-expenses/stats/summary?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};
// In your services/expencesService.ts or similar file
export const getPetrolPumps = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/petrol-pumps`);
        return response.data;
    } catch (error) {
        console.error('Error fetching petrol pumps:', error);
        throw error;
    }
};
// Add this to your expensesService.ts
export const deleteCompanyExpense = async (
  expenseId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(`${API_BASE_URL}/company-expenses/${expenseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};