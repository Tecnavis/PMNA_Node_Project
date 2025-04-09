// src/utils/socket.ts
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../config/axiosConfig';

let socket: Socket | null = null;

export const connectSocket = (email: string): Socket => {
    if (!socket) {
        socket = io(BASE_URL, {
            query: { email },
            transports: ['websocket'], 
            withCredentials: true
        });

        socket.on('connect', () => console.log('Socket connected:', socket?.id));
        socket.on('disconnect', () => console.log('Socket disconnected'));
    }
    return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
