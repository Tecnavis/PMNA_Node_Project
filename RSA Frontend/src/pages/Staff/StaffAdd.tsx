import React, { useState, useEffect, ChangeEvent } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Field, Form, Formik } from 'formik';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import Select, { SingleValue } from 'react-select';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import { CLOUD_IMAGE } from '../../constants/status';
interface EditData {
    id?: string;
    name?: string;
    email?: string;
    address?: string;
    phone?: string;
    userName?: string;
    password?: string;
    confirmPassword?: string;
    profileImage?: string;
}
interface LocationState {
    editData?: EditData;
}
interface Role {
    _id: string;
    name: string;
}
const UserAdd: React.FC = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const id = useParams();
    const [name, setName] = useState<string>('');
    const [roles, setRoles] = useState<Role[]>([]);
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [role, setRole] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [editData, setEditData] = useState<EditData | null>(null);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [modal1, setModal1] = useState(false);
    const [staffById, setStaffById] = useState({});

    const uid = id.id;

    // check the page for token and redirect

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token  found in localStorage');
        } else {
            navigate('/auth/boxed-signin');
            console.log('Token not found in localStorage');
        }
    }, []);

    // getting roles

    useEffect(() => {
        fetchRoles();
    }, []);
    const fetchRoles = async () => {
        try {
            const response = await axios.get(`${backendUrl}/role`);
            setRoles(response.data);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    // handle deletion for the role

    const handleDelete = (roleId: any) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
        }).then((result) => {
            if (result.isConfirmed) {
                axios.delete(`${backendUrl}/role/${roleId}`);
                // Remove role logic
                setRoles((prev) => prev.filter((role) => role._id !== roleId));
                Swal.fire('Deleted!', 'The role has been deleted.', 'success');
            }
        });
    };

    // handling edit

    const handleEdit = (role: any) => {
        setRole(role.name); // Prefill the modal input
        setEditingRoleId(role._id); // Set the ID for editing
        setModal1(true); // Open the modal
    };

    // maping the role in react selcect

    const options = roles.map((role) => ({
        value: role._id,
        label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>{role.name}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm me-2"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent selection on button click
                            handleEdit(role);
                        }}
                    >
                        <IconPencil />
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent selection on button click
                            handleDelete(role._id);
                        }}
                    >
                        <IconTrashLines />
                    </button>
                </div>
            </div>
        ),
    }));

    const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        setConfirmPassword(e.target.value);
    };

    // validation for add or update staff

    const validate = (): boolean => {
        let formErrors: Record<string, string> = {};

        if (!name.trim()) {
            formErrors.name = 'Name is required';
        } else if (name.length < 3) {
            formErrors.name = 'Name must be at least 3 characters';
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phone.trim()) {
            formErrors.phone_number = 'Phone number is required';
        } else if (!phoneRegex.test(phone)) {
            formErrors.phone_number = 'Enter a valid 10-digit Indian phone number';
        }

        if (!userName.trim()) {
            formErrors.userName = 'Username is required';
        } else if (userName.length < 3) {
            formErrors.userName = 'Username must be at least 3 characters';
        }

        if (!password.trim()) {
            formErrors.password = 'Password is required';
        } else if (password.length < 4) {
            formErrors.password = 'Password must be at least 4 characters';
        }

        if (password !== confirmPassword) {
            formErrors.confirmPassword = 'Password and confirm password do not match';
        }

        if (!selectedRole) {
            formErrors.selectedRole = 'Role required';
        }

        setErrors(formErrors);
        return Object.keys(formErrors).length === 0;
    };

    // handling profile image

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // colse modal

    const handleCloleRoleModal = () => {
        setModal1(false);
        setRole('');
    };

    // add and update role submit form

    const submitForm = async (values: { fullName: string }, { setFieldError }: { setFieldError: (field: string, message: string) => void }) => {
        try {
            const data = {
                name: values.fullName,
            };
            if (editingRoleId) {
                await axios.put(`${backendUrl}/role/${editingRoleId}`, data);

                Swal.fire({
                    icon: 'success',
                    title: 'Role updated successfully',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                setRoles((prev) => prev.map((role) => (role._id === editingRoleId ? { ...role, name: values.fullName } : role)));
            } else {
                const response = await axios.post(`${backendUrl}/role`, data);

                Swal.fire({
                    icon: 'success',
                    title: 'Role added successfully',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                fetchRoles();
                setRoles((prev) => [...prev, response.data]);
            }
            setModal1(false);
            setRole('');
            setEditingRoleId(null); // Reset editing state
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Something went wrong';
            setFieldError('fullName', errorMessage);
        }
    };

    const SubmittedForm = Yup.object().shape({
        fullName: Yup.string().required('Please fill the role'),
    });

    // creation of the staff

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        // Client-side validation (if not already done)
        if (validate()) {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('address', address);
            formData.append('phone', phone);
            formData.append('userName', userName);
            formData.append('password', password);
            formData.append('role', selectedRole);
            if (profileImage) {
                formData.append('image', profileImage);
            }

            try {
                await axios.post(`${backendUrl}/staff`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Staff created successfully',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                navigate('/users/staff');
            } catch (error) {
                if (error instanceof Error) {
                    console.error('Error creating staff:', error.message);
                    Swal.fire({
                        icon: 'error', // Error icon
                        title: 'Failed to create staff', // Main title
                        text: 'Please try again.', // Additional details
                        toast: true, // Display as a toast
                        position: 'top', // Position on screen
                        showConfirmButton: false, // Remove confirm button
                        timer: 3000, // Auto-dismiss after 3 seconds
                        padding: '10px 20px',
                    });
                } else {
                    console.error('An unknown error occurred:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'An unexpected error occurred',
                        text: 'Please try again later.',
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                }
            }
        }
    };

    // getting the staff if have id in params
    useEffect(() => {
        if (!id) {
            console.error('ID is missing or invalid');
            return;
        }

        const fetchStaffById = async () => {
            try {
                const response = await axios.get(`${backendUrl}/staff/${uid}`);
                setStaffById(response.data);
                setName(response.data.name || '');
                setEmail(response.data.email || '');
                setSelectedRole(response.data.role._id || '');
                setPhone(response.data.phone || '');
                setUserName(response.data.userName || '');
                setAddress(response.data.address || '');
                setImagePreview(`${CLOUD_IMAGE}${response.data.image}` || '');
                setPassword(response.data.password || '');
                setConfirmPassword(response.data.password || '');
            } catch (error) {
                console.error('Error fetching staffs:', error);
            }
        };

        fetchStaffById();
    }, [id]);


    // updating staff 

    const handleUpdate = async () => {
        if (validate()) {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('address', address);
            formData.append('phone', phone);
            formData.append('userName', userName);
            formData.append('password', password);
            formData.append('role', selectedRole);
            if (profileImage) {
                formData.append('image', profileImage);
            }
    
            try {
                const response = await axios.put(`${backendUrl}/staff/${uid}`, formData);
                Swal.fire({
                    icon: 'success',
                    title: 'Staff updatedation done',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
                navigate('/users/staff');
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    console.error('Error updating staff:', error);
                    setErrors(error.response?.data?.errors || {});
                } else {
                    console.error('Unexpected error:', error);
                    setErrors({});
                }
            }
        }
       
    };

    return (
        <div>
            
              
                <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h6 className="text-lg font-bold mb-5">General Information</h6>
                        <div className="flex items-center justify-center">
                            <button type="button" className="btn btn-primary" onClick={() => setModal1(true)}>
                                Add Role
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row">
                        <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5">
                            <img src={imagePreview || defaultImage} alt="Profile" className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label htmlFor="name">Name</label>
                                <input id="name" type="text" placeholder="Enter Name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                                {errors.name && <p className="text-red-500">{errors.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="email">Email</label>
                                <input id="email" type="email" placeholder="@gmail.com" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="roles">Role</label>
                                <Select
                                    options={options}
                                    value={options.find((option) => option.value === selectedRole) || null} // Update value when selected
                                    onChange={(selected: SingleValue<{ value: string; label: JSX.Element }>) => {
                                        if (selected) {
                                            setSelectedRole(selected.value); // Update selected role if not null
                                        }
                                    }}
                                    placeholder="Select a role"
                                    isClearable={false} // Disable clearing for better control
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            minHeight: 40,
                                            fontSize: '14px',
                                            borderColor: '#ddd',
                                            borderRadius: '4px',
                                            boxShadow: 'none',
                                            '&:hover': {
                                                borderColor: '#5e81f4',
                                            },
                                        }),
                                        dropdownIndicator: (base) => ({
                                            ...base,
                                            color: '#5e81f4',
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            borderRadius: '4px',
                                            padding: '10px 0',
                                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
                                        }),
                                        option: (base, state) => ({
                                            ...base,
                                            cursor: 'pointer',
                                            padding: '10px 20px',
                                            backgroundColor: state.isSelected ? '#5e81f4' : '#fff',
                                            color: state.isSelected ? '#fff' : '#333',
                                            '&:hover': {
                                                backgroundColor: '#f1f1f1',
                                            },
                                        }),
                                    }}
                                />
                                {errors.role && <p className="text-red-500">{errors.role}</p>}
                            </div>

                            <div>
                                <label htmlFor="profileImage">Profile Image</label>
                                <input id="profileImage" type="file" accept=".jpg, .jpeg, .png" onChange={handleImageChange} className="form-input" />
                            </div>

                            <div>
                                <label htmlFor="phone_number">Phone</label>
                                <input id="phone_number" type="number" placeholder="phone number" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                {errors.phone_number && <p className="text-red-500">{errors.phone_number}</p>}
                            </div>
                            <div>
                                <label htmlFor="userName">User Name</label>
                                <input id="userName" type="text" placeholder="User Name" className="form-input" value={userName} onChange={(e) => setUserName(e.target.value)} />
                                {errors.userName && <p className="text-red-500">{errors.userName}</p>}
                            </div>
                            <div>
                                <label htmlFor="password">Password </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="password"
                                        className="form-input pr-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <span className="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                                {errors.password && <p className="text-red-500">{errors.password}</p>}
                            </div>
                            <div>
                                <label htmlFor="confirmPassword">Confirm password </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Confirm Password"
                                        className="form-input pr-10"
                                        value={confirmPassword}
                                        onChange={handleConfirmPasswordChange}
                                    />
                                    <span className="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                                {errors.confirmPassword && <p className="text-red-500">{errors.confirmPassword}</p>}
                            </div>

                            <div>
                                <label htmlFor="address">Address</label>
                                <textarea id="address" placeholder="Enter Address" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                            </div>

                            <div className="sm:col-span-2 mt-3">
                            {uid ? (
                                 <button onClick={handleUpdate} type="button" className="btn btn-info">
                                 Update
                             </button>
                            ):(
                                <button onClick={handleSubmit} type="button" className="btn btn-success">
                                Save
                            </button>
                            )}
                              
                            </div>
                        </div>
                    </div>
                </form>
            

            {/* role add modal  */}

            <Transition appear show={modal1}>
                <Dialog as="div" open={modal1} onClose={() => setModal1(false)}>
                    <TransitionChild enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0" />
                    </TransitionChild>
                    <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                        <div className="flex items-start justify-center min-h-screen px-4">
                            <TransitionChild
                                // as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel as="div" className="panel border-0 p-0 rounded-lg overflow-hidden my-8 w-full max-w-lg text-black dark:text-white-dark">
                                    <div
                                        style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}
                                        className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3"
                                    >
                                        <div className="text-lg font-bold">Add Role</div>
                                    </div>
                                    <div className="p-3">
                                        <Formik
                                            initialValues={{
                                                fullName: role || '', // Use selected role
                                            }}
                                            validationSchema={SubmittedForm}
                                            onSubmit={(values, actions) => submitForm(values, actions)} // Pass both arguments
                                        >
                                            {({ errors, touched, setFieldValue }) => (
                                                <Form className="space-y-5">
                                                    <div style={{ display: 'flex' }}>
                                                        <div style={{ width: '60%' }} className={touched.fullName && errors.fullName ? 'has-error' : ''}>
                                                            <Field
                                                                name="fullName"
                                                                type="text"
                                                                id="fullName"
                                                                placeholder="Enter role"
                                                                className="form-input"
                                                                autoComplete="off"
                                                                onChange={(e: any) => setFieldValue('fullName', e.target.value)}
                                                            />
                                                            {touched.fullName && errors.fullName && <div className="text-danger mt-1">{errors.fullName}</div>}
                                                        </div>
                                                        <div style={{ width: '40%' }}>
                                                            <div className="flex justify-end items-center">
                                                                <button type="submit" className="btn btn-success">
                                                                    Submit
                                                                </button>
                                                                <button type="button" className="btn btn-outline-danger !ml-3" onClick={handleCloleRoleModal}>
                                                                    Discard
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Form>
                                            )}
                                        </Formik>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default UserAdd;
