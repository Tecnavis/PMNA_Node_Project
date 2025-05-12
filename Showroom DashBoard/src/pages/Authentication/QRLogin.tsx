// import './QR.css';
import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG as QRCode } from 'qrcode.react'
import rsaIcon from '../../../public/assets/rsaqr.jpg'
import domtoimage from 'dom-to-image';
import { jsPDF } from 'jspdf';
import { main } from "@popperjs/core";
import { getShowroomById } from "../../service/showroom";
import { IShowroom } from "../../interface/showroom";

const QRLogin: React.FC = () => {

  const [showroom, setShowroom] = useState<IShowroom>();
  const [url, setUrl] = useState<string>('');

  const showroomId = localStorage.getItem('showroomId') || '';

  // getting all showroom
  const fetchShowroom = async () => {
    try {
      const response = await getShowroomById(showroomId)
      setUrl(`http://showroomstaff.rsakerala.com/auth/cover-register?id=${response._id}&name=${response.name}&location=${response.location}&image=${response.image}&helpline=${response.helpline}&phone=${response.phone}&state=${response.state}&district=${response.district}`)
      setShowroom(response);
    } catch (error) {
      console.error('Error fetching showroom staff:', error);
    }
  };

  useEffect(() => {
    fetchShowroom()
  }, [showroomId])

  // const handlePrintA4 = () => {
  //   const modalContent = document.getElementById("modal-content");

  //   if (!modalContent) return;

  //   // Capture the element as an image
  //   domtoimage.toPng(modalContent, {
  //     width: modalContent.scrollWidth, // Capture full width
  //     height: modalContent.scrollHeight, // Capture full height
  //     style: {
  //       overflow: 'visible', // Ensure all content is visible
  //     },
  //   }).then((dataUrl: string) => {
  //     const pdf = new jsPDF("p", "mm", "a4");

  //     // Calculate dimensions to fit A4
  //     const imgWidth = 190; // Width of A4 (210mm) minus margins (10mm on each side)
  //     const imgHeight = (modalContent.scrollHeight * imgWidth) / modalContent.scrollWidth;

  //     // Add image to PDF
  //     pdf.addImage(dataUrl, "PNG", 10, 10, imgWidth, imgHeight);

  //     pdf.save("showroom-details.pdf");
  //   }).catch((error: any) => {
  //     console.error("Error generating PDF:", error);
  //   });
  // };

  // const modalContentRef = useRef<HTMLDivElement>(null);


  return (
    <main >
      <div
        style={{
          position: 'fixed',
          top: 10,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="border mt-11"
      >
        <div
          style={{
            position: "absolute",
            top: "40%", // Adjust based on image size
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <QRCode value={url} size={280} />
        </div>
      </div>
    </main >
  );
};

export default QRLogin;
