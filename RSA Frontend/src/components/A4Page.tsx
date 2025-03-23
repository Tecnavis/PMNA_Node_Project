import React, { useRef } from "react";
import { QRCodeSVG as QRCode } from 'qrcode.react'
import rsaIcon from '../../public/assets/rsaqr.jpg'
import domtoimage from 'dom-to-image';
import { jsPDF } from 'jspdf';

// Main Modal Component
interface A4ModalProps {
    modalOpen: boolean;
    setModalOpen: (open: boolean) => void;
    url: string;
}

const A4Page: React.FC<A4ModalProps> = ({ modalOpen, setModalOpen, url }) => {

    const handlePrintA4 = () => {
        const modalContent = document.getElementById("modal-content");

        if (!modalContent) return;

        // Capture the element as an image
        domtoimage.toPng(modalContent, {
            width: modalContent.scrollWidth, // Capture full width
            height: modalContent.scrollHeight, // Capture full height
            style: {
                overflow: 'visible', // Ensure all content is visible
            },
        }).then((dataUrl: string) => {
            const pdf = new jsPDF("p", "mm", "a4");

            // Calculate dimensions to fit A4
            const imgWidth = 190; // Width of A4 (210mm) minus margins (10mm on each side)
            const imgHeight = (modalContent.scrollHeight * imgWidth) / modalContent.scrollWidth;

            // Add image to PDF
            pdf.addImage(dataUrl, "PNG", 10, 10, imgWidth, imgHeight);

            pdf.save("showroom-details.pdf");
        }).catch((error: any) => {
            console.error("Error generating PDF:", error);
        });
    };

    const modalContentRef = useRef<HTMLDivElement>(null);

    if (!modalOpen) return;

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
                    padding: "20px",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* QR Code Column */}
                <div
                    ref={modalContentRef}
                    id='modal-content'
                    style={{
                        padding: "30px",
                        overflowY: "auto",
                        width: "700px",
                        position: "relative", // Ensure QR codes are positioned properly
                    }}
                    className=" bg-white"
                >
                    {/* Image */}
                    <img src={rsaIcon} alt="RSA Icon" style={{ width: "100%" }} />

                    {/* First QR Code */}
                    <div
                        style={{
                            position: "absolute",
                            top: "40%", // Adjust based on image size
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <QRCode value={url} size={160} />
                    </div>

                    {/* Second QR Code */}
                    <div
                        style={{
                            position: "absolute",
                            top: "109%", // Adjust based on image size
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <QRCode value={url} size={160} />
                    </div>
                </div>
                <div className='w-[700px] bg-white p-3 border-t border-black'>
                    <button
                        onClick={() => setModalOpen(false)}
                        className=' bg-blue-500 text-white py-2 px-3 rounded-md'>Close</button>
                    <button
                        onClick={handlePrintA4}
                        className='ml-3 bg-blue-500 text-white py-2 px-3 rounded-md'>Print</button>
                </div>
            </div>
        </div>
    );
};

export default A4Page;
