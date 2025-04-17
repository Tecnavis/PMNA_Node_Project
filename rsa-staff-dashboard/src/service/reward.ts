import { AxiosResponse } from "axios";
import { axiosInstance as axios } from "../config/axiosConfig";
import { BASE_URL } from "../config/axiosConfig";
import { handleApiError } from "../utils/errorHandler";
import { GetllAllRedeemReponseType, IReward } from "../interface/reward";
import { Parallax } from "swiper";

// API service for fetching showroom by ID
export const getRewards = async (
    rewardFor: string = 'ShowroomStaff',
):
    Promise<IReward[]> => {
    const response: AxiosResponse<IReward[]> = await axios.get(
        `${BASE_URL}reward`,
        {
            params: {
                rewardFor
            },
        }
    );
    console.log(response.data)
    return response.data;
};
// API service for fetching showroom by ID
export const getRedeems = async (
    userId: string,
    userType: string = 'ShowroomStaff',
):
    Promise<GetllAllRedeemReponseType> => {
    const response: AxiosResponse<GetllAllRedeemReponseType> = await axios.get(
        `${BASE_URL}reward/redemtions/`,
        {
            params: {
                userId,
                userType
            },
        }
    );

    return response.data;
};

// API service for redeem a reward
export const redeemReward = async (
    id: string,
    staffId:string,
    userType:string
):
    Promise<any> => {
    try {
        const response: AxiosResponse<any> = await axios.get(
            `${BASE_URL}reward/redeem-reward`,
            {
                params: {
                    id,
                    staffId,
                    userType
                }
            }
        );

        return response.data;
    } catch (error: unknown) {
        const errorMessage = handleApiError(error);
        throw new Error(errorMessage);
    }
};