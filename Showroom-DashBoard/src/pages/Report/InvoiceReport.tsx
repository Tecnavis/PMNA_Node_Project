import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
import IconSend from '../../components/Icon/IconSend';
import IconPrinter from '../../components/Icon/IconPrinter';
import IconDownload from '../../components/Icon/IconDownload';
import IconPlus from '../../components/Icon/IconPlus';

const InvoiceReport: React.FC = () => {
  const location = useLocation();
  const { bookings } = location.state || { bookings: [] };
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Generate Invoice Number
  const generateInvoiceNumber = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
    const day = ('0' + currentDate.getDate()).slice(-2);
    const hours = ('0' + currentDate.getHours()).slice(-2);
    const minutes = ('0' + currentDate.getMinutes()).slice(-2);
    const seconds = ('0' + currentDate.getSeconds()).slice(-2);

    return `INV-${year}${month}${day}-${hours}${minutes}${seconds}`;
  };

  // Handle Print
  const handlePrint = () => {
    const printContent = invoiceRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  // Handle Download as PDF


  // Calculate total amount
  const totalAmount = bookings.reduce((sum:any, booking:any) => sum + parseFloat(booking.amount), 0);
  
  // Define columns
  const columns = [
    { key: 'id', label: 'S.NO' },
    { key: 'dateTime', label: 'Date and Time' },
    { key: 'fileNumber', label: 'File Number', class: 'text-center' },
    { key: 'totalDriverSalary', label: 'Salary', class: 'text-center' },
    { key: 'transferedSalary', label: 'Amount Transferred', class: 'text-center' },
    { key: 'balanceSalary', label: 'Balance', class: 'text-center' },
  ];

  return (
    <div>
      {/* <div className="flex items-center lg:justify-end justify-center flex-wrap gap-4 mb-6">
        <button type="button" className="btn btn-info gap-2">
          <IconSend />
          Send Invoice
        </button>

        <button type="button" className="btn btn-primary gap-2" onClick={handlePrint}>
          <IconPrinter />
          Print
        </button>

        <button type="button" className="btn btn-success gap-2" onClick={handleDownload}>
          <IconDownload />
          Download
        </button>

        <Link to="/apps/invoice/add" className="btn btn-secondary gap-2">
          <IconPlus />
          Create
        </Link>
      </div> */}

    </div>
  );
};

export default InvoiceReport;
