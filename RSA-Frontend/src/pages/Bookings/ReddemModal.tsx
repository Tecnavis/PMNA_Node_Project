import React, { useEffect, useState } from 'react';
import ReusableModal from '../../components/modal';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';

interface Showroom {
    _id: string;
    name: string;
    rewardPoints: number;
}

interface RedeemModalProps {
    open: boolean;
    close: () => void;
    showroom: Showroom | null;
    onRedeem: (points: number) => Promise<void>;
    uid?: string;
}

function RedeemModal({ open, close, showroom, onRedeem, uid }: RedeemModalProps) {
    const [points, setPoints] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [confirmationVisible, setConfirmationVisible] = useState<boolean>(false);
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

    const maxRedeemablePoints = showroom ? Math.floor(showroom.rewardPoints / 2) : 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        if (value === '' || /^[0-9\b]+$/.test(value)) {
            setPoints(value);

            if (!showroom) return;

            const numericValue = value ? parseInt(value) : 0;

            if (value && numericValue > maxRedeemablePoints) {
                setError(`Cannot redeem more than ${maxRedeemablePoints} points`);
            } else if (value && numericValue <= 0) {
                setError('Points must be greater than 0');
            } else {
                setError(null);
            }
        }
    };

    const handleSubmit = async () => {
        if (!points || error || !showroom) return;

        const numericValue = parseInt(points);
        setPointsToRedeem(numericValue);
        setConfirmationVisible(true);
        setPoints('')
        close()
    };

    const confirmRedeem = async () => {
        setConfirmationVisible(false);
        setIsSubmitting(true);
        const toastId = toast.loading(`Processing redemption for ${showroom?.name}...`);

        try {
            if (!showroom) return;

            await onRedeem(pointsToRedeem || 0);

            toast.success(`Successfully redeemed ${pointsToRedeem} points for ${showroom.name}!`, {
                id: toastId,
            });
            setPoints('')
            close();
        } catch (error: any) {
            toast.error(
                error.message || `Failed to redeem points for ${showroom?.name}`,
                { id: toastId }
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        setConfirmationVisible(false);
    }, []);

    if (!showroom) return null;

    return (
        <>
            <ReusableModal
                isOpen={open}
                onClose={close}
                title={`Redeem Showroom Points - ${showroom.name}`}
                buttons={[
                    {
                        text: "Cancel",
                        onClick: () => {
                            setPoints('')
                            close()
                        },
                    },
                    {
                        text: isSubmitting ? "Processing..." : "Redeem",
                        onClick: handleSubmit,
                    }
                ]}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <div className="mb-6 space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">
                                Maximum redeemable points: <span className="font-bold">{maxRedeemablePoints}</span>
                                <br />
                                (Total points: {showroom.rewardPoints})
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="redeemPoints" className="block text-sm font-medium text-gray-700">
                                Enter points to redeem
                            </label>
                            <input
                                id="redeemPoints"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={points}
                                onChange={handleChange}
                                className={`block w-full px-4 py-2 rounded-md border ${error ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                placeholder={`0 - ${maxRedeemablePoints}`}
                                disabled={isSubmitting}
                            />
                            {error && (
                                <p className="mt-1 text-sm text-red-600">{error}</p>
                            )}
                        </div>

                        {points && !error && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    You will redeem <span className="font-semibold">{points}</span> points
                                </p>
                            </div>
                        )}
                    </div>
                </form>
            </ReusableModal>

            <ConfirmationModal
                isVisible={confirmationVisible || false}
                onConfirm={confirmRedeem}
                onCancel={() => setConfirmationVisible(false)}
            />
        </>
    );
}

export default RedeemModal;