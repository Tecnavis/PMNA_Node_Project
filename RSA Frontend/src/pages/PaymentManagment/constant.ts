import { dateFormate, formattedTime } from "../../utils/dateUtils";
import { Booking } from "../Bookings/Bookings";
import { AdvanceData, ReceivedDetails } from "./AdvancePayment";

//Columns Titles
export const AdvanceDetailsTableColumn = [
    { title: "SI", accessor: '_id', render: (_: any, index: number) => index + 1 },
    { title: "DRIVER NAME", accessor: 'driver.name' },
    {
        title: "ADVANCE PAYMENT DATE",
        accessor: 'createdAt',
        render: (advanceDetails: AdvanceData) =>
            `${dateFormate(advanceDetails.createdAt)} at ${formattedTime(advanceDetails.createdAt)}`
    },
    {
        title: "INITIAL ADVANCE",
        accessor: 'addedAdvance',
        render: (advanceDetails: AdvanceData) => `₹${advanceDetails.addedAdvance}`
    },
    {
        title: "ADVANCE AFTER DEDUCTION",
        accessor: "advance",
        render: (advanceDetails: AdvanceData) => `₹${advanceDetails.advance}`
    },
    { title: "REMARK", accessor: "remark" },
];
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
            `${dateFormate(receivedDetails.createdAt)} at ${formattedTime(receivedDetails.createdAt)}`
    },
    { title: "DRIVER NAME", accessor: 'driver.name' },
    { 
        title: "RECEIVED AMOUNT", 
        accessor: 'receivedAmount',
        render: (receivedDetails: ReceivedDetails) => `₹ ${receivedDetails.receivedAmount}`
    },
    { title: "REMARK", accessor: 'remark' },
];
export const CashCollectionDetailsTableColumn = [
    {
        title: "SI",
        accessor: '_id',
        render: (_: any, index: number) => index + 1
    },
    {
        title: "DATE AND TIME",
        accessor: 'createdAt',
        render: (cashCollection: Booking) =>
            `${dateFormate(cashCollection.createdAt as unknown as string)} at ${formattedTime(cashCollection.createdAt as unknown as string)}`
    },
    { title: "DRIVER NAME", accessor: 'driver.name' },
    { title: "FILE NUMBER", accessor: 'fileNumber' },
    {
        title: "INITIAL TOTAL AMOUNT IN HAND",
        accessor: 'driver.cashInHand',
        render: (cashCollection: Booking) => `₹${cashCollection?.driver?.cashInHand || 0}`
    },
    {
        title: "BOOKING AMOUNT",
        accessor: 'totalAmount',
        render: (cashCollection: Booking) => `₹${cashCollection.totalAmount || 0}`
    },
    {
        title: "COLLECTED AMOUNT",
        accessor: 'receivedAmount',
        render: (cashCollection: Booking) => `₹${cashCollection.receivedAmount || 0}`
    },
    {
        title: "BALANCE",
        accessor: 'balance',
        render: (cashCollection: Booking) => {
            const balanceAmount = ((cashCollection.totalAmount || 0) - (cashCollection.receivedAmount || 0))
            return `₹${balanceAmount}`;
        }
    },
];