// toastUtils.js
import { toast } from 'react-hot-toast';
import { XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export const showConfirmationToast = (message: string, onConfirm: () => void) => {
    toast.custom((t) => (
        <div
            className={`w-[380px] p-4 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 transition-all duration-300`}
        >
            <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 mt-2" size={22} />
                <div className="flex-1">
                    <p className="text-base font-semibold">{message}</p>
                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-zinc-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                toast.dismiss(t.id);
                            }}
                            className="px-4 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ));
};
