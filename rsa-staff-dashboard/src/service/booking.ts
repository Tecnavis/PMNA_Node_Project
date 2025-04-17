import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { AddBookingResponse, AddNewBookingFormData, AllBookingResponse } from '../interface/booking'
import { handleApiError } from "../utils/errorHandler";


// API service adding new booking
export const addNewBooking = async (formData: AddNewBookingFormData): Promise<AddBookingResponse> => {
    try {
        const response: AxiosResponse<AddBookingResponse> = await axios.post(
            `${BASE_URL}booking/showroom/add-booking`,
            formData
        );

        return response.data;
    } catch (error: unknown) {
        const errorMessage = handleApiError(error);
        throw new Error(errorMessage);
    }
};

// API service for get all bookings
export const getBookings = async (query: any): Promise<AllBookingResponse> => {
    try {
        const response: AxiosResponse<AllBookingResponse> = await axios.get(
            `${BASE_URL}booking/showroom-staff/bookings`,
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
