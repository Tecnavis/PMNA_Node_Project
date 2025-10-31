import { axiosInstance as axios, BASE_URL } from "../config/axiosConfig";
import { showApiErrorToast } from "../utils/errorHandler";


export const fetchMonthlyAdvance = async (id: string, startDate: string, endingDate: string) => {
    try {
        const res = await axios.get(`${BASE_URL}/advance-payment/monthly-advance/${id}`, {
            params: {
                startDate,
                endingDate
            }
        })

        return res.data
    } catch (error) {
        return error
    }
}