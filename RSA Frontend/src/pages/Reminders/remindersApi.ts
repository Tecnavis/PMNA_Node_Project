import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';

export type Reminder = {
    _id: string;
    title: string;
    note?: string;
    dueAt: string;
    repeat: 'none' | 'daily' | 'weekly' | 'monthly';
    priority: 'normal' | 'high';
    booking?: string;
    fileNumber?: string;
    assignedTo?: string;
    assignedToName?: string;
    createdBy: string;
    createdByName?: string;
    done: boolean;
    doneAt?: string;
    doneByName?: string;
};

export type WorkTask = { taskName: string; status: 'pending' | 'in-progress' | 'completed' | 'delayed'; count?: number | null; time?: string; remarks?: string; priority?: number };
export type MyHome = {
    name: string;
    work: { _id: string; date: string; works: WorkTask[]; total: number; completed: number } | null;
    reminders: Reminder[];
    overdue: number;
    dueToday: number;
    cashInHand: number;
    myOpenBookings: { _id: string; fileNumber: string; status: string; customerName?: string; customerVehicleNumber?: string; createdAt: string }[];
    myUnverifiedCompleted: number;
};

export type ReminderInput = { title: string; note?: string; dueAt: string; repeat?: string; priority?: string; fileNumber?: string; assignedTo?: string };

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });

export const fetchMyHome = async (): Promise<MyHome> => {
    const d = (await axios.get(`${BASE_URL}/me/home`, auth())).data || {};
    return {
        name: d.name || '',
        work: d.work && Array.isArray(d.work.works) ? d.work : null,
        reminders: Array.isArray(d.reminders) ? d.reminders : [],
        overdue: Number(d.overdue) || 0,
        dueToday: Number(d.dueToday) || 0,
        cashInHand: Number(d.cashInHand) || 0,
        myOpenBookings: Array.isArray(d.myOpenBookings) ? d.myOpenBookings : [],
        myUnverifiedCompleted: Number(d.myUnverifiedCompleted) || 0,
    };
};
export const fetchStaffNames = async (): Promise<{ _id: string; name: string }[]> => {
    const d = (await axios.get(`${BASE_URL}/me/staff`, auth())).data?.data;
    return Array.isArray(d) ? d : [];
};
export const listReminders = async (status: 'open' | 'done' | 'all', scope?: 'all'): Promise<Reminder[]> => {
    const d = (await axios.get(`${BASE_URL}/reminders`, { ...auth(), params: { status, ...(scope ? { scope } : {}) } })).data?.data;
    return Array.isArray(d) ? d : [];
};
export const createReminder = async (data: ReminderInput) => (await axios.post(`${BASE_URL}/reminders`, data, auth())).data.data as Reminder;
export const updateReminder = async (id: string, data: Partial<ReminderInput>) => (await axios.put(`${BASE_URL}/reminders/${id}`, data, auth())).data.data as Reminder;
export const setReminderDone = async (id: string, done = true) => (await axios.patch(`${BASE_URL}/reminders/${id}/done`, { done }, auth())).data;
export const snoozeReminder = async (id: string, minutes: number) => (await axios.patch(`${BASE_URL}/reminders/${id}/snooze`, { minutes }, auth())).data;
export const deleteReminder = async (id: string) => (await axios.delete(`${BASE_URL}/reminders/${id}`, auth())).data;
export const updateWorkTask = async (dailyWorkId: string, taskIndex: number, status: WorkTask['status']) =>
    (await axios.put(`${BASE_URL}/work/update-task`, { dailyWorkId, taskIndex, status }, auth())).data;

/** "in 2 h", "15 min late", "Tomorrow 9:30 AM" */
export const dueLabel = (iso: string) => {
    const d = new Date(iso);
    const diff = d.getTime() - Date.now();
    const mins = Math.round(Math.abs(diff) / 60000);
    const span = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} d`;
    if (diff < 0) return `${span} late`;
    if (mins < 60 * 12) return `in ${span}`;
    return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

/** value for <input type="datetime-local"> in the browser's local time */
export const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
