import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";
import { VehicleNames } from "../interface/Vehicle";


// Get all vehicle names list
export const getVehiclesList = async (): Promise<VehicleNames[]> => {
    try {
        const response: AxiosResponse<{ data: VehicleNames[] }> = await axios.get(
            `${BASE_URL}/vehicle/names`
        );
        return response.data.data;
    } catch (error) {
        return [];
    }
};