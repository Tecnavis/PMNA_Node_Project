export interface AdvanceData {
    _id: string;
    addedAdvance: number;
    advance: number;
    driver: {
        name: string
        _id: string
    } | string
    type: string;
    createdAt: string,
    updatedAt: string
    filesNumbers: string[],
    driverSalary: number[],
    balanceSalary: number[],
    transferdSalary: number[]
}

export interface ReceivedDetails {
    _id: string;
    fileNumber: string;
    balance: string;
    currentNetAmount: number;
    amount: string ;
    driver: {
        _id: string;
        name: string;
    };
    receivedAmount: number;
    totalAmount?: number;
    receivedUser: string;
    receivedUserId?: string;
    createdAt: string | Date;
    updatedAt?: string | Date;
    remark?: string;
}
export interface CashCollectionDetails {
    _id: string;
    balance: string;       // String representation of balance
    currentCashInHand: number;
    totalDriverAmount: number;
    driver: { 
        _id: string;      // Typically include the ID
        name: string 
    };
    receivedUser: string;  // Enum would be better if limited values
    receivedUserId?: string; // Optional if not always present
    receivedAmount: number;
    createdAt: string | Date; // Can be string or Date object
    updatedAt?: string | Date; // Optional if using timestamps
    remark?: string;       // Optional remark field
}
export interface ReceivedDetailsStaff {
    _id: string;
    balance: string;
    currentCashInHand: number;
    totalStaffAmount: number;
    staff: {
        _id: string;
        name: string;
    } | string;
    givenAmountByStaff: number;
    remark?: string;
    createdAt: string | Date;
    updatedAt?: string | Date;
    processedBy?: {
        _id: string;
        name: string;
    };
}