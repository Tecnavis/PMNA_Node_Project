import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import templateUrl from '../../public/assets/rsaqr.jpg';
import { Showroom } from '../pages/Showroom/Showroom';

/**
 * Showroom QR sticker sheet: the RSA A4 template with the showroom's QR printed inside both white squares.
 *
 * The template image (public/assets/rsaqr.jpg) is 1002 x 1280 px. The two squares were measured on it:
 *   top    x 393-607, y 197-411
 *   bottom x 395-609, y 844-1058
 * Everything (preview and PDF) is placed from these numbers, so the QR always lands in the squares.
 * If the template image is ever replaced, measure the squares again and update TEMPLATE below.
 */
const TEMPLATE = {
    width: 1002,
    height: 1280,
    boxes: [
        { x: 393, y: 197, size: 214 },
        { x: 395, y: 844, size: 214 },
    ],
    /** small gap between the square's border and the QR (template px) */
    inset: 9,
};

// A4 portrait in mm; the template is scaled to the full page width and centred vertically.
const PAGE = { w: 210, h: 297 };
const SCALE = PAGE.w / TEMPLATE.width; // mm per template px
const TOP = (PAGE.h - TEMPLATE.height * SCALE) / 2; // vertical offset of the template on the page (mm)

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

interface A4ModalProps {
    modalOpen: boolean;
    setModalOpen: (open: boolean) => void;
    showroom: Showroom | null;
    backendUrl: string;
}

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not load the QR template image'));
        img.src = src;
    });

const A4Page: React.FC<A4ModalProps> = ({ modalOpen, setModalOpen, showroom, backendUrl }) => {
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!modalOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModalOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [modalOpen, setModalOpen]);

    if (!modalOpen || !showroom) return null;

    // The QR opens the app download flow for this showroom (unchanged from before).
    const link = `${String(backendUrl || '').replace(/\/+$/, '')}/app/download-flow/${showroom._id}`;
    const showroomId = showroom.showroomId || showroom._id;
    const label = `ID: ${showroomId}`;
    const title = [showroom.name, showroom.location].filter(Boolean).join(' - ');

    const buildPdf = async () => {
        const canvas = qrCanvasRef.current;
        if (!canvas) throw new Error('QR code is not ready yet');
        const template = await loadImage(templateUrl);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        pdf.addImage(template, 'JPEG', 0, TOP, PAGE.w, TEMPLATE.height * SCALE);
        const qrPng = canvas.toDataURL('image/png');

        TEMPLATE.boxes.forEach((b) => {
            const x = (b.x + TEMPLATE.inset) * SCALE;
            const y = TOP + (b.y + TEMPLATE.inset) * SCALE;
            const size = (b.size - TEMPLATE.inset * 2) * SCALE;
            pdf.addImage(qrPng, 'PNG', x, y, size, size);
            // showroom ID just under each square, so cut stickers can still be told apart
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(60);
            pdf.text(label, (b.x + b.size / 2) * SCALE, TOP + (b.y + b.size + 13) * SCALE, { align: 'center', baseline: 'middle' });
        });

        // who the sheet is for, in the top margin (outside the stickers)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(110);
        pdf.text(`${label}  ${title}`.slice(0, 120), PAGE.w / 2, Math.max(5, TOP - 3), { align: 'center' });
        return pdf;
    };

    const fileName = `showroom-${showroomId}-qr.pdf`;

    const download = async () => {
        setBusy(true);
        setError('');
        try {
            (await buildPdf()).save(fileName);
        } catch (e: any) {
            console.error('Error generating PDF:', e);
            setError(e?.message || 'Could not create the PDF');
        } finally {
            setBusy(false);
        }
    };

    const print = async () => {
        setBusy(true);
        setError('');
        try {
            const pdf = await buildPdf();
            pdf.autoPrint();
            const url = pdf.output('bloburl');
            const w = window.open(url as unknown as string, '_blank');
            if (!w) pdf.save(fileName); // pop-ups blocked: fall back to download
        } catch (e: any) {
            console.error('Error printing PDF:', e);
            setError(e?.message || 'Could not print');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-3" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true" aria-label="Showroom QR sheet">
            <div className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-[#0e1726]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                    <div className="min-w-0">
                        <div className="font-semibold">QR sticker sheet (A4)</div>
                        <div className="truncate text-xs text-white-dark">
                            {label} · {title}
                        </div>
                    </div>
                    <button type="button" className="text-2xl leading-none text-white-dark hover:text-danger" onClick={() => setModalOpen(false)} aria-label="Close">
                        ×
                    </button>
                </div>

                {/* Preview: an A4-shaped sheet; the QR positions use the same measurements as the PDF */}
                <div className="overflow-auto bg-[#e5e7eb] p-4 dark:bg-black">
                    <div className="relative mx-auto w-full max-w-[420px] bg-white shadow" style={{ aspectRatio: `${PAGE.w} / ${PAGE.h}` }}>
                        <div className="absolute left-0 w-full" style={{ top: pct(TOP, PAGE.h), aspectRatio: `${TEMPLATE.width} / ${TEMPLATE.height}` }}>
                            <img src={templateUrl} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
                            {TEMPLATE.boxes.map((b, i) => (
                                <React.Fragment key={i}>
                                    <div
                                        className="absolute"
                                        style={{
                                            left: pct(b.x + TEMPLATE.inset, TEMPLATE.width),
                                            top: pct(b.y + TEMPLATE.inset, TEMPLATE.height),
                                            width: pct(b.size - TEMPLATE.inset * 2, TEMPLATE.width),
                                            aspectRatio: '1 / 1',
                                        }}
                                    >
                                        <QRCodeSVG value={link} level="M" marginSize={0} style={{ width: '100%', height: '100%' }} />
                                    </div>
                                    <div
                                        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-bold text-[#3c3c3c]"
                                        style={{ left: pct(b.x + b.size / 2, TEMPLATE.width), top: pct(b.y + b.size + 13, TEMPLATE.height), fontSize: 'clamp(6px, 1.4vw, 9px)' }}
                                    >
                                        {label}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* high-resolution QR used for the PDF (not shown) */}
                <QRCodeCanvas ref={qrCanvasRef} value={link} size={1024} level="M" marginSize={0} style={{ display: 'none' }} />

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                    <div className="min-w-0 text-xs text-white-dark">
                        2 stickers per A4 page. Print at <b>100% / Actual size</b> (not "fit to page").
                        {error && <div className="mt-1 text-danger">{error}</div>}
                    </div>
                    <div className="flex gap-2">
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={download} disabled={busy}>
                            {busy ? '…' : 'Download PDF'}
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={print} disabled={busy}>
                            {busy ? '…' : 'Print'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default A4Page;
