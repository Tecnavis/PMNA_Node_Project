// frontend/src/utils/networkUtils.ts
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface NetworkErrorResponse {
  title: string;
  message: string;
  errorId: string;
  isNetworkError: boolean;
}

export interface ErrorContext {
  [key: string]: unknown;
}

export const handleNetworkError = (error: unknown, context: ErrorContext = {}): NetworkErrorResponse => {
  const errorId = uuidv4();
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  console.error('Frontend Network Error:', {
    errorId,
    message: errorMessage,
    ...context
  });
  
  return {
    title: 'Connection Issue',
    message: 'Please check your internet connection and try again',
    errorId,
    isNetworkError: true
  };
};

export const executeWithRetry = async <T,>(
  apiCall: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    if (retries <= 0) throw error;
    
    if (axios.isAxiosError(error) && !error.response) {
      // Network error - retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWithRetry(apiCall, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Simple offline queue implementation
export const offlineQueue = {
  queue: [] as Array<AxiosRequestConfig & { _isQueued?: boolean, _timestamp?: string }>,
  
  addToQueue(request: AxiosRequestConfig): void {
    this.queue.push({
      ...request,
      _isQueued: true,
      _timestamp: new Date().toISOString()
    });
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  },
  
  async processQueue(): Promise<void> {
    if (navigator.onLine && this.queue.length > 0) {
      const requests = [...this.queue];
      
      try {
        await Promise.all(requests.map(req => axios(req)));
        this.queue = [];
        localStorage.removeItem('offlineQueue');
      } catch (error) {
        // If processing fails, restore the queue
        this.queue = requests;
        localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
        throw error;
      }
    }
  },
  
  init(): void {
    const savedQueue = localStorage.getItem('offlineQueue');
    if (savedQueue) {
      try {
        this.queue = JSON.parse(savedQueue);
      } catch (e) {
        console.error('Failed to parse offline queue', e);
        this.queue = [];
      }
    }
    
    window.addEventListener('online', this.processQueue.bind(this));
  }
};

// Initialize the queue manager
offlineQueue.init();