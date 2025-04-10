import React, { useState, useEffect } from 'react';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import './QR.css';
import Header from '../../components/Layouts/Header';
const QRLogin: React.FC = () => {
  const [showroomLink, setShowroomLink] = useState<string | null>(null); // State to store the showroom link
  const [qrCode, setQrCode] = useState<string | null>(null); // State to store the QR code
  const showroomId = localStorage.getItem('showroomId') || ''; // Get showroomId from localStorage
  const db = getFirestore();
  const uid = import.meta.env.VITE_REACT_APP_UID;

  useEffect(() => {
    const fetchShowroomData = async () => {
      try {
        if (showroomId) {
          const q = query(
            collection(db, `user/${uid}/showroom`),
            where('id', '==', showroomId) // Adjust if the field name is different
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              console.log("Fetched data:", data); // Log fetched data
              setShowroomLink(data.showroomLink); // Fetch and set the showroom link
              setQrCode(data.qrCode); // Fetch and set the QR code
            });
          } else {
            console.error('No showroom found with the provided ID.');
          }
        } else {
          console.error('showroomId is not available');
        }
      } catch (error) {
        console.error('Error fetching showroom data:', error);
      }
    };

    fetchShowroomData();
  }, [showroomId, db, uid]);

  return (
    <div>     

    <div className="qr-login-container">
      {showroomLink ? (
        <div>
          <a href={showroomLink} target="_blank" rel="noopener noreferrer" className="qr-login-link"
          >
            Visit Showroom
          </a>
          {qrCode ? (
            <div className="qr-code-container">
              <img src={qrCode} alt="Showroom QR Code" />
            </div>
          ) : (
            <p>Loading QR Code...</p>
          )}
        </div>
      ) : (
        <p>Loading Showroom Link...</p>
      )}
    </div>
    </div>
  );
};

export default QRLogin;
