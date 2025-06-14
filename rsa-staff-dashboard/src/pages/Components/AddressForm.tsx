import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { trim } from 'lodash';
import { Address } from '../../interface/reward';

interface AddressFormProps {
  open: boolean;
  handleClose: (values:Address) => void;
  cancel: () => void;
}

const AddressSchema = Yup.object().shape({
  fullName: Yup.string()
    .required('Full name is required')
    .trim()
    .min(3, 'Minimum 3 characters required')
    .max(100, 'Maximum 100 characters allowed'),
  phone: Yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .test('is-number', 'Phone number must contain only numbers', (value) => {
      return !isNaN(Number(value));
    }),
  whatsappNumber: Yup.string()
    .required('WhatsApp number is required')
    .matches(/^[0-9]{10}$/, 'WhatsApp number must be 10 digits')
    .test('is-number', 'WhatsApp number must contain only numbers', (value) => {
      return !isNaN(Number(value));
    }),
  email: Yup.string()
    .required('Email is required')
    .email('Invalid email format'),
  addressLine1: Yup.string()
    .required('Address Line 1 is required')
    .trim(),
  addressLine2: Yup.string()
    .trim(),
  city: Yup.string()
    .required('City is required'),
  state: Yup.string()
    .required('State is required'),
  pinCode: Yup.string()
    .required('Pin Code is required')
    .matches(/^[0-9]+$/, 'Must be only digits')
    .min(6, 'Must be exactly 6 digits')
    .max(6, 'Must be exactly 6 digits'),
  country: Yup.string()
    .required('Country is required'),
  addressType: Yup.string()
    .required('Address type is required'),
});

export default function AddressForm({ open, handleClose, cancel }: AddressFormProps) {

  const initialValues:Address = {
    fullName: '',
    phone: '',
    whatsappNumber: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    addressType: 'Home',
  };

  const formik = useFormik({
    initialValues,
    validationSchema: AddressSchema,
    onSubmit: (values, { resetForm, setSubmitting }) => {

      handleClose(values);
      resetForm(); 
      setSubmitting(false)

    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1000]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Fixed Header */}
        <div className="bg-gradient-to-r bg-primary p-6 text-white sticky top-0 z-10 rounded-t-md">
          <h2 className="text-2xl font-bold">Shipping Address</h2>
          <p className="text-blue-100">Where should we send your reward?</p>
        </div>
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={formik.handleSubmit}>
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.fullName && formik.errors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  value={formik.values.fullName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="John Doe"
                />
                {formik.touched.fullName && formik.errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.fullName}</p>
                )}
              </div>

              {/* Contact Information Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.email && formik.errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="your@email.com"
                  />
                  {formik.touched.email && formik.errors.email && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.phone && formik.errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="+1 (123) 456-7890"
                  />
                  {formik.touched.phone && formik.errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.phone}</p>
                  )}
                </div>
              </div>

              {/* WhatsApp Number */}
              <div>
                <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number
                </label>
                <input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  type="tel"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.whatsappNumber && formik.errors.whatsappNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  value={formik.values.whatsappNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="+1 (123) 456-7890"
                />
                {formik.touched.whatsappNumber && formik.errors.whatsappNumber && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.whatsappNumber}</p>
                )}
              </div>

              {/* Address Line 1 */}
              <div>
                <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  id="addressLine1"
                  name="addressLine1"
                  type="text"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.addressLine1 && formik.errors.addressLine1 ? 'border-red-500' : 'border-gray-300'
                    }`}
                  value={formik.values.addressLine1}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="123 Main St"
                />
                {formik.touched.addressLine1 && formik.errors.addressLine1 && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.addressLine1}</p>
                )}
              </div>

              {/* Address Line 2 */}
              <div>
                <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2 (optional)
                </label>
                <input
                  id="addressLine2"
                  name="addressLine2"
                  type="text"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.addressLine2 && formik.errors.addressLine2 ? 'border-red-500' : 'border-gray-300'
                    }`}
                  value={formik.values.addressLine2}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Apt 4B"
                />
                {formik.touched.addressLine2 && formik.errors.addressLine2 && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.addressLine2}</p>
                )}
              </div>

              {/* City, State, Postal Code Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.city && formik.errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                    value={formik.values.city}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="New York"
                  />
                  {formik.touched.city && formik.errors.city && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.city}</p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.state && formik.errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                    value={formik.values.state}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="NY"
                  />
                  {formik.touched.state && formik.errors.state && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.state}</p>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pinCode"
                    name="pinCode"
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.pinCode && formik.errors.pinCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                    value={formik.values.pinCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="10001"
                    maxLength={6}
                  />
                  {formik.touched.pinCode && formik.errors.pinCode && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.pinCode}</p>
                  )}
                </div>
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  id="country"
                  name="country"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${formik.touched.country && formik.errors.country ? 'border-red-500' : 'border-gray-300'
                    }`}
                  value={formik.values.country}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <option value="">Select Country</option>
                  <option value="India" defaultChecked>India</option>
                </select>
                {formik.touched.country && formik.errors.country && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.country}</p>
                )}
              </div>

              {/* Address Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Type <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="addressType"
                      value="Home"
                      checked={formik.values.addressType === 'Home'}
                      onChange={formik.handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Home</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="addressType"
                      value="Work"
                      checked={formik.values.addressType === 'Work'}
                      onChange={formik.handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Work</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="addressType"
                      value="Other"
                      checked={formik.values.addressType === 'Other'}
                      onChange={formik.handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Other</span>
                  </label>
                </div>
                {formik.touched.addressType && formik.errors.addressType && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.addressType}</p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formik.isValid || formik.isSubmitting}
              onClick={() => formik.handleSubmit()}
              className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition ${!formik.isValid || formik.isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {formik.isSubmitting ? 'Saving...' : 'Save $ Redeem'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}