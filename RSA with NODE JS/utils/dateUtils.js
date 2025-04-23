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