import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";
import { DriverDropdownItem } from "../interface/Driver";


// API service for fetching dieselExpenses
export const getDriverForDropDown = async (): Promise<DriverDropdownItem[]> => {
    try {
        const response: AxiosResponse<{ data: DriverDropdownItem[] }> = await axios.get(
            `${BASE_URL}/driver/dropdown`
        );
        return response.data.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};

// API service for fetching dieselExpenses
export const getProviderForDropDown = async (): Promise<DriverDropdownItem[]> => {
    try {
        const response: AxiosResponse<{ data: DriverDropdownItem[] }> = await axios.get(
            `${BASE_URL}/provider/drop-down`
        );
        return response.data.data;
    } catch (error) {
        handleApiError(error);
        return [];
    }
};