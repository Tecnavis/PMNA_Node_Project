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
import styles from './Leaves.module.css';
import 'react-calendar/dist/Calendar.css';
import './customCalendar.css'; // Our custom styles
import CalenderModal from './CalenderModal';
import IconMenuCalendar from '../../components/Icon/Menu/IconMenuCalendar';
// ------------------------------------------
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

interface Leave {
    _id: string;
    leaveDate: string; // ISO date string
    driver: string;
}

interface Errors {
    leaveDate?: string;
    driver?: string;
}

const Leaves: React.FC = () => {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [uid, setUid] = useState<string>('');
    const [leaveDate, setLeaveDate] = useState<string>('');
    const [driver, setDriver] = useState<string>('');
    const [errors, setErrors] = useState<Errors>({});
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [drivers, setDrivers] = useState<{ _id: string; name: string }[]>([]);
    const [filteredLeaves, setFilteredLeaves] = useState<Leave[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const toggleCalendar = () => {
        setCalendarOpen(!calendarOpen);
    };
    // Check token and set axios header or redirect to login if token not found
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
    // Fetch all drivers

    const fetchDrivers = async () => {
        try {
            const response = await axios.get(`${backendUrl}/driver`);
            setDrivers(response.data); // Ensure your backend returns an array of drivers
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };
    // Fetch all leaves
    const fetchLeaves = async () => {
        try {
            const response = await axios.get(`${backendUrl}/leaves`);
            const formattedLeaves = response.data.map((leave: any) => ({
                ...leave,
                driver:
                    leave.driver && typeof leave.driver === 'object'
                        ? leave.driver.name
                        : typeof leave.driver === 'string'
                        ? leave.driver
                        : 'Unknown',
            }));
            setLeaves(formattedLeaves);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        }
    };
    useEffect(() => {
        let tempLeaves = [...leaves];

        // Filter by selected year/month
        if (selectedYear || selectedMonth) {
            tempLeaves = tempLeaves.filter((leave) => {
                const date = new Date(leave.leaveDate);
                const y = date.getFullYear().toString();
                const m = (date.getMonth() + 1).toString().padStart(2, '0');
                return (!selectedYear || y === selectedYear) && (!selectedMonth || m === selectedMonth);
            });
        }

        // Filter by driver name or date string
        if (searchTerm) {
            tempLeaves = tempLeaves.filter((leave) => {
              const formattedDate = new Date(leave.leaveDate).toLocaleDateString('en-GB'); // e.g., "21/03/2025"
              return (
                leave.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
                formattedDate.includes(searchTerm)
              );
            });
          }

        setFilteredLeaves(tempLeaves);
    }, [leaves, selectedYear, selectedMonth, searchTerm]);

    useEffect(() => {
        gettingToken();
        fetchLeaves();
        fetchDrivers();
    }, []);
    // 3. Build a map of date -> driver(s) for highlight
    const leaveMap: { [dateString: string]: string[] } = {};
    filteredLeaves.forEach((leave) => {
        // Convert to local date string (no time)
        const dayStr = new Date(leave.leaveDate).toDateString();
        if (!leaveMap[dayStr]) {
            leaveMap[dayStr] = [];
        }
        leaveMap[dayStr].push(leave.driver);
    });

    // 4. React Calendar tile class
    const tileClassName = ({ date, view }: { date: Date; view: string }) => {
        if (view === "month") {
          const dayStr = date.toDateString();
          const hasLeave = leaves.some((leave) => {
            const leaveDate = new Date(leave.leaveDate).toDateString();
            return leaveDate === dayStr;
          });
          return hasLeave ? "leave-day" : "";
        }
        return "";
      };

      const tileContent = ({ date, view }: { date: Date; view: string }) => {
        if (view === "month") {
            const dayStr = date.toDateString();
            const dayLeaves = leaves.filter((leave) => {
                const leaveDate = new Date(leave.leaveDate).toDateString();
                return leaveDate === dayStr;
            });
    
            if (dayLeaves.length > 0) {
                return (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            position: "absolute",
                            bottom: "2px",  // Align at the bottom
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontSize: "0.6rem",
                            color: "white",
                            backgroundColor: "rgba(237, 122, 122, 0.8)",
                            padding: "2px 4px",
                            borderRadius: "4px",
                            width: "90%",
                            textAlign: "center",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {dayLeaves.map((leave, index) => (
                            <div key={index}>{leave.driver}</div>
                        ))}
                    </div>
                );
            }
        }
        return null;
    };
    
    // Validate form fields
    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: Errors = {};

        if (!leaveDate.trim()) {
            newErrors.leaveDate = 'Leave date is required';
            isValid = false;
        }

        if (!driver.trim()) {
            newErrors.driver = 'Driver is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // Create a new leave
    const handleSaveLeave = async () => {
        setFormSubmitted(true);
        if (!validateForm()) return;

        const data = { leaveDate, driver };

        try {
            await axios.post(`${backendUrl}/leaves`, data);
            Swal.fire({
                icon: 'success',
                title: 'Leave added',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchLeaves();
            handleClose();
            setLeaveDate('');
            setDriver('');
        } catch (error:any) {
            console.error('Error saving leave:', error.response.data.message);
            Swal.fire({
                icon: 'warning',
                title: error?.response?.data?.message || 'Error saving leave',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchLeaves();
            handleClose();
            setLeaveDate('');
            setDriver('');
        }
    };

    // Update an existing leave
    const editSaveLeave = async () => {
        setFormSubmitted(true);
        if (!validateForm()) return;

        const data = { leaveDate, driver };

        try {
            await axios.put(`${backendUrl}/leaves/${uid}`, data);
            Swal.fire({
                icon: 'success',
                title: 'Leave updated',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
            fetchLeaves();
            handleClose();
            setLeaveDate('');
            setDriver('');
            setUid('');
        } catch (error) {
            console.error('Error updating leave:', error);
        }
    };

    // Open modal for add/edit. If an ID is provided, load the leave data.
    const handleOpen = async (id: string | null = null) => {
        if (id) {
            setIsEditMode(true);
            try {
                const response = await axios.get(`${backendUrl}/leaves/${id}`);
                setUid(id);
                // Assuming leaveDate is an ISO string, convert it to YYYY-MM-DD for input
                setLeaveDate(response.data.leaveDate ? response.data.leaveDate.split('T')[0] : '');
                setDriver(response.data.driver);
            } catch (error) {
                console.error('Error fetching leave:', error);
            }
        } else {
            setIsEditMode(false);
            setLeaveDate('');
            setDriver('');
        }
        setErrors({});
        setFormSubmitted(false);
        setOpen(true);
    };

    // Close modal
    const handleClose = () => setOpen(false);

    // Open confirmation modal for deletion
    const openDeleteModal = (id: string) => {
        setItemToDelete(id);
        setModalVisible(true);
    };

    // Close confirmation modal
    const closeModal = () => {
        setModalVisible(false);
        setItemToDelete(null);
    };

    // Delete a leave
    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`${backendUrl}/leaves/${id}`);
            setLeaves(leaves.filter((leave) => leave._id !== id));
            setModalVisible(false);
            Swal.fire({
                icon: 'success',
                title: 'Leave deleted',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                padding: '10px 20px',
            });
        } catch (error) {
            console.error('Error deleting leave:', error);
        }
    };
    // Open/Close modal
    const closeCalendarModal = () => setCalendarOpen(false);

    return (
        <div>
            <div className="container-fluid">
                <CalenderModal
                
                    open={calendarOpen}
                    onClose={closeCalendarModal}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    tileClassName={tileClassName}
                    tileContent={tileContent}
                    
                />

                <div className="row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="col-12 my-3">
                        <h5 className="font-semibold text-lg dark:text-white-light sm:w-auto w-full text-center sm:text-left">Leaves</h5>
                    </div>
                    <br />

                    <div className="flex-grow sm:w-auto w-full m-2">
  <input
    type="text"
    placeholder="Search by driver or leave date (dd/mm/yyyy)..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white-light"
  />
</div>

                    <button className="font-semibold text-danger hover:text-gray-400" onClick={toggleCalendar}>
                        <span className="flex items-center">
                            <IconMenuCalendar className="me-2" />
                            Show Calendar
                        </span>
                    </button>
                  
                    <button className="font-semibold text-success hover:text-gray-400 ml-2" onClick={() => handleOpen()}>
                        <span className="flex items-center">
                            <GrChapterAdd className="me-2" />
                            Add Leave
                        </span>
                    </button>
                </div>
            </div>
            <table className={styles.tableContainer}>
                <thead>
                    <tr>
                        <th className={styles.tableHeader}>Leave Date</th>
                        <th className={styles.tableHeader}>Driver</th>
                        <th className={styles.tableHeader}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredLeaves.map((leave, index) => (
                        <tr key={index} className={styles.tableRow}>
                            <td className={styles.tableCell} data-label="Leave Date">
                                <span>
                                    {new Date(leave.leaveDate).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                    })}
                                </span>
                            </td>
                            <td className={styles.tableCell} data-label="Driver">
                                <span>{leave.driver}</span>
                            </td>
                            <td className={styles.tableActions} data-label="Actions">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '1rem',
                                    }}
                                >
                                    <button onClick={() => handleOpen(leave._id)}>
                                        <IconPencil className="text-primary" />
                                    </button>
                                  
                                    <button onClick={() => openDeleteModal(leave._id)}>
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
                        <label htmlFor="leaveDate" style={{ color: '#afafaf' }}>
                            Leave Date
                        </label>
                        <input id="leaveDate" type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className={`${styles.formInput} form-input`} />
                        {formSubmitted && errors.leaveDate && <span style={{ color: 'red' }}>{errors.leaveDate}</span>}
                    </div>
                    <div>
                        <label htmlFor="driver" style={{ color: '#afafaf' }}>
                            Driver
                        </label>
                        <select id="driver" value={driver} onChange={(e) => setDriver(e.target.value)} className={`${styles.formInput} form-select`}>
                            <option value="">Select Driver</option>
                            {drivers.map((drv) => (
                                <option key={drv._id} value={drv._id}>
                                    {drv.name}
                                </option>
                            ))}
                        </select>
                        {formSubmitted && errors.driver && <span style={{ color: 'red' }}>{errors.driver}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '25px' }}>
                        <Button variant="outlined" color="error" onClick={handleClose}>
                            Close
                        </Button>
                        {isEditMode ? (
                            <Button variant="contained" color="info" className={styles.submitButton} onClick={editSaveLeave}>
                                Update
                            </Button>
                        ) : (
                            <Button variant="contained" color="success" className={styles.submitButton} onClick={handleSaveLeave}>
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

export default Leaves;
