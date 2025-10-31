//@ts-nocheck
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DataTable } from 'mantine-datatable';
import { Button, Group } from '@mantine/core';
import IconTrash from '../../components/Icon/IconTrash';
import IconEdit from '../../components/Icon/IconEdit';
import IconAward from '../../components/Icon/IconAward';
import { MdOutlineBookmarkAdd } from 'react-icons/md';
import Modal from '@mui/material/Modal';
import { Box } from '@mui/material';
import Swal from 'sweetalert2';
import styles from './Staff.module.css';

const modalStyle = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
};

interface Staff {
    _id: string;
    name: string;
    phoneNumber: number;
    designation: string;
    whatsappNumber: number;
}

const StaffTable: React.FC = () => {
    // Staff list and loading states
    const [staff, setStaff] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

    // Form and modal state for adding a staff member
    const [open, setOpen] = useState(false);
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [designation, setDesignation] = useState('');
    const [errors, setErrors] = useState<any>({});
    const [isEditMode, setIsEditMode] = useState(false); // For future edit functionality

    const showroomId = localStorage.getItem('showroomId') || '';
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Fetch staff list
    useEffect(() => {
        const fetchStaff = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`${backendUrl}/showroom/showroom-staff/${showroomId}`);
                if (response.data.success) {
                    setStaff(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching staff:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (showroomId) fetchStaff();
    }, [showroomId, backendUrl]);

    const deleteStaffMember = async (staffId: string) => {
      setLoading((prev) => ({ ...prev, [staffId]: true }));
      try {
        await axios.delete(`${backendUrl}/showroom/${showroomId}/staff-delete/${staffId}`);
        setStaff((prevStaff) => prevStaff.filter((member) => member._id !== staffId));
    
        Swal.fire({
          icon: 'success',
          title: 'Staff member deleted',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
          padding: '10px 20px',
        });
      } catch (error) {
        console.error('Error deleting staff member:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed to delete staff member',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
          padding: '10px 20px',
        });
      } finally {
        setLoading((prev) => ({ ...prev, [staffId]: false }));
      }
    };
    

    // Validate form fields
    const validateForm = (): boolean => {
        let isValid = true;
        const newErrors: any = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
            isValid = false;
        }
        if (!designation.trim()) {
            newErrors.designation = 'Designation is required';
            isValid = false;
        }
        if (!phoneNumber) {
            newErrors.phoneNumber = 'Phone Number is required';
            isValid = false;
        }
        if (!whatsappNumber) {
            newErrors.whatsappNumber = 'Whatsapp Number is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };
    const handleUpdateStaff = (staff: Staff) => {
      setIsEditMode(true);
      setSelectedStaffId(staff._id);
      setName(staff.name);
      setDesignation(staff.designation);
      setPhoneNumber(staff.phoneNumber.toString());
      setWhatsappNumber(staff.whatsappNumber.toString());
      setOpen(true);
    };
    
    
    const handleSaveStaff = async () => {
      setFormSubmitted(true);
      if (!validateForm()) return;
    
      const data = {
        name,
        phoneNumber,
        whatsappNumber,
        designation,
        showroomId,
      };
    
      try {
        if (isEditMode && selectedStaffId) {
          // Update existing staff member
          const response = await axios.put(`${backendUrl}/showroom/update-staff/${selectedStaffId}`, data);
          if (response.data.success) {
            setStaff((prevStaff) =>
              prevStaff.map((member) =>
                member._id === selectedStaffId ? response.data.data : member
              )
            );
          }
        } else {
          // Add new staff member
          const response = await axios.post(`${backendUrl}/showroom/add-staff`, data);
          if (response.data.success) {
            setStaff([...staff, response.data.data]);
          }
        }
    
        Swal.fire({
          icon: 'success',
          title: isEditMode ? 'Staff member updated' : 'Staff member added',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
          padding: '10px 20px',
        });
    
        handleClose();
        // Reset form fields
        setName('');
        setDesignation('');
        setPhoneNumber('');
        setWhatsappNumber('');
        setFormSubmitted(false);
        setSelectedStaffId(null);
      } catch (error) {
        console.error('Error saving staff member:', error);
      }
    };
    

    // Modal open/close handlers
    const handleOpen = () => {
        setIsEditMode(false); // Set to false for add operation
        // Reset form fields
        setName('');
        setDesignation('');
        setPhoneNumber('');
        setWhatsappNumber('');
        setFormSubmitted(false);
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    // Define columns for the datatable
    const columns = [
        { accessor: 'name', title: 'Name' },
        { accessor: 'designation', title: 'Designation' },
        { accessor: 'phoneNumber', title: 'Phone' },
        { accessor: 'whatsappNumber', title: 'Whatsapp' },
        {
            accessor: 'actions',
            title: 'Actions',
            render: (row: Staff) => (
                <Group position="center">
                    <Button variant="outline" color="red" size="xs" loading={loading[row._id]} onClick={() => deleteStaffMember(row._id)}>
                        <IconTrash />
                    </Button>
                    <Button
  variant="outline"
  color="blue"
  size="xs"
  onClick={() => handleUpdateStaff(row)}
>
  <IconEdit />
</Button>

                    <Button variant="outline" color="green" size="xs" onClick={() => console.log('Award staff:', row._id)}>
                        <IconAward />
                    </Button>
                </Group>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center uppercase">Staff Members</h2>
            <div className="flex-grow sm:w-auto w-full" style={{ marginBottom: '16px' }}>
                <Button onClick={handleOpen} variant="outline" color="success" style={{ display: 'flex', alignItems: 'center' }}>
                    <MdOutlineBookmarkAdd style={{ marginRight: '8px' }} />
                    Add Staff
                </Button>
            </div>
            <DataTable fetching={isLoading} records={staff} columns={columns} withColumnBorders highlightOnHover striped minHeight={300} withBorder noRecordsText="No staff members found" />

            {/* Modal for adding staff with enhanced styling */}
            <Modal open={open} onClose={handleClose} aria-labelledby="modal-title" aria-describedby="modal-description">
                <Box sx={modalStyle}>
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="name" style={{ color: '#afafaf', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                            Staff Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`${styles.formInput} form-input`}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '14px',
                            }}
                        />
                        {formSubmitted && errors.name && <span style={{ color: 'red', fontSize: '0.9em' }}>{errors.name}</span>}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="designation" style={{ color: '#afafaf', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                            Designation
                        </label>
                        <input
                            id="designation"
                            type="text"
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            className={`${styles.formInput} form-input`}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '14px',
                            }}
                        />
                        {formSubmitted && errors.designation && <span style={{ color: 'red', fontSize: '0.9em' }}>{errors.designation}</span>}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="phoneNumber" style={{ color: '#afafaf', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                            Phone Number
                        </label>
                        <input
                            id="phoneNumber"
                            type="number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className={`${styles.formInput} form-input`}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '14px',
                            }}
                        />
                        {formSubmitted && errors.phoneNumber && <span style={{ color: 'red', fontSize: '0.9em' }}>{errors.phoneNumber}</span>}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="whatsappNumber" style={{ color: '#afafaf', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                            Whatsapp Number
                        </label>
                        <input
                            id="whatsappNumber"
                            type="number"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            className={`${styles.formInput} form-input`}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '14px',
                            }}
                        />
                        {formSubmitted && errors.whatsappNumber && <span style={{ color: 'red', fontSize: '0.9em' }}>{errors.whatsappNumber}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
                        <Button variant="outline" color="error" onClick={handleClose}>
                            Close
                        </Button>
                        <Button variant="filled" color="success" onClick={handleSaveStaff}>
                            Add
                        </Button>
                    </div>
                </Box>
            </Modal>
        </div>
    );
};

export default StaffTable;
