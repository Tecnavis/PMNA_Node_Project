import React, { useEffect, useState } from 'react';
import { Card, Tooltip, MenuItem, Select, FormControl, InputLabel, TextField } from '@mui/material';
import { Check, X, ChevronLeft, ChevronRight, Download, Filter, FilePlus } from 'lucide-react';
import { Button } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IDieselExpense
} from '../../interface/Expences';
import { getExpences, approveExpense, udpateDieselExpance } from '../../services/expencesService';
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
  // -----------------------------------------------
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
  ];

  const role = localStorage.getItem('role') || ''

  const fetchDieselExpences = async () => {
    try {
      setLoading(true);
      setFilterLoading(true);

      const data: IDieselExpense[] = await getExpences(month, year, vehicleNumber) as IDieselExpense[];
      setExpenses(data);

      data.forEach((expense) => {
        setkmInputValues((prev) => ({ ...prev, [expense._id]: expense.expenceKm }))
      })

    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setFilterLoading(false)
      setLoading(false);
    }
  }

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

  useEffect(() => {
    fetchDieselExpences();
    fetchVehiclesNamesList()
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

  const handleChangeInputField = (value: string, expenseId: string) => {
    setkmInputValues(prev => ({ ...prev, [expenseId]: value }));
  }

  const handleUpdateKm = (expenseId: string) => udpateDieselExpance(expenseId, { expenceKm: kmInputValues[expenseId] })

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
                      className={`bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg w-full flex items-center justify-center ${loading ? 'text-xs px-0 gap-1' : 'px-4'}`}
                    >
                      Apply Filters {loading && (
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
                <th className="px-4 py-3">Expense ID</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Vehicle Number</th>
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
                {expenses.map((expense) => (
                  <motion.tr
                    key={expense.expenseId}
                    className="hover:bg-gray-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td className="px-4 py-3 font-medium w-auto">{expense.expenseId}</td>
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
                        {expense.vehicleNumber}
                      </div>
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
                      <div
                        className={`cursor-pointer ${!expandedDescriptions[expense._id] && 'truncate'}`}
                        onClick={() => toggleDescription(expense._id)}
                      >
                        <input
                          type="number"
                          readOnly={[ROLES.ADMIN].includes(role) ? false : true}
                          className='w-20 border py-1 px-2 rounded-md mr-1 border-gray-500 m-auto'
                          value={kmInputValues[expense._id]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeInputField(e.target.value, expense._id)}
                        />
                        {[ROLES.ADMIN].includes(role) && (
                          <button
                            className='bg-green-500 text-white rounded-md px-1 py-1'
                            onClick={() => showConfirmationToast("Are you sure you want to update the kilometers?", () => handleUpdateKm(expense._id))}
                          >
                            Update
                          </button>
                        )}
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
                          onClick={() => showConfirmationToast(
                            "Are you sure you want to approve this expance.",
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
                            "Are you sure you want to reject this expance.?",
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
      <ReusableModal isOpen={openModal} onClose={handleModal} title='Add Diesel Expenses'>
        <DieselExpenseFormFormik vehiclesNames={vehiclesNames} fetchData={fetchDieselExpences} onClose={handleModal}/>
      </ReusableModal>
    </motion.div>
  );
};

export default DieselExpenses;