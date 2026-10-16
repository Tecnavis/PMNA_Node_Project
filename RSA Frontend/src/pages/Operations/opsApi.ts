import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';

export type LatLng = { lat: number; lng: number };

export type OpsCase = {
    _id: string;
    fileNumber: string;
    status: string;
    minutesInStatus: number | null;
    statusSince: string;
    delayed: boolean;
    delayLimit: number | null;
    unassigned: boolean;
    scheduledFor: string | null;
    customerName: string;
    customerPhone: string;
    vehicleNumber: string;
    pickup: { address: string; point: LatLng | null };
    dropoff: { address: string; point: LatLng | null };
    driver: { _id: string; name: string; phone: string } | null;
    provider: { _id: string; name: string; phone: string } | null;
    showroom: string | null;
    company: string | null;
    serviceType: string | null;
    cashPending: boolean;
    createdAt: string;
};

export type OpsPerson = {
    _id: string;
    type: 'driver' | 'provider';
    name: string;
    phone: string;
    company: string | null;
    image: string | null;
    point: LatLng | null;
    lastSeenAt: string | null;
    lastSeenApprox: boolean;
    minutesSinceSeen: number | null;
    online: boolean;
    gpsStale: boolean;
    activeCases: OpsCase[];
    busy: boolean;
};

export type LiveData = {
    generatedAt: string;
    settings: { gpsStaleMinutes: number; onlineMinutes: number };
    counts: { drivers: number; providers: number; withLocation: number; online: number; busy: number; gpsStale: number };
    people: OpsPerson[];
    unassignedCases: OpsCase[];
};

export type BoardData = {
    generatedAt: string;
    statuses: string[];
    totals: { open: number; scheduled: number; delayed: number; unassigned: number };
    columns: { status: string; delayLimit: number | null; cases: OpsCase[] }[];
};

export type ApprovalItem = { _id: string; title: string; detail: string; amount?: number; at: string; link?: string };
export type ApprovalsData = { total: number; queues: { key: string; label: string; link: string; count: number; items: ApprovalItem[] }[] };

export type SummaryData = {
    date: string;
    totals: { created: number; completed: number; cancelled: number; openNow: number; scheduledUpcoming: number; cashPending: number };
    perPerson: { _id: string; name: string; type: 'driver' | 'provider'; cases: number; completed: number; open: number; amount: number }[];
};

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });

const expect = <T,>(d: any, ok: boolean, what: string): T => {
    if (!ok) throw new Error(`Unexpected ${what} data from the server`);
    return d as T;
};
export const fetchLive = async (): Promise<LiveData> => {
    const d = (await axios.get(`${BASE_URL}/ops/live`, auth())).data;
    return expect(d, !!d?.counts && Array.isArray(d?.people) && Array.isArray(d?.unassignedCases), 'live');
};
export const fetchBoard = async (): Promise<BoardData> => {
    const d = (await axios.get(`${BASE_URL}/ops/board`, auth())).data;
    return expect(d, !!d?.totals && Array.isArray(d?.columns) && d.columns.every((c: any) => Array.isArray(c?.cases)), 'board');
};
export const fetchApprovals = async (): Promise<ApprovalsData> => {
    const d = (await axios.get(`${BASE_URL}/ops/approvals`, auth())).data;
    return expect(d, Array.isArray(d?.queues), 'approvals');
};
export const fetchSummary = async (date?: string): Promise<SummaryData> => {
    const d = (await axios.get(`${BASE_URL}/ops/summary${date ? `?date=${date}` : ''}`, auth())).data;
    return expect(d, !!d?.totals && Array.isArray(d?.perPerson), 'summary');
};

/** Same endpoint the driver app uses to change a case's status */
export const updateCaseStatus = async (id: string, status: string) =>
    (await axios.put(`${BASE_URL}/booking/${id}`, { status }, auth())).data;

export const formatMinutes = (m: number | null | undefined) => {
    if (m === null || m === undefined) return '—';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h ${m % 60} min`;
    return `${Math.floor(h / 24)} d ${h % 24} h`;
};

export const STATUS_COLORS: Record<string, string> = {
    Scheduled: '#64748b',
    'Booking Added': '#6366f1',
    'called to customer': '#0ea5e9',
    'Order Received': '#14b8a6',
    'On the way to pickup location': '#f59e0b',
    'Vehicle Picked': '#f97316',
    'Vehicle Confirmed': '#ef4444',
    'On the way to dropoff location': '#a855f7',
    'Vehicle Dropped': '#22c55e',
};
