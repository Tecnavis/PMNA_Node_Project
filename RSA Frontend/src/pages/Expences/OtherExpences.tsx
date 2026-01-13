// @ts-nocheck
import { Button,  Select } from '@headlessui/react';
import { Card, CardContent, Badge, IconButton, Avatar, Chip, Tooltip, Modal, Backdrop, Fade, TextField, FormControl, InputLabel } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle, Bell, RefreshCw, Download, ChevronLeft, ChevronRight, Maximize2, Plus, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import { connectSocket, getSocket, disconnectSocket } from '../../utils/socket';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { CLOUD_IMAGE } from '../../constants/status';
import ReusableModal from '../../components/modal';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import { Expense } from '../../interface/Expences';
// Fix your imports at the top of the file
import { 
    fetchPendingExpenses,
    fetchExpenses,
    updateStatus
} from '../../services/expencesService';

import { 
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseById
} from './expensesService'; // This is correct
import ExpenseTable from './ExpenseTable';
import { GrNext, GrPrevious } from 'react-icons/gr';
import Swal from 'sweetalert2';
import axios from 'axios';
import { MenuItem } from '@mui/material'; // Add this import

const ExpenseApproveUI = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [currentExpenseIndex, setCurrentExpenseIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [newRequestsCount, setNewRequestsCount] = useState(0);
    const { enqueueSnackbar } = useSnackbar();
    const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showingAll, setShowingAll] = useState(false);
    const [currentSearchTerm, setCurrentSearchTerm] = useState('');
 // CRUD States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [formData, setFormData] = useState({
        amount: '',
        type: '',
        description: '',
        driver: '',
        image: null as File | null
    });
    const [drivers, setDrivers] = useState<any[]>([]);
const [driversLoading, setDriversLoading] = useState(false);

 // Update your fetchDrivers function:
const fetchDrivers = async () => {
    try {
        setDriversLoading(true); // Add this
        const token = localStorage.getItem('token');
        console.log('Token:', token ? 'Exists' : 'Missing');
        
        if (!token) {
            throw new Error('No authentication token found');
        }

        console.log('BASE_URL:', BASE_URL);
        const url = `${BASE_URL}/driver`;
        console.log('Fetching drivers from:', url);

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Full API Response:', response);
        console.log('Response data:', response.data);
        console.log('Response status:', response.status);
        
        // Check the response structure based on your backend
        let driversList = [];
        
        if (Array.isArray(response.data)) {
            // If response.data is directly an array
            driversList = response.data;
            console.log('Drivers list (direct array):', driversList.length);
        } else if (response.data && Array.isArray(response.data.data)) {
            // If response.data has a data property that's an array
            driversList = response.data.data;
            console.log('Drivers list (data property):', driversList.length);
        } else if (response.data && Array.isArray(response.data.drivers)) {
            // If response.data has a drivers property
            driversList = response.data.drivers;
            console.log('Drivers list (drivers property):', driversList.length);
        } else if (response.data && response.data.success && Array.isArray(response.data.expenseData)) {
            // If it's from expense endpoint
            driversList = response.data.expenseData;
            console.log('Drivers list (expenseData):', driversList.length);
        } else {
            console.error('Unexpected response structure:', response.data);
            enqueueSnackbar('Failed to parse drivers list', { variant: 'error' });
            return;
        }
        
        console.log('Parsed drivers:', driversList);
        setDrivers(driversList);
        
    } catch (error) {
        console.error('Error fetching drivers:', error);
        console.error('Error response:', error.response);
        console.error('Error message:', error.message);
        
        if (error.response) {
            enqueueSnackbar(`Failed to fetch drivers: ${error.response.status} - ${error.response.data?.message || 'Server error'}`, { variant: 'error' });
        } else if (error.request) {
            enqueueSnackbar('No response from server. Check network connection.', { variant: 'error' });
        } else {
            enqueueSnackbar(`Error: ${error.message}`, { variant: 'error' });
        }
    } finally {
        setDriversLoading(false); // Add this
    }
};
   const fetchPendingExpense = async () => {
    try {
        setLoading(true);

        // FIXED: Call the imported function directly, not via expenseService
        const response: Expense[] = (await fetchPendingExpenses()) as unknown as Expense[];
        setExpenses(response);
        setNewRequestsCount(0);
    } catch (error) {
        enqueueSnackbar('Failed to fetch expenses', { variant: 'error' });
        console.error('Error fetching expenses:', error);
    } finally {
        setLoading(false);
    }
};

