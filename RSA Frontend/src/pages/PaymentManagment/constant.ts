import { dateFormate, formattedTime } from "../../utils/dateUtils";
import { Booking } from "../Bookings/Bookings";
import { AdvanceData, ReceivedDetails } from "./types";

//Columns Titles
export const AdvanceDetailsTableColumn = [
    {
        title: "SI",
        accessor: '_id',
        render: (_: any, index: number) => index + 1
    },
    {
        title: "DRIVER NAME",
        accessor: 'driver.name',
        render: (advanceDetails: AdvanceData) =>
            typeof advanceDetails?.driver === 'object' ?
                advanceDetails?.driver?.name
                : "N/A"
    },
    {
        title: "ADVANCE PAYMENT DATE",
        accessor: 'createdAt',
        render: (advanceDetails: AdvanceData) =>
            `${dateFormate(advanceDetails?.createdAt)} at ${formattedTime(advanceDetails?.createdAt)}`
    },
    {
        title: "INITIAL ADVANCE",
        accessor: 'addedAdvance',
        render: (advanceDetails: AdvanceData) => `₹${advanceDetails?.addedAdvance || 0}`
    },
    {
        title: "ADVANCE AFTER DEDUCTION",
        accessor: "advance",
        render: (advanceDetails: AdvanceData) => `₹${advanceDetails?.advance || 0}`
    },
    { title: "REMARK", accessor: "remark" },
];
//Columns Titles

export const colsForAdvance = [
    {
        title: "DATE AND TIME",
        accessor: 'addedAdvance',
        render: (advanceDetails: AdvanceData) =>
            `${dateFormate(advanceDetails?.createdAt)} , ${formattedTime(advanceDetails?.createdAt)}`
    },
    {
        title: "File NUMBERS",
        accessor: 'filesNumbers',
        render: (advanceDetails: AdvanceData) =>
            advanceDetails?.filesNumbers?.length
                ? advanceDetails.filesNumbers.join(', ')
                : 'N/A'
    },
    {
        title: "Transferred Salary",
        accessor: 'transferdSalary',
        render: (advanceDetails: AdvanceData) =>
            advanceDetails?.transferdSalary?.length
                ? advanceDetails.transferdSalary.map(salary => `₹${salary}`).join(', ')
                : 'N/A'
    },
    {
        title: "Driver Salary",
        accessor: 'driverSalary',
        render: (advanceDetails: AdvanceData) =>
            advanceDetails?.driverSalary?.length
                ?advanceDetails.driverSalary.map(salary => `₹${salary}`).join(', ')
                : 'N/A'
    },
    {
        title: "Balance Salary",
        accessor: 'balanceSalary',
        render: (advanceDetails: AdvanceData) =>
            advanceDetails?.balanceSalary?.length
                ? advanceDetails.balanceSalary.map(salary => `₹${salary}`).join(', ')
                : 'N/A'
    },
    {
        title: "CURRENT ADVANCE",
        accessor: 'advance',
        render: (advanceDetails: AdvanceData) =>
            `₹${advanceDetails?.advance}`
    },
    {
        title: "PAYMENT DATE",
        accessor: 'createdAt',
        render: (advanceDetails: AdvanceData) =>
            `${dateFormate(advanceDetails?.createdAt)}`
    },
];
//Columns Titles

export const ReceivedDetailsTableColumn = [
    {
        title: "SI",
        accessor: '_id',
        render: (_: any, index: number) => index + 1
    },
    {
        title: "DATE AND TIME",
        accessor: 'createdAt',
        render: (receivedDetails: ReceivedDetails) =>
            `${dateFormate(receivedDetails?.createdAt)} at ${formattedTime(receivedDetails?.createdAt)}`
    },
    {
        title: "DRIVER NAME",
        accessor: 'driver.name',
        render: (booking: ReceivedDetails) => (booking.driver?.name || "N/A")
    },
    {
        title: "RECEIVED AMOUNT",
        accessor: 'receivedAmount',
        render: (receivedDetails: ReceivedDetails) => `₹ ${receivedDetails?.receivedAmount || 0}`
    },
    {
        title: "REMARK",
        accessor: 'remark'
    },
];
//Columns Titles

export const CashCollectionDetailsTableColumn = [
    {
        title: "SI",
        accessor: '_id',
        render: (_: any, index: number) => index + 1
    },
    {
        title: "DATE AND TIME",
        accessor: 'createdAt',
        render: (cashCollection: ReceivedDetails) =>
            `${dateFormate(cashCollection?.createdAt as unknown as string)} at ${formattedTime(cashCollection?.createdAt as unknown as string)}`
    },
    {
        title: "DRIVER NAME",
        accessor: 'driver.name',
        render: (booking: ReceivedDetails) => (booking.driver?.name || "N/A")
    },
    {
        title: "FILE NUMBER",
        accessor: 'fileNumber',
        render: (booking: ReceivedDetails) => (booking.fileNumber || "N/A")
    },
    {
        title: "INITIAL TOTAL AMOUNT IN HAND",
        accessor: 'driver.cashInHand',
        render: (cashCollection: ReceivedDetails) => `₹${cashCollection?.currentNetAmount || 0}`
    },
    {
        title: "BOOKING AMOUNT",
        accessor: 'totalAmount',
        render: (cashCollection: ReceivedDetails) => `₹${cashCollection?.amount || 0}`
    },
    {
        title: "COLLECTED AMOUNT",
        accessor: 'receivedAmount',
        render: (cashCollection: ReceivedDetails) => `₹${cashCollection?.receivedAmount || 0}`
    },
    {
        title: "BALANCE",
        accessor: 'balance',
        render: (cashCollection: ReceivedDetails) => cashCollection.balance
    },
];