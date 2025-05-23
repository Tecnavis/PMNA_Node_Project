import React, { useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import ReusableModal from "../../components/modal";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { useFormik } from "formik";
import * as Yup from "yup";
import { TbCancel } from "react-icons/tb";
import Swal from "sweetalert2";
import { axiosInstance, BASE_URL } from "../../config/axiosConfig";

interface CancelBookingModalProps {
    bookingId: string;
    onSuccess: () => void;
}

const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
    bookingId,
    onSuccess,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formik = useFormik({
        initialValues: {
            cancelReason: "",
            cancelKm: "",
            image: null as File | null,
        },
        validationSchema: Yup.object({
            cancelReason: Yup.string().required("Reason is required"),
            cancelKm: Yup.string().required("Kilometers is required"),
            image: Yup.mixed().required("Image is required"),
        }),
        onSubmit: async (values) => {
            try {
                const confirm = await Swal.fire({
                    title: 'Are you sure?',
                    text: "You are about to cancel this booking. This action cannot be undone.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, cancel it!',
                });

                if (!confirm.isConfirmed) return;
                setIsSubmitting(true);

                const formData = new FormData();
                formData.append("cancelReason", values.cancelReason);
                formData.append("cancelKm", values.cancelKm);
                if (values.image) {
                    formData.append("image", values.image);
                }

                const response = await axiosInstance.patch(
                    `${BASE_URL}/booking/cancel/${bookingId}`,
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                    }
                );

                if (response.data.success) {
                    onSuccess();
                    closeModal();
                } else {
                    toast.error(response.data.message || "Failed to cancel booking");
                }
            } catch (error) {
                console.error("Error canceling booking:", error);
                toast.error("Failed to cancel booking");
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    const openModal = () => setIsOpen(true);
    const closeModal = () => {
        setIsOpen(false);
        formik.resetForm();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            formik.setFieldValue("image", e.target.files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <TbCancel size={24} className="text-yellow-500"
                onClick={openModal}
            >
                Cancel Booking
            </TbCancel>

            <ReusableModal
                isOpen={isOpen}
                onClose={closeModal}
                title="Cancel Booking"
                buttons={[
                    {
                        text: "Cancel",
                        onClick: closeModal,
                        className: "btn btn-outline-danger",
                    },
                    {
                        text: isSubmitting ? "Submitting..." : "Confirm Cancellation",
                        onClick: () => formik.handleSubmit(),
                        className: "btn btn-danger",
                        icon: isSubmitting && (
                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 ltr:mr-4 rtl:ml-4 inline-block"></span>
                        ),
                    },
                ]}
            >
                <div className="space-y-4">
                    <div>
                        <label htmlFor="cancelReason" className="block mb-1 font-medium">
                            Reason for Cancellation
                        </label>
                        <select
                            id="cancelReason"
                            name="cancelReason"
                            className="form-select"
                            value={formik.values.cancelReason}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        >
                            <option value="">Select a reason</option>
                            <option value="Customer Request">Customer Request</option>
                            <option value="Vehicle Unavailable">Vehicle Unavailable</option>
                            <option value="Operational Issues">Operational Issues</option>
                            <option value="Weather Conditions">Weather Conditions</option>
                            <option value="Other">Other</option>
                        </select>
                        {formik.touched.cancelReason && formik.errors.cancelReason ? (
                            <div className="text-red-500 text-sm mt-1">
                                {formik.errors.cancelReason}
                            </div>
                        ) : null}
                    </div>

                    <div>
                        <label htmlFor="cancelKm" className="block mb-1 font-medium">
                            Current Kilometers
                        </label>
                        <input
                            id="cancelKm"
                            name="cancelKm"
                            type="number"
                            className="form-input"
                            placeholder="Enter current kilometers"
                            value={formik.values.cancelKm}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.cancelKm && formik.errors.cancelKm ? (
                            <div className="text-red-500 text-sm mt-1">
                                {formik.errors.cancelKm}
                            </div>
                        ) : null}
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Upload Image</label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className="btn btn-outline-primary w-full flex items-center justify-center gap-2"
                        >
                            <FileUploadIcon />
                            {formik.values.image ? formik.values.image.name : "Choose File"}
                        </button>
                        {formik.touched.image && formik.errors.image ? (
                            <div className="text-red-500 text-sm mt-1">
                                {formik.errors.image}
                            </div>
                        ) : null}
                        {formik.values.image && (
                            <div className="mt-2">
                                <img
                                    src={URL.createObjectURL(formik.values.image)}
                                    alt="Preview"
                                    className="h-32 object-contain border rounded"
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <h4 className="font-bold text-yellow-700 dark:text-yellow-400">
                            Important Note
                        </h4>
                        <p className="text-yellow-600 dark:text-yellow-300 text-sm mt-1">
                            Canceling a booking will mark it as completed and cannot be undone.
                            Please ensure all details are correct before confirming.
                        </p>
                    </div>
                </div>
            </ReusableModal>
        </>
    );
};

export default CancelBookingModal;