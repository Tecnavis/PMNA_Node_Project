import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { IShowroom } from "../interface/showroom";
import { handleApiError } from "../utils/errorHandler";

// API service for fetching showroom by ID
export const getShowroomById = async (
    id: string
):
    Promise<IShowroom> => {
    try {
        const response: AxiosResponse<IShowroom> = await axios.get(
            `${BASE_URL}showroom/${id}`
        );

        return response.data;
    } catch (error: unknown) {
        const errorMessage = handleApiError(error);
        throw new Error(errorMessage);
    }
};

export const getShowroomReports = async (query: {
    month?: number;
    year?: number;
    serviceCategory: string;
    showroomId: string
}): Promise<any> => {
    try {
        const response: AxiosResponse = await axios.get(
            `${BASE_URL}showroom/report`,
            {
                params: query
            }
        );
        return response.data;
    } catch (error: unknown) {
        const errorMessage = handleApiError(error);
        throw new Error(errorMessage);
    }
};

export const getShowroomStaffProfile = async (): Promise<any> => {
    try {
        const response: AxiosResponse = await axios.get(
            `${BASE_URL}showroom/showroom-staff-profile`,
        );
        return response.data;
    } catch (error: unknown) {
        const errorMessage = handleApiError(error);
        throw new Error(errorMessage);
    }
};