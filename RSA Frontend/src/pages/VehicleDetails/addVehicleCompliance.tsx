import { Box, Button, Modal } from "@mui/material"
import React, { useEffect, useState } from "react"
import { style } from './VehicleDetails'
import styles from './vehicledetails.module.css';
import Swal from 'sweetalert2';
import axios from 'axios';
import { Link, useNavigate } from "react-router-dom";
import type { VehicleRecord } from "./VehicleCompliance";
import { formatToInputDate } from "../../utils/dateUtils";
import { CLOUD_IMAGE } from "../../constants/status";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

type AddVehicleComplianceType = {
    open: boolean,
    handleClose: () => void,
    fetchComplianceDetails: (searchTerm?: string, page?: number, limit?: number) => void;
    isEditMode?: boolean,
    id?: string
}

interface Errors {
    [key: string]: string
}

const AddVehicleCompliance: React.FC<AddVehicleComplianceType> = ({ open, handleClose, isEditMode, fetchComplianceDetails, id }) => {

    const [vehicleNumber, setVehicleNumber] = useState<string>('');
    const [emiExpiryDate, setEmiExpiryDate] = useState<string>('');
    const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<string>('');
    const [pollutionExpiryDate, setPollutionExpiryDate] = useState<string>('');
    const [taxExpiryDate, setTaxExpiryDate] = useState<string>('');
    const [insurancePaper, setInsurancePaper] = useState<File | null>(null);
    const [taxPaper, setTaxPaper] = useState<File | null>(null);
    const [taxPaperChange, setTaxPaperChange] = useState<boolean>(false);
    const [insurancePaperChange, setInsurance] = useState<boolean>(false);
    const [errors, setErrors] = useState<Errors>({});
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

    const navigate = useNavigate();

    const clearState = () => {
        setVehicleNumber('')
        setEmiExpiryDate('')
        setInsuranceExpiryDate('')
        setPollutionExpiryDate('')
        setTaxExpiryDate('')
        setInsurancePaper(null)
        setTaxPaper(null)
        setErrors({})
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "insurance" | "tax") => {
        if (e.target.files && e.target.files.length > 0) {
            if (type === "insurance") {
                setInsurancePaper(e.target.files[0]);
                setInsurance(true)
            } else {
                setTaxPaper(e.target.files[0]);
                setTaxPaperChange(true)
            }
        }
    };

    // checking the token
    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            navigate('/auth/boxed-signin');
        }
    };

    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: Errors = {};

        if (!vehicleNumber.trim()) {
            newErrors.vehicleNumber = "Vehicle number is required";
            isValid = false;
        }

        if (!emiExpiryDate) {
            newErrors.emiExpiryDate = "EMI expiry date is required";
            isValid = false;
        }

        if (!insuranceExpiryDate) {
            newErrors.insuranceExpiryDate = "Insurance expiry is required";
            isValid = false;
        }

        if (!pollutionExpiryDate) {
            newErrors.pollutionExpiryDate = "Pollution expiry is required";
            isValid = false;
        }

        if (!taxExpiryDate) {
            newErrors.taxExpiryDate = "Tax expiry is required";
            isValid = false;
        }

        if (!insurancePaper && !isEditMode) {
            newErrors.insurancePaper = "Insurance paper file is required";
            isValid = false;
        }

        if (!taxPaper && !isEditMode) {
            newErrors.taxPaper = "Tax paper file is required";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setFormSubmitted(true);

        if (!validateForm()) return;

        const formData = new FormData();
        formData.append("vehicleNumber", vehicleNumber);
        formData.append("emiExpiryDate", emiExpiryDate);
        formData.append("insuranceExpiryDate", insuranceExpiryDate);
        formData.append("pollutionExpiryDate", pollutionExpiryDate);
        formData.append("taxExpiryDate", taxExpiryDate);
        formData.append("insurancePaperChange", String(insurancePaperChange));
        formData.append("taxPaperChange", String(taxPaperChange));

        if (insurancePaperChange && insurancePaper) {
            formData.append("images", insurancePaper); // Append insurance paper file
        }
        if (taxPaperChange && taxPaper) {
            formData.append("images", taxPaper); // Append tax paper file
        }

        try {
            if (isEditMode) {
                // Editing existing record
                await axios.put(`${backendUrl}/vehicle/compliance-record/${id}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Vehicle record updated',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
            } else {
                // Creating new record
                await axios.post(`${backendUrl}/vehicle/compliance-record`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Vehicle record added',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
            }

            fetchComplianceDetails();
            clearState();
            handleClose();
        } catch (error: any) {
            Swal.fire({
                title: "Error",
                text: error.message || `Failed to ${isEditMode ? 'update' : 'create'} the record.`,
                toast: true,
                icon: "error",
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        }
    };


    useEffect(() => {
        gettingToken();
        if (isEditMode) {
            const fetchRecord = async () => {
                const response = await axios.get(`${backendUrl}/vehicle/compliance-record/${id}`);
                const data = response.data

                setVehicleNumber(data?.vehicleNumber || "");
                setEmiExpiryDate(data?.emiExpiryDate || "");
                setInsuranceExpiryDate(data?.insuranceExpiryDate || "");
                setPollutionExpiryDate(data?.pollutionExpiryDate || "");
                setTaxExpiryDate(data?.taxExpiryDate || "");
                setTaxPaper(data?.taxPaperUrl || null);
                setInsurancePaper(data?.insurancePaperUrl || null);
            };
            fetchRecord();
        } else {
            clearState();
        }
    }, [open, isEditMode, id]);

    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description">
            <Box sx={style}>
                <form onSubmit={handleSubmit}>
                    <h2 id="parent-modal-title">Add Vehicle Details</h2>
                    <div>
                        <label htmlFor="vehicleNumber" style={{ color: '#afafaf' }}>Vehicle Number :</label>
                        <input
                            id="vehicleNumber"
                            value={vehicleNumber}
                            type="text"
                            onChange={(e) => setVehicleNumber(e.target.value)}
                            className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.vehicleNumber && <span className='text-red-500 text-xs' >{errors.vehicleNumber}</span>}

                    </div>
                    <div>
                        <label htmlFor="taxExpiryDate" style={{ color: '#afafaf' }}>Tax Expiry Date :</label>
                        <input
                            id="taxExpiryDate"
                            defaultValue={formatToInputDate(taxExpiryDate)}
                            onChange={(e) => setTaxExpiryDate(e.target.value)}
                            type="date"
                            className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.taxExpiryDate && <span className='text-red-500 text-xs' >{errors.taxExpiryDate}</span>}
                    </div>
                    <div>
                        <label htmlFor="insuranceExpiryDate" style={{ color: '#afafaf' }}>Insurance Expiry Date :</label>
                        <input
                            id="insuranceExpiryDate"
                            defaultValue={formatToInputDate(insuranceExpiryDate)}
                            onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                            type="date"
                            className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.insuranceExpiryDate && <span className='text-red-500 text-xs' >{errors.insuranceExpiryDate}</span>}
                    </div>
                    <div>
                        <label htmlFor="pllutionExpiryDate" style={{ color: '#afafaf' }}>Pllution Expiry Date :</label>
                        <input
                            id="pllutionExpiryDate"
                            defaultValue={formatToInputDate(pollutionExpiryDate)}
                            onChange={(e) => setPollutionExpiryDate(e.target.value)}
                            type="date"
                            className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.pollutionExpiryDate && <span className='text-red-500 text-xs' >{errors.pollutionExpiryDate}</span>}
                    </div>
                    <div>
                        <label htmlFor="emiExpiryDate" style={{ color: '#afafaf' }}>EMI Expiry Date :</label>
                        <input
                            id="emiExpiryDate"
                            defaultValue={formatToInputDate(emiExpiryDate)}
                            onChange={(e) => setEmiExpiryDate(e.target.value)}
                            type="date"
                            className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.emiExpiryDate && <span className='text-red-500 text-xs' >{errors.emiExpiryDate}</span>}
                    </div>
                    <div>
                        <label htmlFor="insurancePaper" className="mt-2" style={{ color: '#afafaf' }}>Upload Insurance Paper :</label>
                        <input
                            id="insurancePaper"
                            type="file"
                            onChange={(e) => handleFileChange(e, 'insurance')}
                        />
                        {formSubmitted && errors.insurancePaper && <span className='text-red-500 text-xs' >{errors.insurancePaper}</span>}
                        {
                            isEditMode && <Link to={`${CLOUD_IMAGE}${insurancePaper || ""}`} className='text-blue-600'>View Insurance Paper</Link>
                        }
                    </div>
                    <div>
                        <label htmlFor="taxPaper" className="mt-2" style={{ color: '#afafaf' }}>Upload Tax Paper :</label>
                        <input
                            id="taxPaper"
                            type="file"
                            onChange={(e) => handleFileChange(e, 'tax')}
                        />
                        {formSubmitted && errors.taxPaper && <span className='text-red-500 text-xs' >{errors.taxPaper}</span>}
                        {
                            isEditMode && <Link to={`${CLOUD_IMAGE}${taxPaper || ""}`} className='text-blue-600'>View Existing Tax Paper</Link>
                        }
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
                                type='submit'
                                variant="contained"
                                color="info"
                                className={styles.submitButton}
                            >
                                Update
                            </Button>
                        ) : (
                            <Button
                                type='submit'
                                variant="contained"
                                color="success"
                                className={styles.submitButton}
                            >
                                Add Record
                            </Button>
                        )}
                    </div>
                </form>
            </Box>
        </Modal>
    )
}

export default AddVehicleCompliance;