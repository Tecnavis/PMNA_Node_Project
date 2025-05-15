import { AxiosResponse } from "axios";
import { axiosInstance as axios, BASE_URL } from "../config/axiosConfig";
import { IMarketingExecutives } from "../interface/Executives";
import { showApiErrorToast } from "../utils/errorHandler";


export const createNewExecutives = async (formData: any) => {
    try {
        const res = await axios.post(`${BASE_URL}/marketing-executives`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })

        return res.data.data
    } catch (error) {
        showApiErrorToast(error)
        return false;
    }
}

export const updateExecutives = async (formData: any, id: string) => {
    try {
        const res = await axios.put(`${BASE_URL}/marketing-executives/${id}`, formData, {
            // headers: {
            //     'Content-Type': 'multipart/form-data',
            // },
        })

        return res.data.data
    } catch (error) {
        showApiErrorToast(error)
        return false;
    }
}

export const getAllExecutives = async (page: number = 1, search: string, disablePagination: boolean = false, projectionFields: string) => {
    try {
        const res: AxiosResponse<{
            data: IMarketingExecutives[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
            success: boolean
        }> = await axios.get(`${BASE_URL}/marketing-executives`, {
            params: {
                page, search, disablePagination, projectionFields
            }
        })
        return res.data
    } catch (error) {
        showApiErrorToast(error)
        return null;
    }
}

export const getExecutiveById = async (id: string) => {
    try {
        const res: AxiosResponse<{
            data: IMarketingExecutives;
            success: boolean
        }> = await axios.get(`${BASE_URL}/marketing-executives/${id}`)
        return res.data.data
    } catch (error) {
        showApiErrorToast(error)
        return null;
    }
}

export const deleteExecutiveById = async (id: string) => {
    try {
        const res: AxiosResponse<{
            data: IMarketingExecutives;
            success: boolean
        }> = await axios.delete(`${BASE_URL}/marketing-executives/${id}`)
        return res.data.success
    } catch (error) {
        showApiErrorToast(error)
        return null;
    }
}
// APi server for verify the showroom
export const verifyShowroom = async (data: {
    userType: string;
    showroomId: string;
    coordinates: number[];
    accuracy: number;
    image: File;
}) => {
    try {
        const formData = new FormData();
        formData.append('userType', data.userType);
        formData.append('showroomId', data.showroomId);
        formData.append('longitude', data.coordinates[0].toString());
        formData.append('latitude', data.coordinates[1].toString());
        formData.append('accuracy', data.accuracy.toString());
        formData.append('image', data.image);

        const res: AxiosResponse<{
            data: any;
            success: boolean;
            message: string;
        }> = await axios.post(
            `${BASE_URL}/marketing-executives/showroom-verifiction`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return res.data.success;
    } catch (error) {
        showApiErrorToast(error);
        return null;
    }
};