import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useEffect, useState } from 'react';
import { FilePlus } from 'lucide-react';
import { createDieselExpance } from '../../services/expencesService';
import { DriverDropdownItem } from '../../interface/Driver';
import { getDriverForDropDown } from '../../services';
import { VehicleNames } from '../../interface/Vehicle';

const DieselExpenseSchema = Yup.object().shape({
    expenseId: Yup.string().required('Expense ID is required'),
    driver: Yup.string().required('Driver is required'),
    description: Yup.string().required('Description is required'),
    amount: Yup.number()
        .min(0, 'Amount must be positive')
        .required('Amount is required'),
    vehicleNumber: Yup.string().required('Vehicle number is required'),
    expenceKm: Yup.number()
        .min(0, 'Kilometers must be positive')
        .required('Kilometers are required'),
    images: Yup.array()
        .of(Yup.mixed())
        .min(2, 'Upload at least 2 images')
        .max(3, 'Maximum 3 images allowed')
        .required('Upload 2 to 3 images'),
});

interface DieselExpenseFormProps {
    vehiclesNames: VehicleNames[];
    fetchData: () => void
    onClose: () => void
}

export default function DieselExpenseFormFormik(
    {
        vehiclesNames,
        fetchData,
        onClose
    }: DieselExpenseFormProps) {

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [drivers, setDriver] = useState<DriverDropdownItem[]>([]);

    const handleSubmit = async (values: any, { resetForm }: any) => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();

            // Append all fields except images
            formData.append('expenseId', values.expenseId);
            formData.append('driver', values.driver);
            formData.append('description', values.description);
            formData.append('amount', values.amount.toString());
            formData.append('vehicleNumber', values.vehicleNumber);
            formData.append('expenceKm', values.expenceKm.toString());

            // Append each image file
            values.images.forEach((img: File) => {
                formData.append('images', img);
            });

            // // Simulate API call
            console.log(formData);
            await createDieselExpance(formData)

            setSubmitSuccess(true);
            resetForm();
            fetchData()
            onClose()
        } catch (error) {
            console.error('Submission error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchDriverDropDownData = async () => {
        const data = await getDriverForDropDown()
        setDriver(data)
    }

    useEffect(() => {
        fetchDriverDropDownData()
        console.log(vehiclesNames)
    }, [])

    return (
        <div className="mx-auto p-6 bg-white">
            {submitSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                    Expense submitted successfully!
                </div>
            )}

            <Formik
                initialValues={{
                    expenseId: '',
                    driver: '',
                    description: '',
                    amount: 0,
                    vehicleNumber: '',
                    expenceKm: 0,
                    images: [],
                }}
                validationSchema={DieselExpenseSchema}
                onSubmit={handleSubmit}
            >
                {({ setFieldValue, values, errors, touched }) => (
                    <Form className="space-y-4">
                        <div>
                            <label htmlFor="expenseId" className="block text-sm font-medium text-gray-700">
                                Expense ID *
                            </label>
                            <Field
                                name="expenseId"
                                id="expenseId"
                                placeholder="EXP-001"
                                className={`p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.expenseId && touched.expenseId ? 'border-red-500' : 'border'}`}
                            />
                            <ErrorMessage name="expenseId" component="div" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                            <label htmlFor="driver" className="block text-sm font-medium text-gray-700">
                                Driver *
                            </label>
                            <Field
                                as="select"
                                name="driver"
                                id="driver"
                                placeholder="Driver name or ID"
                                className={`p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.driver && touched.driver ? 'border-red-500' : 'border'}`}
                            >
                                <option disabled value="">Select a driver</option>
                                {drivers.map((driver) => (
                                    <option key={driver._id} value={driver._id}>
                                        {driver.label}
                                    </option>
                                ))}
                            </Field>
                            <ErrorMessage name="driver" component="div" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Description *
                            </label>
                            <Field
                                name="description"
                                id="description"
                                as="textarea"
                                rows={3}
                                placeholder="Purpose of expense"
                                className={`p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.description && touched.description ? 'border-red-500' : 'border'}`}
                            />
                            <ErrorMessage name="description" component="div" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                                    Amount (₹) *
                                </label>
                                <Field
                                    name="amount"
                                    id="amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    className={`p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.amount && touched.amount ? 'border-red-500' : 'border'}`}
                                />
                                <ErrorMessage name="amount" component="div" className="mt-1 text-sm text-red-600" />
                            </div>

                            <div>
                                <label htmlFor="expenceKm" className="block text-sm font-medium text-gray-700">
                                    Kilometers *
                                </label>
                                <Field
                                    name="expenceKm"
                                    id="expenceKm"
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className={`p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.expenceKm && touched.expenceKm ? 'border-red-500' : 'border'}`}
                                />
                                <ErrorMessage name="expenceKm" component="div" className="mt-1 text-sm text-red-600" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700">
                                Vehicle Number *
                            </label>
                            <Field
                                as='select'
                                name="vehicleNumber"
                                id="vehicleNumber"
                                placeholder="e.g. KA01AB1234"
                                className={`p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.vehicleNumber && touched.vehicleNumber ? 'border-red-500' : 'border'}`}
                            >
                                <option disabled value="">Select a Vehicle Number</option>
                                {vehiclesNames?.map((vehicle, index) => (
                                    <option key={index} value={vehicle.serviceVehicle}>
                                        {vehicle.serviceVehicle}
                                    </option>
                                ))}
                            </Field>
                            <ErrorMessage name="vehicleNumber" component="div" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Upload Images (2-3) *
                            </label>
                            <div className="mt-1 flex items-center">
                                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Choose Files
                                    <input
                                        type="file"
                                        id="images"
                                        name="images"
                                        accept="image/*"
                                        multiple
                                        className="sr-only"
                                        onChange={(e) => setFieldValue('images', Array.from(e.target.files || []))}
                                    />
                                </label>
                                <span className="ml-3 text-sm text-gray-500">
                                    {values.images.length > 0
                                        ? `${values.images.length} file(s) selected`
                                        : 'No files selected'}
                                </span>
                            </div>
                            {values.images.length > 0 && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    {values.images.map((file: File, index: number) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Preview ${index}`}
                                                className=" w-full object-cover rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newImages = [...values.images];
                                                    newImages.splice(index, 1);
                                                    setFieldValue('images', newImages);
                                                }}
                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <ErrorMessage name="images" component="div" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`p-2 w-full flex justify-center  border border-transparent  shadow-sm text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : <>
                                    <FilePlus size={18} />
                                    <span className='ml-1'>
                                        Submit Expense
                                    </span>
                                </>
                                }
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
}