export interface IFeedback {
    questionId: string;
    response: "yes" | "no";
    yesPoint?: number;
    noPoint?: number;
}

interface IDriver {
    name :string
    phone :string
}
interface IProvider {
    name :string
    phone :string
}


export interface IBooking {
    _id?: string;
    workType?: string;
    fileNumber?: string;
    location?: string;
    latitudeAndLongitude?: string;
    baselocation?: string; // ObjectId as string
    showroom?: string;
    company?: string;
    totalDistence?: number;
    dropoffLocation?: string;
    dropoffLatitudeAndLongitude?: string;
    trapedLocation?: string;
    serviceType?: string;
    customerName?: string;
    serviceCategory?: string;
    mob1?: string;
    mob2?: string;
    vehicleType?: string;
    brandName?: string;
    comments?: string;
    customerVehicleNumber?: string;
    status?: string;
    driver?: IDriver;
    provider?: IProvider;
    afterExpenseForProvider?: number;
    afterExpenseForDriver?: number;
    payableAmountForProvider?: number;
    payableAmountForDriver?: number;
    totalAmount?: number;
    receivedAmount?: number;
    totalDriverDistence?: number;
    driverSalary?: number;
    transferedSalary?: number;
    accidentOption?: string;
    insuranceAmount?: number;
    adjustmentValue?: number;
    amountWithoutInsurance?: number;
    createdBy?: IDriver;
    bookedBy?: string | {name:string};
    pickupDate?: Date | string;
    pickupTime?: Date | string;
    dropoffTime?: Date | string;
    vehicleNumber?: string;
    driverSalaryCheck?: boolean;
    compnayAmountCheck?: boolean;
    remark?: string;
    totalPoints?: number;
    serviceVehicleNumber?: string;
    pickupImages?: string[];
    dropoffImages?: string[];
    feedback?: IFeedback[];
    verified?: boolean;
    feedbackCheck?: boolean;
    accountantVerified?: boolean;
    cashPending?: boolean;
    approve?: boolean;
    receivedUser?: string;
    dummyDriverName?: string;
    dummyProviderName?: string;
    notes?: string; // Notes ObjectId as string
    createdAt?: string;
    updatedAt?: string;
}

export interface AddBookingResponse {
    message: string;
    booking: IBooking;
}

export interface AllBookingResponse {
    data: {
        bookings: IBooking[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }
    success: boolean;
}

export interface AddNewBookingFormData {
    fileNumber: string;
    customerName: string;
    mob1: string;
    serviceCategory: string;
    customerVehicleNumber: string;
    comments: string;
    showroom: string;
    bookingStatus: string;
    createdBy: string;
}