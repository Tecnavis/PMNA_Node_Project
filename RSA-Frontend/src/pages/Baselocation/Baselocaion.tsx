import React, { useEffect, useState } from 'react';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { Button } from '@mui/material';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { GrChapterAdd } from 'react-icons/gr';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from 'axios';
import styles from './baselocation.module.css';
import { MdShareLocation } from 'react-icons/md';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
};
interface Baselocation {
    _id: string;
    baseLocation: string;
    latitudeAndLongitude: string;
}

interface Errors {
    baseLocation?: string;
    latitudeAndLongitude?: string;
}
const Baselocation: React.FC = () => {
    const [baselocations, setBaselocations] = useState<Baselocation[]>([]);
    const [uid, setUid] = useState<string>('');
    const [baseLocation, setBaseLocation] = useState<string>('');
    const [latitudeAndLongitude, setLatitudeAndLongitude] = useState<string>('');
    const [errors, setErrors] = useState<Errors>({});
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // checking the token

    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token  found in localStorage');
        } else {
            navigate('/auth/boxed-signin');
            console.log('Token not found in localStorage');
        }
    };

    // getting all baselocations

    const fetchBaselocation = async () => {
        try {
            const response = await axios.get(`${backendUrl}/baselocation`);
            setBaselocations(response.data.data);
        } catch (error) {
            console.error('Error fetching service types:', error);
        }
    };

    useEffect(() => {
        gettingToken();
        fetchBaselocation();
    }, []);

    // validating form

    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: Errors = {};

        if (!baseLocation) {
            newErrors.baseLocation = 'Baselocation is required';
            isValid = false;
        }

        if (!latitudeAndLongitude) {
            newErrors.latitudeAndLongitude = 'Latitude and longitude is required';
            isValid = false;
        }

    

        setErrors(newErrors);
        return isValid;
    };

    // posting the baselocation

    const handleSavebaselocation = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        const data = {
            baseLocation: baseLocation,
            latitudeAndLongitude: latitudeAndLongitude
        };

        try {
            await axios.post(`${backendUrl}/baselocation`, data);
            Swal.fire({
                icon: 'success',
                title: 'Baselocation added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchBaselocation();
            handleClose();
            setBaseLocation('');
            setLatitudeAndLongitude('');
        } catch (error) {
            console.error('Error saving baselocation:', error);
        }
    };

    // editing baselocation

    const editBaselocation = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        const data = {
            baseLocation: baseLocation,
            latitudeAndLongitude: latitudeAndLongitude,
        };

        try {
            await axios.put(`${backendUrl}/baselocation/${uid}`, data);
            Swal.fire({
                icon: 'success',
                title: 'Baselocation edited',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchBaselocation();
            handleClose();
            setBaseLocation('');
            setLatitudeAndLongitude('');
            setUid('');
        } catch (error) {
            console.error('Error saving baseLocation:', error);
        }
    };

    // opening modal

    const handleOpen = async (id: any | null = null) => {
        if (id) {
            setIsEditMode(true);
            try {
                const response = await axios.get(`${backendUrl}/baseLocation/${id}`);
                setUid(id);
                console.log(response.data, 'this is the response data');
                setBaseLocation(response.data.data.baseLocation);
                setLatitudeAndLongitude(response.data.data.latitudeAndLongitude);
            } catch (error) {
                console.error('Error fetching baselocation:', error);
            }
        } else {
            setIsEditMode(false);
            setBaseLocation('');
            setLatitudeAndLongitude('');
        }
        setErrors({});
        setFormSubmitted(false);
        setOpen(true);
    };

    // closing modal
    const handleClose = () => setOpen(false);

    // opening modal for delete confirmation

    const openDeleteModal = (item: string) => {
        setItemToDelete(item);
        setModalVisible(true);
    };

    // closing modal for delete confirmation

    const closeModal = () => {
        setModalVisible(false);
        setItemToDelete(null);
    };

    // delete service type

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`${backendUrl}/baselocation/${id}`);
            setBaselocations(baselocations.filter((base) => base._id !== id));
            setModalVisible(false);
            Swal.fire({
                icon: 'success',
                title: 'Baselocation deleted',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error deleting baselocation:', error.message);
                alert(`Error deleting baselocation: ${error.message}`);
            } else {
                console.error('Unknown error deleting baselocation:', error);
            }
        }
    };

    return (
        <div>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12 my-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">Baselocations</h5>

                        <button className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600" onClick={() => handleOpen()}>
                            <span className="flex items-center">
                                <MdShareLocation className="me-2" />
                                Add Baselocation
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <table className={styles.tableContainer}>
                <thead>
                    <tr>
                        <th className={styles.tableHeader}>Location</th>
                        <th className={styles.tableHeader}>Latitude and Longitude</th>
                        <th className={styles.tableHeader}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {baselocations.map((base, index) => (
                        <tr key={index} className={styles.tableRow}>
                            <td className={styles.tableCell} data-label="Base location">
                                <span>{base?.baseLocation ? base.baseLocation.charAt(0).toUpperCase() + base.baseLocation.slice(1) : 'Location not available'}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Latitude and longitude">
                                <span>{base.latitudeAndLongitude}</span>
                            </td>
                            <td className={styles.tableActions} data-label="Actions">
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '50%', justifyContent: 'center' }}>
                                    <button onClick={() => handleOpen(base._id)}>
                                        <IconPencil className="text-primary" />
                                    </button>
                                    <button onClick={() => openDeleteModal(base._id)}>
                                        <IconTrashLines className="text-danger" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Modal open={open} onClose={handleClose} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
                <Box sx={style}>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <label htmlFor="serviceName" style={{ color: '#afafaf', display: 'block', marginBottom: '0.5rem' }}>
                            Baselocation
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                id="serviceName"
                                type="text"
                                value={baseLocation}
                                onChange={(e) => setBaseLocation(e.target.value)}
                                className={`${styles.formInput} form-input`}
                                style={{
                                    paddingRight: '50px', // Add padding to avoid overlapping the button
                                    borderRadius: '5px',
                                    width: '100%',
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        // Simulate search by opening Google Maps
                                        window.open(
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(baseLocation)}`,
                                            '_blank',
                                            'noopener,noreferrer'
                                        );
                                    }
                                }}
                            />
                            <a
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    backgroundColor: '#ddd',
                                    border: 'none',
                                    padding: '0 10px',
                                    cursor: 'pointer',
                                    borderRadius: '0 5px 5px 0',
                                    height: '100%',
                                    paddingTop: '6px',
                                }}
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(baseLocation)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <p>Search</p>
                            </a>
                        </div>
                        {formSubmitted && errors.baseLocation && <span style={{ color: 'red' }}>{errors.baseLocation}</span>}
                    </div>

                    <div>
                        <label htmlFor="salaryPerKM" style={{ color: '#afafaf' }}>
                            Latitude and longitude
                        </label>
                        <input id="salaryPerKM" type="text" value={latitudeAndLongitude} onChange={(e) => setLatitudeAndLongitude(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.latitudeAndLongitude && <span style={{ color: 'red' }}>{errors.latitudeAndLongitude}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '25px' }}>
                        <Button variant="outlined" color="error" onClick={handleClose}>
                            Close
                        </Button>
                        {isEditMode ? (
                            <Button variant="contained" color="info" className={styles.submitButton} onClick={editBaselocation}>
                                Update
                            </Button>
                        ) : (
                            <Button variant="contained" color="success" className={styles.submitButton} onClick={handleSavebaselocation}>
                                Add
                            </Button>
                        )}
                    </div>
                </Box>
            </Modal>
            <ConfirmationModal
                isVisible={isModalVisible}
                onConfirm={() => {
                    if (itemToDelete) {
                        handleDelete(itemToDelete);
                    }
                }}
                onCancel={closeModal}
            />
        </div>
    );
};

export default Baselocation;
