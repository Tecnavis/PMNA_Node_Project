// Reward model inteface and its enums
export type RewardFor = 'Staff' | 'Showroom' | 'ShowroomStaff' | 'Driver';
export enum RewardForEnum {
    Staff = 'Staff',
    Showroom = 'Showroom',
    ShowroomStaff = 'ShowroomStaff',
    Driver = 'Driver'
}
export interface IReward {
    _id: string;
    name: string;
    price: number;
    description: string;
    pointsRequired: number;
    stock: number;
    TotalRedeem?: number;
    percentage?: number;
    rewardFor: RewardFor;
    image?: string;
    createdAt?: string;
    updatedAt?: string;
}

// Redeem model inteface and its enums
export type RedeemByModel = 'Showroom' | 'ShowroomStaff' | 'Staff';
export interface IRedemption {
    _id: string;
    reward: IReward | string;
    user: string;
    redeemByModel: RedeemByModel;
    createdAt?: string;
    updatedAt?: string;
}
export enum RedeemByModelEnum {
    Showroom = 'Showroom',
    ShowroomStaff = 'ShowroomStaff',
    Staff = 'Staff'
}

// API Response interface for get all redeem
export interface GetllAllRedeemReponseType {
    message: string,
    success: boolean,
    data: IRedemption[]
}