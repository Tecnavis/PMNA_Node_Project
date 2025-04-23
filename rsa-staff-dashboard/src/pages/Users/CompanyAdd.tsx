import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { addDoc, collection, getFirestore, doc, updateDoc } from 'firebase/firestore';
interface CompanyData {
    companyName: string;
    location: string;
    email: string;
    address: string;
    phone_number: string;
    totalCases: string;
    id?: string; // Optional if you include the document ID
}

// Rest of the component...

const CompanyAdd = () => {
    const [companyName, setCompanyName] = useState('');
    const [location, setLocation] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [phone_number, setPhone] = useState('');
    const [totalCases, setTotalCases] = useState('');
    const [editData, setEditData] = useState(null);
    const navigate = useNavigate();
    const { state } = useLocation(); // Use the useLocation hook to access location state

    const db = getFirestore();

    useEffect(() => {
        if (state && state.editData) {
            // If editData is present in the location state, set the form fields with its data
            setEditData(state.editData);
            setCompanyName(state.editData.companyName || '');
            setLocation(state.editData.location || '');
            setEmail(state.editData.email || '');
            setAddress(state.editData.address || '');
            setPhone(state.editData.phone_number || '');
            setTotalCases(state.editData.totalCases || '');
        }
    }, [state]);
    const addOrUpdateItem = async () => {
        try {
            const itemData: CompanyData = {
                companyName,
                location,
                email,
                address,
                phone_number,
                totalCases,
            };

            if (editData) {
                const docRef = doc(db, 'company', editData.id);
                await updateDoc(docRef, itemData);
                console.log('Document updated');
            } else {
                const docRef = await addDoc(collection(db, 'company'), itemData);
                console.log('Document written with ID: ', docRef.id);
            }

            navigate('/users/company');
        } catch (e) {
            console.error('Error adding/updating document: ', e);
        }
    };

    useEffect(() => {
        if (editData) {
            console.log("Edit Data:", editData);

            // If editData is present, set the form fields with its data
            setCompanyName(editData.companyName || '');
            setLocation(editData.location || '');
            setEmail(editData.email || '');
            setAddress(editData.address || '');
            setPhone(editData.phone_number || '');
            setTotalCases(editData.totalCases || '');
        }
    }, [editData]);
    
    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="#" className="text-primary hover:underline">
                        Users
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Company Account Settings</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Company Details</h5>
                </div>
                <div></div>

                <div>
                    <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                        <h6 className="text-lg font-bold mb-5">General Information</h6>
                        <div className="flex flex-col sm:flex-row">
                            <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5">
                                <img src="/assets//images/profile-34.jpeg" alt="img" className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto" />
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="companyName">Company Name</label>
                                    <input id="companyName" type="text" placeholder="Enter Company Name" className="form-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor="location">Location</label>
                                    <input id="location" type="location"  className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor="email">Email</label>
                                    <input id="email" type="email" placeholder="@gmail.com" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor="address">Address</label>
                                    <textarea id="address" placeholder="Enter Address" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                                </div>

                                <div>
                                    <label htmlFor="phone_number">Phone</label>
                                    <input id="phone_number" type="phone_number" placeholder="phone number" className="form-input" value={phone_number} onChange={(e) => setPhone(e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor="totalCases">Total Cases</label>
                                    <input
                                        id="totalCases"
                                        type="totalCases"
                                        placeholder=" totalCases"
                                        className="form-input"
                                        value={totalCases}
                                        onChange={(e) => setTotalCases(e.target.value)}
                                    />
                                </div>
        

                                <div className="sm:col-span-2 mt-3">
                                <button type="button" className="btn btn-primary" onClick={addOrUpdateItem}>
                            {editData ? 'Update' : 'Save'}
                        </button>
        </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CompanyAdd;
