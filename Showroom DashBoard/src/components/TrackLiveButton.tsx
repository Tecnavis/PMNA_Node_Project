import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { BASE_URL } from '../config/axiosConfig';

/** "Track live": opens the case's live tracking page; also offers sending it to the customer on WhatsApp. */
const TrackLiveButton: React.FC<{ bookingId: string; className?: string }> = ({ bookingId, className = '' }) => {
    const [busy, setBusy] = useState(false);
    const go = async () => {
        setBusy(true);
        try {
            const r = await axios.post(`${BASE_URL}/showroom-portal/bookings/${bookingId}/tracking`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
            const { url, whatsappUrl, customer } = r.data || {};
            const res = await Swal.fire({
                title: 'Live tracking',
                html: `<div style="font-size:13px;color:#5d6375;margin-bottom:8px">Map, arrival time and progress for this case. No amounts are shown.</div><input class="swal2-input" readonly value="${String(url).replace(/"/g, '')}" style="font-size:13px" onclick="this.select()">`,
                showDenyButton: !!whatsappUrl,
                showCancelButton: true,
                confirmButtonText: 'Open tracking',
                denyButtonText: `Send to ${customer || 'customer'} on WhatsApp`,
                cancelButtonText: 'Close',
                denyButtonColor: '#25D366',
            });
            if (res.isConfirmed) window.open(url, '_blank', 'noopener');
            if (res.isDenied && whatsappUrl) window.open(whatsappUrl, '_blank', 'noopener');
        } catch (e: any) {
            Swal.fire('Not available', e?.response?.data?.message || 'Could not get the tracking link', 'warning');
        } finally {
            setBusy(false);
        }
    };
    return (
        <button type="button" onClick={go} disabled={busy} className={`btn btn-outline-primary btn-sm ${className}`}>
            {busy ? '…' : '📍 Track live'}
        </button>
    );
};

export default TrackLiveButton;
