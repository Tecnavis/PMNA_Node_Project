export interface Staff {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
}

export interface TaskComment {
  _id: string;
  text: string;
  commentedBy: Staff;
  createdAt: string;
}

export interface TaskAttachment {
  url: string;
  filename: string;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  staff: Staff;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  dueDate?: string;
  completedAt?: string;
  assignedBy: Staff;
  category: 'billing' | 'tracking' | 'verification' | 'administration' | 'other';
  estimatedHours?: number;
  attachments: TaskAttachment[];
  comments: TaskComment[];
  notes?: string;
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface TaskFilters {
  staff?: string;
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}