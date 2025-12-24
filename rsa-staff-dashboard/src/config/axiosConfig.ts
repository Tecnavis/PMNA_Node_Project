// Fixed axiosConfig.js
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

export const BASE_URL: string = import.meta.env.VITE_BACKEND_URL;
export const IMAGE_URL: string = import.meta.env.VITE_CLOUD_IMAGE;

// Create an Axios instance
export const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // Add timeout for better error handling
});

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
        if (error.response?.status === 401) {
            // Clear local storage on 401
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('showroomIcon');
            localStorage.removeItem('showroomId');
            localStorage.removeItem('name');
            
            // Don't redirect here - let the component handle it
            console.error('Unauthorized access - please login again');
        }
        return Promise.reject(error);
    }
);