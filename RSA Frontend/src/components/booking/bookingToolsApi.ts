import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });

export type TimelineItem = { _id: string; type: string; at: string; by: string | null; byRole: string | null; from: string; to: string; meta: any; source: 'log' | 'record' };
export type TrackingLinkRow = {
    _id: string; url: string; show: { map: boolean; driver: boolean }; expiry: 'after-delivery' | 'hours'; expiresAt: string | null;
    revokedAt: string | null; createdAt: string; createdBy: string | null; views: number; lastViewedAt: string | null; active: boolean;
    sentTo: { name?: string; phone?: string; at?: string }[];
};
export type Suggestion = { _id: string; kind: 'driver' | 'provider'; name: string; phone: string; km: number; minutes: number; gpsMinutesAgo: number; busy: boolean };

export const getTimeline = async (id: string) => (await axios.get(`${BASE_URL}/booking-tools/${id}/timeline`, auth())).data as { items: TimelineItem[]; logStartedEarly: boolean; status: string };
export const getLinks = async (id: string) => (await axios.get(`${BASE_URL}/booking-tools/${id}/tracking-links`, auth())).data as { links: TrackingLinkRow[]; customer: { name: string; phones: string[] } | null };
export const createLink = async (id: string, body: { showDriver: boolean; showMap: boolean; expiry: string; hours?: number; sendTo: { name: string; phone: string }[] }) =>
    (await axios.post(`${BASE_URL}/booking-tools/${id}/tracking-links`, body, auth())).data as { link: TrackingLinkRow; message: string; recipients: { name: string; phone: string; whatsappUrl: string }[] };
export const revokeLink = async (id: string, lid: string) => (await axios.delete(`${BASE_URL}/booking-tools/${id}/tracking-links/${lid}`, auth())).data;
export const getSuggestions = async (id: string) => (await axios.get(`${BASE_URL}/booking-tools/${id}/suggest-drivers`, auth())).data as { pickupKnown: boolean; suggestions: Suggestion[] };
export const logReassign = async (id: string, body: { to: string; kind: string; reason?: string; impact?: any; decision?: 'approved' | 'rejected' }) =>
    (await axios.post(`${BASE_URL}/booking-tools/${id}/reassign-approval`, body, auth())).data;

export const fmtWhen = (d: string | Date | null | undefined) => {
    if (!d) return '';
    const x = new Date(d);
    const today = new Date();
    const time = x.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    return x.toDateString() === today.toDateString() ? `Today ${time}` : `${x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
};
