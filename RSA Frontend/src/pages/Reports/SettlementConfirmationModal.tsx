import React from 'react';

interface SettlementConfirmationModalProps {
    pendingExpenses: Array<{
        amount?: number;
        _id: string;
        [key: string]: any;
    }>;
    balanceAmount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

const SettlementConfirmationModal: React.FC<SettlementConfirmationModalProps> = ({
    pendingExpenses,
    balanceAmount,
    onConfirm,
    onCancel
}) => {
    const totalExpenses = pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const balanceSettlement = balanceAmount < 0 ? Math.abs(balanceAmount) : 0;
    const totalAmount = totalExpenses + balanceSettlement;

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Confirm Settlement</h3>
            <div className="mb-4 space-y-1">
                {pendingExpenses.length > 0 && (
                    <p>Approve {pendingExpenses.length} expenses totaling ${totalExpenses.toFixed(2)}</p>
                )}
                {balanceAmount < 0 && (
                    <p className={pendingExpenses.length > 0 ? "text-sm text-gray-600" : ""}>
                        {pendingExpenses.length > 0 
                            ? `+ ${balanceSettlement.toFixed(2)} balance settlement`
                            : `Balance settlement: ${balanceSettlement.toFixed(2)}`}
                    </p>
                )}
                <p className="font-bold">
                    Total: ${totalAmount.toFixed(2)}
                </p>
            </div>
            <div className="flex justify-end space-x-2">
                <button
                    onClick={onConfirm}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Confirm
                </button>
                <button
                    onClick={onCancel}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default SettlementConfirmationModal;