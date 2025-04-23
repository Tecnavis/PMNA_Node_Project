import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import axios from 'axios';
import { MdShareLocation } from 'react-icons/md';
import { GrNext, GrPrevious } from 'react-icons/gr';
import { debounce } from 'lodash';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import styles from './vehicledetails.module.css';
import AddVehicleCompliance from './addVehicleCompliance';
import { dateFormate } from '../../utils/dateUtils'
import IconMenuDocumentation from '../../components/Icon/Menu/IconMenuDocumentation';
import { CLOUD_IMAGE } from '../../constants/status';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const columns = [
    "#",
    "Vehicle Number",
    "Tax Expiry",
    "Insurance Expiry",
    "Pollution Expiry",
    "EMI Expiry",
    "Insurance Paper",
    "Tax Paper",
    "Actions",
];

export interface VehicleRecord {
    _id: string;
    vehicleNumber: string;
    serviceVehicle: string;
    emiExpiryDate: string;
    insuranceExpiryDate: string;
    pollutionExpiryDate: string;
    taxExpiryDate: string;
    taxPaperUrl: string;
    insurancePaperUrl: string;
    pollutionDueDismissedBy: string;
    insuranceDueDismissedBy: string;
    taxDueDismissedBy: string;
    emiDueDismissedBy: string;
    serviceKM: string;
}

const VehicleCompliance: React.FC = () => {

    const [records, setRecords] = useState<VehicleRecord[]>([])
    const [id, setId] = useState<string>('')
    const [openModal, setOpenModal] = useState<boolean>(false)
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleOpen = () => {
        setOpenModal(true)
    }
    const handleClose = () => {
        setOpenModal(false)
        setIsEditMode(false)
    }

    // checking the token
    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            navigate('/auth/boxed-signin');
        }
    };

    const fetchComplianceDetails = async (searchTerm = '', page = 1, limit = 10) => {
        try {
            const response = await axios.get(`${backendUrl}/vehicle/compliance-record`, {
                params: { search: searchTerm, page, limit }
            });
            setRecords(response.data.data);
            setTotalPages(Math.ceil(response.data.total / limit));
            setCurrentPage(response.data.page);
        } catch (error) {
            console.error('Error fetching service types:', error);
        }
    }

    const debouncedFfetchComplianceDetails = useCallback(debounce(fetchComplianceDetails, 500), []);

    const handlePageChange = (page: any) => {
        setCurrentPage(page);
        fetchComplianceDetails('', page);
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`${backendUrl}/vehicle/compliance-record/${id}`);
            setRecords((record) => record.filter((item) => item._id !== id));
            setModalVisible(false);
            Swal.fire({
                icon: 'success',
                title: 'Record Details deleted',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            if (error instanceof Error) {
                alert(`Error deleting Record Details: ${error.message}`);
            } else {
                console.error('Unknown error deleting Record Details:', error);
            }
        }
    };

    // opening modal for delete confirmation
    const openDeleteModal = (item: string) => {
        setItemToDelete(item);
        setModalVisible(true);
    };

    const openEditmodal = (id: string) => {
        setIsEditMode(true);
        setId(id);
        handleOpen();
    };

    // closing modal for delete confirmation
    const closeModal = () => {
        setModalVisible(false);
        setItemToDelete(null);
    };

    const today = new Date()

    useEffect(() => {
        fetchComplianceDetails()
        gettingToken()
    }, [])

    return (
        <div>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12 my-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Heading */}
                        <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left"> Tax, Pollution, EMI & Insurance Records</h5>
                        {/* Search Bar */}
                        <div className="flex-grow sm:w-auto w-full mx-2">
                            <input
                                type="text"
                                placeholder="Search records..."
                                onChange={(e) => debouncedFfetchComplianceDetails(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white-light"
                            />
                        </div>
                        {/* Add Vehicle */}
                        <button className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600"
                            onClick={handleOpen}
                        >
                            <span className="flex items-center">
                                <IconMenuDocumentation className="me-2" />
                                Add Vehicle Details
                            </span>
                        </button>
                        <AddVehicleCompliance
                            open={openModal}
                            handleClose={handleClose}
                            fetchComplianceDetails={fetchComplianceDetails}
                        />
                    </div>
                </div>
            </div>
            <table className={styles.tableContainer}>
                <thead>
                    <tr>
                        {columns.map((column, index) => (
                            <th key={index} className={styles.tableHeader}>
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                {/* Table body*/}
                <tbody>
                    {
                        records?.map((record, index) => (
                            <tr className={styles.tableRow}>
                                <td className={styles.tableCell} data-label="No">
                                    <span>{index + 1}</span>
                                </td>
                                <td className={styles.tableCell} data-label="Vehicle Number">
                                    <span>{record.vehicleNumber}</span>
                                </td>
                                <td
                                    data-label="Tax Expiry"
                                    className={new Date(record.taxExpiryDate) < today ? "bg-green-200" : ""}
                                >
                                    <span>{dateFormate(record.taxExpiryDate)}</span>
                                    {record.taxDueDismissedBy && <span><br /> Dismissed by: {record.taxDueDismissedBy}</span>}
                                </td>

                                <td
                                    className={`${styles.tableCell} ${new Date(record.insuranceExpiryDate) < today ? "bg-green-200" : ""}`}
                                    data-label="Insurance Expiry"
                                >
                                    <span>{dateFormate(record.insuranceExpiryDate)}</span>
                                    {record.insuranceDueDismissedBy && <span><br /> Dismissed by: {record.insuranceDueDismissedBy}</span>}
                                </td>

                                <td
                                    className={`${styles.tableCell} ${new Date(record.pollutionExpiryDate) < today ? "bg-green-200" : ""}`}
                                    data-label="Pollution Expiry"
                                >
                                    <span>{dateFormate(record.pollutionExpiryDate)}</span>
                                    {record.pollutionDueDismissedBy && <span><br /> Dismissed by: {record.pollutionDueDismissedBy}</span>}
                                </td>

                                <td
                                    className={`${styles.tableCell} ${new Date(record.emiExpiryDate) < today ? "bg-green-200" : ""}`}
                                    data-label="EMI Expiry"
                                >
                                    <span>{dateFormate(record.emiExpiryDate)}</span>
                                    {record.emiDueDismissedBy && <span><br />Dismissed by: {record.emiDueDismissedBy}</span>}
                                </td>
                                <td className={styles.tableCell} data-label="Insurance Paper">
                                    <Link className='text-blue-600' to={`${CLOUD_IMAGE}${record.insurancePaperUrl}`}>View Tax Paper</Link>
                                </td>
                                <td className={styles.tableCell} data-label="Total Runned KM">
                                    <Link to={`${CLOUD_IMAGE}${record.taxPaperUrl}`} className='text-blue-600'>View Insurance Paper</Link>
                                </td>
                                <td className={styles.tableActions} data-label="Actions">
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '50%', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => openEditmodal(record._id)}
                                        >
                                            <IconPencil className="text-primary" />
                                        </button>
                                        <AddVehicleCompliance
                                            open={openModal}
                                            handleClose={handleClose}
                                            fetchComplianceDetails={fetchComplianceDetails}
                                            isEditMode={isEditMode}
                                            id={id}
                                        />
                                        <button
                                            onClick={() => openDeleteModal(record._id)}
                                        >
                                            <IconTrashLines className="text-danger" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
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
    )
}

export default VehicleCompliance