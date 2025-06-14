import { Staff } from "../pages/Rewards/Rewards";

export interface ClientRewardDetails {
    _id: string;
    name: string;
    rewardPoints: number;
    companyName?: string;
    bookingPoint?: number;
    category?: string;
    staff: Staff[];
}
export type RewardFor = 'Staff' | 'Showroom' | 'ShowroomStaff' | 'Driver';
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
    image: string;
    createdAt: string;
    updatedAt: string;
}
export interface Address {
    fullName: string,
    phone: string,
    whatsappNumber: string,
    email: string,
    addressLine1: string,
    addressLine2: string,
    state: string
    city: string
    pinCode: string
    country: string
    addressType: "Home" | "Work" | "Other"
}
export type RedeemByModel = 'Showroom' | 'ShowroomStaff' | 'Staff';
export interface IRedemption {
    _id: string;
    reward: IReward | string;
    user: string | {
        name: string
        idNumber:string
    };
    address: Address
    redeemByModel: RedeemByModel;
    createdAt?: string;
    updatedAt?: string;
    approval: boolean;
}