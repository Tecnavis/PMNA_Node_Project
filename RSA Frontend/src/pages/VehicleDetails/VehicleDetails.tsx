import React, { useCallback, useEffect, useState } from 'react';
import { debounce } from "lodash";
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { Button } from '@mui/material';
import Swal from 'sweetalert2';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GrNext, GrPrevious } from 'react-icons/gr';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import styles from './vehicledetails.module.css';
import IconMenuDocumentation from '../../components/Icon/Menu/IconMenuDocumentation';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
};

interface VehicleDetails {
    _id: string,
    serviceKM: number,
    serviceVehicle: string,
    totalOdometer: number,
    vehicleName: string,
    vehicleServiceDismissed: boolean
    vehicleServiceDue: boolean
}

interface Errors {
    vehicleName?: string;
    serviceVehicle?: string;
    serviceKM?: string;
}
const VehicleDetails: React.FC = () => {
    const [vehicles, setVehicles] = useState<VehicleDetails[]>([]);
    const [uid, setUid] = useState<string>('');
    const [vehicleName, setVehicleName] = useState<string>('');
    const [serviceVehicle, setServiceNumber] = useState<string>('');
    const [serviceKM, setServiceKM] = useState<string>('');
    const [errors, setErrors] = useState<Errors>({});
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    
    const navigate = useNavigate();

    // checking the token
    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            navigate('/auth/boxed-signin');
        }
    };

    // getting all vehicle-details
    const fetchVehicleDetails = async (searchTerm = '', page = 1, limit = 10) => {
        try {
            const response = await axios.get(`${backendUrl}/vehicle`, {
                params: { search: searchTerm, page, limit },
            });
            setVehicles(response.data.data);
            setTotalPages(Math.ceil(response.data.total / limit));
            setCurrentPage(response.data.page);
        } catch (error) {
            console.error('Error fetching service types:', error);
        }
    };

    const debouncedfetchVehicleDetails = useCallback(debounce(fetchVehicleDetails, 500), []);

    const handlePageChange = (page: any) => {
        setCurrentPage(page);
        fetchVehicleDetails('', page);
    };

    useEffect(() => {
        gettingToken();
        fetchVehicleDetails();
    }, []);

    // validating form
    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: Errors = {};

        if (!vehicleName) {
            newErrors.vehicleName = 'Vehicle name is required';
            isValid = false;
        }
        if (!serviceVehicle) {
            newErrors.serviceVehicle = 'Vehicle number is required';
            isValid = false;
        }
        if (!serviceKM) {
            newErrors.serviceKM = 'Service KM is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSaveVehicleDetails = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        try {
            await axios.post(`${backendUrl}/vehicle`, { serviceKM, serviceVehicle, vehicleName });
            Swal.fire({
                icon: 'success',
                title: 'Vehicle added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchVehicleDetails();
            handleClose();
            setVehicleName("")
            setServiceNumber("")
            setServiceKM("")
        } catch (error) {
            console.error('Error saving baselocation:', error);
        }
    };

    // editing baselocation
    const editVehicleDetails = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        try {
            await axios.put(`${backendUrl}/vehicle/${uid}`, { serviceKM, serviceVehicle, vehicleName });
            Swal.fire({
                icon: 'success',
                title: 'Vehicle Details edited',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchVehicleDetails();
            handleClose();
            setUid('');
            setVehicleName("")
            setServiceNumber("")
            setServiceKM("")
        } catch (error) {
            console.error('Error saving baseLocation:', error);
        }
    };

    // opening modal
    const handleOpen = async (id: any | null = null) => {
        setVehicleName("")
        setServiceNumber("")
        setServiceKM("")
        if (id) {
            setIsEditMode(true);
            try {
                const response = await axios.get(`${backendUrl}/vehicle/${id}`);
                setUid(id);
                setVehicleName(response.data.vehicleName)
                setServiceNumber(response.data.serviceVehicle)
                setServiceKM(response.data.serviceKM)
            } catch (error) {
                console.error('Error fetching baselocation:', error);
            }
        } else {
            setIsEditMode(false);
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
            await axios.delete(`${backendUrl}/vehicle/${id}`);
            setVehicles((prevVehicles) => prevVehicles.filter((item) => item._id !== id));
            setModalVisible(false);
            Swal.fire({
                icon: 'success',
                title: 'Vehicle Details deleted',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            if (error instanceof Error) {
                alert(`Error deleting Vehicle Details: ${error.message}`);
            } else {
                console.error('Unknown error deleting Vehicle Details:', error);
            }
        }
    };

    return (
        <div>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12 my-3"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Heading */}
                        <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left"> Vehicle List</h5>
                        {/* Search Bar */}
                        <div className="flex-grow sm:w-auto w-full mx-2">
                            <input
                                type="text"
                                placeholder="Search vehicles..."
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white-light"
                                onChange={(e) => debouncedfetchVehicleDetails(e.target.value)}
                            />
                        </div>
                        {/* Add Vehicle */}
                        <button className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600" onClick={() => handleOpen()}>
                            <span className="flex items-center">
                                <IconMenuDocumentation className="me-2"/>
                                Add Vehicle
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <table className={styles.tableContainer}>
                <thead>
                    <tr>
                        <th className={styles.tableHeader}>#</th>
                        <th className={styles.tableHeader}>Vehicle Name</th>
                        <th className={styles.tableHeader}>Vehicle Number</th>
                        <th className={styles.tableHeader}>Service KM</th>
                        <th className={styles.tableHeader}>Total Runned KM</th>
                        <th className={styles.tableHeader}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {vehicles?.map((vehicle, index) => (
                        <tr key={index} className={styles.tableRow}>
                            <td className={styles.tableCell} data-label="No">
                                <span>{index + 1}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Vehicle Name">
                                <span>{vehicle?.vehicleName}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Service Number">
                                <span>{vehicle?.serviceVehicle}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Service KM">
                                <span>{vehicle?.serviceKM}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Total Runned KM">
                                <span>{vehicle?.totalOdometer}</span>
                            </td>
                            <td className={styles.tableActions} data-label="Actions">
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '50%', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => handleOpen(vehicle?._id)}>
                                        <IconPencil className="text-primary" />
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(vehicle?._id)}>
                                        <IconTrashLines className="text-danger" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
                <Box sx={style}>
                    <div>
                        <label htmlFor="vehicleName" style={{ color: '#afafaf' }}>Vehicle Name :</label>
                        <input
                            id="vehicleName"
                            type="text"
                            value={vehicleName}
                            onChange={(e) => setVehicleName(e.target.value)}
                            className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.vehicleName && <span style={{ color: 'red' }}>{errors.vehicleName}</span>}
                    </div>
                    <div>
                        <label htmlFor="serviceVehicle" style={{ color: '#afafaf' }}>Vehicle Number :</label>
                        <input
                            id="serviceVehicle"
                            type="text"
                            value={serviceVehicle}
                            onChange={(e) => setServiceNumber(e.target.value)}
                            className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.serviceVehicle && <span style={{ color: 'red' }}>{errors.serviceVehicle}</span>}
                    </div>
                    <div>
                        <label htmlFor="serviceKM" style={{ color: '#afafaf' }}>Service KM :</label>
                        <input
                            id="serviceKM"
                            type="text"
                            value={serviceKM}
                            onChange={(e) => setServiceKM(e.target.value)}
                            className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.serviceKM && <span style={{ color: 'red' }}>{errors.serviceKM}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '25px' }}>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleClose}>
                            Close
                        </Button>
                        {isEditMode ? (
                            <Button
                                variant="contained"
                                color="info"
                                className={styles.submitButton}
                                onClick={editVehicleDetails}>
                                Update
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="success"
                                className={styles.submitButton}
                                onClick={handleSaveVehicleDetails}>
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
            <ul className="flex justify-center items-center space-x-2 mt-4">
                <li>
                    <button
                        type="button"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className="flex justify-center font-semibold p-2 rounded-full transition bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50"
                        disabled={currentPage === 1}
                    >
                        <GrPrevious />
                    </button>
                </li>
                {Array.from({ length: totalPages }, (_, index) => (
                    <li key={index}>
                        <button
                            type="button"
                            onClick={() => handlePageChange(index + 1)}
                            className={`px-4 py-2 rounded-full transition ${currentPage === index + 1
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-blue-300"
                                }`}
                        >
                            {index + 1}
                        </button>
                    </li>
                ))}
                <li>
                    <button
                        type="button"
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className="flex justify-center font-semibold p-2 rounded-full transition bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50"
                        disabled={currentPage === totalPages}
                    >
                        <GrNext />
                    </button>
                </li>
            </ul>
        </div>
    );
};

export default VehicleDetails;