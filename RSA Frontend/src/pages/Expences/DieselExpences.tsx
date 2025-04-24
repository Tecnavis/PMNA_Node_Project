import React, { useEffect, useState } from 'react';
import { Card, Tooltip } from '@mui/material';
import { Check, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IDieselExpense
} from '../../interface/Expences';
import { getExpences, approveExpense } from '../../services/expencesService';
import { CLOUD_IMAGE } from '../../constants/status';
import { formattedTime, dateFormate } from '../../utils/dateUtils';


const DieselExpenses = () => {
  const [expenses, setExpenses] = useState<IDieselExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchDieselExpences = async () => {
    try {
      setLoading(true);
      const data: IDieselExpense[] = await getExpences() as IDieselExpense[];
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDieselExpences();
  }, []);

  const handleStatusUpdate = async (expenseId: string, status: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [expenseId]: true }));
      await approveExpense(expenseId, status);
      fetchDieselExpences()
    } catch (error) {
      console.error('Error approving expense:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  const toggleDescription = (expenseId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
  };

  const openImageModal = (imageUrl: string, index: number = 0) => {
    setSelectedImage(imageUrl);
    setCurrentImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const navigateImages = (direction: 'prev' | 'next') => {
    if (!selectedImage) return;

    const expense = expenses.find(exp =>
      exp.images.includes(selectedImage.replace(`${CLOUD_IMAGE}`, ''))
    );

    if (!expense) return;

    const currentIndex = expense.images.indexOf(selectedImage.replace(`${CLOUD_IMAGE}`, ''));
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    // Wrap around if at ends
    if (newIndex >= expense.images.length) newIndex = 0;
    if (newIndex < 0) newIndex = expense.images.length - 1;

    setSelectedImage(`${CLOUD_IMAGE}${expense.images[newIndex]}`);
    setCurrentImageIndex(newIndex);
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


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 shadow-xl rounded-2xl bg-white">
        <div className="flex justify-between items-center mb-6">
          <motion.h2
            className="text-2xl font-semibold text-indigo-700"
            initial={{ x: -20 }}
            animate={{ x: 0 }}
          >
            Diesel Expenses
          </motion.h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="bg-indigo-50 border-b text-indigo-700">
              <tr>
                <th className="px-4 py-3">Expense ID</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount (₹)</th>
                <th className="px-4 py-3">Images</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <AnimatePresence>
                {expenses.map((expense) => (
                  <motion.tr
                    key={expense.expenseId}
                    className="hover:bg-gray-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td className="px-4 py-3 font-medium">{expense.expenseId}</td>
                    <td className="px-4 py-3">
                      <Tooltip title={`Driver ID: ${expense.driver._id}`}>
                        <span className="cursor-help">{expense.driver.name}</span>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div
                        className={`cursor-pointer ${!expandedDescriptions[expense._id] && 'truncate'}`}
                        onClick={() => toggleDescription(expense._id)}
                      >
                        {expense.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">₹{expense.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center -space-x-4">
                        {expense.images.slice(0, 2).map((img, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <img
                              src={`${CLOUD_IMAGE}${img}`}
                              alt={`Expense ${idx + 1}`}
                              className=" shadow-sm cursor-pointer relative inline-block h-12 w-20 rounded-full border-2 border-white object-cover object-center hover:z-10 focus:z-10"
                              onClick={() => openImageModal(`${CLOUD_IMAGE}${img}`, idx)}
                            />
                          </motion.div>
                        ))}
                        {expense.images.length > 2 && (
                          <motion.div
                            className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center cursor-pointer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openImageModal(`${CLOUD_IMAGE}${expense.images[0]}`)}
                          >
                            <span className="text-indigo-600 font-medium">
                              +{expense.images.length - 2}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {`${dateFormate(expense.createdAt)}, ${formattedTime(expense.createdAt)}`}
                    </td>
                    <td className="px-4 py-3">
                      <motion.span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${expense.status === 'Approved' ?
                          'bg-green-100 text-green-700' :
                          expense.status === 'Rejected' ?
                            'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                      >
                        {expense.status}
                      </motion.span>
                    </td>
                    <td className="px-4 py-3 mt-3 flex items-center justify-center gap-2">
                      {/* Approve Button */}
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          onClick={() => handleStatusUpdate(expense._id, 'Approved')}
                          disabled={expense.status === 'Approved' || actionLoading[expense._id]}
                          className={`${expense.status === 'Approved'
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                            } text-white px-3 py-1 rounded-lg flex items-center gap-1`}
                        >
                          {actionLoading[expense._id] ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <Check size={16} />
                          )}
                        </Button>
                      </motion.div>

                      {/* Reject Button */}
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          onClick={() => handleStatusUpdate(expense._id, 'Rejected')}
                          disabled={expense.status === 'Rejected' || actionLoading[expense._id]}
                          className={`${expense.status === 'Rejected'
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                            } text-white px-3 py-1 rounded-lg flex items-center gap-1`}
                        >
                          {actionLoading[expense._id] ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <X size={16} />
                          )}
                        </Button>
                      </motion.div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

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
              {/* Navigation Arrows */}
              {expenses.some(exp =>
                exp.images.length > 1 &&
                exp.images.includes(selectedImage?.replace(`${CLOUD_IMAGE}`, '') || '')
              ) && (
                  <>
                    <button
                      onClick={() => navigateImages('prev')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black hover:bg-black/70 text-white p-2 rounded-full"
                    >
                      <ChevronLeft />
                    </button>
                    <button
                      onClick={() => navigateImages('next')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black hover:bg-black/70 text-white p-2 rounded-full"
                    >
                      <ChevronRight />
                    </button>
                  </>
                )}
            </div>

          </div>
        )}

      </Card>
    </motion.div>
  );
};

export default DieselExpenses;