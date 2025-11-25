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
import styles from './petrolpump.module.css';
import { MdLocalGasStation } from 'react-icons/md';

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

interface PetrolPump {
    _id: string;
    pumpName: string;
    location: string;
    latitude: string;
    longitude: string;
    fuelTypes: string[];
    contactNumber?: string;
    address?: string;
}

interface Errors {
    pumpName?: string;
    location?: string;
    latitude?: string;
    longitude?: string;
    contactNumber?: string;
}

const PetrolPump: React.FC = () => {
    const [petrolPumps, setPetrolPumps] = useState<PetrolPump[]>([]);
    const [uid, setUid] = useState<string>('');
    const [pumpName, setPumpName] = useState<string>('');
    const [location, setLocation] = useState<string>('');
    const [latitude, setLatitude] = useState<string>('');
    const [longitude, setLongitude] = useState<string>('');
    const [contactNumber, setContactNumber] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [fuelTypes, setFuelTypes] = useState<string[]>([]);
    const [errors, setErrors] = useState<Errors>({});
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Available fuel types
    const availableFuelTypes = ['Petrol', 'Diesel', 'CNG', 'Premium Petrol', 'Diesel Exhaust Fluid'];

    // checking the token
    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token found in localStorage');
        } else {
            navigate('/auth/boxed-signin');
            console.log('Token not found in localStorage');
        }
    };

    // getting all petrol pumps
    const fetchPetrolPumps = async () => {
        try {
            const response = await axios.get(`${backendUrl}/petrol-pumps`);
            setPetrolPumps(response.data.data);
        } catch (error) {
            console.error('Error fetching petrol pumps:', error);
        }
    };

    useEffect(() => {
        gettingToken();
        fetchPetrolPumps();
    }, []);

    // validating form
    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: Errors = {};

        if (!pumpName) {
            newErrors.pumpName = 'Petrol pump name is required';
            isValid = false;
        }

        if (!location) {
            newErrors.location = 'Location is required';
            isValid = false;
        }

        if (!latitude) {
            newErrors.latitude = 'Latitude is required';
            isValid = false;
        }

        if (!longitude) {
            newErrors.longitude = 'Longitude is required';
            isValid = false;
        }

        if (contactNumber && !/^\d{10}$/.test(contactNumber)) {
            newErrors.contactNumber = 'Contact number must be 10 digits';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // Handle fuel type selection
    const handleFuelTypeChange = (fuelType: string) => {
        setFuelTypes(prev => 
            prev.includes(fuelType) 
                ? prev.filter(type => type !== fuelType)
                : [...prev, fuelType]
        );
    };

    // posting the petrol pump
    const handleSavePetrolPump = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        const data = {
            pumpName,
            location,
            latitude,
            longitude,
            contactNumber,
            address,
            fuelTypes
        };

        try {
            await axios.post(`${backendUrl}/petrol-pumps`, data);
            Swal.fire({
                icon: 'success',
                title: 'Petrol pump added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchPetrolPumps();
            handleClose();
            resetForm();
        } catch (error) {
            console.error('Error saving petrol pump:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to add petrol pump',
            });
        }
    };

    // editing petrol pump
    const editPetrolPump = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        const data = {
            pumpName,
            location,
            latitude,
            longitude,
            contactNumber,
            address,
            fuelTypes
        };

        try {
            await axios.put(`${backendUrl}/petrol-pumps/${uid}`, data);
            Swal.fire({
                icon: 'success',
                title: 'Petrol pump updated',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchPetrolPumps();
            handleClose();
            resetForm();
            setUid('');
        } catch (error) {
            console.error('Error updating petrol pump:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update petrol pump',
            });
        }
    };

    // Reset form
    const resetForm = () => {
        setPumpName('');
        setLocation('');
        setLatitude('');
        setLongitude('');
        setContactNumber('');
        setAddress('');
        setFuelTypes([]);
        setErrors({});
        setFormSubmitted(false);
    };

    // opening modal
    const handleOpen = async (id: any | null = null) => {
        if (id) {
            setIsEditMode(true);
            try {
                const response = await axios.get(`${backendUrl}/petrol-pumps/${id}`);
                const pump = response.data.data;
                setUid(id);
                setPumpName(pump.pumpName);
                setLocation(pump.location);
                setLatitude(pump.latitude);
                setLongitude(pump.longitude);
                setContactNumber(pump.contactNumber || '');
                setAddress(pump.address || '');
                setFuelTypes(pump.fuelTypes || []);
            } catch (error) {
                console.error('Error fetching petrol pump:', error);
            }
        } else {
            setIsEditMode(false);
            resetForm();
        }
        setOpen(true);
    };

    // closing modal
    const handleClose = () => {
        setOpen(false);
        resetForm();
    };

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

    // delete petrol pump
    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`${backendUrl}/petrol-pumps/${id}`);
            setPetrolPumps(petrolPumps.filter((pump) => pump._id !== id));
            setModalVisible(false);
            Swal.fire({
                icon: 'success',
                title: 'Petrol pump deleted',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error deleting petrol pump:', error.message);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Error deleting petrol pump: ${error.message}`,
                });
            } else {
                console.error('Unknown error deleting petrol pump:', error);
            }
        }
    };

    return (
        <div>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12 my-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">Petrol Pumps</h5>
                        <button className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600" onClick={() => handleOpen()}>
                            <span className="flex items-center">
                                <MdLocalGasStation className="me-2" />
                                Add Petrol Pump
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            
            <table className={styles.tableContainer}>
                <thead>
                    <tr>
                        <th className={styles.tableHeader}>Pump Name</th>
                        <th className={styles.tableHeader}>Location</th>
                        <th className={styles.tableHeader}>Coordinates</th>
                        <th className={styles.tableHeader}>Fuel Types</th>
                        <th className={styles.tableHeader}>Contact</th>
                        <th className={styles.tableHeader}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {petrolPumps.map((pump, index) => (
                        <tr key={index} className={styles.tableRow}>
                            <td className={styles.tableCell} data-label="Pump Name">
                                <span>{pump?.pumpName ? pump.pumpName.charAt(0).toUpperCase() + pump.pumpName.slice(1) : 'Name not available'}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Location">
                                <span>{pump.location}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Coordinates">
                                <span>{pump.latitude}, {pump.longitude}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Fuel Types">
                                <span>{pump.fuelTypes?.join(', ') || 'N/A'}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Contact">
                                <span>{pump.contactNumber || 'N/A'}</span>
                            </td>
                            <td className={styles.tableActions} data-label="Actions">
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '50%', justifyContent: 'center' }}>
                                    <button onClick={() => handleOpen(pump._id)}>
                                        <IconPencil className="text-primary" />
                                    </button>
                                    <button onClick={() => openDeleteModal(pump._id)}>
                                        <IconTrashLines className="text-danger" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Add/Edit Modal */}
            <Modal open={open} onClose={handleClose} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
                <Box sx={style}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="pumpName" style={{ color: '#afafaf', display: 'block', marginBottom: '0.5rem' }}>
                            Petrol Pump Name *
                        </label>
                        <input
                            id="pumpName"
                            type="text"
                            value={pumpName}
                            onChange={(e) => setPumpName(e.target.value)}
                            className={`${styles.formInput} form-input`}
                            style={{ borderRadius: '5px', width: '100%' }}
                        />
                        {formSubmitted && errors.pumpName && <span style={{ color: 'red' }}>{errors.pumpName}</span>}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="location" style={{ color: '#afafaf', display: 'block', marginBottom: '0.5rem' }}>
                            Location *
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                id="location"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className={`${styles.formInput} form-input`}
                                style={{
                                    paddingRight: '50px',
                                    borderRadius: '5px',
                                    width: '100%',
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        window.open(
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
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
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span>Search</span>
                            </a>
                        </div>
                        {formSubmitted && errors.location && <span style={{ color: 'red' }}>{errors.location}</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label htmlFor="latitude" style={{ color: '#afafaf', display: 'block', marginBottom: '0.5rem' }}>
                                Latitude *
                            </label>
                            <input
                                id="latitude"
                                type="text"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                className={`${styles.formInput} form-input`}
                                style={{ borderRadius: '5px', width: '100%' }}
                            />
                            {formSubmitted && errors.latitude && <span style={{ color: 'red' }}>{errors.latitude}</span>}
                        </div>
                        <div>
                            <label htmlFor="longitude" style={{ color: '#afafaf', display: 'block', marginBottom: '0.5rem' }}>
                                Longitude *
                            </label>
                            <input
                                id="longitude"
                                type="text"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                className={`${styles.formInput} form-input`}
                                style={{ borderRadius: '5px', width: '100%' }}
                            />
                            {formSubmitted && errors.longitude && <span style={{ color: 'red' }}>{errors.longitude}</span>}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="contactNumber" style={{ color: '#afafaf', display: 'block', marginBottom: '0.5rem' }}>
                            Contact Number
                        </label>
                        <input
                            id="contactNumber"
                            type="text"
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            className={`${styles.formInput} form-input`}
                            style={{ borderRadius: '5px', width: '100%' }}
                            placeholder="10-digit number"
                        />
                        {formSubmitted && errors.contactNumber && <span style={{ color: 'red' }}>{errors.contactNumber}</span>}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="address" style={{ color: '#afafaf', display: 'block', marginBottom: '0.5rem' }}>
                            Address
                        </label>
                        <textarea
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className={`${styles.formInput} form-input`}
                            style={{ borderRadius: '5px', width: '100%', minHeight: '80px' }}
                            placeholder="Full address"
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#afafaf', display: 'block', marginBottom: '0.5rem' }}>
                            Fuel Types Available
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {availableFuelTypes.map((fuelType) => (
                                <label key={fuelType} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={fuelTypes.includes(fuelType)}
                                        onChange={() => handleFuelTypeChange(fuelType)}
                                    />
                                    <span>{fuelType}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '25px' }}>
                        <Button variant="outlined" color="error" onClick={handleClose}>
                            Close
                        </Button>
                        {isEditMode ? (
                            <Button variant="contained" color="info" className={styles.submitButton} onClick={editPetrolPump}>
                                Update
                            </Button>
                        ) : (
                            <Button variant="contained" color="success" className={styles.submitButton} onClick={handleSavePetrolPump}>
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

export default PetrolPump;