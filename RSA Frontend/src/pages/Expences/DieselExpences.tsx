import React, { useEffect, useState } from 'react';
import { Card, Tooltip, MenuItem, Select, FormControl, InputLabel, TextField } from '@mui/material';
import { Check, X, ChevronLeft, ChevronRight, Download, Filter, FilePlus, Trash2 } from 'lucide-react';
import { Button } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IDieselExpense
} from '../../interface/Expences';
import { getExpences, approveExpense, udpateDieselExpance, deleteDieselExpense } from '../../services/expencesService'; // Import delete function
import { CLOUD_IMAGE } from '../../constants/status';
import { formattedTime, dateFormate } from '../../utils/dateUtils';
import Loader from '../../components/loader';
import { showConfirmationToast } from '../../components/toastUtils';
import { ROLES } from '../../constants/roles'
import { getVehiclesList } from '../../services';
import { VehicleNames } from '../../interface/Vehicle';
import ReusableModal from '../../components/modal';
import DieselExpenseFormFormik from './AddDieselExpense';

const DieselExpenses = () => {
  const [expenses, setExpenses] = useState<IDieselExpense[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [kmInputValues, setkmInputValues] = useState<Record<string, string | number>>({});
  const [openModal, setOpenModal] = useState<boolean>(false);
    const [amountInputValues, setAmountInputValues] = useState<Record<string, string | number>>({}); // New state for amount

  // Filter states
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [vehiclesNames, setVehiclesNames] = useState<VehicleNames[]>([]);
  
  // loaders
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [filterLoading, setFilterLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = [
    { value: '2023', label: '2023' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
        { value: '2026', label: '2026' },

            { value: '2027', label: '2027' },

  ];

  const role = localStorage.getItem('role') || ''

  const fetchDieselExpences = async () => {
    try {
      setLoading(true);
      setFilterLoading(true);

      const response = await getExpences(
        month, 
        year, 
        vehicleNumber,
        currentPage,
        itemsPerPage,
        showAll
      );
      
      setExpenses(response.data);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);

       response.data.forEach((expense) => {
        setkmInputValues((prev) => ({ ...prev, [expense._id]: expense.expenceKm }));
        setAmountInputValues((prev) => ({ ...prev, [expense._id]: expense.amount })); // Initialize amount
      });

    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setFilterLoading(false)
      setLoading(false);
    }
  }

  // DELETE OPERATION - Add this function
  const handleDeleteExpense = async (expenseId: string, expenseDescription: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [expenseId]: true }));
      
      await deleteDieselExpense(expenseId);
      
      // Show success message
      alert(`Diesel expense "${expenseDescription.substring(0, 30)}..." deleted successfully!`);
      
      // Refresh the expenses list
      fetchDieselExpences();
      
    } catch (error) {
      console.error('Error deleting diesel expense:', error);
      alert('Failed to delete expense. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDieselExpences();
  };

  const handleResetFilters = () => {
    setMonth('');
    setYear('');
    setVehicleNumber('');
    fetchDieselExpences();
  };

  // Pagination controls
  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
        </span>
        
        <FormControl size="small" className="w-24">
          <InputLabel>Per Page</InputLabel>
          <Select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            label="Per Page"
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
          </Select>
        </FormControl>
        
        <Button
          onClick={() => setShowAll(!showAll)}
          className={`px-3 py-1 rounded-md ${showAll ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          {showAll ? 'Show Paginated' : 'Show All'}
        </Button>
      </div>
      
      {!showAll && (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <Button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-md ${currentPage === pageNum ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    fetchDieselExpences();
    fetchVehiclesNamesList();
  }, [currentPage, itemsPerPage, showAll]);

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

  const handleChangeInputField = (value: string, expenseId: string) => {
    setkmInputValues(prev => ({ ...prev, [expenseId]: value }));
  }

// Update kilometers function
  const handleUpdateKm = (expenseId: string) => {
    udpateDieselExpance(expenseId, { expenceKm: kmInputValues[expenseId] })
      .then(() => {
        fetchDieselExpences(); // Refresh data
      })
      .catch(error => {
        console.error('Error updating kilometers:', error);
      });
  }

  // NEW: Update amount function
  const handleUpdateAmount = (expenseId: string) => {
    udpateDieselExpance(expenseId, { amount: amountInputValues[expenseId] })
      .then(() => {
        fetchDieselExpences(); // Refresh data
      })
      .catch(error => {
        console.error('Error updating amount:', error);
      });
  }
  // Handle kilometer input change
  const handleChangeKmInput = (value: string, expenseId: string) => {
    setkmInputValues(prev => ({
      ...prev,
      [expenseId]: value
    }));
  }

  // NEW: Handle amount input change
  const handleChangeAmountInput = (value: string, expenseId: string) => {
    setAmountInputValues(prev => ({
      ...prev,
      [expenseId]: value
    }));
  }
  const fetchVehiclesNamesList = async () => {
    const list = await getVehiclesList()
    setVehiclesNames(list)
  }

  const handleModal = () => {
    setOpenModal(!openModal)
  }

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
          <div className='flex items-center justify-center gap-1'>
            <Button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
            >
              <Filter size={18} />
              Filters
            </Button>
            <Button
              onClick={handleModal}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
            >
              <FilePlus size={18} />
              Add Expense
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Card className="py-4 px-1 shadow-sm">
                <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormControl fullWidth size="small">
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={month}
                      label="Month"
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      <MenuItem value="">All Months</MenuItem>
                      {months.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={year}
                      label="Year"
                      onChange={(e) => setYear(e.target.value)}
                    >
                      <MenuItem value="">All Years</MenuItem>
                      {years.map((y) => (
                        <MenuItem key={y.value} value={y.value}>
                          {y.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Vehicles</InputLabel>
                    <Select
                      value={vehicleNumber}
                      label="Vehicle Number"
                      onChange={(e) => setVehicleNumber(e.target.value)}
                    >
                      <MenuItem value="">All Vehicles</MenuItem>
                      {vehiclesNames?.map((v) => (
                        <MenuItem key={v.serviceVehicle} value={v.serviceVehicle}>
                          {v.serviceVehicle}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <div className="flex items-end gap-2 h-10">
                    <Button
                      type="submit"
                      className={`bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg w-full flex items-center justify-center ${filterLoading ? 'text-xs px-0 gap-1' : 'px-4'}`}
                    >
                      Apply Filters {filterLoading && (
                        <Loader />
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleResetFilters}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2.5 rounded-lg w-full"
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="bg-indigo-50 border-b text-indigo-700">
              <tr>
                <th className="px-4 py-3">Index</th>
                <th className="px-4 py-3">Expense ID</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Vehicle Number</th>
                                                <th className="px-4 py-3">Total KM</th> {/* New Column */}

                                <th className="px-4 py-3">Petrol Pump</th> {/* New Column */}

                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">KiloMeter </th>
                <th className="px-4 py-3">Amount (₹)</th>
                <th className="px-4 py-3">Images</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <AnimatePresence>
                {expenses.map((expense, index) => (
                  expense && expense._id ? (
                    <motion.tr
                      key={expense._id.toString()}
                      className="hover:bg-gray-50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td>{index + 1}</td>
                      <td className="px-4 py-3 font-medium w-auto">{expense.expenseId}</td>
                      <td className="px-4 py-3">
                        <Tooltip title={`Driver ID: ${expense.driver?._id || 'N/A'}`}>
                          <span className="cursor-help">{expense.driver?.name || 'Unknown Driver'}</span>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div
                          className={`cursor-pointer ${!expandedDescriptions[expense._id] && 'truncate'}`}
                          onClick={() => toggleDescription(expense._id)}
                        >
                          {expense.vehicleNumber}
                        </div>
                      </td>
                                            <td className="px-4 py-3 font-medium w-auto text-danger">{expense.totalDriverDistance}</td>

                       <td className="px-4 py-3">
                        {expense.petrolPump ? (
                          <div className="max-w-xs">
                            <Tooltip 
                              title={
                                <div className="text-xs">
                                  <div><strong>Location:</strong> {expense.petrolPump.location}</div>
                                  {expense.petrolPump.contactNumber && (
                                    <div><strong>Contact:</strong> {expense.petrolPump.contactNumber}</div>
                                  )}
                                  {expense.petrolPump.address && (
                                    <div><strong>Address:</strong> {expense.petrolPump.address}</div>
                                  )}
                                </div>
                              }
                            >
                              <div className="cursor-help">
                                <div className="font-medium text-indigo-600">
                                  {expense.petrolPump.pumpName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {expense.petrolPump.location}
                                </div>
                              </div>
                            </Tooltip>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not specified</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div
                          className={`cursor-pointer ${!expandedDescriptions[expense._id] && 'truncate'}`}
                          onClick={() => toggleDescription(expense._id)}
                        >
                          {expense.description}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
    readOnly={![ROLES.ADMIN, ROLES.accountant].includes(role)}
                      className='w-20 border py-1 px-2 rounded-md border-gray-500'
                      value={kmInputValues[expense._id]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleChangeKmInput(e.target.value, expense._id)
                      }
                    />
{[ROLES.ADMIN, ROLES.accountant].includes(role) && (
                      <button
                        className='bg-green-500 text-white rounded-md px-2 py-1 text-xs hover:bg-green-600 transition-colors'
                        onClick={() => 
                          showConfirmationToast(
                            "Are you sure you want to update the kilometers?", 
                            () => handleUpdateKm(expense._id)
                          )
                        }
                      >
                        Update
                      </button>
                    )}
                  </div>
                </td>

                {/* Amount Column - UPDATED */}
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 mr-1">₹</span>
                    <input
                      type="number"
                      readOnly={![ROLES.ADMIN].includes(role)}
                      className='w-24 border py-1 px-2 rounded-md border-gray-500'
                      value={amountInputValues[expense._id]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleChangeAmountInput(e.target.value, expense._id)
                      }
                    />
                    {[ROLES.ADMIN].includes(role) && (
                      <button
                        className='bg-green-500 text-white rounded-md px-2 py-1 text-xs hover:bg-green-600 transition-colors'
                        onClick={() => 
                          showConfirmationToast(
                            "Are you sure you want to update the amount?", 
                            () => handleUpdateAmount(expense._id)
                          )
                        }
                      >
                        Update
                      </button>
                    )}
                  </div>
                </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center -space-x-4">
                          {expense.images?.slice(0, 2).map((img, idx) => (
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
                          {expense.images && expense.images.length > 2 && (
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
                            onClick={() => showConfirmationToast(
                              "Are you sure you want to approve this expense.",
                              () => handleStatusUpdate(expense._id, 'Approved')
                            )}
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
                            onClick={() => showConfirmationToast(
                              "Are you sure you want to reject this expense.?",
                              () => handleStatusUpdate(expense._id, 'Rejected')
                            )}
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

                        {/* DELETE Button - Only show for Admins */}
                        {[ROLES.ADMIN].includes(role) && (
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              onClick={() => showConfirmationToast(
                                `Are you sure you want to delete expense "${expense.description.substring(0, 30)}..."? This action cannot be undone.`,
                                () => handleDeleteExpense(expense._id, expense.description)
                              )}
                              disabled={actionLoading[expense._id]}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg flex items-center gap-1"
                            >
                              {actionLoading[expense._id] ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </td>
                    </motion.tr>
                  ) : null
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <PaginationControls />

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
      <ReusableModal isOpen={openModal} onClose={handleModal} title='Add Diesel Expenses'>
        <DieselExpenseFormFormik vehiclesNames={vehiclesNames} fetchData={fetchDieselExpences} onClose={handleModal}/>
      </ReusableModal>
    </motion.div>
  );
};

export default DieselExpenses;