import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import IconSend from '../../../components/Icon/IconSend';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPlus from '../../../components/Icon/IconPlus';
import { Booking } from '../../Bookings/Bookings';

const SelectiveShowroomInvoice = () => {
    const location = useLocation();
    const booking = location.state?.bookings || [];
    const invoiceRef = useRef<HTMLDivElement>(null);
    console.log(booking[0])
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
    const totalPayableAmount = booking.reduce((total: any, booking: any) => total + (Number(booking.totalAmount) + Number(booking.receivedAmount)), 0);


    const columns = [
        { key: 'id', label: 'S.NO' },
        { key: 'serviceType', label: 'Service Type' },
        { key: 'vehicleNumber', label: 'Vehicle Number', class: 'text-center' },
        { key: 'payableAmount', label: 'Payable Amount', class: 'text-center' },
        { key: 'receivedAmount', label: 'Amount Received', class: 'text-center' },
        { key: 'balanceSalary', label: 'Balance', class: 'text-center' },
    ];


    return (
        <div>
            <div className="flex items-center lg:justify-end justify-center flex-wrap gap-4 mb-6">
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
            </div>
            <div className="panel" ref={invoiceRef} id='invoice-content'>
                <div className="flex justify-between flex-wrap gap-4 px-4">
                    <div className="text-2xl font-semibold uppercase">Invoice</div>
                    <div className="shrink-0">
                        <img
                            src="/assets/images/auth/rsa-png.png"
                            alt="img"
                            className="w-24 ltr:ml-auto rtl:mr-auto"
                        />
                    </div>
                </div>
                <div className="ltr:text-right rtl:text-left px-4">
                    <div className="space-y-1 mt-6 text-white-dark">
                        <div>perinthalmanna Road, kerala, 33884, India</div>
                        <div>rsa@gmail.com</div>
                        <div>+91 9817100100</div>
                    </div>
                </div>
                <hr className="border-white-light dark:border-[#1b2e4b] my-6" />
                <div className="flex justify-between lg:flex-row flex-col gap-6 flex-wrap" >
                    <div className="flex-1">
                        <div className="space-y-1 text-white-dark">
                            <div>Issue For:</div>
                            <div className="text-black dark:text-white font-semibold">{booking[0]?.showroomLocation || ""}</div>
                        </div>
                    </div>
                    <div className="flex justify-between sm:flex-row flex-col gap-6 lg:w-2/3">
                        <div className="xl:1/3 lg:w-2/5 sm:w-1/2">
                            <div className="flex items-center w-full justify-between mb-2">
                                <div className="text-white-dark">Invoice :</div>
                                <div>{generateInvoiceNumber()}</div>
                            </div>
                            <div className="flex items-center w-full justify-between mb-2">
                                <div className="text-white-dark">Issue Date :</div>
                                <div>{new Date().toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center w-full justify-between mb-2">
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
                                {columns.map((column) => (
                                    <th key={column.key} className={column.class}>
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {booking?.map((booking: any, index: any) => (
                                <tr key={booking?.id}>
                                    <td>{index + 1}</td>
                                    <td>{booking?.serviceType.serviceName }</td>
                                    <td className="text-center">{booking?.customerVehicleNumber}</td>
                                    <td className="text-center">{booking.totalAmount}</td>
                                    <td className="text-center">{booking?.receivedAmount}</td>
                                    <td className="text-center">{booking.totalAmount -  booking?.receivedAmount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 px-4">
                    <div className="flex justify-end font-semibold text-lg text-gray-800">
                        Total Payable Amount: <span className="ml-2 text-blue-600">{totalPayableAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectiveShowroomInvoice;