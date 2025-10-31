import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";

// API service for fetching drivers
export const fetchDrivers = async (id:string): Promise<any[]> => {
    try {
        const response: AxiosResponse<any[]> = await axios.get(
            `${BASE_URL}/driver/${id}`
        );
        return response.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};

// API service for fetching showroomStaff
export const fetchShowroomStaff = async (id:string): Promise<any[]> => {
    try {
        const response: AxiosResponse<any[]> = await axios.get(
            `${BASE_URL}/showroom/get-showroom-staff/${id}`
        );
        return response.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};

// API service for fetching showroom
export const fetchShowrooms = async (id:string): Promise<any[]> => {
    try {
        const response: AxiosResponse<any[]> = await axios.get(
            `${BASE_URL}/showroom/${id}`
        );
        return response.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};
