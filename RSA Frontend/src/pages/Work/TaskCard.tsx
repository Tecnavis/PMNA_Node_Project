// components/DailyWork/TaskCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
  ChipProps,
  LinearProgressProps
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  AccessTime as AccessTimeIcon,
  PlayCircle as PlayCircleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Define TypeScript interfaces
interface Task {
  _id?: string;
  taskName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  count?: number;
  remarks?: string;
  priority?: number;
  time?: string;
  estimatedTime?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  requiresCount?: boolean;
  requiresTimeTracking?: boolean;
}

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: () => void;
}

// Type for StatusChip props
interface StatusChipProps extends ChipProps {
  status: Task['status'];
}

const StatusChip = styled(Chip)<StatusChipProps>(({ theme, status }) => ({
  ...(status === 'completed' && {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
  }),
  ...(status === 'in-progress' && {
    backgroundColor: theme.palette.info.light,
    color: theme.palette.info.contrastText,
  }),
  ...(status === 'pending' && {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
  }),
  ...(status === 'delayed' && {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
  }),
}));

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick }) => {
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'in-progress':
        return <PlayCircleIcon sx={{ color: 'info.main' }} />;
      case 'delayed':
        return <PendingIcon sx={{ color: 'error.main' }} />;
      default:
        return <PendingIcon sx={{ color: 'warning.main' }} />;
    }
  };

  const getPriorityColor = (priority: number): 'error' | 'warning' | 'success' => {
    if (priority <= 3) return 'error';
    if (priority <= 6) return 'warning';
    return 'success';
  };

  // Format time if it exists
  const getFormattedTime = (): string | undefined => {
    if (task.time) return task.time;
    if (task.estimatedTime) return task.estimatedTime;
    return undefined;
  };

  // Format date for display
  const formatTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formattedTime = getFormattedTime();
  const priorityColor = task.priority ? getPriorityColor(task.priority) : 'success';

  return (
    <Card 
      sx={{ 
        height: '100%',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Chip 
            label={`#${index + 1}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusChip
              label={task.status.replace('-', ' ')}
              status={task.status}
              size="small"
              icon={getStatusIcon(task.status)}
            />
          </Box>
        </Box>

        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            fontWeight: 'medium',
            minHeight: '64px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {task.taskName}
        </Typography>

        {/* Priority Indicator */}
        {task.priority && (
          <Tooltip title={`Priority: ${task.priority}`}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon 
                fontSize="small" 
                sx={{ 
                  mr: 0.5, 
                  color: `${priorityColor}.main` 
                }} 
              />
              <LinearProgress 
                variant="determinate" 
                value={Math.min(task.priority * 10, 100)}
                sx={{ 
                  flexGrow: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: `${priorityColor}.light`,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: `${priorityColor}.main`
                  }
                }}
              />
            </Box>
          </Tooltip>
        )}

        {/* Task Details */}
        <Box sx={{ mt: 2 }}>
          {formattedTime && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="textSecondary">
                {formattedTime}
              </Typography>
            </Box>
          )}

          {(task.count !== null && task.count !== undefined) && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                Count: {task.count}
              </Typography>
            </Box>
          )}

          {task.startTime && (
            <Typography variant="caption" color="textSecondary" display="block">
              Started: {formatTime(task.startTime)}
            </Typography>
          )}

          {task.endTime && (
            <Typography variant="caption" color="textSecondary" display="block">
              Completed: {formatTime(task.endTime)}
            </Typography>
          )}
        </Box>

        {/* Remarks */}
        {task.remarks && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              <strong>Remarks:</strong> {task.remarks}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;