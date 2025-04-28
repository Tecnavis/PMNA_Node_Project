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