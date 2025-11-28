import { Driver } from "../pages/Reports/DCPReport";
// In your interface/Expences.ts
export interface IPetrolPump {
  _id: string;
  pumpName: string;
  location: string;
  latitude: string;
  longitude: string;
  contactNumber?: string;
  address?: string;
  fuelTypes: string[];
}
export interface IDieselExpense {
    _id: string;
    expenseId: string;
    driver: {
        name: string,
        _id: string
    };
    description: string;
    amount: number;
    totalDriverDistance:number;
    images: string[];
      petrolPump: IPetrolPump; // Add this

    vehicleNumber?: string;
    expenceKm: number;
  status: 'Pending' | 'Approved' | 'Rejected';
      createdAt: string;
    updatedAt: string;
}

// API Response for get all diesel expense
export interface IAPIResponseAllDieselExpenses {
    data: IDieselExpense[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
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
    status: 'pending' | 'approved' | 'rejected';

  createdAt: string;
}
// In your interface/Expences.ts
export interface ICompanyExpense {
  _id: string;
  expenseId: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  vendor?: string;
  employee?: string;
  image: string; // Changed from images to image (single string)
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  rejectedBy?: string;
}

export interface ICompanyExpenseResponse {
  success: boolean;
  data: ICompanyExpense[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ICreateExpenseData {
  title: string;
  description: string;
  category: string;
  amount: number;
  vendor?: string;
  employee?: string;
  images: File[];
}