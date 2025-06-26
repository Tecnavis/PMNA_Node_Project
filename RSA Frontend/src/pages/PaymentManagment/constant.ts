import { DataTableColumn } from "mantine-datatable";
import { dateFormate, formattedTime } from "../../utils/dateUtils";
import { Booking } from "../Bookings/Bookings";
import { AdvanceData, CashCollectionDetails, ReceivedDetails, ReceivedDetailsStaff } from "./types";
const roundToNearestMinute = (date: Date) => {
  const roundedDate = new Date(date);
  roundedDate.setSeconds(0);
  roundedDate.setMilliseconds(0);
  return roundedDate;
};

// Modified color generation function to group similar times
const getColorForDateTime = (dateTime: Date) => {
  // Round to nearest minute to group similar times
  const roundedDate = roundToNearestMinute(new Date(dateTime));
  const dateStr = dateFormate(roundedDate.toISOString());
  const timeStr = formattedTime(roundedDate.toISOString());
  const roundedDateTimeStr = `${dateStr} at ${timeStr}`;
  
  // Generate consistent hash for rounded datetime
  let hash = 0;
  for (let i = 0; i < roundedDateTimeStr.length; i++) {
    hash = roundedDateTimeStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate a pastel color based on the rounded datetime
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 85%)`;
};
//Columns Titles
// --------------------------------------
export const AdvanceDetailsTableColumn: DataTableColumn<AdvanceData>[] = [
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
                : 'N/A'
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

export const colsForAdvance: DataTableColumn<AdvanceData>[] = [
   
  {
    title: "DATE AND TIME",
    accessor: 'createdAt',
    render: (advanceDetails: AdvanceData) => {
      const dateStr = dateFormate(advanceDetails?.createdAt as unknown as string);
      const timeStr = formattedTime(advanceDetails?.createdAt as unknown as string);
      return `${dateStr} at ${timeStr}`;
    },
    cellsStyle: (advanceDetails: AdvanceData) => {
      return {
        backgroundColor: getColorForDateTime(new Date(advanceDetails.createdAt))
      };
    }
  },
    {
        title: "DRIVER NAME",
        accessor: 'driver.name',
        render: (advanceDetails: AdvanceData) =>
            typeof advanceDetails?.driver === 'object' ?
                advanceDetails?.driver?.name
                : 'N/A'
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
        title: "Total Salary",
        accessor: 'transferdSalary',
        render: (advanceDetails: AdvanceData) => advanceDetails.transferdSalary.reduce((total, salary) => total + salary, 0)
    },
    {
        title: "Driver Salary",
        accessor: 'driverSalary',
        render: (advanceDetails: AdvanceData) =>
            advanceDetails?.driverSalary?.length
                ? advanceDetails.driverSalary.map(salary => `₹${salary}`).join(', ')
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

export const ReceivedDetailsTableColumn: DataTableColumn<ReceivedDetails>[] = [
    {
        title: "SI",
        accessor: '_id',
        render: (_: any, index: number) => index + 1
    },
 
  {
    title: "DATE AND TIME",
    accessor: 'createdAt',
    render: (receivedDetails: ReceivedDetails) => {
      const dateStr = dateFormate(receivedDetails?.createdAt as unknown as string);
      const timeStr = formattedTime(receivedDetails?.createdAt as unknown as string);
      return `${dateStr} at ${timeStr}`;
    },
    cellsStyle: (receivedDetails: ReceivedDetails) => {
      return {
        backgroundColor: getColorForDateTime(new Date(receivedDetails.createdAt))
      };
    }
  },
    {
        title: "DRIVER NAME",
        accessor: 'driver.name',
        render: (booking: ReceivedDetails) => (booking.driver?.name || "N/A")
    },
       {
        title: "FILE NUMBER",
        accessor: 'fileNumber',
        render: (receivedDetails: ReceivedDetails) => (receivedDetails?.fileNumber || "N/A")
    },
       {
        title: "AMOUNT FROM DRIVER",
        accessor: 'totalAmount',
        render: (receivedDetails: ReceivedDetails) => `₹ ${receivedDetails?.totalAmount || 0}`
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

export const CashCollectionDetailsTableColumn: DataTableColumn<CashCollectionDetails>[] = [
    {
        title: "SI",
        accessor: '_id',
        render: (_: any, index: number) => index + 1
    },
 {
    title: "DATE AND TIME",
    accessor: 'createdAt',
    render: (cashCollectionDetails: CashCollectionDetails) => {
      const dateStr = dateFormate(cashCollectionDetails?.createdAt as unknown as string);
      const timeStr = formattedTime(cashCollectionDetails?.createdAt as unknown as string);
      return `${dateStr} at ${timeStr}`;
    },
    cellsStyle: (cashCollectionDetails: CashCollectionDetails) => {
      return {
        backgroundColor: getColorForDateTime(new Date(cashCollectionDetails.createdAt))
      };
    }
  },
    {
        title: "DRIVER NAME",
        accessor: 'driver.name',
        render: (booking: CashCollectionDetails) => (booking.driver?.name || "N/A")
    },
     {
        title: "CURRENT CASH IN HAND",
        accessor: 'currentCashInHand',
        render: (booking: CashCollectionDetails) => `₹ ${booking?.currentCashInHand || 0}`
    },
       {
        title: "AMOUNT FROM DRIVER",
        accessor: 'totalDriverAmount',
        render: (booking: CashCollectionDetails) => `₹ ${booking?.totalDriverAmount || 0}`
    },
//    {
//     title: "FILE NUMBERS",
//     accessor: 'fileNumbers',
//     render: (cashCollection: CashCollectionDetails) => (
//         cashCollection.fileNumbers?.join(', ') || 'N/A'
//     )
// },
    {
        title: "BALANCE",
        accessor: 'balance',
        render: (cashCollection: CashCollectionDetails) => cashCollection.balance
    },
];
export const ReceivedDetailsStaffTableColumn: DataTableColumn<ReceivedDetailsStaff>[] = [
    {
        title: "SI",
        accessor: '_id',
        render: (_: any, index: number) => index + 1
    },
    {
        title: "DATE AND TIME",
        accessor: 'createdAt',
        render: (details: ReceivedDetailsStaff) => {
            const dateStr = dateFormate(details.createdAt.toString());
            const timeStr = formattedTime(details.createdAt.toString());
            return `${dateStr} at ${timeStr}`;
        },
        cellsStyle: (details: ReceivedDetailsStaff) => ({
            backgroundColor: getColorForDateTime(new Date(details.createdAt))
        })
    },
    {
        title: "STAFF NAME",
        accessor: 'staff.name',
        render: (details: ReceivedDetailsStaff) => 
            typeof details.staff === 'object' ? details.staff.name : details.staff
    },
    {
        title: "CURRENT CASH",
        accessor: 'currentCashInHand',
        render: (details: ReceivedDetailsStaff) => `₹${details.currentCashInHand}`
    },
    {
        title: "TOTAL AMOUNT",
        accessor: 'totalStaffAmount',
        render: (details: ReceivedDetailsStaff) => `₹${details.totalStaffAmount}`
    },
    {
        title: "AMOUNT GIVEN",
        accessor: 'givenAmountToStaff',
        render: (details: ReceivedDetailsStaff) => `₹${details.givenAmountToStaff}`
    },
    {
        title: "BALANCE",
        accessor: 'balance',
        render: (details: ReceivedDetailsStaff) => `₹${details.balance}`
    },
    {
        title: "PROCESSED BY",
        accessor: 'processedBy.name',
        render: (details: ReceivedDetailsStaff) => 
            details.processedBy?.name || 'System'
    },
    {
        title: "REMARK",
        accessor: 'remark',
        render: (details: ReceivedDetailsStaff) => details.remark || '-'
    }
];