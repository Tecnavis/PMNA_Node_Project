import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";
import { IRedemption } from "../interface/Rewards";


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
export const redeemShowroomReward = async (showroomId: string): Promise<any[]> => {
    try {
        const response: AxiosResponse<any> = await axios.patch(
            `${BASE_URL}/reward/showroom-redeem/${showroomId}`);
        return response.data.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};
export const getAllRedeems = async (): Promise<IRedemption[]> => {
    try {
        const response: AxiosResponse<any> = await axios.get(
            `${BASE_URL}/reward/redeems`);
        return response.data.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};
export const approveRedeem = async (redeemId: string): Promise<IRedemption> => {
    try {
        const response: AxiosResponse<{ success: boolean; data: IRedemption; message?: string }> =
            await axios.patch(`${BASE_URL}/reward/approve-redeem/${redeemId}`);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to approve redemption');
        }

        return response.data.data;
    } catch (error) {
        handleApiError(error);
        throw error; 
    }
};

export const rejectRedeem = async (redeemId: string): Promise<IRedemption> => {
    try {
        const response: AxiosResponse<{ success: boolean; data: IRedemption; message?: string }> =
            await axios.patch(`${BASE_URL}/reward/reject-redeem/${redeemId}`);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to reject redemption');
        }

        return response.data.data;
    } catch (error) {
        handleApiError(error);
        throw error; 
    }
};