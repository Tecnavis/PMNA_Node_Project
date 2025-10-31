import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { createNewExecutives, getExecutiveById, updateExecutives } from '../../services/index';
import { IMarketingExecutives } from '../../interface/Executives';
import { useNavigate, useParams } from 'react-router-dom'
import { showApiErrorToast, showApiSuccessToast } from '../../utils/errorHandler';
import { useEffect, useState } from 'react';
import Loader from '../../components/loader';


const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    phone: Yup.string()
        .matches(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
        .required('Phone is required'),
    userName: Yup.string().required('User Name is required'),
    password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Confirm password is required'),
    address: Yup.string().required('Address is required'),
    image: Yup.mixed()
        .required('Image is required')
        .test('fileOrUrl', 'Unsupported File Format', (value: any) => {
            // If it's a string (URL), accept it
            if (typeof value === 'string') {
                return true;
            }

            // If it's a File, check its type
            if (value instanceof File) {
                const fileTypes = ['image/jpeg', 'image/png'];
                return fileTypes.includes(value.type);
            }

            return false; // Invalid type
        }),

});

function AddExecutive() {

    const [loading, setLoading] = useState<boolean>(false)
    const [initialValues, setInitialValues] = useState<IMarketingExecutives>({
        name: '',
        email: '',
        phone: '',
        userName: '',
        password: '',
        confirmPassword: '',
        address: '',
        image: null
    })

    const navigate = useNavigate()
    const params = useParams();

    const handleSubmit = async (values: IMarketingExecutives, { resetForm }: any) => {
        setLoading(true)
        try {
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                if (key === 'image') {
                    formData.append('image', value);
                } else {
                    formData.append(key, value);
                }
            });
            const data = await createNewExecutives(formData)
            if (data) {
                showApiSuccessToast("New marketing executive created successfull")
                navigate(-1)
            }
        } catch (error) {
            showApiErrorToast(error)
        } finally {
            setLoading(false)
        }
    };

    const handleUpdate = async (values: IMarketingExecutives, { resetForm }: any) => {
        setLoading(true)
        try {
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (key === 'image' && value instanceof File) {
                        formData.append(key, value);
                    } else if (typeof value === 'object') {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });

            const data = await updateExecutives(formData, params.id || '')
            if (data) {
                showApiSuccessToast("New marketing executive created successfull")
                navigate(-1)
            }
        } catch (error) {
            showApiErrorToast(error)
        } finally {
            setLoading(false)
        }
    };

    const fetchExecutiveById = async () => {
        const data = await getExecutiveById(params?.id || '');
        setInitialValues({
            address: data?.address || '',
            name: data?.name || '',
            userName: data?.userName || '',
            email: data?.email || '',
            phone: data?.phone || '',
            password: data?.password || '',
            confirmPassword: data?.password || '',
            image: data?.image || null
        });
    };

    useEffect(() => {
        if (params.id) {
            fetchExecutiveById();
        }
    }, [params.id]);

    return (
        <Formik
            initialValues={initialValues}
            enableReinitialize={true}
            validationSchema={validationSchema}
            onSubmit={params.id ? handleUpdate : handleSubmit}
        >
            {({ setFieldValue, values, errors, touched }) => (
                <Form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                    <div className="flex justify-between items-center">
                        <h6 className="text-lg font-bold mb-5">General Information for Marketing Executive</h6>
                    </div>

                    <div className="flex flex-col sm:flex-row">
                        <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5">
                            <img src={`${initialValues.image}` || defaultImage} alt="Profile" className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto" />
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">

                            <div>
                                <label htmlFor="name">Name</label>
                                <Field name="name" className={`form-input  ${errors.name && touched.name ? 'border-red-500' : 'border'}`} placeholder="Enter Name" />
                                <ErrorMessage name="name" component="p" className="text-red-500" />
                            </div>

                            <div>
                                <label htmlFor="email">Email</label>
                                <Field name="email" type="email" className={`form-input  ${errors.email && touched.email ? 'border-red-500' : 'border'}`} placeholder="@gmail.com" />
                                <ErrorMessage name="email" component="p" className="text-red-500" />
                            </div>

                            <div>
                                <label htmlFor="image">Profile Image</label>
                                <input
                                    name="image"
                                    type="file"
                                    accept=".jpg,.jpeg,.png"
                                    className={`form-input  ${errors.image && touched.image ? 'border-red-500' : 'border'}`}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            setFieldValue('image', e.target.files[0]);
                                        }
                                    }}
                                />
                                <ErrorMessage name="image" component="p" className="text-red-500" />
                            </div>

                            <div>
                                <label htmlFor="phone">Phone</label>
                                <Field name="phone" type="text" className={`form-input  ${errors.phone && touched.phone ? 'border-red-500' : 'border'}`} placeholder="Phone Number" />
                                <ErrorMessage name="phone" component="p" className="text-red-500" />
                            </div>

                            <div>
                                <label htmlFor="userName">User Name</label>
                                <Field name="userName" className={`form-input  ${errors.userName && touched.userName ? 'border-red-500' : 'border'}`} placeholder="User Name" />
                                <ErrorMessage name="userName" component="p" className="text-red-500" />
                            </div>

                            <div>
                                <label htmlFor="password">Password</label>
                                <Field name="password" type="password" className={`pr-10 form-input  ${errors.password && touched.password ? 'border-red-500' : 'border'}`} placeholder="Password" />
                                <ErrorMessage name="password" component="p" className="text-red-500" />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <Field name="confirmPassword" type="password" className={`pr-10 form-input  ${errors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border'}`} placeholder="Confirm Password" />
                                <ErrorMessage name="confirmPassword" component="p" className="text-red-500" />
                            </div>

                            <div>
                                <label htmlFor="address">Address</label>
                                <Field name="address" as="textarea" className={`pr-10 form-input  ${errors.address && touched.address ? 'border-red-500' : 'border'}`} placeholder="Street, City, State, Pincode, India" />
                                <ErrorMessage name="address" component="p" className="text-red-500" />
                            </div>

                            <div className="sm:col-span-2 mt-3">
                                <button type="submit" disabled={loading} className="btn btn-success flex items-center justify-center gap-1">
                                    {params.id ? "Update" : 'Save'}
                                    {
                                        loading && (
                                            <Loader />
                                        )
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export default AddExecutive