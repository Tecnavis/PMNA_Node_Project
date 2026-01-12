import { AxiosResponse } from "axios";
import { axiosInstance as axios, axiosInstance } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";
import { Expense, IAPIResponseAllDieselExpenses, IAPIResponseApproveDieselExpenses, IDieselExpense } from "../interface/Expences";


// API service for fetching dieselExpenses
export const getExpences = async (
    month?: string,
    year?: string,
    vehicleNumber?: string,
      petrolPump?: string,
    page: number = 1,
    limit: number = 10,
    all: boolean = false
): Promise<IAPIResponseAllDieselExpenses> => {
    try {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (vehicleNumber) params.append('vehicleNumber', vehicleNumber);
          if (petrolPump) params.append('petrolPump', petrolPump); 
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        params.append('all', all.toString());

        const response: AxiosResponse<IAPIResponseAllDieselExpenses> = await axios.get(
            `${BASE_URL}/diesel-expenses?${params.toString()}`
        );
        return response.data;
    } catch (error) {
        handleApiError(error);
        return {
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0
        };
    }
};
// Approve dieslse expnse
export const approveExpense = async (expenseId: string, status: string): Promise<IDieselExpense> => {
    try {
        const response = await axios.patch<IAPIResponseApproveDieselExpenses>(
            `${BASE_URL}/diesel-expenses/${expenseId}/approve`, { status }
        );
        return response.data.data;
    } catch (error) {
        console.error('Error approving expense:', error);
        throw error;
    }
};
// Update dieslse expnse
export const udpateDieselExpance = async (
    expenseId: string,
    data: any
): Promise<IDieselExpense> => {
    try {
        const response = await axios.put(
            `${BASE_URL}/diesel-expenses/${expenseId}`,
            { ...data }
        );
        return response.data.data;
    } catch (error) {
        console.error('Error updating expense status:', error);
        throw error;
    }
}

// Create new  dieslse expnse
export const createDieselExpance = async (
    data: any
): Promise<IDieselExpense> => {
    try {
        const response = await axios.post(
            `${BASE_URL}/diesel-expenses/`,
            data,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        return response.data.data;
    } catch (error) {
        console.error('Error updating expense status:', error);
        throw error;
    }
}


// ---------------------------------------------------------------------Expense Service-----------------------------------------------------------------------------------------------------------------------------------------------


export const fetchPendingExpenses = async (): Promise<Expense[]> => {
    try {
        console.log('Fetching pending expenses...'); // Log before making the request
        const response = await axios.get(
            `${BASE_URL}/expense/pending`
        );
        
        console.log('Pending expenses data:', response.data.expenseData); // Log the received data
        
        return response.data.expenseData;
    } catch (error) {
        console.error('Error fetching pending expenses:', error);
        throw error;
    }
};

export const fetchExpenses = async (search: string, page: number = 1, limit: number | 'all' = 10): Promise<{ data: Expense[], pagination: any }> => {
    try {
        const params = {
            search,
            page,
            ...(limit !== 'all' && { limit }),
            ...(limit === 'all' && { all: true })
        };

        const response = await axiosInstance.get(`${BASE_URL}/expense`, { params });
        return {
            data: response.data.expenseData,
            pagination: response.data.pagination
        };
    } catch (error) {
        console.error('Error fetching expenses:', error);
        throw error;
    }
};

export const updateStatus = async (
    expenseId: string,
    status: boolean
): Promise<IDieselExpense> => {
    try {
        const response = await axios.patch(
            `${BASE_URL}/expense/update-expense/${expenseId}`,
            { status }
        );
        return response.data.expenseData;
    } catch (error) {
        console.error('Error updating expense status:', error);
        throw error;
    }
};

// Add this to your expencesService.ts
export const deleteDieselExpense = async (
  expenseId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(`${BASE_URL}/diesel-expenses/${expenseId}`, {
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