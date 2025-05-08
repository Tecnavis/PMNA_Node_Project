import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";
import { Expense, IAPIResponseAllDieselExpenses, IAPIResponseApproveDieselExpenses, IDieselExpense } from "../interface/Expences";


// API service for fetching dieselExpenses
export const getExpences = async (
    month?: string,
    year?: string,
    vehicleNumber?: string
): Promise<IDieselExpense[]> => {
    try {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (vehicleNumber) params.append('vehicleNumber', vehicleNumber);

        const response: AxiosResponse<IAPIResponseAllDieselExpenses> = await axios.get(
            `${BASE_URL}/diesel-expenses?${params.toString()}`
        );
        return response.data.data;
    } catch (error) {
        handleApiError(error);
        return [];
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
        const response = await axios.get(
            `${BASE_URL}/expense/pending`
        );
        return response.data.expenseData;
    } catch (error) {
        console.error('Error fetching pending expenses:', error);
        throw error;
    }
};

export const fetchExpenses = async (): Promise<Expense[]> => {
    try {
        const response = await axios.get(
            `${BASE_URL}/expense`
        );
        return response.data.expenseData;
    } catch (error) {
        console.error('Error fetching pending expenses:', error);
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

