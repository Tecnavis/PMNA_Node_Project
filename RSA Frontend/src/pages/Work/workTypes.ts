// workTypes.ts
export interface Task {
  taskName: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedTime?: string;
  category?: 'routine' | 'special' | 'emergency';
}

export interface DailyTask {
  taskName: string;
  status: 'pending' | 'in-progress' | 'completed';
  remarks?: string;
  completedAt?: string;
  assignedAt?: string;
}

export interface Role {
  _id: string;
  name: string;
}

export interface Staff {
  _id: string;
  name: string;
  role?: Role;
  phone: string;
  email: string;
  image?: string;
  userName?: string;
}

export interface StaffDailyWork {
  _id: string;
  staff: Staff;
  date: string;
  works: DailyTask[];
  overallStatus: 'pending' | 'partially-completed' | 'completed';
  completedPercentage: number;
  updatedAt: string;
  createdAt: string;
}

export interface WorkData {
  date: string;
  staffsWithWork: StaffDailyWork[];
  staffsWithoutWork: Array<{
    staff: Staff;
    message: string;
  }>;
}

export interface StaffWorkTemplate {
  _id?: string;
  staff: Staff;
  dailyTasks: Task[];
  isActive: boolean;
  lastUpdated: string;
}

export interface StaffTaskTemplate {
  staff: Staff;
  dailyTasks: Task[];
  _id?: string;
}