// Convert ISOString date to MM-DD-YYYY fomate
export const dateFormate = (isoString: string) => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        return 'N/A';
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Convert ISOString date to YYYY-MM-DD fomate
export const formatToInputDate = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toISOString().split("T")[0];
};

// Conver ISOString date to time formate(hour-minute-second-housr-12)
export const formattedTime = (isoString: string) => {
    const date = new Date(isoString);

    if (isNaN(date.getTime())) {
        return 'N/A';
    }

    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
};
//Helper Function for Date Comparison
export const isSameDay = (date1: Date, date2: Date): boolean => {
    const result = date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();

    console.log("isSameDay:", result);
    return result;
};
