import { Button } from '@headlessui/react';
import { Card, CardContent, Badge, IconButton, Avatar, Chip, Tooltip, Modal, Backdrop, Fade } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle, Bell, RefreshCw, Download, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import { connectSocket, getSocket, disconnectSocket } from '../../utils/socket';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { CLOUD_IMAGE } from '../../constants/status';
import ReusableModal from '../../components/modal';
import { dateFormate, formattedTime } from '../../utils/dateUtils';
import { Expense } from '../../interface/Expences';
import { fetchExpenses, fetchPendingExpenses, updateStatus } from '../../services/expencesService';
import ExpenseTable from './ExpenseTable';



const ExpenseApproveUI = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [currentExpenseIndex, setCurrentExpenseIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Mock API calls - replace with your actual API calls
  const fetchPendingExpense = async () => {
    try {
      setLoading(true);

      const response: Expense[] = await fetchPendingExpenses() as unknown as Expense[]
      setExpenses(response);

      setNewRequestsCount(0);
    } catch (error) {
      enqueueSnackbar('Failed to fetch expenses', { variant: 'error' });
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpense = async () => {
    try {
      setLoading(true);

      const response: Expense[] = await fetchExpenses() as unknown as Expense[]
      setAllExpenses(response);

      setNewRequestsCount(0);
    } catch (error) {
      enqueueSnackbar('Failed to fetch expenses', { variant: 'error' });
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDescription = (expenseId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const approveExpense = async (expenseId: string) => {
    try {
      setActionLoading(true);

      await updateStatus(expenseId, true)

      setExpenses(prev => prev.map(exp =>
        exp._id === expenseId ? { ...exp, approve: true } : exp
      ));
      enqueueSnackbar('Expense approved successfully', { variant: 'success' });
      moveToNextExpense();
    } catch (error) {
      enqueueSnackbar('Failed to approve expense', { variant: 'error' });
      console.error('Error approving expense:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const rejectExpense = async (expenseId: string) => {
    try {
      setActionLoading(true);

      await updateStatus(expenseId, false)

      setExpenses(prev => prev.map(exp =>
        exp._id === expenseId ? { ...exp, approve: false } : exp
      ));
      enqueueSnackbar('Expense rejected successfully', { variant: 'success' });
      moveToNextExpense();
    } catch (error) {
      enqueueSnackbar('Failed to reject expense', { variant: 'error' });
      console.error('Error rejecting expense:', error);
    } finally {
      setActionLoading(false);
    }
  };

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
    setCurrentExpenseIndex(prev => {
      if (prev >= expenses.length - 1) {
        fetchPendingExpense(); // Refresh list when we reach the end
        return 0;
      }
      return prev + 1;
    });
  };

  const moveToPrevExpense = () => {
    setCurrentExpenseIndex(prev => (prev > 0 ? prev - 1 : prev));
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
        )
      });
      setNewRequestsCount(prev => prev + 1);
    });

    return () => {
      socket.off('new-expense');
      disconnectSocket();
    };
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchPendingExpense();
    fetchExpense()
  }, []);

  const currentExpense = expenses[currentExpenseIndex];
  const updatedCash = currentExpense?.driver.cashInHand - (currentExpense?.amount || 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!expenses.length) {
    return (<>
      <Card className="w-full max-w-lg mx-auto mt-12 p-6 shadow-2xl rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-100">
        <CardContent className="text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-indigo-400" />
          <h3 className="text-xl font-semibold text-gray-700">No Pending Expenses</h3>
          <p className="text-gray-500">There are currently no expense requests awaiting approval.</p>
          <Button
            onClick={fetchPendingExpense}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </CardContent>
      </Card>
      <ExpenseTable
        expenses={allExpenses}
        expandedDescriptions={expandedDescriptions}
        toggleDescription={toggleDescription}
        openImageModal={openImageModal}
        CLOUD_IMAGE={CLOUD_IMAGE}
      />
    </>
    );
  }

  return (
    <div className="relative">
      {/* Floating notification badge */}
      {newRequestsCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed top-4 right-4 z-50"
        >
          <Badge
            badgeContent={newRequestsCount}
            color="error"
            overlap="circular"
            onClick={fetchPendingExpense}
            className="cursor-pointer"
          >
            <IconButton className="bg-indigo-100 hover:bg-indigo-200">
              <Bell className="text-indigo-600" />
            </IconButton>
          </Badge>
        </motion.div>
      )}

      <Card className="w-full max-w-lg mx-auto mt-12 p-6 shadow-2xl rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-100">
        <CardContent className="space-y-6 text-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-indigo-700">Expense Approval</h2>
            <Chip
              label={`${currentExpenseIndex + 1}/${expenses.length}`}
              color="primary"
              size="small"
            />
          </div>

          {/* Driver Info */}
          <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
            <Avatar
              src={currentExpense.driver.image}
              alt={currentExpense.driver.name}
              className="h-12 w-12"
            />
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
              <span className={`font-bold ${updatedCash < 0 ? 'text-red-600' : 'text-green-800'}`}>
                ₹{updatedCash.toLocaleString()}
              </span>
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
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-600">Receipt:</p>
              <Button
                onClick={() => setImageModalOpen(true)}
                className="text-indigo-600 text-sm font-medium flex items-center gap-1"
              >
                {/* <Maximize2 size={14} /> */}
                View Full
              </Button>
            </div>
            <img
              src={`${CLOUD_IMAGE}${currentExpense.image}`} // Replace with your actual image path
              alt="Expense receipt"
              className="w-full h-32 object-contain rounded border bg-gray-50 cursor-pointer"
              onClick={() => setImageModalOpen(true)}
            />
          </div>

          {/* Date */}
          <div className="text-right text-sm text-gray-500">
            {/* {format(new Date(currentExpense.createdAt), 'MMM dd, yyyy hh:mm a')} */}
          </div>

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
                {actionLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <X size={16} />
                )}
                Reject
              </Button>
              <Button
                onClick={() => approveExpense(currentExpense._id)}
                className={`bg-green-600 hover:bg-green-700'} text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-2`}
              >
                {actionLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Check size={16} />
                )}
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

      {/* Image Modal */}
      <ReusableModal
        title='Expense Image'
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
      >
        <div className="bg-white rounded-xl p-4 max-w-4xl max-h-[90vh] outline-none">
          <div className="relative">
            <img
              src={`${CLOUD_IMAGE}${currentExpense.image}`} // Replace with your actual image path
              alt="Expense receipt"
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <IconButton
                // onClick={() => downloadImage(`/receipts/${currentExpense.image}`)}
                className="bg-black/50 hover:bg-black/70 text-white"
              >
                <Download size={20} />
              </IconButton>
              <IconButton
                onClick={() => setImageModalOpen(false)}
                className="bg-black/50 hover:bg-black/70 text-white"
              >
                <X size={20} />
              </IconButton>
            </div>
          </div>
        </div>
      </ReusableModal>
      <div className="overflow-x-auto my-10">
        <ExpenseTable
          expenses={allExpenses}
          expandedDescriptions={expandedDescriptions}
          toggleDescription={toggleDescription}
          openImageModal={openImageModal}
          CLOUD_IMAGE={CLOUD_IMAGE}
        />
        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity duration-300"
            onClick={closeImageModal}
          >
            <div
              className="relative bg-white rounded-xl p-4 max-w-4xl max-h-[90vh] overflow-hidden outline-none"
              onClick={(e) => e.stopPropagation()} // prevent modal close when clicking on image
            >

              <img
                src={selectedImage}
                alt="Expense Receipt"
                className="max-h-[70vh] max-w-full object-contain rounded-lg mx-auto"
              />
              <div className='flex flex-row gap-2 item-end mt-5'>
                {/* Close Button */}
                <button
                  onClick={closeImageModal}
                  className=" top-2 left-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                >
                  <X size={20} />
                </button>

                {/* Download Button */}
                <button
                  onClick={() => selectedImage && downloadImage(selectedImage)}
                  className=" top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseApproveUI;