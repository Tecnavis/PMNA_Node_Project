import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';

function ServiceType() {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [newServiceType, setNewServiceType] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [editing, setEditing] = useState(false);
  const [currentService, setCurrentService] = useState({ id: '', name: '', salary: '', basicSalaryKM: '', salaryPerKM: '' });
  const [newBasicSalaryKM, setNewBasicSalaryKM] = useState('');
  const [newSalaryPerKM, setNewSalaryPerKM] = useState('');
  useEffect(() => {
    const fetchServices = async () => {
      const db = getFirestore();
      const serviceRef = collection(db, 'service');
      try {
        const snapshot = await getDocs(serviceRef);
        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServiceTypes(services);
      } catch (error) {
        console.error('Error fetching service types:', error);
      }
    };
    fetchServices();
  }, []);

  const addServiceType = async () => {
    const newService = {
      name: newServiceType,
      salary: newSalary,
      basicSalaryKM: newBasicSalaryKM,
      salaryPerKM: newSalaryPerKM
    };
        try {
      const db = getFirestore();
      const serviceRef = collection(db, 'service');
      const docRef = await addDoc(serviceRef, newService);
      setServiceTypes([...serviceTypes, { ...newService, id: docRef.id }]);
      setNewServiceType('');
      setNewSalary('');
      setNewBasicSalaryKM('');
      setNewSalaryPerKM('');
    } catch (error) {
      console.error('Error adding service type:', error);
    }
  };

  const deleteServiceType = async (id) => {
    try {
      const db = getFirestore();
      const serviceRef = doc(db, 'service', id);
      await deleteDoc(serviceRef);
      setServiceTypes(serviceTypes.filter(service => service.id !== id));
    } catch (error) {
      console.error('Error deleting service type:', error);
      alert(`Error deleting service: ${error.message}`);
    }
  };

  const editServiceType = (service) => {
    setEditing(true);
    setCurrentService({ 
      id: service.id, 
      name: service.name, 
      salary: service.salary, 
      basicSalaryKM: service.basicSalaryKM, // Add this line
      salaryPerKM: service.salaryPerKM // Add this line
    });
  };
  

  const updateServiceType = async () => {
    const { id, name, salary, basicSalaryKM, salaryPerKM } = currentService;
    try {
      const db = getFirestore();
      const serviceRef = doc(db, 'service', id);
      await updateDoc(serviceRef, { name, salary, basicSalaryKM, salaryPerKM });
      setServiceTypes(serviceTypes.map(service => service.id === id ? { ...service, name, salary, basicSalaryKM, salaryPerKM } : service));
      setEditing(false);
      setCurrentService({ id: '', name: '', salary: '', basicSalaryKM: '', salaryPerKM: '' });
    } catch (error) {
      console.error('Error updating service type:', error);
      alert(`Error updating service: ${error.message}`);
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>

            <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Service Type</th>
            <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Basic Salary KM</th>

            <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Salary/KM</th>

            <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Salary</th>
            <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {serviceTypes.map((service,index) => (
            <tr key={index}>

              <td style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>{service.name}</td>
              <td style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>{service.basicSalaryKM}</td>

              <td style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>{service.salaryPerKM}</td>

              <td style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>{service.salary}</td>
              <td style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>
                <button style={{ padding: '5px 10px', marginRight: '5px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => editServiceType(service)}>
                  Edit
                </button>
                <button style={{ padding: '5px 10px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => deleteServiceType(service.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
    <div>
        <input
            type="text"
            value={currentService.name}
            onChange={(e) => setCurrentService({ ...currentService, name: e.target.value })}
            style={{ textAlign: 'left', padding: '8px', border: '3px solid #ddd', backgroundColor: '#f2f2f2' }}        />
        <input
            type="text"
            value={currentService.basicSalaryKM}
            placeholder="KM for Basic Salary"
            onChange={(e) => setCurrentService({ ...currentService, basicSalaryKM: e.target.value })}
            style={{ textAlign: 'left', padding: '8px', border: '3px solid #ddd', backgroundColor: '#f2f2f2' }}        />
        <input
            type="text"
            value={currentService.salaryPerKM}
            placeholder="Salary per KM"
            onChange={(e) => setCurrentService({ ...currentService, salaryPerKM: e.target.value })}
            style={{ textAlign: 'left', padding: '8px', border: '3px solid #ddd', backgroundColor: '#f2f2f2' }}        />
        <input
            type="text"
            value={currentService.salary}
            onChange={(e) => setCurrentService({ ...currentService, salary: e.target.value })}
            style={{ textAlign: 'left', padding: '8px', border: '3px solid #ddd', backgroundColor: '#f2f2f2' }}        />
        <button
            style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginLeft:'5px'
            }}
            onClick={updateServiceType}
        >
            Update
        </button>
    </div>
)}

      <div>
        <input
          type="text"
          placeholder="New Service Type"
          value={newServiceType}
          onChange={e => setNewServiceType(e.target.value)}
          style={{ textAlign: 'left', padding: '8px', border: '3px solid #ddd', backgroundColor: '#f2f2f2',marginTop:'20px' }}        />
              <input
          type="text"
          placeholder="Basic Salary KM"
          value={newBasicSalaryKM}
          onChange={e => setNewBasicSalaryKM(e.target.value)}
          style={{ textAlign: 'left', padding: '8px', border: '3px solid #ddd', backgroundColor: '#f2f2f2' }}        />
           <input
          type="text"
          placeholder="SalaryPerKM"
          value={newSalaryPerKM}
          onChange={e => setNewSalaryPerKM(e.target.value)}
          style={{ textAlign: 'left', padding: '8px', border: '3px solid #ddd', backgroundColor: '#f2f2f2' }}        />
        <input
          type="text"
          placeholder="Salary"
          value={newSalary}
          onChange={e => setNewSalary(e.target.value)}
          style={{ textAlign: 'left', padding: '8px', border: '3px solid #ccc', backgroundColor: '#f2f2f2' }}        />
     
        <button
          onClick={addServiceType}
          style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer',marginLeft:"5px" }}
        >
          Add Service Type
        </button>
      </div>
    </div>
  );
}

export default ServiceType;
