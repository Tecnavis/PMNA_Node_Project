
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';


const Driver = () => {
    const [items, setItems] = useState([] as any);
    const [editData, setEditData] = useState(null);
    const db = getFirestore();
    const navigate = useNavigate();
console.log("data",items)

    useEffect(() => {
        const fetchData = async () => {
            const querySnapshot = await getDocs(collection(db, 'driver'));
            setItems(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        };
        fetchData().catch(console.error);
    }, []);

    const handleDelete = async (userId: string) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this user?');
        if (confirmDelete) {
            try {
                const userRef = doc(db, 'driver', userId);
                await deleteDoc(userRef);
                setItems((prevItems: any) => prevItems.filter((item: any) => item.id !== userId));
            } catch (error) {
                console.error('Error deleting document: ', error);
            }
        }
    };
    

    const handleEdit = (item) => {
        navigate(`/users/driver-add/${item.id}`, { state: { editData: item } });
    };

return (
    <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
        <div className="panel">
            <div className="flex items-center justify-between mb-5">
                <h5 className="font-semibold text-lg dark:text-white-light">Driver Details</h5>
                <Link to="/users/driver-add" className="font-semibold text-success hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600">
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
                            <th>Driver Name</th>
                            <th>ID Number</th>
                           <th>Phone Number</th>
                            <th>Service Types</th>
                            <th>Basic Salary</th>
                            <th className="!text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item,index) => {
                            return (
                                <tr key={item.id}>
                                    <td>{index+1}</td>
                                    <td>
                                        <div className="whitespace-nowrap">{item.driverName}</div>
                                    </td>
                                    <td>{item.idnumber}</td>
                                    <td>{item.phone}</td>
                                    <td>
    <ul>
        {Object.entries(item.selectedServices).map(([key, value]) => (
            <li key={key}> {value}</li>
        ))}
    </ul>
</td>
<td>
    <ul>
        {Object.entries(item.basicSalaries).map(([key, value]) => (
            <li key={key}>{key}: {value}</li>
        ))}
    </ul>
</td>





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
                                            <li>
                                                <Tippy content="More">
                                                <Link to={`/users/driver/driverdetails/${item.id}`}>
                                                    <button style={{background:"violet",border:"none",color:"white",padding:"15px 32px",textAlign:"center",textDecoration:"none",display:"inline-block",fontSize:"16px",margin:"4px 2px",cursor:"pointer",borderRadius:"10px"}}>ViewMore</button>
                                                        {/* <IconMenuMore className="text-dark" /> */}
                                                        
                                                    </Link> 
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

export default Driver;