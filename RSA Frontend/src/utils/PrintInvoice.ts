import { RefObject } from "react";
import { Driver } from "../pages/Bookings/BookingAdd";
import { Booking } from "../pages/Bookings/Bookings";
import { formattedTime } from "./dateUtils";
import logo from '../assets/images/RSALogo.png'

export const handlePrint = (
    printRef: RefObject<HTMLDivElement>,
    selectedYear: string,
    selectedMonth: string,
    role: string,
    userName: string,
    bookings: Booking[],
    totalCollected: string,
    balanceToCollecct: string
) => {

    const printContent = printRef?.current; // Get the content to print
    const printWindow = window.open('', '', 'height=1000,width=1600'); // Create a print window

    if (printWindow && printContent) {
        printWindow.document.write('<html><head><title>Print</title>');

        // Add custom styles for print
        printWindow.document.write(`
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.5;
                    margin: 0;
                    padding: 20px;
                }
                h2, h3 {
                    color: #2c3e50;
                }
                .bg-gradient-to-r {
                    background: linear-gradient(to right, #a8e063, #56ab2f);
                    padding: 15px;
                    border-radius: 8px;
                    color: #fff;
                }
                .table-container {
                    width: 100%;
                    margin-top: 20px;
                    border-collapse: collapse;
                }
                .table-container th, .table-container td {
                    padding: 12px 15px; /* Added padding for better readability */
                    border: 2px solid #000; /* Solid black borders */
                    text-align: left;
                    font-size: 14px; /* Set font size for clarity */
                }
                .table-container th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .table-container tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .table-container td {
                    background-color: #fff;
                }
                .no-print {
                    display: none !important; /* Hide elements with the 'no-print' class */
                }
                .text-green {
                    color: #2ecc71;
                }
                .text-red {
                    color: #e74c3c;
                }
                .action-buttons {
                    display: none; /* Hide action buttons for printing */
                }
                     .print-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .company-details {
                text-align: right;
                max-width: 300px;
                font-size: 14px;
            }
            .company-logo {
                width: 50px;
                height: auto;
            }
                @media print {
                    body {
                        padding: 0;
                        margin: 0;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: repeat(1, 1fr); /* Stack items in a single column */
                        gap: 4px;
                    }
                    .bg-gradient-to-r {
                        padding: 5px; /* Reduce padding */
                        font-size: 30px; /* Smaller font size */
                    }
                    .text-6xl {
                        font-size: 4xl; /* Smaller icon size */
                    }
                    h3 {
                        font-size: 14px; /* Smaller heading size */
                    }
                    p {
                        font-size: 12px; /* Smaller paragraph size */
                    }
                    .flex {
                        display: block; /* Stack flex items vertically */
                    }
                  .company-details {
    position: absolute;
    right: 20px;
    top: 20px;
}

.company-logo {
    display: block !important; /* Ensure the image is not hidden during printing */
    width: 150px; /* Set a fixed width for the logo */
    height: auto;
}
                .print-header {
                    flex-direction: row;
                    align-items: flex-start;
                }
                }
            </style>
        `);

        printWindow.document.write('</head><body>');

        // Get selected month and year
        const monthText = selectedMonth ? selectedMonth : "All"; // Default to "All" if no month is selected
        const yearText = selectedYear ? selectedYear : "All"; // Default to "All" if no year is selected
        // Get the current date
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        // Inject the selected month and year values in the print content
        printWindow.document.write(`
            <p><strong>Month:</strong> ${monthText}</p>
            <p><strong>Year:</strong> ${yearText}</p>
        `);

        // Inject the "Printed By" message based on the role
        const printedBy = role === 'staff' ? `Printed By: ${userName}` : 'Printed By: Admin';
        printWindow.document.write(`
            <p><strong>${printedBy}</strong></p>
        `);
        printWindow.document.write(`
            <p><strong>Printed Date:</strong> ${formattedDate}</p>
        `);
        printWindow.document.write(`
            <div class="print-header">
              
    <div class="company-details">
<h3><strong>Company:</strong> RSA</h3>
<p><strong>Location:</strong> Tirurkad</p>
<img class="company-logo" src=${logo} alt="Company Logo" />
</div>


            </div>
        `);
        printWindow.document.write(`
            <style>
                .card-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 20px;
                    padding: 20px;
                    margin-top: 20px;
                }
                .card {
                    background: linear-gradient(to right, #6a11cb, #2575fc);
                    color: white;
                    border-radius: 10px;
                    padding: 20px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                    transition: transform 0.3s ease-in-out;
                }
                .card:hover {
                    transform: translateY(-5px);
                }
                .title {
                    font-size: 1.2rem;
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                }
                .value {
                    font-size: 1.5rem;
                    font-weight: 500;
                    margin-top: 10px;
                }
                /* Ensure proper styling for printing */
                @media print {
                    .card-container {
                        display: block;
                        margin: 0;
                        padding: 0;
                    }
                    .card {
                        background: #ffffff;
                        color: #333;
                        border: 1px solid #ddd;
                        box-shadow: none;
                        padding: 15px;
                        margin: 10px 0;
                    }
                    .card:hover {
                        transform: none;
                    }
                    .title {
                        color: #333;
                    }
                    .value {
                        font-size: 1.3rem;
                    }
                }
            </style>
             <div class="print-header">
    <h1 class="text-4xl font-extrabold mb-6 text-center text-gray-900 shadow-md p-3 rounded-lg bg-gradient-to-r from-indigo-300 to-red-300">
        Cash Collection Report Of 
    </h1>
</div>
            <div class="card-container">
             
             
                <div class="card">
                    <div class="title">Total Collected Amount:</div>
                    <div class="value">${totalCollected}</div>
                </div>
                <div class="card">
                    <div class="title">Balance Amount To Collect: </div>
                    <div class="value">${balanceToCollecct}</div>
                </div>
               
            </div>
        `);
        // Write the rest of the content into the print window
        printWindow.document.write(`
            <table class="table-container">
                 <thead>
                         <tr>
                             <th>#</th>
                             <th>Date</th>
                             <th>File Number</th>
                            <th>Customer Vehicle Number</th>
                            <th>Payable Amount By Company</th>
                             <th>Received Amount From Company</th>
                            <th>Balance</th>
                             <th>Invoice Number</th>
                         </tr>
                     </thead>
                <tbody>
                    ${bookings?.map((booking: Booking, index: number) => `
                      <tr>
                                 <td>${index + 1}</td>
                                 <td>${formattedTime(booking.createdAt + '')}</td>
                                 <td>${booking.fileNumber}</td>
                                 <td>${booking.customerVehicleNumber}</td>
                                 <td>${booking.totalAmount}</td>
                                 <td>${booking.receivedAmount}</td>
                                 <td>${booking.totalAmount || 0 - booking.receivedAmount || 0}</td>
                                 <td>${booking?.invoiceNumber || 'invoiceNumber'}</td>
                             </tr>
                         `).join('')}
                </tbody>
            </table>
        `);


        // Add CSS for print
        printWindow.document.write(`
            <style>
                .print-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: auto;
                    padding: 10px;
                    box-sizing: border-box;
                }
                .table-wrapper {
                    width: 100%;
                    max-width: 1000px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                    background-color: #fff;
                    padding: 10px;
                }
                @media print {
                    .print-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: auto;
                        margin: 0;
                    }
                    .table-wrapper {
                        width: 100%;
                        max-width: auto;
                    }
                }
            </style>
        `);

        printWindow.document.write('</body></html>');
        printWindow.document.close(); // Close the document to trigger printing
        printWindow.print(); // Trigger the print dialog
    } else {
        console.error('Print window or content is null');
    }
};