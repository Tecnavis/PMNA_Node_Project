// components/ExpenseTable.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@mui/material";
import { Expense } from "../../interface/Expences";

interface ExpenseTableProps {
    expenses: Expense[];
    expandedDescriptions: Record<string, boolean>;
    toggleDescription: (id: string) => void;
    openImageModal: (src: string) => void;
    CLOUD_IMAGE: string;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({
    expenses,
    expandedDescriptions,
    toggleDescription,
    openImageModal,
    CLOUD_IMAGE,
}) => {
    return (
        <div className="overflow-x-auto my-10">
            <table className="min-w-full text-sm text-left text-gray-600 bg-white shadow-md border rounded">
                <thead className="bg-indigo-50 border-b text-indigo-700">
                    <tr>
                        <th className="px-4 py-3">Driver</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Amount (₹)</th>
                        <th className="px-4 py-3">Images</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    <AnimatePresence>
                        {expenses.map((expense) => (
                            <motion.tr
                                key={expense._id}
                                className="hover:bg-gray-50"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <td className="px-4 py-3">
                                    <Tooltip title={`Driver: ${expense.driver.name}`}>
                                        <span className="cursor-help">{expense.driver.name}</span>
                                    </Tooltip>
                                </td>
                                <td className="px-4 py-3 max-w-xs">
                                    <div
                                        className={`cursor-pointer ${!expandedDescriptions[expense._id] && "truncate"
                                            }`}
                                        onClick={() => toggleDescription(expense._id)}
                                    >
                                        {expense.description}
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-green-700">
                                    ₹{expense.amount.toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2 items-center -space-x-4">
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <img
                                                src={`${CLOUD_IMAGE}${expense.image}`}
                                                alt="Expense"
                                                className="shadow-sm cursor-pointer relative inline-block h-12 w-20 rounded-full border-2 border-white object-cover object-center hover:z-10 focus:z-10"
                                                onClick={() => openImageModal(`${CLOUD_IMAGE}${expense.image}`)}
                                            />
                                        </motion.div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {new Date(expense.createdAt).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 capitalize">{expense.approve ? "Approved" : "Rejected"}</td>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
};

export default ExpenseTable;
