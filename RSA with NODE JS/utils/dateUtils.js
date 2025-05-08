//Helper Function for Date Comparison
exports.isSameDay = (date1, date2) => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};
// – Get Start & End Date for Any Month in Year
exports.getMonthDateRange = (month, year) => {
    if (!month || !year) {
        const todayDate = new Date();
        month = todayDate.getMonth() + 1;
        year = todayDate.getFullYear()
    }
    const startDate = new Date(year, month - 1, 1);

    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return { startDate, endDate };
}

exports.capitalizeFirstLetter = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

exports.convertTo12HourFormat = (dateInput) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    let hours = date.getUTCHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours || 12; // 0 becomes 12

    // Get ISO string if input was string, otherwise convert Date to ISO
    const isoString = typeof dateInput === 'string' ? dateInput : date.toISOString();
    
    // Construct new ISO string with 12-hour time
    const [datePart] = isoString.split('T');
    return `${datePart}T${hours.toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')}.000Z`;
};