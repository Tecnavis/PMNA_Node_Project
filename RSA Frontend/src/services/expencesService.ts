import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";
import { Expense, IAPIResponseAllDieselExpenses, IAPIResponseApproveDieselExpenses, IDieselExpense } from "../interface/Expences";


// API service for fetching dieselExpenses
export const getExpences = async (): Promise<IDieselExpense[]> => {
    try {
        const response: AxiosResponse<IAPIResponseAllDieselExpenses> = await axios.get(
            `${BASE_URL}/diesel-expenses`
        );
        return response.data.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};

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
