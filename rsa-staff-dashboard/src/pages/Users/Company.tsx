

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, addDoc,get } from 'firebase/firestore';

const Company = () => {
    const [items, setItems] = useState([] as any);
    const [editData, setEditData] = useState(null);
    const db = getFirestore();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const querySnapshot = await getDocs(collection(db, 'company'));
            setItems(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        };
        fetchData().catch(console.error);
    }, []);

    const handleDelete = async (userId: string) => {
        try {
            const userRef = doc(db, 'company', userId);
            await deleteDoc(userRef);
            setItems((prevItems: any) => prevItems.filter((item: any) => item.id !== userId));
        } catch (error) {
            console.error('Error deleting document: ', error);
        }
    };

   
    const handleEdit = (item) => {
        navigate(`/users/company-add/${item.id}`, { state: { editData: item } });
    };
    
    
    

return (
    <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
        <div className="panel">
            <div className="flex items-center justify-between mb-5">
                <h5 className="font-semibold text-lg dark:text-white-light">Company Details</h5>
                <Link to="/users/company-add" className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600">
                    <span className="flex items-center">
                        <IconUserPlus className="me-2" />
                        Add New
                    </span>
                </Link>
            </div>
            <div className="table-responsive mb-5 ">
                <table>
                    <thead>
                        <tr>
                            <th>Id</th>
                            <th>Company Name</th>
                            <th>Location</th>

                            <th>Email</th>
                            <th>Address</th>

                            <th>Phone Number</th>
                            <th>Total Cases</th>
                            <th className="!text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item,index) => {
                            return (
                                <tr key={item.id}>
                                    <td>{index+1}</td>
                                    <td>
                                        <div className="whitespace-nowrap">{item.companyName}</div>
                                    </td>
                                    <td>{item.location}</td>
                                    <td>{item.email}</td>

                                    <td>{item.address}</td>
                                    <td>{item.phone_number}</td>

                                    <td>{item.totalCases}</td>

                                    <td className="text-center">
                                        <ul className="flex items-center justify-center gap-2">
                                            <li>
                                            <Tippy content="Edit">
                    <button type="button" onClick={() => handleEdit(item)}>
                        <IconPencil className="text-primary" />
                    </button>
                </Tippy>
                                            </li>
                                            <li>
                                                <Tippy content="Delete">
                                                    <button type="button" onClick={() => handleDelete(item.id)}>
                                                        <IconTrashLines className="text-danger" />
                                                    </button>
                                                </Tippy>
                                            </li>
                                        </ul>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
           
        </div>
    </div>
);
};
export default Company;
