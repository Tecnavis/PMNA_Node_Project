import sweetAlert from '../components/sweetAlert';
import { toast } from 'react-hot-toast';

export const handleApiError = (error: any): string => {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.response) {
        const statusCode = error.response.status;

        switch (statusCode) {
            case 400:
                errorMessage = 'Invalid data. Please check your input.';
                break;
            case 404:
                errorMessage = 'Resource not found. Please try again later.';
                break;
            case 500:
                errorMessage = 'Something went wrong on our end. Please try again later.';
                break;
            default:
                errorMessage = 'An unexpected error occurred. Please try again.';
        }
    }
    else if (error.request) {
        errorMessage = 'Network error. Please check your internet connection.';
    }
    else {
        errorMessage = error?.response?.message || error?.response?.data.message || 'try again'
        console.log(error)
    }

    sweetAlert({
        title: 'Error',
        message: errorMessage,
        type: 'error',
        position: 'top-end',
        timer: 5000,
        toast: true,
        showConfirmButton: false,
    });

    return errorMessage;
};

interface ErrorField {
    location?: string;
    msg: string;
    path: string;
    type?: string;
    value?: string;
}

interface ErrorResponse {
    success: boolean;
    errorCode?: string;
    errors?: ErrorField[] | ErrorField;
    message?: string;
}

/**
 * Formats field errors into readable messages
 */
const formatFieldError = (error: ErrorField): string => {
    const fieldName = error.path.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    return `${fieldName}: ${error.msg}`;
};

/**
 * Handles API errors and shows appropriate toast messages
 */
export const showApiErrorToast = (error: any): void => {
    console.log(error)
    let messageToShow = 'An unexpected error occurred. Please try again.';

    const responseData: ErrorResponse = error?.response?.data;


    if (Array.isArray(responseData?.errors)) {
        // Handle array of errors (from validation)
        messageToShow = responseData.errors
            .map(err => formatFieldError(err))
            .join('\n');
    } else if (responseData?.errors && typeof responseData.errors === 'object') {
        // Handle single error object
        messageToShow = formatFieldError(responseData.errors as ErrorField);
    } else if (responseData?.message) {
        // Use direct message if available
        messageToShow = responseData.message;
    }

    // Show error toast
    toast.error(messageToShow, {
        position: 'top-right',
        duration: 6000,
        className: 'bg-white text-red-600 border border-red-300 shadow-xl rounded-xl px-4 py-3 font-semibold text-sm whitespace-pre-line',
    });
};

/**
 * Handles success toast messages
 */
export const showApiSuccessToast = (message: string): void => {
    toast.success(message, {
        position: 'bottom-right',
        duration: 4000,
        className: 'bg-white text-green-600 border border-green-300 shadow-xl rounded-xl px-4 py-3 font-semibold text-sm',
    });
};
