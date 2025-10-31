import React from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Calendar from 'react-calendar';
import './customCalendar.css'; // Custom styles

interface Leave {
    date: string; // Format: "YYYY-MM-DD"
    driverName: string;
}
interface CalendarModalProps {
    open: boolean;
    onClose: () => void;

    // Filters
    selectedYear: string;
    setSelectedYear: (year: string) => void;
    selectedMonth: string;
    setSelectedMonth: (month: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;

    // Calendar Props
    tileClassName: (props: any) => string | null;
    tileContent: (props: any) => JSX.Element | null;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ open, onClose, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, searchTerm, setSearchTerm, tileClassName, tileContent }) => {
    // Generate a range of years (current year - next 10 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

    // Compute the active start date for the calendar
    // If a year is selected, use that year and selectedMonth (or January if none selected)
    const activeDate = selectedYear !== '' ? new Date(Number(selectedYear), selectedMonth !== '' ? Number(selectedMonth) - 1 : 0, 1) : new Date();

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle className="flex justify-between items-center">
                <span className="text-xl font-bold">Leaves Calendar</span>
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent className="p-4 flex flex-col items-center justify-center">
                {/* Filter Section */}
                <div className="flex flex-wrap gap-4 mb-4">
                    {/* Year Filter */}
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border px-3 py-2 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Year</option>
                        {years.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>

                    {/* Month Filter */}
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border px-3 py-2 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Month</option>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                            <option key={index} value={(index + 1).toString().padStart(2, '0')}>
                                {month}
                            </option>
                        ))}
                    </select>

                </div>

                {/* Centered Calendar */}
                <div className="flex justify-center items-center w-full">
                    <Calendar activeStartDate={activeDate} tileClassName={tileClassName} tileContent={tileContent} />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CalendarModal;
