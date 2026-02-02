import React, { useRef } from "react";
import { QRCodeSVG as QRCode } from 'qrcode.react'
import rsaIcon from '../../public/assets/rsaqr.jpg'
import domtoimage from 'dom-to-image';
import { jsPDF } from 'jspdf';
import { Showroom } from "../pages/Showroom/Showroom";

// Main Modal Component
interface A4ModalProps {
    modalOpen: boolean;
    setModalOpen: (open: boolean) => void;
    showroom: Showroom | null;
    backendUrl: string;
}

const A4Page: React.FC<A4ModalProps> = ({ modalOpen, setModalOpen, showroom, backendUrl }) => {
    const generateUniversalLink = (): string => {
        if (!showroom) return '';
        return `${backendUrl}/staff/showroom/${showroom._id}`;
    };
    
    const handlePrintA4 = () => {
        const modalContent = document.getElementById("modal-content");

        if (!modalContent) return;

        domtoimage.toPng(modalContent, {
            width: modalContent.scrollWidth,
            height: modalContent.scrollHeight,
            style: { overflow: 'visible' },
        }).then((dataUrl: string) => {
            const pdf = new jsPDF("p", "mm", "a4");
            const imgWidth = 185;
            const imgHeight = (modalContent.scrollHeight * imgWidth) / modalContent.scrollWidth;
            pdf.addImage(dataUrl, "PNG", 10, 10, imgWidth, imgHeight);
            pdf.save(`showroom-${showroom?.showroomId || showroom?._id}-qr.pdf`);
        }).catch((error: any) => {
            console.error("Error generating PDF:", error);
        });
    };

    const modalContentRef = useRef<HTMLDivElement>(null);

    if (!modalOpen || !showroom) return null;

    const universalLink = generateUniversalLink();
    const showroomId = showroom.showroomId || showroom._id;
    
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={() => setModalOpen(false)}
        >
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "21.4px",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* QR Code Column */}
                <div
                    ref={modalContentRef}
                    id='modal-content'
                    style={{
                        padding: "35px",
                        overflowY: "auto",
                        width: "774px",
                        position: "relative",
                        backgroundColor: "white",
                    }}
                >
                    {/* Simple Showroom ID Header */}
                    <div style={{
                        textAlign: "center",
                        marginBottom: "11px",
                    }}>
                        <h2 style={{
                            fontSize: "20px",
                            fontWeight: "bold",
                            color: "#333",
                                                    borderBottom: "2px solid #e0e0e0"

                        }}>
                            Showroom ID: <span style={{ color: "#007bff" }}>{showroomId} :                             {showroom.name} - {showroom.location}
</span>
                        </h2>
                    </div>

                    {/* Image */}
                    <img src={rsaIcon} alt="RSA Icon" style={{ width: "100%" }} />

                    {/* First QR Code */}
                    <div
                        style={{
                            position: "absolute",
                            top: "45%", // Adjusted for header
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <QRCode value={universalLink} size={160} />
                    </div>

                    {/* Second QR Code */}
                    <div
                        style={{
                            position: "absolute",
                            top: "114%", // Adjusted for header
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <QRCode value={universalLink} size={160} />
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className='w-[700px] bg-white p-3 border-t border-black'>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>
                                ID: {showroomId}
                            </span>
                        </div>
                        <div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className='bg-red-500 text-white py-2 px-3 rounded-md hover:bg-red-600 mr-3'
                            >
                                Close
                            </button>
                            <button
                                onClick={handlePrintA4}
                                className='bg-blue-500 text-white py-2 px-3 rounded-md hover:bg-blue-600'
                            >
                                Print PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default A4Page;