// src/types/booking.ts
export interface Booking {
    _id: string;
    fileNumber: string;
    driver?: {
        name: string;
    };
    customerVehicleNumber: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    pickupDate?: string;
    dropoffTime?: string;
    totalDistence?: string;
    pickupTime?: string;
    // Add all other properties that exist in both types
    inventoryImage?: string;
    bookingStatus?: string;
    serviceVehicleNumber?: string;
    feedback?: any;
    workType: string;
    dummyProviderName?: string;
    dummyDriverName?: string;
    bookedBy: string;
    feedbackCheck: boolean;
    vehicleNumber: string;
    location: string;
    cashPending?: boolean;
    dropoffImagePending?: boolean;
    pickupImagePending?: boolean;
    accountantVerified?: boolean;
    inventoryImagePending?: boolean;
    company: {
        name: string;
    };
    latitudeAndLongitude: string;
    baselocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    }; // Reference to BaseLocation
    showroom: {
        name: string;
        location: string;
    }; // Reference to Showroom
    dropoffLocation: string;
    dropoffLatitudeAndLongitude: string;
    trapedLocation: string;
    serviceType: {
        additionalAmount: number;
        expensePerKm: number;
        firstKilometer: number;
        firstKilometerAmount: number;
        serviceName: string;
        _id: string;
    };
    customerName: string;
    mob1: string;
    mob2?: string; // Optional field
    vehicleType: string;
    brandName?: string; // Optional field
    comments?: string; // Optional field
  
    totalAmount?: number; // Optional field
    totalDriverDistence?: number; // Optional field
    driverSalary?: number; // Optional field
    accidentOption?: string; // Optional field
    serviceCategory?: string; // Optional field
    insuranceAmount?: number; // Optional field
    adjustmentValue?: number; // Optional field
    amountWithoutInsurance?: number; // Optional field
  
    verified: boolean;
   
    driverSalaryCheck: boolean;
    compnayAmountCheck: boolean;
    remark: string;
    pickupImages: [string];
    dropoffImages: [string];}