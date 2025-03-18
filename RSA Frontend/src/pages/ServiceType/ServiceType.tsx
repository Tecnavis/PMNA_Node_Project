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
import styles from './serviceType.module.css';

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
interface ServiceType {
    _id: string;
    serviceName: string;
    expensePerKm: number;
    firstKilometerAmount: number;
    additionalAmount: number;
    firstKilometer: number; 
}

interface Errors {
    serviceName?: string;
    firstKilometer?: string;
    additionalAmount?: string;
    firstKilometerAmount?: string;
    expencePerKm?: string;
}
const ServiceType: React.FC = () => {
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [uid, setUid] = useState<string>('');
    const [serviceName, setServiceName] = useState<string>('');
    const [firstKilometerAmount, setFirstKilometerAmount] = useState<string>('');
    const [firstKilometer, setFirstKilometer] = useState<string>('');
    const [additionalAmount, setAdditionalAmount] = useState<string>('');
    const [expencePerKm, setExpencePerKm] = useState<string>(''); 
    const [currentService, setCurrentService] = useState<ServiceType | null>(null);
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

    // getting all service type

    const fetchServiceTypes = async () => {
        try {
            const response = await axios.get(`${backendUrl}/serviceType`); 
            setServiceTypes(response.data);
        } catch (error) {
            console.error('Error fetching service types:', error);
        }
    };

    useEffect(() => {
        gettingToken();
        fetchServiceTypes();
    }, []);

    // validating form

    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: Errors = {};

        if (!serviceName.trim()) {
            newErrors.serviceName = 'Service type is required';
            isValid = false;
        }

        if (!firstKilometer) {
            newErrors.firstKilometer = 'First Kilometer is required';
            isValid = false;
        }

        if (!additionalAmount) {
            newErrors.additionalAmount = 'Salary per KM is required';
            isValid = false;
        }

        if (!firstKilometerAmount) {
            newErrors.firstKilometerAmount = 'Salary is required';
            isValid = false;
        }

        if (!expencePerKm) {
            newErrors.expencePerKm = 'Expense per KM is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // posting the servicetype

    const handleSaveServiceType = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        const data = {
            serviceName: serviceName,
            firstKilometer: firstKilometer,
            additionalAmount: additionalAmount,
            firstKilometerAmount: firstKilometerAmount,
            expensePerKm: expencePerKm,
        };

        try {
            await axios.post(`${backendUrl}/serviceType`, data);
            Swal.fire({
                icon: 'success',
                title: 'Service type added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchServiceTypes();
            handleClose();
            setServiceName('');
            setFirstKilometerAmount('');
            setFirstKilometer('');
            setAdditionalAmount('');
            setExpencePerKm('');
        } catch (error) {
            console.error('Error saving service type:', error);
        }
    };

    // editing servicetype 

    const editSaveServiceType = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        const data = {
            serviceName: serviceName,
            firstKilometer: firstKilometer,
            additionalAmount: additionalAmount,
            firstKilometerAmount: firstKilometerAmount,
            expensePerKm: expencePerKm,
        };

        try {
            await axios.put(`${backendUrl}/serviceType/${uid}`, data);
            Swal.fire({
                icon: 'success',
                title: 'Service type edited',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchServiceTypes();
            handleClose();
            setServiceName('');
            setFirstKilometerAmount('');
            setFirstKilometer('');
            setAdditionalAmount('');
            setExpencePerKm('');
            setUid('')
        } catch (error) {
            console.error('Error saving service type:', error);
        }
    };

    // opening modal 

    const handleOpen = async(id: any | null = null) => {
        if (id) {
            setIsEditMode(true);
                    try {
                        const response = await axios.get(`${backendUrl}/serviceType/${id}`);
                        setUid(id);
                        setServiceName(response.data.serviceName);
                        setFirstKilometerAmount(response.data.firstKilometerAmount);
                        setFirstKilometer(response.data.firstKilometer);
                        setAdditionalAmount(response.data.additionalAmount);
                        setExpencePerKm(response.data.expensePerKm);
                    } catch (error) {
                        console.error('Error fetching service types:', error);
                    }
        } else {
            setIsEditMode(false);
            setServiceName('');
            setFirstKilometerAmount('');
            setFirstKilometer('');
            setAdditionalAmount('');
            setExpencePerKm('');
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
            await axios.delete(`${backendUrl}/serviceType/${id}`);
            setServiceTypes(serviceTypes.filter((service) => service._id !== id));
            setModalVisible(false);
            Swal.fire({
                icon: 'success',
                title: 'Service deleted',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error deleting service type:', error.message);
                alert(`Error deleting service: ${error.message}`);
            } else {
                console.error('Unknown error deleting service type:', error);
            }
        }
    };

    return (
        <div>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12 my-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">Service Types</h5>

                        <button className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600" onClick={() => handleOpen()}>
                            <span className="flex items-center">
                                <GrChapterAdd className="me-2" />
                                Add Service Type
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <table className={styles.tableContainer}>
                <thead>
                    <tr>
                        <th className={styles.tableHeader}>Service Name</th>
                        <th className={styles.tableHeader}>First Kilometers</th>
                        <th className={styles.tableHeader}>Additional Amount Per Km</th>
                        <th className={styles.tableHeader}>First Kilometers Amount</th>
                        <th className={styles.tableHeader}>Expense per KM</th>
                        <th className={styles.tableHeader}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {serviceTypes.map((service, index) => (
                        <tr key={index} className={styles.tableRow}>
                            <td className={styles.tableCell} data-label="Service Name">
                                <span>{service.serviceName.charAt(0).toUpperCase() + service.serviceName.slice(1)}</span>
                            </td>
                            <td className={styles.tableCell} data-label="First Kilometers">
                                <span>{service.firstKilometer} KM</span>
                            </td>
                            <td className={styles.tableCell} data-label="Additional Amount Per Km">
                                <span>{service.additionalAmount}</span>
                            </td>
                            <td className={styles.tableCell} data-label="First Kilometers Amount">
                                <span>{service.firstKilometerAmount}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Expense per KM">
                                <span>{service.expensePerKm}</span> {/* New data display */}
                            </td>
                            <td className={styles.tableActions} data-label="Actions">
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '50%', justifyContent: 'center' }}>
                                    <button onClick={() => handleOpen(service._id)}>
                                        <IconPencil className="text-primary" />
                                    </button>
                                    <button onClick={() => openDeleteModal(service._id)}>
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
                    <div>
                        <label htmlFor="serviceName" style={{color:'#afafaf'}}>Service Name</label>
                        <input id="serviceName" type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.serviceName && <span style={{ color: 'red' }}>{errors.serviceName}</span>}
                    </div>
                    <div>
                        <label htmlFor="basicSalaryKM" style={{color:'#afafaf'}}>First Kilometers</label>
                        <input id="basicSalaryKM" type="number" value={firstKilometer} onChange={(e) => setFirstKilometer(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.firstKilometer && <span style={{ color: 'red' }}>{errors.firstKilometer}</span>}
                    </div>
                    <div>
                        <label htmlFor="salaryPerKM" style={{color:'#afafaf'}}>Additional Amount Per Km</label>
                        <input id="salaryPerKM" type="number" value={additionalAmount} onChange={(e) => setAdditionalAmount(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.additionalAmount && <span style={{ color: 'red' }}>{errors.additionalAmount}</span>}
                    </div>
                    <div>
                        <label htmlFor="salary" style={{color:'#afafaf'}}>First Kilometers Amount</label>
                        <input id="salary" type="number" value={firstKilometerAmount} onChange={(e) => setFirstKilometerAmount(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.firstKilometerAmount && <span style={{ color: 'red' }}>{errors.firstKilometerAmount}</span>}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label className={styles.label} style={{color:'#afafaf'}}>Expense per KM</label> 
                        <input type="text" value={expencePerKm} onChange={(e) => setExpencePerKm(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.expencePerKm && (
                            <span style={{ color: 'red' }} className={styles.error}>
                                {errors.expencePerKm}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '25px' }}>
                        <Button variant="outlined" color="error" onClick={handleClose}>
                            Close
                        </Button>
                        {isEditMode ? (
                            <Button variant="contained" color="info" className={styles.submitButton} onClick={editSaveServiceType}>
                                Update
                            </Button>
                        ) : (
                            <Button variant="contained" color="success" className={styles.submitButton} onClick={handleSaveServiceType}>
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

export default ServiceType;