// Update your fetchExpense function to handle pagination properly
const fetchExpense = async (searchTerm: string = '', page: number = 1, limit: number | 'all' = 10) => {
    try {
        // FIXED: Call the imported function directly
        const response = await fetchExpenses(searchTerm, page, limit);
        setAllExpenses(response.data);

        // Update pagination state
        if (response.pagination) {
            setTotalPages(response.pagination.totalPages);
            setTotalItems(response.pagination.totalItems);
            setCurrentPage(page); // Update current page
        }
    } catch (error) {
        enqueueSnackbar('Failed to fetch expenses', { variant: 'error' });
        console.error('Error fetching expenses:', error);
    }
};
    // Update your search handler
    const handleSearch = (searchTerm: string) => {
        setCurrentSearchTerm(searchTerm);
        setCurrentPage(1); // Reset to first page when searching
        fetchExpense(searchTerm, 1, showingAll ? 'all' : 10);
    };
    // Update your page change handler
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchExpense(currentSearchTerm, page, showingAll ? 'all' : 10);
    };
    const toggleShowAll = () => {
        const newShowingAll = !showingAll;
        setShowingAll(newShowingAll);
        fetchExpense(currentSearchTerm, 1, newShowingAll ? 'all' : 10);
    };
  
// CRUD Functions
    const handleCreateExpense = async () => {
        try {
            setActionLoading(true);
            
            if (!formData.amount || !formData.type || !formData.description || !formData.driver) {
                enqueueSnackbar('Please fill all required fields', { variant: 'error' });
                return;
            }

            const data = new FormData();
            data.append('amount', formData.amount);
            data.append('type', formData.type);
            data.append('description', formData.description);
            data.append('driver', formData.driver);
            if (formData.image) {
                data.append('image', formData.image);
            }

            await createExpense(data);
            enqueueSnackbar('Expense created successfully', { variant: 'success' });
            setIsCreateModalOpen(false);
            resetForm();
            fetchExpense();
            fetchPendingExpense();
        } catch (error) {
            enqueueSnackbar('Failed to create expense', { variant: 'error' });
            console.error('Error creating expense:', error);
        } finally {
            setActionLoading(false);
        }
    };

   const handleEditExpense = async () => {
    try {
        setActionLoading(true);
        
        if (!editingExpense) {
            console.error('No expense selected for editing');
            return;
        }

        console.log('Editing expense ID:', editingExpense._id);
        console.log('Form data before submission:', formData);

        const data = new FormData();
        if (formData.amount) data.append('amount', formData.amount);
        if (formData.type) data.append('type', formData.type);
        if (formData.description) data.append('description', formData.description);
        if (formData.driver) data.append('driver', formData.driver);
        if (formData.image) {
            data.append('image', formData.image);
            console.log('New image selected for upload');
        }

        console.log('Sending update request...');
        const result = await updateExpense(editingExpense._id, data);
        
        console.log('Update successful:', result);
        enqueueSnackbar('Expense updated successfully', { variant: 'success' });
        
        setIsEditModalOpen(false);
        resetForm();
        setEditingExpense(null);
        
        // Refresh data
        fetchExpenseData();
        fetchPendingExpenseData();
        
    } catch (error: any) {
        console.error('Error updating expense:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        enqueueSnackbar(`Failed to update expense: ${error.message || 'Unknown error'}`, { variant: 'error' });
    } finally {
        setActionLoading(false);
    }
};

    const handleDeleteExpense = async (expenseId: string) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'You are about to delete this expense!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#4b5563',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, cancel',
        });

        if (result.isConfirmed) {
            try {
                setActionLoading(true);
                await deleteExpense(expenseId);
                enqueueSnackbar('Expense deleted successfully', { variant: 'success' });
                fetchExpense();
                fetchPendingExpense();
            } catch (error) {
                enqueueSnackbar('Failed to delete expense', { variant: 'error' });
                console.error('Error deleting expense:', error);
            } finally {
                setActionLoading(false);
            }
        }
    };

   const openEditModal = async (expenseId: string) => {
    try {
        setActionLoading(true);
        console.log('Opening edit modal for expense ID:', expenseId);
        
        const expense = await getExpenseById(expenseId);
        console.log('Fetched expense for editing:', expense);
        
        setEditingExpense(expense);
        setFormData({
            amount: expense.amount.toString(),
            type: expense.type,
            description: expense.description,
            driver: expense.driver?._id || '',
            image: null
        });
        setIsEditModalOpen(true);
        console.log('Edit modal opened with form data:', {
            amount: expense.amount.toString(),
            type: expense.type,
            description: expense.description,
            driver: expense.driver?._id
        });
    } catch (error) {
        console.error('Error loading expense for editing:', error);
        enqueueSnackbar('Failed to load expense for editing', { variant: 'error' });
    } finally {
        setActionLoading(false);
    }
};

    const resetForm = () => {
        setFormData({
            amount: '',
            type: '',
            description: '',
            driver: '',
            image: null
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({
                ...prev,
                image: e.target.files![0]
            }));
        }
    };

    const toggleDescription = (expenseId: string) => {
        setExpandedDescriptions((prev) => ({
            ...prev,
            [expenseId]: !prev[expenseId],
        }));
    };

    const closeImageModal = () => {
        setSelectedImage(null);
    };

    const openImageModal = (imageUrl: string) => {
        setSelectedImage(imageUrl);
    };

    const approveExpense = async (expenseId: string) => {
    // First check if this would result in negative balance
    const currentExpense = expenses.find(exp => exp._id === expenseId);
    if (currentExpense && (currentExpense.driver.cashInHand - currentExpense.amount) < 0) {
        await Swal.fire({
            title: 'Insufficient Balance',
            text: 'Not enough amount in driver hand to approve this expense',
            icon: 'error',
            confirmButtonColor: '#16a34a',
        });
        return;
    }

    // Proceed with confirmation if balance is sufficient
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to approve this expense!',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a', // green-600
        cancelButtonColor: '#dc2626', // red-600
        confirmButtonText: 'Yes, approve it!',
        cancelButtonText: 'No, cancel',
    });

   if (result.isConfirmed) {
    try {
        setActionLoading(true);
      const response = await updateStatus(expenseId, true);
       if (response && response._id) {
                setExpenses((prev) => prev.map((exp) => 
                    (exp._id === expenseId ? { ...exp, approve: true, status: 'approved' } : exp)
                ));
                enqueueSnackbar('Expense approved successfully', { variant: 'success' });
                
                // Reload after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            } else {
                if (response.code === "INSUFFICIENT_BALANCE") {
                    await Swal.fire({
                        title: 'Insufficient Balance',
                        text: 'Not enough amount in driver hand to approve this expense',
                        icon: 'error',
                        confirmButtonColor: '#16a34a',
                    });
                } else {
                    enqueueSnackbar(response.message || 'Failed to approve expense', { variant: 'error' });
                }
            }
        } catch (error) {
            enqueueSnackbar('Failed to approve expense', { variant: 'error' });
            console.error('Error approving expense:', error);
        } finally {
            setActionLoading(false);
        }
    }
};

    const rejectExpense = async (expenseId: string) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'You are about to reject this expense!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626', // red-600
            cancelButtonColor: '#4b5563', // gray-600
            confirmButtonText: 'Yes, reject it!',
            cancelButtonText: 'No, cancel',
        });

        if (result.isConfirmed) {
            try {
                setActionLoading(true);
                await updateStatus(expenseId, false);
                setExpenses((prev) => prev.map((exp) => (exp._id === expenseId ? { ...exp, approve: false, status: 'rejected' } : exp)));
                enqueueSnackbar('Expense rejected successfully', { variant: 'success' });
                window.location.reload();
                moveToNextExpense();
            } catch (error) {
                enqueueSnackbar('Failed to reject expense', { variant: 'error' });
                console.error('Error rejecting expense:', error);
            } finally {
                setActionLoading(false);
            }
        }
    };
 

    useEffect(() => {
        fetchExpense();
    }, [searchQuery]);
    const getDownloadableUrl = (url: string) => {
        return url.replace('/upload/', '/upload/fl_attachment/');
    };

    const downloadImage = (imageUrl: string) => {
        const downloadableUrl = getDownloadableUrl(imageUrl);
        const link = document.createElement('a');
        link.href = downloadableUrl;
        link.download = `expense-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const moveToNextExpense = () => {
        setCurrentExpenseIndex((prev) => {
            if (prev >= expenses.length - 1) {
                fetchPendingExpense(); // Refresh list when we reach the end
                return 0;
            }
            return prev + 1;
        });
    };

    const moveToPrevExpense = () => {
        setCurrentExpenseIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    // Socket.IO integration
    useEffect(() => {
        const socket = connectSocket('admin@example.com');

        socket.on('new-expense', (newExpense: Expense) => {
            enqueueSnackbar(`New expense request from ${newExpense.driver.name}`, {
                variant: 'info',
                action: (
                    <Button onClick={fetchPendingExpense} className="text-white">
                        View
                    </Button>
                ),
            });
            setNewRequestsCount((prev) => prev + 1);
        });

        return () => {
            socket.off('new-expense');
            disconnectSocket();
        };
    }, [enqueueSnackbar]);

    // Initialize
    useEffect(() => {
        fetchPendingExpense();
        fetchExpense();
        fetchDrivers();
    }, []);

    useEffect(() => {
        fetchExpense();
    }, [searchQuery]);

    const currentExpense = expenses[currentExpenseIndex];
    const updatedCash = currentExpense?.driver.cashInHand - (currentExpense?.amount || 0);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }
    return (
        <div className="relative">
            {/* Image Modal - MOVED TO TOP LEVEL */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity duration-300" onClick={closeImageModal}>
                    <div className="relative bg-white rounded-xl p-4 max-w-4xl max-h-[90vh] overflow-hidden outline-none" onClick={(e) => e.stopPropagation()}>
                        <img src={selectedImage} alt="Expense Receipt" className="max-h-[70vh] max-w-full object-contain rounded-lg mx-auto" />
                        <div className="flex flex-row gap-2 item-end mt-5">
                            <button onClick={closeImageModal} className="top-2 left-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                                <X size={20} />
                            </button>
                            <button onClick={() => selectedImage && downloadImage(selectedImage)} className="top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                                <Download size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
  {/* Create Expense Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New Expense</h2>
                        <div className="space-y-4">
                            <TextField
                                fullWidth
                                label="Amount"
                                name="amount"
                                type="number"
                                value={formData.amount}
                                onChange={handleInputChange}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Expense Type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Description"
                                name="description"
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                            />
                            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Driver *
                    </label>
                    <select
                        name="driver"
                        value={formData.driver}
                        onChange={(e) => setFormData(prev => ({ ...prev, driver: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        required
                    >
                        <option value="">Select a driver</option>
                        {drivers.map(driver => (
                            <option key={driver._id} value={driver._id}>
                                {driver.name} - {driver.phone}
                            </option>
                        ))}
                    </select>
                </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Receipt Image
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateExpense}
                                    disabled={actionLoading}
                                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
                                >
                                    {actionLoading ? (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    Create Expense
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Expense Modal */}
            {isEditModalOpen && editingExpense && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Expense</h2>
                        <div className="space-y-4">
                            <TextField
                                fullWidth
                                label="Amount"
                                name="amount"
                                type="number"
                                value={formData.amount}
                                onChange={handleInputChange}
                            />
                            <TextField
                                fullWidth
                                label="Expense Type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                            />
                            <TextField
                                fullWidth
                                label="Description"
                                name="description"
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={handleInputChange}
                            />
                            <FormControl fullWidth>
                                <InputLabel>Driver</InputLabel>
                                <Select
                                    name="driver"
                                    value={formData.driver}
                                    onChange={(e) => setFormData(prev => ({ ...prev, driver: e.target.value }))}
                                >
                                    {drivers.map(driver => (
                                        <MenuItem key={driver._id} value={driver._id}>
                                            {driver.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Receipt Image (optional)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {editingExpense.image && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Current image: {editingExpense.image}
                                    </p>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setEditingExpense(null);
                                        resetForm();
                                    }}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleEditExpense}
                                    disabled={actionLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
                                >
                                    {actionLoading ? (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    Update Expense
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Floating notification badge */}
            {newRequestsCount > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="fixed top-4 right-4 z-50">
                    <Badge badgeContent={newRequestsCount} color="error" overlap="circular" onClick={fetchPendingExpense} className="cursor-pointer">
                        <IconButton className="bg-indigo-100 hover:bg-indigo-200">
                            <Bell className="text-indigo-600" />
                        </IconButton>
                    </Badge>
                </motion.div>
            )}
  {/* Header with Create Button */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Expense Management</h1>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create Expense
                </Button>
            </div>
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : !expenses.length ? (
                <>
                    <Card className="w-full max-w-lg mx-auto mt-12 p-6 shadow-2xl rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-100">
                        <CardContent className="text-center space-y-4">
                            <AlertCircle className="mx-auto h-12 w-12 text-indigo-400" />
                            <h3 className="text-xl font-semibold text-gray-700">No Pending Expenses</h3>
                            <p className="text-gray-500">There are currently no expense requests awaiting approval.</p>
                            <Button onClick={fetchPendingExpense} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg inline-flex items-center gap-2">
                                <RefreshCw size={16} />
                                Refresh
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4 mt-5">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search by driver name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

// In your main component's return statement, update the ExpenseTable usage:
<ExpenseTable
    expenses={allExpenses}
    expandedDescriptions={expandedDescriptions}
    toggleDescription={toggleDescription}
    openImageModal={openImageModal}
    CLOUD_IMAGE={CLOUD_IMAGE}
    onEdit={openEditModal}  // This should be your edit handler function
    onDelete={handleDeleteExpense}  // This should be your delete handler function
/>                </>
            ) : (
                <>
                    <Card className="w-full max-w-lg mx-auto mt-12 p-6 shadow-2xl rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-100">
                        <CardContent className="space-y-6 text-gray-800">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-semibold text-indigo-700">Expense Approval</h2>
                                <Chip label={`${currentExpenseIndex + 1}/${expenses.length}`} color="primary" size="small" />
                            </div>

                            {/* Driver Info */}
                            <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
                                <Avatar src={currentExpense.driver.image} alt={currentExpense.driver.name} className="h-12 w-12" />
                                <div>
                                    <p className="font-semibold">{currentExpense.driver.name}</p>
                                    <p className="text-sm text-gray-500">Driver Phone Number: {currentExpense.driver.phone}</p>
                                </div>
                            </div>

                            {/* Expense Type */}
                            <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-indigo-500">
                                <p className="text-sm text-gray-500">Expense Type</p>
                                <p className="font-semibold capitalize">{currentExpense.type}</p>
                            </div>

                            {/* Cash Flow */}
                            <div className="space-y-3">
                                <div className="flex justify-between bg-gray-100 p-3 rounded-lg shadow-sm">
                                    <span className="text-sm font-medium text-gray-600">Cash In Hand(Before)</span>
                                    <span className="font-semibold text-indigo-600">₹{currentExpense.driver.cashInHand.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between bg-yellow-50 p-3 rounded-lg shadow-sm border-l-4 border-yellow-400">
                                    <span className="text-sm font-medium text-gray-700">Expense Amount</span>
                                    <span className="font-bold text-yellow-700">₹{currentExpense.amount.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between bg-green-50 p-3 rounded-lg shadow-sm border-l-4 border-green-500">
                                    <span className="text-sm font-medium text-green-700">Cash In Hand(After)</span>
                                    <span className={`font-bold ${updatedCash < 0 ? 'text-red-600' : 'text-green-800'}`}>₹{updatedCash.toLocaleString()}</span>
                                </div>

                                {updatedCash < 0 && (
                                    <div className="bg-red-50 p-3 rounded-lg text-red-600 text-sm border-l-4 border-red-500">
                                        <AlertCircle className="inline mr-2" size={16} />
                                        This expense will result in negative balance
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                                <p className="text-sm text-gray-600 mb-1">Description:</p>
                                <p className="text-base text-gray-800 font-medium">{currentExpense.description}</p>
                            </div>

                            {/* Receipt Image */}
                            {/* Receipt Image */}
                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm text-gray-600">Receipt:</p>
                                    <Button onClick={() => openImageModal(`${CLOUD_IMAGE}${currentExpense.image}`)} className="text-indigo-600 text-sm font-medium flex items-center gap-1">
                                        View Full
                                    </Button>
                                </div>
                                <img
                                    src={`${CLOUD_IMAGE}${currentExpense.image}`}
                                    alt="Expense receipt"
                                    className="w-full h-32 object-contain rounded border bg-gray-50 cursor-pointer"
                                    onClick={() => openImageModal(`${CLOUD_IMAGE}${currentExpense.image}`)}
                                />
                            </div>

                            {/* Date */}
                            <div className="text-right text-sm text-gray-500">{/* {format(new Date(currentExpense.createdAt), 'MMM dd, yyyy hh:mm a')} */}</div>

                            {/* Navigation and Actions */}
                            <div className="flex justify-between gap-4 pt-4">
                                <Button
                                    onClick={moveToPrevExpense}
                                    disabled={currentExpenseIndex === 0 || actionLoading}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </Button>

                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => rejectExpense(currentExpense._id)}
                                        disabled={actionLoading}
                                        className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {actionLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <X size={16} />}
                                        Reject
                                    </Button>
                                  <Button
    onClick={() => approveExpense(currentExpense._id)}
    disabled={actionLoading || updatedCash < 0}
    className={`bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-2 ${updatedCash < 0 ? 'cursor-not-allowed' : ''}`}
    title={updatedCash < 0 ? "Not enough amount in driver hand" : ""}
>
    {actionLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Check size={16} />}
    Approve
</Button>
                                </div>

                                <Button
                                    onClick={moveToNextExpense}
                                    disabled={currentExpenseIndex === expenses.length - 1 || actionLoading}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="overflow-x-auto my-10">
                        <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4 mt-5">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search by driver name or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <ExpenseTable
                            expenses={allExpenses}
                        expandedDescriptions={expandedDescriptions}
                        toggleDescription={toggleDescription}
                        openImageModal={openImageModal}
                        CLOUD_IMAGE={CLOUD_IMAGE}
                        onEdit={openEditModal}
                        onDelete={handleDeleteExpense}
                    />
                    </div>
                </>
            )}
            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {allExpenses.length} of {totalItems} expenses
                </div>

                <ul className="inline-flex items-center space-x-1 rtl:space-x-reverse m-auto">
                    <li>
                        <button
                            type="button"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={showingAll || currentPage === 1}
                            className={`flex justify-center font-semibold p-2 rounded-full transition ${
                                showingAll || currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white-light text-dark hover:text-white hover:bg-primary'
                            } dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary`}
                        >
                            <GrPrevious />
                        </button>
                    </li>

                    {!showingAll &&
                        Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                            // Show limited page numbers (max 5)
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = index + 1;
                            } else if (currentPage <= 3) {
                                pageNum = index + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + index;
                            } else {
                                pageNum = currentPage - 2 + index;
                            }

                            return (
                                <li key={pageNum}>
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${
                                            currentPage === pageNum ? 'bg-primary text-white' : 'bg-white-light text-dark hover:text-white hover:bg-primary'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                </li>
                            );
                        })}

                    <li>
                        <button
                            type="button"
                            onClick={toggleShowAll}
                            className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${
                                showingAll ? 'bg-primary text-white' : 'bg-white-light text-dark hover:text-white hover:bg-primary'
                            }`}
                        >
                            {showingAll ? 'Show Pages' : 'Show All'}
                        </button>
                    </li>

                    <li>
                        <button
                            type="button"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={showingAll || currentPage === totalPages}
                            className={`flex justify-center font-semibold p-2 rounded-full transition ${
                                showingAll || currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'bg-white-light text-dark hover:text-white hover:bg-primary'
                            } dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary`}
                        >
                            <GrNext />
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default ExpenseApproveUI;
// ----------------------------------------------------