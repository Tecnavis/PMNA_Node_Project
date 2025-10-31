import { axiosInstance, BASE_URL } from "../config/axiosConfig";
import Swal from "sweetalert2";
import { Booking } from "../pages/Bookings/OpenBooking";

interface UpdateData {
    [key: string]: any;
}

export interface APIForCancelApiResponse {
    success: boolean;
    message: string;
    booking?: Booking;
}

export const updateCancelData = async (
    id: string,
    data: UpdateData
): Promise<APIForCancelApiResponse> => {
    try {
        const response = await axiosInstance.put(`${BASE_URL}/booking/${id}`, data);

        return {
            success: true,
            message: response.data.message,
            booking: response.data.booking,
        };
    } catch (error: any) {
        const message = error.response?.data?.message || "Something went wrong. Please try again.";
        Swal.fire("Error", message, "error");
        return {
            success: false,
            message,
        };
    }
};
