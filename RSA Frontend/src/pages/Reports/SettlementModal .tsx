// import React, { useState, useEffect } from 'react';
// import { toast } from 'react-hot-toast';
// import axios from 'axios';


// const SettlementModal = ({ 
//     driver, 
//     pendingExpenses, 
//     onClose, 
//     onSettle 
// }) => {
//     const [loading, setLoading] = useState(false);
    
//     // Calculate financials
//     const totalPendingExpenses = pendingExpenses.reduce((sum:any, exp:any) => sum + exp.amount, 0);
//     const cashCollection = driver.cashInHand - driver.advance;
//     const settlementAmount = driver.cashInHand - (totalPendingExpenses + (driver.balanceAmount > 0 ? driver.balanceAmount : 0));

//     const handleSettle = async () => {
//         setLoading(true);
//         try {
//             await onSettle({
//                 driverId: driver._id,
//                 settlementAmount
//             });
//             onClose();
//         } catch (error) {
//             console.error('Settlement failed:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
//                 <h2 className="text-xl font-bold mb-4">Complete Settlement</h2>
                
//                 {/* Financial Summary */}
//                 <div className="grid grid-cols-2 gap-4 mb-6">
//                     <div className="border p-3 rounded">
//                         <h3 className="font-medium text-gray-700">Current Cash In Hand</h3>
//                         <p className="text-2xl font-bold">${driver.cashInHand.toFixed(2)}</p>
//                     </div>
//                     <div className="border p-3 rounded">
//                         <h3 className="font-medium text-gray-700">Current Balance</h3>
//                         <p className={`text-2xl font-bold ${
//                             driver.balanceAmount < 0 ? 'text-red-600' : 'text-green-600'
//                         }`}>
//                             {driver.balanceAmount < 0 ? '-' : ''}${Math.abs(driver.balanceAmount).toFixed(2)}
//                         </p>
//                     </div>
//                     <div className="border p-3 rounded">
//                         <h3 className="font-medium text-gray-700">Current Advance</h3>
//                         <p className="text-2xl font-bold">${driver.advance.toFixed(2)}</p>
//                     </div>
//                     <div className="border p-3 rounded">
//                         <h3 className="font-medium text-gray-700">Cash Collection</h3>
//                         <p className="text-2xl font-bold">${cashCollection.toFixed(2)}</p>
//                     </div>
//                 </div>

//                 {/* Pending Expenses */}
//                 {pendingExpenses.length > 0 && (
//                     <div className="mb-6">
//                         <h3 className="font-medium mb-2">Pending Expenses ({pendingExpenses.length})</h3>
//                         <div className="max-h-40 overflow-y-auto border rounded">
//                             <table className="min-w-full divide-y divide-gray-200">
//                                 <thead className="bg-gray-50">
//                                     <tr>
//                                         <th className="px-4 py-2 text-left">Date</th>
//                                         <th className="px-4 py-2 text-left">Description</th>
//                                         <th className="px-4 py-2 text-left">Amount</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {pendingExpenses.map(expense => (
//                                         <tr key={expense._id} className="hover:bg-gray-50">
//                                             <td className="px-4 py-2">
//                                                 {new Date(expense.date).toLocaleDateString()}
//                                             </td>
//                                             <td className="px-4 py-2">{expense.description}</td>
//                                             <td className="px-4 py-2">${expense.amount.toFixed(2)}</td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                         <div className="mt-2 text-right font-bold">
//                             Total: ${totalPendingExpenses.toFixed(2)}
//                         </div>
//                     </div>
//                 )}

//                 {/* Settlement Amount */}
//                 <div className="bg-blue-50 p-4 rounded mb-6">
//                     <h3 className="font-bold text-lg mb-2">Settlement Calculation</h3>
//                     <div className="space-y-2">
//                         <div className="flex justify-between">
//                             <span>Cash In Hand:</span>
//                             <span>${driver.cashInHand.toFixed(2)}</span>
//                         </div>
//                         <div className="flex justify-between">
//                             <span>Pending Expenses:</span>
//                             <span>-${totalPendingExpenses.toFixed(2)}</span>
//                         </div>
//                         {driver.balanceAmount > 0 && (
//                             <div className="flex justify-between">
//                                 <span>Balance to Company:</span>
//                                 <span>-${driver.balanceAmount.toFixed(2)}</span>
//                             </div>
//                         )}
//                         <div className="border-t border-gray-300 my-2"></div>
//                         <div className="flex justify-between font-bold text-lg">
//                             <span>Settlement Amount:</span>
//                             <span>${settlementAmount.toFixed(2)}</span>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex justify-end space-x-3">
//                     <button 
//                         onClick={onClose}
//                         className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
//                     >
//                         Cancel
//                     </button>
//                     <button 
//                         onClick={handleSettle}
//                         disabled={loading}
//                         className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
//                     >
//                         {loading ? 'Processing...' : 'Approve All & Complete Settlement'}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default SettlementModal;