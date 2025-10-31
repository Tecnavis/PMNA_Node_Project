// Convert ISOString date to MM-DD-YYYY fomate
export const dateFormate = (isoString: string) => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        return 'N/A';
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
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