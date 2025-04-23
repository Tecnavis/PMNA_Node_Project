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
    currentNetAmount: number;
    driver: { name: string };
    receivedAmount: number;
    createdAt: string;
    remark?: string;
}