import axios, { isAxiosError, AxiosRequestConfig, AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

export const BASE_URL: string = import.meta.env.VITE_BACKEND_URL;
export const VITE_STAFF_DASHBOARD_URL: string = import.meta.env.VITE_STAFF_DASHBOARD_URL || 'http://localhost:5175/';

// Create an Axios instance
export const axiosInstance = axios.create({
  baseURL: BASE_URL,
}) as AxiosInstance & { isAxiosError: typeof axios.isAxiosError };

// Axios Request Interceptor for Adding Authorization Token
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Axios Response Interceptor for Handling Unauthorized Access
axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        // 401 handling lives in config/authInterceptor.ts (calling a React hook here used to throw)
        return Promise.reject(error);
    }
);
