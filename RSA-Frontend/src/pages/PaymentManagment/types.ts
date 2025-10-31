export interface AdvanceData {
    _id: string;
    addedAdvance: number;
    advance: number;
    previousAdvance?:number;
    driver?:
        | {
              name: string;
              _id: string;
          }
        | string;
        provider?:
        | {
              name: string;
              _id: string;
          }
        | string;
    type: string;
    createdAt: string;
    updatedAt: string;
    filesNumbers: string[];
    driverSalary: number[];
    balanceSalary: number[];
    transferdSalary: number[];
}
export interface Provider {
  _id: string;
  name: string;
  cashInHand: number;
  advance?: number;
 companyName: string;
    baseLocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    };
    idNumber: string;
    creditAmountLimit: number;
    phone: string;
    personalPhoneNumber: string;
    password: string;
    serviceDetails: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
}
export interface Staff {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    cashInHand?: number;
    // Add other staff properties as needed
}
export interface Showroom {
    _id: string;
    name: string;
   
    cashInHand?: number;
    // Add other staff properties as needed
}
export interface PaymentTransaction {
  _id: string;
  showroomId: string;
  showroomName: string;
  collectedAmount: number;
  previousBalance: number;
  newBalance: number;

  remark: string;
  createdAt: string;
  paymentMode: string;
  referenceNumber: string;
}
export interface ReceivedDetails {
    _id: string;
    fileNumber: string;
    balance: string;
    currentNetAmount: number;
    amount: string;
    driver?: {
        _id: string;
        name: string;
    };
  provider?: {
        _id: string;
        name: string;
    };
    staff: Staff | string; // Can be either Staff object or ID string

    receivedAmount: number;
    totalAmount?: number;
    receivedUser: string;
    receivedUserId?: string | Staff; // Can be ID string or populated Staff object

    createdAt: string | Date;
    updatedAt?: string | Date;
    remark?: string;
}
export interface CashCollectionDetails {
    _id: string;
    balance: string; // String representation of balance
    currentCashInHand: number;
    totalDriverAmount: number;
    driver?: {
        _id: string; // Typically include the ID
        name: string;
    };
     provider?: {
        _id: string; // Typically include the ID
        name: string;
    };
    staff: Staff | string;
    receivedUser: string; // Enum would be better if limited values
    receivedUserId?: string | Staff; // Can be ID string or populated Staff object
    receivedAmount: number;
    createdAt: string | Date; // Can be string or Date object
    updatedAt?: string | Date; // Optional if using timestamps
    remark?: string; // Optional remark field
}
export interface ReceivedDetailsStaff {
    _id: string;
    balance: string;
    currentCashInHand: number;
    totalStaffAmount: number;
    staff:
        | {
              _id: string;
              name: string;
          }
        | string;
    givenAmountToStaff: number;
    remark?: string;
    createdAt: string | Date;
    updatedAt?: string | Date;
    processedBy?: {
        _id: string;
        name: string;
    };
      provider?: {
        _id: string;
        name: string;
    };
}
