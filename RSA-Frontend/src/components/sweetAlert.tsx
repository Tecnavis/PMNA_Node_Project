import React from 'react'
import Swal from 'sweetalert2'

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'question';

interface SweetAlertProps {
    title: string;
    message: string;
    type?: AlertType;
    position?: 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end';
    timer?: number;
    showConfirmButton?: boolean;
    toast?: boolean;
}

const sweetAlert = ({
    title,
    message,
    type = 'success',
    position = 'top',
    timer = 3000,
    showConfirmButton = false,
    toast = true,
}: SweetAlertProps) => {
    return Swal.fire({
        icon: type,
        title,
        text: message,
        toast,
        position,
        showConfirmButton,
        timer,
        padding: '10px 0px',
    });
};

export default sweetAlert;