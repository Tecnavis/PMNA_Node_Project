import React from 'react';
import {
  ArchiveBoxIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface TaskStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

interface TaskStatsCardProps {
  stats: TaskStats;
}

const TaskStatsCard: React.FC<TaskStatsCardProps> = ({ stats }) => {
  const statsItems = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: ArchiveBoxIcon,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600'
    },
    {
      title: 'Pending',
      value: stats.pendingTasks,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      icon: UserGroupIcon,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Overdue',
      value: stats.overdueTasks,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {statsItems.map((item, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{item.title}</p>
              <p className={`text-2xl font-bold ${item.textColor} mt-1`}>
                {item.value}
              </p>
            </div>
            <div className={`p-3 rounded-full ${item.color} bg-opacity-10`}>
              <item.icon className={`h-8 w-8 ${item.textColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskStatsCard;