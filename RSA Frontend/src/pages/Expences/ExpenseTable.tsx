// components/ExpenseTable.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, IconButton } from '@mui/material';
import { Expense } from '../../interface/Expences';
import { Edit, Trash2, Eye } from 'lucide-react'; // Import icons

interface ExpenseTableProps {
    expenses: Expense[];
    expandedDescriptions: Record<string, boolean>;
    toggleDescription: (id: string) => void;
    openImageModal: (src: string) => void;
    CLOUD_IMAGE: string;
    onEdit: (expenseId: string) => void;
    onDelete: (expenseId: string) => void;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ 
    expenses, 
    expandedDescriptions, 
    toggleDescription, 
    openImageModal,  
    CLOUD_IMAGE,
    onEdit,
    onDelete
}) => {
    return (
        <div className="overflow-x-auto my-2">
            <table className="min-w-full text-sm text-left text-gray-600 bg-white shadow-md border rounded">
                <thead className="bg-indigo-50 border-b text-indigo-700">
                    <tr>
                        <th className="px-4 py-3">No</th>
                        <th className="px-4 py-3">Driver</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Amount (₹)</th>
                        <th className="px-4 py-3">Images</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    <AnimatePresence>
                        {expenses.map((expense, index) => (
                            <motion.tr
                                key={expense._id}
                                className="hover:bg-gray-50"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <td className="px-4 py-3">{index + 1}</td>
                                <td className="px-4 py-3">
                                    <Tooltip title={`Driver: ${expense.driver?.name || 'N/A'}`}>
                                        <span className="cursor-help">{expense.driver?.name || 'No Driver'}</span>
                                    </Tooltip>
                                </td>
                                <td className="px-4 py-3 max-w-xs">
                                    <div 
                                        className={`cursor-pointer ${!expandedDescriptions[expense._id] && 'truncate'}`} 
                                        onClick={() => toggleDescription(expense._id)}
                                    >
                                        {expense.description || 'No description'}
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-green-700">₹{expense.amount.toLocaleString()}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2 items-center -space-x-4">
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Tooltip title="View Image">
                                                <img
                                                    src={`${CLOUD_IMAGE}${expense.image}`}
                                                    alt="Expense"
                                                    className="shadow-sm cursor-pointer relative inline-block h-12 w-20 rounded-full border-2 border-white object-cover object-center hover:z-10 focus:z-10"
                                                    onClick={() => openImageModal(`${CLOUD_IMAGE}${expense.image}`)}
                                                />
                                            </Tooltip>
                                        </motion.div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {expense.createdAt ? (
                                        new Date(expense.createdAt).toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: 'numeric',
                                            minute: 'numeric',
                                            second: 'numeric',
                                            hour12: true,
                                        })
                                    ) : 'N/A'}
                                </td>
                                <td className="px-4 py-3 capitalize">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        expense.approve 
                                            ? 'bg-green-100 text-green-800' 
                                            : expense.status === 'rejected' 
                                                ? 'bg-red-100 text-red-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {expense.approve ? 'Approved' : expense.status === 'rejected' ? 'Rejected' : 'Pending'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {/* Edit Button */}
                                      <Tooltip title="Edit Expense">
    <button
        onClick={() => onEdit(expense._id)}
        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
        disabled={!!expense.approve} // Convert to boolean
        title={expense.approve ? "Cannot edit approved expenses" : "Edit"}
    >
        <Edit size={18} />
    </button>
</Tooltip>

<Tooltip title="Delete Expense">
    <button
        onClick={() => onDelete(expense._id)}
        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
        disabled={!!expense.approve} // Convert to boolean
        title={expense.approve ? "Cannot delete approved expenses" : "Delete"}
    >
        <Trash2 size={18} />
    </button>
</Tooltip>
                                        
                                        {/* View Details Button (Optional) */}
                                        <Tooltip title="View Details">
                                            <button
                                                onClick={() => openImageModal(`${CLOUD_IMAGE}${expense.image}`)}
                                                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
};

export default ExpenseTable;
// --------------------------------------------------