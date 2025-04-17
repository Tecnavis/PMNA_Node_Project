import { IShowroom } from "./showroom";

export interface IShowroomStaff {
    _id: string;
    designation: string;
    name: string;
    phoneNumber: number;
    whatsappNumber: number;
    rewardPoints?: number;
    showroomId: string | IShowroom;
    createdAt?: Date;
    updatedAt?: Date;
}