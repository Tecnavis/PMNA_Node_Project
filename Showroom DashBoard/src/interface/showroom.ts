export interface IServiceOption {
    selected: boolean;
    amount?: number | null;
}

export interface IShowroom {
    name: string;
    showroomId?: string;
    description?: string;
    location: string;
    latitudeAndLongitude: string;
    username?: string;
    password?: string;
    helpline?: string;
    phone?: string;
    mobile?: string;
    state?: string;
    district?: string;
    image?: string;
    rewardPoints: number;
    bookingPoints: number;
    bookingPointsForStaff: number;
    showroomLink?: string;
    cashInHand?: number;
    services: {
        serviceCenter: IServiceOption;
        bodyShop: IServiceOption;
        showroom: {
            selected: boolean;
        };
    };
}
