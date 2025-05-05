import React, { useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import IconSend from '../../../components/Icon/IconSend';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPlus from '../../../components/Icon/IconPlus';
import { Booking } from '../../Bookings/Bookings';
import Logo from '../../../assets/images/RSALogo.png'
import { dateFormate, formattedTime } from '../../../utils/dateUtils';

const ShowroomInvoice = () => {
    const location = useLocation();
    const booking = location.state?.bookings || [];
    const totalPayableAmountShowroom = location.state?.totalPayableAmount || 0;
    const role = location.state?.role || "Driver";
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams()

    if (!booking || booking.length === 0) {
        return <div>No bookings selected for invoice generation.</div>;
    }

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

    const handleDownload = async () => {
        const invoiceContent = document.getElementById('invoice-content');
        if (invoiceContent) {
            const canvas = await html2canvas(invoiceContent);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`invoice-${generateInvoiceNumber()}.pdf`);
        }
    };

    // Calculate total payable amount
    const totalPayableAmount = booking
        .filter((b: any) => b.workType !== 'RSAWork' && (!b.cashPending || b.partialPayment))
        .reduce((total: number, b: any) => total + (Number(b.totalAmount) || 0), 0);

    // Calculate total balance amount
    const totalBalanceAmount = booking
        .filter((b: any) => b.workType !== 'RSAWork' && (!b.cashPending || b.partialPayment))
        .reduce((total: any, booking: any) => total + Number(booking.totalAmount - (booking.partialPayment ? booking.partialAmount : booking.receivedAmount)), 0);

    const columnsForShowroom = [
        { key: 'id', label: 'SL.NO' },
        { key: 'serviceType', label: 'Service Type' },
        { key: 'Vehicle Number', label: 'Vehicle Number' },
        { key: 'amountOfBooking', label: 'Payable Amount', class: 'text-center' },
        { key: 'receivedAmount', label: 'Amount Received', class: 'text-center' },
        { key: 'balanceSalary', label: 'Balance', class: 'text-center' },
    ];

    const columns = columnsForShowroom;
    return (
        <div>
            <div className="flex items-center lg:justify-end justify-center flex-wrap gap-4 mb-6">
                <button type="button" className="btn btn-primary gap-2" onClick={handlePrint}>
                    <IconPrinter />
                    Print
                </button>

                <button type="button" className="btn btn-success gap-2" onClick={handleDownload}>
                    <IconDownload />
                    Download
                </button>
            </div>
            <div className="panel" ref={invoiceRef} id='invoice-content'>
                <div className="flex justify-between flex-wrap gap-4 px-4">
                    <div className="text-2xl font-semibold uppercase">Invoice</div>
                    <div className="shrink-0">
                        <img
                            src={Logo}
                            alt="img"
                            className="w-24 ltr:ml-auto rtl:mr-auto"
                        />
                    </div>
                </div>
                <div className="ltr:text-right rtl:text-left px-4">
                    <div className="space-y-1 mt-6">
                        <div>perinthalmanna Road, kerala, 33884, India</div>
                        <div>rsa@gmail.com</div>
                        <div>+91 9817100100</div>
                    </div>
                </div>
                <hr className="border-white-light dark:border-[#1b2e4b] my-6" />
                <div className="flex justify-between lg:flex-row flex-col gap-6 flex-wrap" >
                    <div className="flex-1">
                        <div className="space-y-1 text-white-dark">
                            <div>Issue For : <span className='text-black'> {booking[0]?.driver?.name || booking[0]?.provider?.name || ""}</span></div>
                        </div>
                    </div>
                    <div className="flex justify-between sm:flex-row flex-col gap-6 lg:w-2/3">
                        <div className="xl:1/3 lg:w-2/5 sm:w-1/2">
                            <div className="flex items-center w-full gap-2 mb-2">
                                <div className="text-white-dark">Invoice :</div>
                                <div>{generateInvoiceNumber()}</div>
                            </div>
                            <div className="flex items-center w-full gap-2 mb-2">
                                <div className="text-white-dark">Issue Date :</div>
                                <div>{new Date().toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center w-full gap-2 mb-2">
                                <div className="text-white-dark">Order ID :</div>
                                <div>{booking[0]?.fileNumber}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="table-responsive mt-6">
                    <table className="table-striped w-full">
                        <thead>
                            <tr>
                                {(columnsForShowroom).map((column) => (
                                    <th key={column.key} className={column.class || ''}>
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {booking?.map((booking: any, index: number) => (
                                <tr key={booking?._id}>
                                    {columns.map((column) => (
                                        <td key={column.key} className={column.class || ''}>
                                            {column.key === 'id' && index + 1}
                                            {column.key === 'dateAndTime' &&
                                                role === 'driver' &&
                                                `${dateFormate(booking.createdAt)} at ${formattedTime(booking.createdAt)}`}
                                            {column.key === 'serviceType' && (booking.serviceType.serviceName || "N/A")}
                                            {column.key === 'Vehicle Number' && (booking.customerVehicleNumber || "N/A")}
                                            {column.key === 'fileNumber' && (booking?.fileNumber || "N/A")}
                                            {column.key === 'amountOfBooking' && (booking?.totalAmount || 0)}
                                            {column.key === 'payableAmount' && role === 'driver' && (booking.workType === 'RSAWork' ? 'Company Work' : booking?.totalAmount || 0)}
                                            {column.key === 'receivedAmount' &&
                                                (booking.workType === 'RSAWork' ? 0 : (booking.partialPayment ? booking.partialAmount : booking?.receivedAmount || 0))
                                            }
                                            {column.key === 'balanceSalary' &&
                                                (booking.workType === 'RSAWork' ? 0 : (booking?.totalAmount || 0) - (booking.partialPayment ? booking.partialAmount : booking?.receivedAmount || 0))
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 px-4">
                    <div className="flex justify-end font-semibold text-lg text-gray-800">
                        Total Payable Amount: <span className="ml-2 text-blue-600">{totalPayableAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-end font-semibold text-lg text-gray-800">
                        Balance Amount: <span className="ml-2 text-blue-600">{totalBalanceAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShowroomInvoice;