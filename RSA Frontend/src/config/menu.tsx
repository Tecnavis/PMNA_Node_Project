import React from 'react';
import { VscChecklist, VscFeedback } from 'react-icons/vsc';
import { TbCurrencyDollar, TbReport } from 'react-icons/tb';
import { MdLocalGasStation, MdShareLocation } from 'react-icons/md';
import { PiBuildingApartmentBold, PiBuildingApartmentLight } from 'react-icons/pi';
import { BsCashStack } from 'react-icons/bs';
import { ImUserTie } from 'react-icons/im';
import { CalendarClock, Images, RadioTower, BellRing, ListChecks, ShieldCheck } from 'lucide-react';
import IconMenuDashboard from '../components/Icon/Menu/IconMenuDashboard';
import IconMenuCalendar from '../components/Icon/Menu/IconMenuCalendar';
import IconMenuUsers from '../components/Icon/Menu/IconMenuUsers';
import IconMenuDocumentation from '../components/Icon/Menu/IconMenuDocumentation';
import IconServer from '../components/Icon/IconServer';
import IconBook from '../components/Icon/IconBook';
import IconAt from '../components/Icon/IconAt';
import IconAward from '../components/Icon/IconAward';
import IconDollarSignCircle from '../components/Icon/IconDollarSignCircle';
import { ROLES } from '../constants/roles';

/**
 * The admin website menu, in one place. The sidebar is drawn from this list, and the
 * Staff permissions screen uses the same list, so a page that is switched off disappears from both.
 *
 * `def(role)` is the built-in rule per role name — exactly the rules the sidebar used before.
 * It applies whenever an admin has not set the page for that role / staff member.
 */
type Rule = (role: string) => boolean;
const all: Rule = () => true;
const only = (...roles: string[]): Rule => (role) => roles.includes(role);
const except = (...roles: string[]): Rule => (role) => !roles.includes(role);

export type MenuLink = { path: string; label: string; def: Rule };
export type MenuEntry =
    | { kind: 'link'; path: string; label: string; icon: React.ReactNode; def: Rule; adminOnly?: boolean }
    | { kind: 'group'; id: string; label: string; icon: React.ReactNode; def: Rule; children: MenuLink[]; adminOnly?: boolean };

const ic = 'group-hover:!text-primary shrink-0';

export const MENU: MenuEntry[] = [
    { kind: 'link', path: '/', label: 'Dashboard', icon: <IconMenuDashboard className={ic} />, def: all },
    {
        kind: 'group', id: 'bookings', label: 'Bookings', icon: <IconBook className={ic} />, def: all,
        children: [
            { path: '/bookings', label: 'Bookings', def: all },
            { path: '/add-booking', label: 'Add Bookings', def: all },
            { path: '/completedbookings', label: 'Driver Completed Bookings', def: except(ROLES.CASHIER) },
            { path: '/approvedbookings', label: 'Service Details', def: only(ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.VERIFIER, ROLES.accountant, ROLES.Manager) },
        ],
    },
    {
        kind: 'group', id: 'users', label: 'users', icon: <IconMenuUsers className={ic} />, def: only(ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager),
        children: [
            { path: '/users/staff', label: 'Staff Creation', def: except(ROLES.SECONDARY_ADMIN) },
            { path: '/users/provider', label: 'Provider Creation', def: all },
            { path: '/users/driver', label: 'Driver Creation', def: all },
            { path: '/users/company', label: 'Company Creation', def: all },
        ],
    },
    {
        kind: 'group', id: 'marketing executive', label: 'Marketing Executives', icon: <ImUserTie className={ic} />, def: only(ROLES.VERIFIER, ROLES.ADMIN),
        children: [
            { path: '/marketing-executives', label: 'Executives', def: except(ROLES.VERIFIER) },
            { path: '/marketing-executives/showroom', label: 'Executive Showroom', def: all },
        ],
    },
    {
        kind: 'group', id: 'service', label: 'Service Types', icon: <IconServer className={ic} />, def: only(ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager),
        children: [{ path: '/service_type', label: 'Service Types', def: all }],
    },
    {
        kind: 'group', id: 'vehicle-details', label: 'Vehicle Details', icon: <IconMenuDocumentation className={ic} />, def: only(ROLES.VERIFIER, ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager),
        children: [
            { path: '/vehicle', label: 'RSA Vehicle', def: all },
            { path: '/taxandinsurance', label: 'Tax And Insurance', def: all },
        ],
    },
    { kind: 'link', path: '/baselocation', label: 'Baselocation', icon: <MdShareLocation className={ic} />, def: only(ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager) },
    { kind: 'link', path: '/petrol', label: 'Petrol Pump', icon: <MdLocalGasStation className={ic} />, def: only(ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager) },
    { kind: 'link', path: '/feedback', label: 'Feedback', icon: <VscFeedback className={ic} />, def: only(ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager) },
    {
        kind: 'group', id: 'Todo List', label: 'Todo List', icon: <VscChecklist className={ic} />, def: all,
        children: [{ path: '/dashboardtodo', label: ' Todo', def: all }],
    },
    { kind: 'link', path: '/showroom', label: 'Showroom', icon: <PiBuildingApartmentLight className={ic} />, def: only(ROLES.VERIFIER, ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager) },
    { kind: 'link', path: '/serviceCenterBookings', label: 'Showroom Bookings Report', icon: <PiBuildingApartmentBold className={ic} />, def: only(ROLES.VERIFIER, ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager) },
    {
        kind: 'group', id: 'Payment Management', label: 'Payment Management', icon: <BsCashStack className={ic} />, def: except(ROLES.VERIFIER, ROLES.CALL_EXECUTIVE, ROLES.Manager),
        children: [
            { path: '/driver-advance-payment-managment', label: 'Driver Payment Report', def: all },
            { path: '/provider-advance-payment-managment', label: 'Provider Payment Report', def: all },
            { path: '/payment-report-staff', label: 'Staff Payment Report', def: only(ROLES.ADMIN, ROLES.SECONDARY_ADMIN) },
            { path: '/payment-report-showroom', label: 'Showroom Payment Report', def: all },
            { path: '/pmnr-report', label: 'Payment Work Report', def: all },
        ],
    },
    {
        kind: 'group', id: 'reports', label: 'Reports', icon: <TbReport className={ic} />, def: except(ROLES.CALL_EXECUTIVE),
        children: [
            { path: '/reports', label: 'Reports Centre (filter & export)', def: all },
            { path: '/dcpreport', label: 'Driver/Company/Provider Report', def: all },
            { path: '/showroomreport', label: 'ShowRoom Report', def: except(ROLES.VERIFIER, ROLES.CASHIER) },
            { path: '/staffreport', label: 'Staff Report', def: all },
            { path: '/driver-scorecard', label: 'Driver scorecard', def: all },
        ],
    },
    {
        kind: 'group', id: 'expences', label: 'Expences', icon: <TbCurrencyDollar className={ic} />, def: except(ROLES.CALL_EXECUTIVE),
        children: [
            { path: '/otherexpences', label: 'Other Expences', def: all },
            { path: '/companyexpences', label: 'Company Expences', def: all },
            { path: '/dieselexpences', label: 'Diesel Expence', def: all },
        ],
    },
    {
        kind: 'group', id: 'rewards', label: 'Rewards', icon: <IconAward className={ic} />, def: only(ROLES.VERIFIER, ROLES.ADMIN, ROLES.SECONDARY_ADMIN, ROLES.Manager),
        children: [
            { path: '/reward-item', label: 'Reward Item', def: except(ROLES.VERIFIER) },
            { path: '/reward', label: 'Rewards', def: all },
            { path: '/redeems', label: 'Redeems', def: all },
        ],
    },
    { kind: 'link', path: '/leaves', label: 'leaves', icon: <IconMenuCalendar className={ic} />, def: except(ROLES.VERIFIER, ROLES.CASHIER, ROLES.CALL_EXECUTIVE) },
    { kind: 'link', path: '/status', label: 'Status', icon: <IconAt className={ic} />, def: all },
    { kind: 'link', path: '/oldBookings', label: 'Old Booking', icon: <CalendarClock className={ic} />, def: all },
    { kind: 'link', path: '/operations', label: 'Operations', icon: <RadioTower className={ic} />, def: all },
    { kind: 'link', path: '/reminders', label: 'Reminders', icon: <BellRing className={ic} />, def: all },
    { kind: 'link', path: '/dashboardtodo', label: 'Staff Tasks', icon: <ListChecks className={ic} />, def: (r) => r === 'admin', adminOnly: true },
    { kind: 'link', path: '/case-photos', label: 'Case Photos', icon: <Images className={ic} />, def: all },
    {
        kind: 'group', id: 'transaction', label: 'Transactions', icon: <IconDollarSignCircle className={ic} />, def: all,
        children: [
            { path: '/transations/salary-transaction', label: 'Salary Transactions', def: except(ROLES.VERIFIER) },
            { path: '/driversalary-transaction', label: 'Transactions Details', def: except(ROLES.VERIFIER) },
            { path: '/settlement-transaction', label: 'Settlement Details', def: all },
        ],
    },
    {
        kind: 'group', id: 'admin-tools', label: 'Admin tools', icon: <ShieldCheck className={ic} />, def: (r) => r === 'admin', adminOnly: true,
        children: [
            { path: '/staff-permissions', label: 'Staff permissions', def: all },
            { path: '/activity-log', label: 'Activity & logins', def: all },
            { path: '/daily-summary', label: 'Daily summary', def: all },
            { path: '/backups', label: 'Backups', def: all },
        ],
    },
];

