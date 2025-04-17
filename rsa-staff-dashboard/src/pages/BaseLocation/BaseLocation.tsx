import React, { useEffect, useState } from 'react';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import './BaseLocationForm.css'; // Import the CSS file
import MyMapComponent from './MyMapComponent';
import Tippy from '@tippyjs/react';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import { useNavigate } from 'react-router-dom';

const BaseLocation = () => {
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [baseLocation, setBaseLocation] = useState(null);
    const [baseLocationName, setBaseLocationName] = useState('');
    const [savedBaseLocation, setSavedBaseLocation] = useState(null);
    const [items, setItems] = useState([]);
    const [editing, setEditing] = useState(false);
    const [currentItemId, setCurrentItemId] = useState(null);
    const db = getFirestore();
    const navigate = useNavigate();

    const handleMapClick = (location) => {
        setLat(location.lat);
        setLng(location.lng);
        setBaseLocation(location);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'baselocation'));
                const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                console.log('Fetched data:', data);
                setItems(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [db]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const baseLocationDetails = { name: baseLocationName, lat, lng };

        if (editing) {
            try {
                await updateDoc(doc(db, 'baselocation', currentItemId), baseLocationDetails);
                setItems((prevItems) =>
                    prevItems.map((item) =>
                        item.id === currentItemId ? { ...item, ...baseLocationDetails } : item
                    )
                );
                setEditing(false);
                setCurrentItemId(null);
            } catch (error) {
                console.error('Error updating base location: ', error);
            }
        } else {
            try {
                const docRef = await addDoc(collection(db, 'baselocation'), baseLocationDetails);
                setItems([...items, { ...baseLocationDetails, id: docRef.id }]);
            } catch (error) {
                console.error('Error adding base location: ', error);
            }
        }

        setSavedBaseLocation(baseLocationDetails);
        setBaseLocationName('');
        setLat('');
        setLng('');
    };

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this base location?');
        if (confirmDelete) {
            const password = window.prompt('Please enter the password to confirm deletion:BASELOCATION(password)');
            if (password === 'BASELOCATION') {
                try {
                    await deleteDoc(doc(db, 'baselocation', id));
                    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
                } catch (error) {
                    console.error('Error deleting document:', error);
                }
            } else {
                alert('Incorrect password. Deletion cancelled.');
            }
        }
    };
    

    const handleEdit = (item:any) => {
        const password = window.prompt('Please enter the password to edit this base location:BASELOCATION(password)');
        if (password === 'BASELOCATION') {
            setEditing(true);
            setCurrentItemId(item.id);
            setBaseLocationName(item.name);
            setLat(item.lat);
            setLng(item.lng);
            setBaseLocation({ lat: item.lat, lng: item.lng });
        } else {
            alert('Incorrect password. Edit cancelled.');
        }
    };
    

    return (
        <div className="base-location-form-container">
            <form onSubmit={handleFormSubmit} className="base-location-form">
                <div className="form-group">
                    <label htmlFor="baseLocationName">Base Location Name:</label>
                    <input
                        type="text"
                        id="baseLocationName"
                        value={baseLocationName}
                        onChange={(e) => setBaseLocationName(e.target.value)}
                        required
                        className="form-control"
                    />
                </div>
                <button type="submit" className="btn btn-primary">
                    {editing ? 'Update Base Location' : 'Save Base Location'}
                </button>
            </form>
            <div className="map-container">
                <MyMapComponent baseLocation={baseLocation} onMapClick={handleMapClick} />
            </div>
            {savedBaseLocation && (
                <div className="base-location-details">
                    <h3>Base Location Details</h3>
                    <p><strong>Location:</strong> {savedBaseLocation.name}</p>
                    <p><strong>Coordinates:</strong> ({savedBaseLocation.lat}, {savedBaseLocation.lng})</p>
                </div>
            )}
            <div className="table-responsive mb-5">
                <table>
                    <thead>
                        <tr>
                            <th>Id</th>
                            <th>Location</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                            <th className="!text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>
                                    <div className="whitespace-nowrap">{item.name}</div>
                                </td>
                                <td>
                                    <div className="whitespace-nowrap">{item.lat}</div>
                                </td>
                                <td>
                                    <div className="whitespace-nowrap">{item.lng}</div>
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
                                    </ul>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BaseLocation;
