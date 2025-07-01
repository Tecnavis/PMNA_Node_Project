export interface AdvanceData {
    _id: string;
    addedAdvance: number;
    advance: number;
    driver:
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
export interface Staff {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    cashInHand?: number;
    // Add other staff properties as needed
}
export interface ReceivedDetails {
    _id: string;
    fileNumber: string;
    balance: string;
    currentNetAmount: number;
    amount: string;
    driver: {
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
    driver: {
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
}
