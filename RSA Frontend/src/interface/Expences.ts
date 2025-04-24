import { Driver } from "../pages/Reports/DCPReport";

export interface IDieselExpense {
    _id: string;
    expenseId: string;
    driver: {
        name: string,
        _id: string
    };
    description: string;
    amount: number;
    images: string[];
    status: 'Pending' | 'Approved' | 'Rejected';
    createdAt: string;
    updatedAt: string;
}

// API Response for get all diesel expense
export interface IAPIResponseAllDieselExpenses {
    data: IDieselExpense[]
}

// API Response for get all diesel expense
export interface IAPIResponseApproveDieselExpenses {
    message: string
    data: IDieselExpense
}

export interface Expense {
  _id: string;
  amount: number;
  type: string;
  description: string;
  approve: boolean | null; // null = pending, true = approved, false = rejected
  driver: Driver;
  image: string;
  createdAt: string;
}