/** Actions an admin can allow/block. The server enforces these too. */
export const ACTIONS: { key: string; label: string; hint?: string }[] = [
    { key: 'booking.create', label: 'Create bookings' },
    { key: 'booking.edit', label: 'Edit bookings', hint: 'Details, driver, photos, file number' },
    { key: 'booking.cancel', label: 'Cancel bookings' },
    { key: 'booking.verify', label: 'Verify bookings and feedback' },
    { key: 'booking.accountVerify', label: 'Accountant verification' },
    { key: 'cash.settle', label: 'Settle and record cash / payments' },
    { key: 'expense.approve', label: 'Approve or settle expenses' },
    { key: 'people.manage', label: 'Add, edit or delete drivers and providers' },
    { key: 'staff.manage', label: 'Add, edit or delete staff' },
    { key: 'masterdata.manage', label: 'Edit companies, showrooms, service types, base locations, petrol pumps, vehicles, rewards' },
    { key: 'tracking.share', label: 'Share live tracking links with customers' },
    { key: 'dispatch.approve', label: 'Approve dispatch suggestions' },
];

export const pageKey = (path: string) => `page:${path}`;

/** Built-in default for a page for a role, including its menu group's rule. */
export function pageDefault(path: string, role: string): boolean {
    for (const e of MENU) {
        if (e.kind === 'link' && e.path === path && !e.adminOnly) return e.def(role);
        if (e.kind === 'group' && !e.adminOnly) {
            const c = e.children.find((x) => x.path === path);
            if (c) return e.def(role) && c.def(role);
        }
    }
    return true;
}

/** Every page path that can be switched on/off (admin-only links excluded). */
export const ALL_PAGES = (): { path: string; label: string; section: string }[] =>
    MENU.flatMap((e) =>
        e.kind === 'link' ? (e.adminOnly ? [] : [{ path: e.path, label: e.label, section: 'General' }]) : e.adminOnly ? [] : e.children.map((c) => ({ path: c.path, label: c.label.trim(), section: e.label === 'users' ? 'Users' : e.label }))
    );
