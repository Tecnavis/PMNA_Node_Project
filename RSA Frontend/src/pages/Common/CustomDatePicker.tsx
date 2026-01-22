// components/Common/CustomDatePicker.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  Popover,
  Box,
  IconButton,
  Typography,
  Button,
  Grid
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon
} from '@mui/icons-material';

interface CustomDatePickerProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  label = 'Select Date',
  value,
  onChange,
  fullWidth = false,
  size = 'small',
  disabled = false,
  error = false,
  helperText
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(value);
  const inputRef = useRef<HTMLDivElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle manual date input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue) {
      const newDate = new Date(inputValue);
      if (!isNaN(newDate.getTime())) {
        onChange(newDate);
        setCurrentMonth(newDate);
      }
    }
  };

  // Navigate to previous month
  const handlePrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  // Set today's date
  const handleToday = () => {
    const today = new Date();
    onChange(today);
    setCurrentMonth(today);
    handleClose();
  };

  // Select a date
  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth);
    selectedDate.setDate(day);
    onChange(selectedDate);
    handleClose();
  };

  // Get days in month
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Get month name
  const getMonthName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  // Check if a day is today
  const isToday = (day: number | null): boolean => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  // Check if a day is selected
  const isSelected = (day: number | null): boolean => {
    if (!day) return false;
    return (
      day === value.getDate() &&
      currentMonth.getMonth() === value.getMonth() &&
      currentMonth.getFullYear() === value.getFullYear()
    );
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const calendarDays = generateCalendarDays();
  const monthName = getMonthName(currentMonth);
  const year = currentMonth.getFullYear();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box ref={inputRef}>
      <TextField
        label={label}
        value={formatDate(value)}
        onClick={handleOpen}
        fullWidth={fullWidth}
        size={size}
        disabled={disabled}
        error={error}
        helperText={helperText}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <IconButton
              size={size === 'small' ? 'small' : 'medium'}
              onClick={(e) => {
                e.stopPropagation();
                handleOpen(e as any);
              }}
              disabled={disabled}
              sx={{ mr: -1 }}
            >
              <CalendarIcon />
            </IconButton>
          )
        }}
        sx={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      />

      <input
        type="hidden"
        value={formatDateForInput(value)}
        onChange={handleInputChange}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            boxShadow: 3,
            overflow: 'hidden'
          }
        }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          {/* Month/Year Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <IconButton onClick={handlePrevMonth} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
              {monthName} {year}
            </Typography>
            <IconButton onClick={handleNextMonth} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Today Button */}
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<TodayIcon />}
            onClick={handleToday}
            sx={{ mb: 2 }}
          >
            Today
          </Button>

          {/* Day Names */}
          <Grid container spacing={0} sx={{ mb: 1 }}>
            {dayNames.map((day) => (
              <Grid item xs key={day} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar Days */}
          <Grid container spacing={0}>
            {calendarDays.map((day, index) => (
              <Grid item xs key={index} sx={{ textAlign: 'center', mb: 1 }}>
                {day ? (
                  <IconButton
                    size="small"
                    onClick={() => handleDateSelect(day)}
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.875rem',
                      ...(isSelected(day) && {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        }
                      }),
                      ...(isToday(day) && !isSelected(day) && {
                        border: '2px solid',
                        borderColor: 'primary.main',
                      })
                    }}
                  >
                    {day}
                  </IconButton>
                ) : (
                  <Box sx={{ width: 32, height: 32 }} />
                )}
              </Grid>
            ))}
          </Grid>

          {/* Date Input Field */}
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Or enter date manually:
            </Typography>
            <TextField
              type="date"
              fullWidth
              size="small"
              value={formatDateForInput(value)}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              slotProps={{
                input: {
                  sx: { fontSize: '0.875rem' }
                }
              }}
            />
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default CustomDatePicker;