import React, { useEffect, useState } from 'react';
import { Card, Tooltip, MenuItem, Select, FormControl, InputLabel, TextField } from '@mui/material';
import { Check, X, ChevronLeft, ChevronRight, Download, Filter, FilePlus, Trash2, Printer } from 'lucide-react';
import { Button } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ICompanyExpense
} from '../../interface/Expences';
import { formattedTime, dateFormate } from '../../utils/dateUtils';
import Loader from '../../components/loader';
import { showConfirmationToast } from '../../components/toastUtils';
import { ROLES } from '../../constants/roles'
import ReusableModal from '../../components/modal';
import CompanyExpenseFormFormik from './AddCompanyExpense';
import { 
  approveCompanyExpense, 
  getCompanyExpenses, 
  updateCompanyExpense, 
  deleteCompanyExpense 
} from './expensesService';
import logo from '../../assets/images/RSALogo.png'

const CompanyExpenses = () => {
  const [expenses, setExpenses] = useState<ICompanyExpense[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [amountInputValues, setAmountInputValues] = useState<Record<string, string | number>>({});
  const [openModal, setOpenModal] = useState<boolean>(false);
  
  // Filter states
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [employee, setEmployee] = useState<string>('');

  // Loaders
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [filterLoading, setFilterLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // NEW: Total amount state
  const [totalAmount, setTotalAmount] = useState<number>(0);

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

  const employees = [
    { value: 'employee1', label: 'John Doe' },
    { value: 'employee2', label: 'Jane Smith' },
    { value: 'employee3', label: 'Mike Johnson' },
  ];

  const categories = [
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'rent', label: 'Rent' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'travel', label: 'Travel' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'software', label: 'Software' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'other', label: 'Other' },
  ];

  const role = localStorage.getItem('role') || '';

  // NEW: Function to calculate total amount
  const calculateTotalAmount = (expenses: ICompanyExpense[]): number => {
    return expenses.reduce((total, expense) => {
      const amount = typeof expense.amount === 'string' 
        ? parseFloat(expense.amount) 
        : expense.amount;
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  // NEW: Function to get current filter description
  const getFilterDescription = (): string => {
    const monthLabel = months.find(m => m.value === month)?.label || 'All Months';
    const yearLabel = year || 'All Years';
    const categoryLabel = categories.find(c => c.value === category)?.label || 'All Categories';
    
    return `${monthLabel} ${yearLabel} - ${categoryLabel}`;
  };

  // In your CompanyExpenses component
  const fetchCompanyExpenses = async () => {
    try {
      setLoading(true);
      setFilterLoading(true);

      console.log('Fetching expenses from:', import.meta.env.VITE_BACKEND_URL);
      console.log('Token exists:', !!localStorage.getItem('token'));

      const response = await getCompanyExpenses(
        month, 
        year, 
        category,
        employee,
        currentPage,
        itemsPerPage,
        showAll
      );
      console.log("response", response);
      
      setExpenses(response.data);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);

      // NEW: Calculate and set total amount
      const calculatedTotal = calculateTotalAmount(response.data);
      setTotalAmount(calculatedTotal);

      response.data.forEach((expense: ICompanyExpense) => {
        setAmountInputValues((prev) => ({ ...prev, [expense._id]: expense.amount }))
      });

    } catch (error: any) {
      console.error('Error fetching company expenses:', error);
      if (error.code === 'ERR_NETWORK') {
        console.error('Network error - Backend server is not reachable');
      }
      // NEW: Reset total amount on error
      setTotalAmount(0);
    } finally {
      setFilterLoading(false);
      setLoading(false);
    }
  };

  // DELETE OPERATION
  const handleDeleteExpense = async (expenseId: string, expenseTitle: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [expenseId]: true }));
      
      await deleteCompanyExpense(expenseId);
      
      // Show success message
      alert(`Expense "${expenseTitle}" deleted successfully!`);
      
      // Refresh the expenses list
      fetchCompanyExpenses();
      
    } catch (error) {
      console.error('Error deleting company expense:', error);
      alert('Failed to delete expense. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when applying filters
    fetchCompanyExpenses();
  };

  const handleResetFilters = () => {
    setMonth('');
    setYear('');
    setCategory('');
    setEmployee('');
    setCurrentPage(1);
    fetchCompanyExpenses();
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
    fetchCompanyExpenses();
  }, [currentPage, itemsPerPage, showAll]);

  // FIXED: Added proper type constraint for status
   const handleStatusUpdate = async (expenseId: string, status: 'Approved' | 'Rejected') => {
    try {
      setActionLoading(prev => ({ ...prev, [expenseId]: true }));
      await approveCompanyExpense(expenseId, status);
      fetchCompanyExpenses();
    } catch (error) {
      console.error('Error approving company expense:', error);
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

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const getDownloadableUrl = (url: string) => {
    return url.replace('/upload/', '/upload/fl_attachment/');
  };

  const downloadImage = (imageUrl: string) => {
    const downloadableUrl = getDownloadableUrl(imageUrl);
    const link = document.createElement('a');
    link.href = downloadableUrl;
    link.download = `company-expense-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleChangeAmountField = (value: string, expenseId: string) => {
    setAmountInputValues(prev => ({ ...prev, [expenseId]: value }));
  };

  const handleUpdateAmount = (expenseId: string) => {
    const amountValue = amountInputValues[expenseId];
    const numericAmount = typeof amountValue === 'string' 
      ? parseFloat(amountValue) 
      : amountValue;
    
    updateCompanyExpense(expenseId, { amount: numericAmount });
  };

  const handleModal = () => {
    setOpenModal(!openModal);
  };

  const getCategoryLabel = (categoryValue: string) => {
    const foundCategory = categories.find(cat => cat.value === categoryValue);
    return foundCategory ? foundCategory.label : categoryValue;
  };

  const getImageUrl = (imagePublicId: string): string => {
    if (!imagePublicId) return '';
    
    const cloudName = 'dksxgbcyi';
    
    if (imagePublicId.includes('/')) {
      return `https://res.cloudinary.com/${cloudName}/image/upload/${imagePublicId}`;
    } else {
      return `https://res.cloudinary.com/${cloudName}/image/upload/company-expenses/${imagePublicId}`;
    }
  };

  const handleImageClick = (imagePublicId: string) => {
    const imageUrl = getImageUrl(imagePublicId);
    if (imageUrl) {
      console.log('Opening image URL:', imageUrl);
      setSelectedImage(imageUrl);
    }
  };
const handlePrintExpenses = () => {
  // Create a print-friendly HTML content
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Company Expenses Report</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          color: #333;
        }
        .company-header {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 2px solid #4f46e5;
        }
        .company-logo {
          height: 60px;
          margin-right: 20px;
        }
        .company-info {
          text-align: center;
        }
        .company-info h1 {
          color: #4f46e5;
          margin: 0 0 5px 0;
          font-size: 24px;
        }
        .company-info .subtitle {
          color: #666;
          font-size: 14px;
          margin: 0;
        }
        .report-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .report-header h2 {
          color: #333;
          margin: 0 0 10px 0;
          font-size: 20px;
        }
        .filter-info {
          text-align: center;
          margin-bottom: 20px;
          color: #666;
          font-size: 14px;
          background: #f8fafc;
          padding: 10px;
          border-radius: 6px;
        }
        .summary {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #4f46e5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th {
          background-color: #4f46e5;
          color: white;
          padding: 12px 8px;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: bold;
        }
        td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .status-approved { 
          color: #059669; 
          background: #d1fae5; 
          padding: 4px 8px; 
          border-radius: 12px; 
          font-size: 11px;
        }
        .status-pending { 
          color: #d97706; 
          background: #fef3c7; 
          padding: 4px 8px; 
          border-radius: 12px; 
          font-size: 11px;
        }
        .status-rejected { 
          color: #dc2626; 
          background: #fee2e2; 
          padding: 4px 8px; 
          border-radius: 12px; 
          font-size: 11px;
        }
        .total-row {
          background-color: #4f46e5 !important;
          color: white;
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 11px;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        @media print {
          body { margin: 10mm; }
          .no-print { display: none; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      <!-- Company Header with Logo -->
      <div class="company-header">
        <img class="company-logo" src="${logo}" alt="Company Logo" onerror="this.style.display='none'" />
        <div class="company-info">
          <h1>RSA</h1>
          <p class="subtitle">Expense Management System</p>
        </div>
      </div>
      
      <!-- Report Header -->
      <div class="report-header">
        <h2>Expenses Report</h2>
        <div class="filter-info">
          <strong>Period:</strong> ${getFilterDescription()} • 
          <strong>Generated:</strong> ${new Date().toLocaleDateString()}
        </div>
      </div>
      
      <!-- Summary -->
      <div class="summary">
        <strong>Summary:</strong> ${totalItems} expenses • Total Amount: ₹${totalAmount.toLocaleString('en-IN')}
      </div>
      
      <!-- Expenses Table -->
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Expense ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount (₹)</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map((expense, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${expense.expenseId}</td>
              <td>${expense.title}</td>
              <td>${getCategoryLabel(expense.category)}</td>
              <td>${expense.description}</td>
              <td>₹${(typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount).toLocaleString('en-IN')}</td>
              <td>${dateFormate(expense.createdAt)}</td>
              <td>
                <span class="status-${expense.status.toLowerCase()}">
                  ${expense.status}
                </span>
              </td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5" style="text-align: right;"><strong>Total:</strong></td>
            <td><strong>₹${totalAmount.toLocaleString('en-IN')}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        Printed on ${new Date().toLocaleString()} • ${expenses.length} records displayed • RSA Company
      </div>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
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
          Company Expenses
        </motion.h2>
        <div className='flex items-center justify-center gap-1'>
          {/* Print Button - Add this */}
          <Button
            onClick={handlePrintExpenses}
            disabled={expenses.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Printer size={18} />
            Print
          </Button>
          
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
        
         <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg"
        >
          <div className="flex flex-col md:flex-row justify-between items-center text-white">
            <div>
              <h3 className="text-lg font-semibold">Total Expenses</h3>
              <p className="text-indigo-100 text-sm">
                {getFilterDescription()} • {totalItems} expenses
              </p>
            </div>
            <div className="text-right mt-2 md:mt-0">
              <div className="text-3xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</div>
                        </div>
          </div>
        </motion.div>
        
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
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={category}
                      label="Category"
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <div className="flex items-end gap-2 h-10">
                    <Button
                      type="submit"
                      className={`bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg w-full flex items-center justify-center ${filterLoading ? 'text-xs px-0 gap-1' : 'px-4'}`}
                    >
                      Apply Filters {filterLoading && <Loader />}
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
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount (₹)</th>
                <th className="px-4 py-3">Image</th>
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
                      {/* Your existing table rows remain the same */}
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{expense.expenseId}</td>
                      <td className="px-4 py-3 font-medium">{expense.title}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div
                          className={`cursor-pointer ${!expandedDescriptions[expense._id] && 'truncate'}`}
                          onClick={() => toggleDescription(expense._id)}
                        >
                          {expense.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            readOnly={[ROLES.ADMIN].includes(role) ? false : true}
                            className='w-24 border py-1 px-2 rounded-md border-gray-500'
                            value={amountInputValues[expense._id]}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              handleChangeAmountField(e.target.value, expense._id)
                            }
                          />
                          {[ROLES.ADMIN].includes(role) && (
                            <button
                              className='bg-green-500 text-white rounded-md px-2 py-1 text-xs'
                              onClick={() => showConfirmationToast(
                                "Are you sure you want to update the amount?", 
                                () => handleUpdateAmount(expense._id)
                              )}
                            >
                              Update
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {expense.image ? (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <img
                              src={getImageUrl(expense.image)}
                              alt="Expense Receipt"
                              className="shadow-sm cursor-pointer h-12 w-20 rounded-lg border-2 border-white object-cover object-center"
                              onClick={() => handleImageClick(expense.image)}
                              onError={(e) => {
                                console.error('Image failed to load:', expense.image);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </motion.div>
                        ) : (
                          <span className="text-gray-400 text-sm">No image</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {`${dateFormate(expense.createdAt)}, ${formattedTime(expense.createdAt)}`}
                      </td>
                      <td className="px-4 py-3">
                        <motion.span
                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                            expense.status === 'Approved' 
                              ? 'bg-green-100 text-green-700' 
                              : expense.status === 'Rejected' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                        >
                          {expense.status}
                        </motion.span>
                      </td>
                      <td className="px-4 py-3 flex items-center justify-center gap-2">
                        {/* Approve Button */}
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            onClick={() => showConfirmationToast(
                              "Are you sure you want to approve this expense?",
                              () => handleStatusUpdate(expense._id, 'Approved')
                            )}
                            disabled={expense.status === 'Approved' || actionLoading[expense._id]}
                            className={`${
                              expense.status === 'Approved'
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

                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            onClick={() => showConfirmationToast(
                              "Are you sure you want to reject this expense?",
                              () => handleStatusUpdate(expense._id, 'Rejected')
                            )}
                            disabled={expense.status === 'Rejected' || actionLoading[expense._id]}
                            className={`${
                              expense.status === 'Rejected'
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
                        
{[ROLES.ADMIN, ROLES.accountant].includes(role) && (
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              onClick={() => showConfirmationToast(
                                `Are you sure you want to delete expense "${expense.title}"? This action cannot be undone.`,
                                () => handleDeleteExpense(expense._id, expense.title)
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

        {/* Image Modal - FIXED: Simplified for single image */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity duration-300"
            onClick={closeImageModal}
          >
            <div
              className="relative bg-white rounded-xl p-4 max-w-4xl max-h-[90vh] overflow-hidden outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Expense Receipt"
                className="max-h-[70vh] max-w-full object-contain rounded-lg mx-auto"
              />
              <div className='flex flex-row gap-2 item-end mt-5'>
                <button
                  onClick={closeImageModal}
                  className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                >
                  <X size={20} />
                </button>

                <button
                  onClick={() => selectedImage && downloadImage(selectedImage)}
                  className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      <ReusableModal isOpen={openModal} onClose={handleModal} title='Add Company Expense'>
        <CompanyExpenseFormFormik fetchData={fetchCompanyExpenses} onClose={handleModal}/>
      </ReusableModal>
    </motion.div>
  );
};

export default CompanyExpenses;
// -------------------------------------------------------------------------