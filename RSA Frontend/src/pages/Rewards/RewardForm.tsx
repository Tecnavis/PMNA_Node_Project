import React, { useState, useReducer } from 'react';
import styles from '../ServiceType/serviceType.module.css';
import { REWAR_CATEGORYS } from './RewardsItems';
import { BASE_URL } from '../../config/axiosConfig';
import { Link } from 'react-router-dom';

export interface Reward {
    name?: string;
    pointsRequiredRequired?: number;
    _id: number;
    description: string;
    price: string;
    pointsRequired: string;
    stock: string;
    image: File | null;
    category: string;
    rewardFor?: string;
}

export interface FormState {
    name: string;
    description: string;
    price: string;
    pointsRequired: string;
    stock: string;
    category: string;
    image: File | null;
    rewardFor?: string
}

export interface FormErrors {
    name?: string;
    description?: string;
    price?: string;
    pointsRequired?: string;
    stock?: string;
    category?: string;
    image?: string;
    rewardFor?: string
}

// Reducer action types
type FormAction =
    | { type: 'UPDATE_FIELD'; field: keyof FormState; value: string | File | null }
    | { type: 'RESET_FORM' };

// Initial state for the form
const initialFormState: FormState = {
    name: '',
    description: '',
    price: '',
    pointsRequired: '',
    stock: '',
    category: '',
    image: null,
};

// Reducer for form state management
const formReducer = (state: FormState, action: FormAction): FormState => {
    switch (action.type) {
        case 'UPDATE_FIELD':
            return { ...state, [action.field]: action.value };
        case 'RESET_FORM':
            return initialFormState;
        default:
            return state;
    }
};

// Props for RewardForm component
interface RewardFormProps {
    isEditMode: boolean;
    rewardToEdit: Reward | null;
    onClose: () => void;
    onSubmit: (reward: FormState, id?: number) => void;
}

const RewardForm: React.FC<RewardFormProps> = ({ isEditMode, rewardToEdit, onClose, onSubmit }) => {
    const [formState, dispatch] = useReducer(
        formReducer,
        isEditMode && rewardToEdit ? {
            ...rewardToEdit,
            name: rewardToEdit.name || '',
            description: rewardToEdit.description || '',
            price: rewardToEdit.price || '',
            pointsRequired: rewardToEdit.pointsRequired || '',
            stock: rewardToEdit.stock || '',
            category: rewardToEdit.category || rewardToEdit.rewardFor || "",
            image: rewardToEdit.image || null
        } : initialFormState
    );
    const [errors, setErrors] = useState<FormErrors>({});
    // Validate form fields
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formState.name) newErrors.name = 'Reward Name is required';
        if (!formState.description) newErrors.description = 'Description is required';
        if (!formState.price) newErrors.price = 'Price is required';
        if (!formState.pointsRequired) newErrors.pointsRequired = 'pointsRequired are required';
        if (!formState.stock) newErrors.stock = 'Stock is required';
        if (!isEditMode && !formState.category) newErrors.category = 'Category is required';
        if (!formState.image) newErrors.image = 'Image is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(formState, rewardToEdit?._id || 0);
            onClose();
        }
    };

    // Handle input changes
    const handleChange = (field: keyof FormState, value: string | File | null) => {
        dispatch({ type: 'UPDATE_FIELD', field, value });
    };

    return (
        <div className="p-5">
            <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937]">
                {/* Reward Name */}
                <div>
                    <label htmlFor="name">Reward Name</label>
                    <input
                        id="name"
                        type="text"
                        value={formState.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={`${styles.formInput} form-input`}
                    />
                    {errors.name && <span className='text-xs text-red-500'>{errors.name}</span>}
                </div>

                {/* Description */}
                <div className='mt-2'>
                    <label htmlFor="description">Description</label>
                    <input
                        id="description"
                        type="text"
                        value={formState.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className={`${styles.formInput} form-input`}
                    />
                    {errors.description && <span className='text-xs text-red-500'>{errors.description}</span>}
                </div>

                <div className='flex justify-center items-center gap-3'>
                    {/* Price */}
                    <div className='w-1/2 mt-2'>
                        <label htmlFor="price">Price</label>
                        <input
                            id="price"
                            type="text"
                            value={formState.price}
                            onChange={(e) => handleChange('price', e.target.value)}
                            className={`${styles.formInput} form-input`}
                        />
                        {errors.price && <span className='text-xs text-red-500'>{errors.price}</span>}
                    </div>

                    {/* pointsRequired */}
                    <div className='w-1/2 mt-2'>
                        <label htmlFor="pointsRequired">Points</label>
                        <input
                            id="pointsRequired"
                            type="text"
                            value={formState.pointsRequired}
                            onChange={(e) => handleChange('pointsRequired', e.target.value)}
                            className={`${styles.formInput} form-input`}
                        />
                        {errors.pointsRequired && <span className='text-xs text-red-500'>{errors.pointsRequired}</span>}
                    </div>
                </div>
                <div className='flex justify-center items-start gap-3'>
                    {/* Stock */}
                    <div className='w-1/2 mt-2'>
                        <label htmlFor="stock">Stock</label>
                        <input
                            id="stock"
                            type="text"
                            value={formState.stock}
                            onChange={(e) => handleChange('stock', e.target.value)}
                            className={`${styles.formInput} form-input`}
                        />
                        {errors.stock && <span className='text-xs text-red-500'>{errors.stock}</span>}
                    </div>

                    {/* Category Dropdown */}
                    <div className="w-1/2 mt-2">
                        <label htmlFor="category">Select Category</label>
                        <select
                            name="category"
                            className="form-input"
                            value={formState.category} // Set the default value from formState
                            onChange={(e) => handleChange('category', e.target.value)}
                        >
                            {Object.keys(REWAR_CATEGORYS).map((key: string) => (
                                <option key={key} value={key}>
                                    {REWAR_CATEGORYS[key as keyof typeof REWAR_CATEGORYS]}
                                </option>
                            ))}
                        </select>
                        {errors.category && (
                            <span className="text-xs text-red-500">{errors.category}</span>
                        )}
                    </div>

                </div>
                {/* Image */}
                <div className='mt-2'>
                    <label htmlFor="image">Image</label>
                    <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleChange('image', e.target.files?.[0] || null)}
                        className={`${styles.formInput} form-input`}
                    />
                    {errors.image && <span className='text-xs text-red-500'>{errors.image}</span>}
                </div>
                {

                    isEditMode && <div className='w-full py-3 border border-gray-300  mt-3 p-4 rounded '><Link to={`${BASE_URL}/images/${formState.image}`} className='my-2 underline text-blue-500 w-full'>Existing reward image</Link></div>
                }
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '25px' }}>
                <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                    Close
                </button>
                <button
                    type="button"
                    className={`btn ${isEditMode ? 'btn-info' : 'btn-success'}`}
                    onClick={handleSubmit}
                >
                    {isEditMode ? 'Update' : 'Add'}
                </button>
            </div>
        </div>
    );
};

export default RewardForm