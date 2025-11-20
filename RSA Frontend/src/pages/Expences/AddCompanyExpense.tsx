import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Button, TextField, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import { createCompanyExpense } from '../Expences/expensesService';

const CompanyExpenseFormFormik = ({ fetchData, onClose }: any) => {
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

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      category: '',
      amount: '',
      vendor: '',
      employee: '', // if you have employee field
      image: null as File | null, // Changed from images array to single image
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Title is required'),
      description: Yup.string().required('Description is required'),
      category: Yup.string().required('Category is required'),
      amount: Yup.number().required('Amount is required').positive('Amount must be positive'),
      vendor: Yup.string(),
      employee: Yup.string(),
    }),
  // In your AddCompanyExpense.tsx - update the onSubmit function
onSubmit: async (values, { setSubmitting, resetForm }) => {
  try {
    // Create the expense data object, converting null to undefined for image
    const expenseData = {
      title: values.title,
      description: values.description,
      category: values.category,
      amount: Number(values.amount),
      vendor: values.vendor,
      employee: values.employee,
      image: values.image || undefined,
    };

    console.log('Submitting expense data:', expenseData);
    
    await createCompanyExpense(expenseData);

    await fetchData();
    resetForm();
    onClose();
    alert('Expense added successfully!');

  } catch (error: any) {
    console.error('Error adding company expense:', error);
    
    // Show detailed error message
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to add expense. Please try again.';
    
    alert(`Error: ${errorMessage}`);
    
  } finally {
    setSubmitting(false);
  }
},
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5MB.');
        return;
      }
      formik.setFieldValue('image', file);
    } else {
      // Clear the image if no file selected
      formik.setFieldValue('image', null);
    }
  };

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      <TextField
        fullWidth
        label="Title"
        name="title"
        value={formik.values.title}
        onChange={formik.handleChange}
        error={formik.touched.title && Boolean(formik.errors.title)}
        helperText={formik.touched.title && formik.errors.title}
      />
      
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Description"
        name="description"
        value={formik.values.description}
        onChange={formik.handleChange}
        error={formik.touched.description && Boolean(formik.errors.description)}
        helperText={formik.touched.description && formik.errors.description}
      />
      
      <FormControl fullWidth error={formik.touched.category && Boolean(formik.errors.category)}>
        <InputLabel>Category</InputLabel>
        <Select
          name="category"
          value={formik.values.category}
          onChange={formik.handleChange}
          label="Category"
        >
          {categories.map((category) => (
            <MenuItem key={category.value} value={category.value}>
              {category.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <TextField
        fullWidth
        type="number"
        label="Amount"
        name="amount"
        value={formik.values.amount}
        onChange={formik.handleChange}
        error={formik.touched.amount && Boolean(formik.errors.amount)}
        helperText={formik.touched.amount && formik.errors.amount}
      />
      
      <TextField
        fullWidth
        label="Vendor"
        name="vendor"
        value={formik.values.vendor}
        onChange={formik.handleChange}
        error={formik.touched.vendor && Boolean(formik.errors.vendor)}
        helperText={formik.touched.vendor && formik.errors.vendor}
      />
      
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="w-full p-2 border border-gray-300 rounded-md"
      />
      
      <div className="flex gap-2 justify-end">
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="contained" 
          disabled={formik.isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {formik.isSubmitting ? 'Adding...' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
};

export default CompanyExpenseFormFormik;