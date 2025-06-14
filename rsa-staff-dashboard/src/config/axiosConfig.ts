import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useNavigate } from 'react-router-dom';

export const BASE_URL: string = import.meta.env.VITE_BACKEND_URL;
export const IMAGE_URL: string = import.meta.env.VITE_CLOUD_IMAGE;

// Create an Axios instance
export const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
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
            const navigate = useNavigate();
            navigate('/auth/cover-register'); // Redirect to login if unauthorized
        }
        return Promise.reject(error);
    }
);
