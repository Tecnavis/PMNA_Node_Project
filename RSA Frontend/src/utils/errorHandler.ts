import sweetAlert from '../components/sweetAlert';

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
