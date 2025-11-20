import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";

export const updateQrApi = async (
    qr: FormData
): Promise<string> => {
    try {
        const response: AxiosResponse<{ message: string }> = await axios.patch(
            `${BASE_URL}/admin/qr`,
            qr,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data.message
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

export const getAdminQrApi = async (): Promise<string | null> => {
    try {
        const res: AxiosResponse<{ qrImage: string | null }> =
            await axios.get(`${BASE_URL}/admin/qr`);

        return res.data.qrImage;
    } catch (error) {
        handleApiError(error);
        return null;
    }
};