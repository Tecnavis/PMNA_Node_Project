/**
 * Attach the login token to every request to our backend (imported once in main.tsx).
 * Some pages call plain `axios` without it; those endpoints now require a login.
 */
import axios, { InternalAxiosRequestConfig } from 'axios';

const BACKEND = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

export function installAuthInterceptors() {
    axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
        const full = config.url && /^https?:\/\//i.test(config.url) ? config.url : `${config.baseURL || ''}${config.url || ''}`;
        const token = localStorage.getItem('token');
        if (BACKEND && full.startsWith(BACKEND) && token && !config.headers?.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });
}
