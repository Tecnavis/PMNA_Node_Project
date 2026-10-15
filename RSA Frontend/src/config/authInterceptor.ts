/**
 * Runs once at start-up (imported in main.tsx).
 *
 * 1. Every request to our backend carries the login token — many pages call plain `axios`
 *    without adding it, which only worked because those endpoints were unprotected.
 * 2. When the backend says the session is gone (code AUTH_REQUIRED — expired or invalid token),
 *    clear it and go to the login page. Other 401s (e.g. a wrong salary-verification password)
 *    are left for the page to handle.
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { axiosInstance } from './axiosConfig';

const BACKEND = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
const LOGIN_ROUTE = '#/auth/boxed-signin';

const isBackendUrl = (url?: string, baseURL?: string) => {
    if (!BACKEND) return false;
    const full = url && /^https?:\/\//i.test(url) ? url : `${baseURL || ''}${url || ''}`;
    return full.startsWith(BACKEND);
};

const attachToken = (config: InternalAxiosRequestConfig) => {
    if (isBackendUrl(config.url, config.baseURL)) {
        const token = localStorage.getItem('token');
        const headers = config.headers;
        if (token && !headers?.Authorization && !headers?.authorization) {
            headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
};

let redirecting = false;
const handleAuthError = (error: AxiosError<any>) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const onLoginPage = window.location.hash.startsWith('#/auth/');
    if (status === 401 && code === 'AUTH_REQUIRED' && !onLoginPage && !redirecting && isBackendUrl(error.config?.url, error.config?.baseURL)) {
        redirecting = true;
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('name');
        window.location.hash = LOGIN_ROUTE;
        setTimeout(() => { redirecting = false; }, 2000);
    }
    return Promise.reject(error);
};

export function installAuthInterceptors() {
    for (const instance of [axios, axiosInstance] as AxiosInstance[]) {
        instance.interceptors.request.use(attachToken);
        instance.interceptors.response.use((r) => r, handleAuthError);
    }
}
