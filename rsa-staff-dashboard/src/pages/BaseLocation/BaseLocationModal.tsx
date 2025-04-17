import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

const BaseLocationModal = ({ onClose, setBaseLocation, pickupLocation }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState([]);
    const db = getFirestore();
    const [distances, setDistances] = useState({});

    console.log('distances', distances);
    console.log('pickupLocation', pickupLocation);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'baselocation'));
                const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setItems(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [db]);

    useEffect(() => {
        if (pickupLocation) {
            calculateDistances();
        }
    }, [pickupLocation, items]);

    const calculateDistances = () => {
        const service = new window.google.maps.DistanceMatrixService();
        const origins = items.map((item) => ({ lat: item.lat, lng: item.lng }));
        const destination = { lat: pickupLocation.lat, lng: pickupLocation.lng };

        service.getDistanceMatrix(
            {
                origins,
                destinations: [destination],
                travelMode: 'DRIVING', // Change this to the desired travel mode (DRIVING, WALKING, BICYCLING, TRANSIT)
            },
            (response, status) => {
                if (status === 'OK') {
                    const distances = response.rows.map((row, index) => ({
                        id: items[index].id,
                        distance: row.elements[0].distance.value, // Use value instead of text for numerical sorting
                        duration: row.elements[0].duration.text,
                    }));
                    setDistances(Object.fromEntries(distances.map((d) => [d.id, d])));

                    // Sort items based on distance in descending order
                    const sortedItems = [...items].sort((a, b) => {
                        const distanceA = distances.find((d) => d.id === a.id)?.distance || 0;
                        const distanceB = distances.find((d) => d.id === b.id)?.distance || 0;
                        return distanceA - distanceB;
                    });
                    setItems(sortedItems);
                } else {
                    console.error('Error fetching distance matrix:', status);
                }
            }
        );
    };

    const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelect = (item) => {
        setBaseLocation(item); // Update the base location in the parent component
        onClose(); // Close the modal
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
                <div className="mb-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Select Base Location</h2>
                    <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="search-container mb-4">
                    <input type="text" placeholder="Search locations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 rounded border border-gray-300 w-full" />
                </div>
                <div className="table-responsive">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="px-4 py-2">Start Location</th>
                                <th className="px-4 py-2">Distance</th>
                                <th className="px-4 py-2">Duration</th>
                                <th className="px-4 py-2 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <td className="px-4 py-2">{item.name}</td>
                                    <td className="px-4 py-2">{distances[item.id]?.distance / 1000 || 'Calculating...'} km</td> {/* Convert meters to km */}
                                    <td className="px-4 py-2">{distances[item.id]?.duration || 'Calculating...'}</td>
                                    <td className="px-4 py-2 text-center">
                                        <Tippy content="Select">
                                            <button type="button" className="btn btn-primary text-blue-600 hover:text-blue-800" onClick={() => handleSelect(item)}>
                                                Select
                                            </button>
                                        </Tippy>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BaseLocationModal;
