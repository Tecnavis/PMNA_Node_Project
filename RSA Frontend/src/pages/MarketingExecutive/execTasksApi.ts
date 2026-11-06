import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';

/** Admin website calls for executive tasks, showroom assignment and the executive report (/exec-tasks). */

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
const url = (p: string) => `${BASE_URL}/exec-tasks${p}`;

export type TaskType = 'visit' | 'onboard' | 'follow-up' | 'other';
export type TaskStatus = 'open' | 'done' | 'cancelled';

export type ExecRow = { _id: string; name: string; phone: string; userName: string; image: string | null; showrooms: number; openTasks: number; overdueTasks: number };
export type ShowroomRow = {
    _id: string;
    name: string;
    code: string;
    location: string;
    district: string;
    phone: string;
    lookedAfterBy: { _id: string; name: string; how: 'assigned' | 'added' } | null;
    addedBy: { _id: string; name: string } | null;
    assignedAt: string | null;
    lastVisitAt: string | null;
};
export type TaskRow = {
    _id: string;
    executive: { _id: string; name: string; phone: string };
    type: TaskType;
    title: string;
    notes: string;
    area: string;
    target: number;
    progress: number;
    dueDate: string | null;
    overdue: boolean;
    priority: 'normal' | 'high';
    status: TaskStatus;
    assignedBy: string;
    createdAt: string;
    completedAt: string | null;
    completedBy: string;
    completionNote: string;
    showroom: { _id: string; name: string; code: string; district: string } | null;
};
export type Paged<T> = { data: T[]; total: number; page: number; pages: number };
export type TaskCounts = { open: number; overdue: number; done: number; cancelled: number };

export type SummaryRow = {
    _id: string;
    name: string;
    phone: string;
    showrooms: number;
    visits: number;
    showroomsVisited: number;
    coverage: number | null;
    notVisited: number;
    newShowrooms: number;
    bookings: number;
    tasksGiven: number;
    tasksDone: number;
    tasksDoneOnTime: number;
    openTasks: number;
    overdueTasks: number;
    lastVisitAt: string | null;
};
export type SummaryTotals = { executives: number; showrooms: number; visits: number; showroomsVisited: number; newShowrooms: number; bookings: number; tasksGiven: number; tasksDone: number; openTasks: number; overdueTasks: number };
export type VisitRow = {
    _id: string;
    at: string;
    executive: { _id: string; name: string };
    showroom: { _id: string; name: string; code: string; district: string; location: string } | null;
    image: string | null;
    accuracy: number | null;
    point: { lat: number; lng: number } | null;
    distanceM: number | null;
    recordedBy: string;
};
export type NewShowroomRow = {
    _id: string;
    name: string;
    code: string;
    district: string;
    location: string;
    phone: string;
    createdAt: string;
    addedBy: { _id: string; name: string };
    lookedAfterBy: string | null;
    bookings: number;
    firstBookingAt: string | null;
    visits: number;
};

export const errorText = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

export const getExecutives = () => axios.get(url('/executives'), auth()).then((r) => ({ list: (r.data?.data || []) as ExecRow[], unassigned: Number(r.data?.unassignedShowrooms || 0) }));

export const getShowrooms = (params: { search?: string; executive?: string; scope?: 'all' | 'mine' | 'unassigned'; page?: number; limit?: number }) =>
    axios.get(url('/showrooms'), { ...auth(), params }).then((r) => r.data as Paged<ShowroomRow>);

export const assignShowrooms = (body: { executiveId: string; showroomIds: string[]; visitTask: boolean; dueDate?: string; notes?: string; priority?: string }) =>
    axios.post(url('/assign'), body, auth()).then((r) => r.data as { message: string; assigned: number; tasksCreated: number });

export const unassignShowrooms = (showroomIds: string[]) => axios.post(url('/unassign'), { showroomIds }, auth()).then((r) => r.data as { message: string });

export const getTasks = (params: { executive?: string; status?: string; type?: string; search?: string; page?: number; limit?: number }) =>
    axios.get(url(''), { ...auth(), params }).then((r) => r.data as Paged<TaskRow> & { counts: TaskCounts });

export const createTask = (body: {
    executiveId: string;
    type: TaskType;
    showroomId?: string;
    showroomIds?: string[];
    title?: string;
    notes?: string;
    area?: string;
    target?: number;
    dueDate?: string;
    priority?: string;
}) => axios.post(url(''), body, auth()).then((r) => r.data as { message: string });

export const updateTask = (id: string, body: Partial<{ title: string; notes: string; dueDate: string | null; priority: string; status: TaskStatus; note: string; target: number }>) =>
    axios.patch(url(`/${id}`), body, auth()).then((r) => r.data as { message: string });

export const cancelTask = (id: string) => axios.delete(url(`/${id}`), auth()).then((r) => r.data as { message: string });

export const getSummary = (params: { from: string; to: string; executive?: string }) =>
    axios.get(url('/report/summary'), { ...auth(), params }).then((r) => r.data as { data: SummaryRow[]; totals: SummaryTotals; from: string; to: string });

export const getVisits = (params: { from: string; to: string; executive?: string; page?: number; limit?: number }) =>
    axios.get(url('/report/visits'), { ...auth(), params }).then((r) => r.data as Paged<VisitRow>);

export const getNewShowrooms = (params: { from: string; to: string; executive?: string; page?: number; limit?: number }) =>
    axios.get(url('/report/new-showrooms'), { ...auth(), params }).then((r) => r.data as Paged<NewShowroomRow>);

// ---- small helpers shared by the two pages

export const istDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
export const fmtDay = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');
export const fmtWhen = (d?: string | null) =>
    d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—';
export const TYPE_LABEL: Record<TaskType, string> = { visit: 'Visit', onboard: 'Add showrooms', 'follow-up': 'Follow up', other: 'Other' };
