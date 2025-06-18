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
    amount: string;
    fileNumber: string;
    balance: string;
    totalAmount:number;
    currentNetAmount: number;
    driver: { name: string };
    receivedAmount: number;
    createdAt: string;
    remark?: string;
}
export interface CashCollectionDetails {
    _id: string;
    fileNumbers: string[]; // Array of file numbers
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