import React, { useEffect, useState } from 'react';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import { VscFeedback } from "react-icons/vsc";
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { Button } from '@mui/material';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { GrChapterAdd } from 'react-icons/gr';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from 'axios';
import styles from './feedback.module.css';

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
interface Feedbacks {
    _id: string;
    question:string;
    yesPoint:number;
    noPoint:number
}

interface Errors {
    question?: string;
    yesPoint?: string;
    noPoint?: string;
}
const Feedbacks: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedbacks[]>([]);
    const [uid, setUid] = useState<string>('');
    const [question, setQuestion] = useState<string>('');
   
    const [yesPoint, setYesPoint] = useState<string>('');
    const [noPoint, setNoPoint] = useState<string>('');
    
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

    console.log(feedbacks,'feedback')
    // getting all service type

    const fetchFeedback = async () => {
        try {
            const response = await axios.get(`${backendUrl}/feedback`); 
            setFeedbacks(response.data.data);
        } catch (error) {
            console.error('Error fetching feedback:', error);
        }
    };

    useEffect(() => {
        gettingToken();
        fetchFeedback();
    }, []);

    // validating form

    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: Errors = {};

        if (!question.trim()) {
            newErrors.question = 'Question is required';
            isValid = false;
        }

        if (!yesPoint) {
            newErrors.yesPoint = 'Point is required';
            isValid = false;
        }

        if (!noPoint) {
            newErrors.noPoint = 'Point is required';
            isValid = false;
        }

   

        setErrors(newErrors);
        return isValid;
    };

    // posting the servicetype

    const postFeedback = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        const data = {
            question,
            yesPoint,
            noPoint
        };

        try {
            await axios.post(`${backendUrl}/feedback`, data);
            Swal.fire({
                icon: 'success',
                title: 'Feedback added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchFeedback();
            handleClose();
            setQuestion('');
            setYesPoint('');
            setNoPoint('');
        } catch (error) {
            console.error('Error saving service type:', error);
        }
    };

    // editing servicetype 

    const editFeedback = async () => {
        setFormSubmitted(true);

        if (!validateForm()) return;

        const data = {
            question,
            yesPoint,
            noPoint
        };

        try {
            await axios.put(`${backendUrl}/feedback/${uid}`, data);
            Swal.fire({
                icon: 'success',
                title: 'Feedback edited',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchFeedback();
            handleClose();
            setQuestion('');
            setYesPoint('');
            setNoPoint('');
            setUid('')
        } catch (error) {
            console.error('Error saving feedback:', error);
        }
    };

    // opening modal 

    const handleOpen = async(id: any | null = null) => {
        if (id) {
            setIsEditMode(true);
                    try {
                        const response = await axios.get(`${backendUrl}/feedback/${id}`);
                        setUid(id);
                        setQuestion(response.data.data.question);
                        setYesPoint(response.data.data.yesPoint);
                        setNoPoint(response.data.data.noPoint);
                    } catch (error) {
                        console.error('Error fetching service types:', error);
                    }
        } else {
            setIsEditMode(false);
            setQuestion('');
            setYesPoint('');
            setNoPoint('');
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
            await axios.delete(`${backendUrl}/feedback/${id}`);
            setFeedbacks(feedbacks.filter((feedback) => feedback._id !== id));
            setModalVisible(false);
            Swal.fire({
                icon: 'success',
                title: 'Feedback deleted',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error deleting feedback:', error.message);
                alert(`Error deleting feedback: ${error.message}`);
            } else {
                console.error('Unknown error deleting feedback:', error);
            }
        }
    };

    return (
        <div>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12 my-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">Feedback Questions</h5>

                        <button className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600" onClick={() => handleOpen()}>
                            <span className="flex items-center">
                                <VscFeedback className="me-2" />
                                Add Feedback
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <table className={styles.tableContainer}>
                <thead>
                    <tr>
                        <th className={styles.tableHeader}>Question</th>
                        <th className={styles.tableHeader}>Point (Yes)</th>
                        <th className={styles.tableHeader}>Point (No)</th>
                        <th className={styles.tableHeader}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {feedbacks.map((feedback, index) => (
                        <tr key={index} className={styles.tableRow}>
                            <td className={styles.tableCell} data-label="Service Name">
                                <span>{feedback.question.charAt(0).toUpperCase() + feedback.question.slice(1)}</span>
                            </td>
                            <td className={styles.tableCell} data-label="First Kilometers">
                                <span>{feedback.yesPoint}</span>
                            </td>
                            <td className={styles.tableCell} data-label="Additional Amount Per Km">
                                <span>{feedback.noPoint}</span>
                            </td>
                            
                            <td className={styles.tableActions} data-label="Actions">
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '50%', justifyContent: 'center' }}>
                                    <button onClick={() => handleOpen(feedback._id)}>
                                        <IconPencil className="text-primary" />
                                    </button>
                                    <button onClick={() => openDeleteModal(feedback._id)}>
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
                        <label htmlFor="serviceName" style={{color:'#afafaf'}}>Question</label>
                        <input id="serviceName" type="text" value={question} onChange={(e) => setQuestion(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.question && <span style={{ color: 'red' }}>{errors.question}</span>}
                    </div>
                    <div>
                        <label htmlFor="basicSalaryKM" style={{color:'#afafaf'}}>Point for Yes</label>
                        <input id="basicSalaryKM" type="number" value={yesPoint} onChange={(e) => setYesPoint(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.yesPoint && <span style={{ color: 'red' }}>{errors.yesPoint}</span>}
                    </div>
                    <div>
                        <label htmlFor="salaryPerKM" style={{color:'#afafaf'}}>Point for No</label>
                        <input id="salaryPerKM" type="number" value={noPoint} onChange={(e) => setNoPoint(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.noPoint && <span style={{ color: 'red' }}>{errors.noPoint}</span>}
                    </div>
                   
                  
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '25px' }}>
                        <Button variant="outlined" color="error" onClick={handleClose}>
                            Close
                        </Button>
                        {isEditMode ? (
                            <Button variant="contained" color="info" className={styles.submitButton} onClick={editFeedback}>
                                Update
                            </Button>
                        ) : (
                            <Button variant="contained" color="success" className={styles.submitButton} onClick={postFeedback}>
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

export default Feedbacks;
