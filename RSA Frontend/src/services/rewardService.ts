import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";


// API service for fetching dieselExpenses
export const getRedemableRewads = async (userType: string, points: number): Promise<any[]> => {
    try {
        const response: AxiosResponse<any> = await axios.get(
            `${BASE_URL}/reward/redemable-rewards`,
            {
                params: {
                    userType, points
                }
            }
        );
        return response.data.rewards;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};
export const getRedeemedHistory = async (userType: string, userId: string): Promise<any[]> => {
    try {
        const response: AxiosResponse<any> = await axios.get(
            `${BASE_URL}/reward/redemtions`,
            {
                params: {
                    userType, userId
                }
            }
        );
        return response.data.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};