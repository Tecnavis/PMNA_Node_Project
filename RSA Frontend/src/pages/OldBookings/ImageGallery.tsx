// components/ImageGallery.tsx - UPDATED WITH DOWNLOAD FUNCTIONALITY
import React, { useState, useEffect } from 'react';
import { 
    PhotoIcon, 
    XMarkIcon, 
    ChevronLeftIcon, 
    ChevronRightIcon,
    CameraIcon,
    ArrowDownTrayIcon // Add download icon
} from '@heroicons/react/24/outline';

interface ImageGalleryProps {
    images: string[];
    title?: string;
    maxDisplay?: number;
    onDownload?: (imageUrl: string, imageName: string) => void; // Optional download callback
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
    images, 
    title = 'Images', 
    maxDisplay = 3,
    onDownload 
}) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [imageNames, setImageNames] = useState<string[]>([]); // Store original image names
    
    // Use Cloudinary base URL WITHOUT the version and uploads part
    const CLOUDINARY_BASE = 'https://res.cloudinary.com/dksxgbcyi/image/upload/';

    // Generate placeholder SVG
    const generatePlaceholderSVG = (text: string, index: number): string => {
        const colors = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6'];
        const color = colors[index % colors.length];
        
        return `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='${encodeURIComponent(color)}' opacity='0.2'/%3E%3Crect width='80' height='80' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='10' fill='${encodeURIComponent(color)}' text-anchor='middle' dy='.3em'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
    };

    // Function to extract filename from URL or path
    const extractFileName = (image: string): string => {
        if (!image) return `image-${Date.now()}.jpg`;
        
        // If it's a Cloudinary URL, extract the filename
        if (image.includes('cloudinary.com')) {
            const parts = image.split('/');
            const lastPart = parts[parts.length - 1];
            
            // Remove query parameters if any
            const cleanName = lastPart.split('?')[0];
            
            // If the filename has a format like "v1745300782/uploads/filename.jpg"
            if (cleanName.includes('uploads/')) {
                const uploadParts = cleanName.split('uploads/');
                return uploadParts.length > 1 ? uploadParts[1] : cleanName;
            }
            
            return cleanName || `image-${Date.now()}.jpg`;
        }
        
        // If it's just a filename
        if (!image.includes('/')) {
            return image;
        }
        
        // Extract filename from path
        const parts = image.split('/');
        return parts[parts.length - 1] || `image-${Date.now()}.jpg`;
    };

    // Function to download image
    const downloadImage = async (imageUrl: string, imageName: string) => {
        try {
            // If parent component wants to handle download
            if (onDownload) {
                onDownload(imageUrl, imageName);
                return;
            }
            
            // Default download behavior
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary anchor element
            const link = document.createElement('a');
            link.href = url;
            
            // Create a meaningful filename
            const timestamp = new Date().toISOString().split('T')[0];
            const cleanTitle = title.toLowerCase().replace(/\s+/g, '-');
            const extension = imageName.includes('.') ? imageName.split('.').pop() : 'jpg';
            const filename = `${cleanTitle}-${timestamp}-${currentIndex + 1}.${extension}`;
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            console.log(`Downloaded: ${filename}`);
            
        } catch (error) {
            console.error('Error downloading image:', error);
            
            // Fallback: Open image in new tab
            window.open(imageUrl, '_blank');
        }
    };

    // Function to download all images
    const downloadAllImages = async () => {
        if (imageUrls.length === 0) return;
        
        // Show download in progress
        console.log(`Starting download of ${imageUrls.length} ${title.toLowerCase()}(s)...`);
        
        // Download each image sequentially
        for (let i = 0; i < imageUrls.length; i++) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
                await downloadImage(imageUrls[i], imageNames[i] || `image-${i + 1}.jpg`);
            } catch (error) {
                console.error(`Error downloading image ${i + 1}:`, error);
            }
        }
        
        console.log(`Completed downloading ${imageUrls.length} ${title.toLowerCase()}(s)`);
    };

    // Test image URL
    const testImageUrl = (image: string): string => {
        if (!image || typeof image !== 'string') {
            return generatePlaceholderSVG('Invalid', 0);
        }
        
        // If already a full URL, return as-is
        if (image.startsWith('http')) {
            return image;
        }
        
        // Try different patterns
        const patterns = [
            `${CLOUDINARY_BASE}v1745300782/uploads/${image}`,
            `${CLOUDINARY_BASE}v1745300782/${image}`,
            `${CLOUDINARY_BASE}uploads/${image}`,
            `${CLOUDINARY_BASE}${image}`,
        ];
        
        return patterns[0];
    };

    // Convert image filenames to Cloudinary URLs
    useEffect(() => {
        if (!images || !Array.isArray(images) || images.length === 0) {
            setImageUrls([]);
            setImageNames([]);
            return;
        }

        const urls = images.map((image, index) => {
            if (!image || typeof image !== 'string') {
                return generatePlaceholderSVG(`Invalid ${index + 1}`, index);
            }
            
            return testImageUrl(image);
        });
        
        // Store original image names for download
        const names = images.map(image => extractFileName(image));
        
        setImageUrls(urls);
        setImageNames(names);
        
    }, [images, title]);

    if (!images || !Array.isArray(images) || images.length === 0) {
        return (
            <div className="text-center text-gray-400">
                <CameraIcon className="h-6 w-6 mx-auto mb-1" />
                <span className="text-xs">No {title.toLowerCase()}</span>
            </div>
        );
    }

    const displayedUrls = imageUrls.slice(0, maxDisplay);
    const remainingCount = images.length - maxDisplay;

    const openImage = (imageUrl: string, index: number) => {
        setSelectedImage(imageUrl);
        setCurrentIndex(index);
    };

    const closeImage = () => {
        setSelectedImage(null);
    };

    const navigateImage = (direction: 'prev' | 'next') => {
        let newIndex = currentIndex;
        
        if (direction === 'prev') {
            newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
        } else {
            newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
        }
        
        setSelectedImage(imageUrls[newIndex]);
        setCurrentIndex(newIndex);
    };

    return (
        <>
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <PhotoIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">
                            {images.length} {title}
                        </span>
                    </div>
                    
                    {/* Download All Button */}
                    {imageUrls.length > 0 && (
                        <button
                            onClick={downloadAllImages}
                            title={`Download all ${title.toLowerCase()}`}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 p-1 rounded hover:bg-indigo-50 transition-colors"
                        >
                            <ArrowDownTrayIcon className="h-3 w-3" />
                            <span>Download All</span>
                        </button>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {displayedUrls.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                            <button
                                onClick={() => openImage(imageUrl, index)}
                                className="relative w-full"
                                title={`Click to view ${title} ${index + 1}`}
                            >
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-300 transition-colors bg-gray-50">
                                    <img
                                        src={imageUrl}
                                        alt={`${title} ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = generatePlaceholderSVG(`${title} ${index + 1}`, index);
                                            target.className = "w-full h-full object-contain p-1";
                                        }}
                                    />
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
                            </button>
                            
                            {/* Download button overlay */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    downloadImage(imageUrl, imageNames[index] || `image-${index + 1}.jpg`);
                                }}
                                title={`Download ${title} ${index + 1}`}
                                className="absolute top-1 right-1 bg-black bg-opacity-50 hover:bg-opacity-70 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <ArrowDownTrayIcon className="h-3 w-3 text-white" />
                            </button>
                        </div>
                    ))}
                    
                    {remainingCount > 0 && (
                        <div className="relative" title={`${remainingCount} more ${title.toLowerCase()}`}>
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-indigo-50 flex items-center justify-center">
                                <div className="text-center">
                                    <span className="text-sm font-medium text-indigo-700">
                                        +{remainingCount}
                                    </span>
                                    <div className="text-xs text-indigo-500 mt-0.5">more</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Fullscreen Image Modal with Download Option */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-4xl max-h-[90vh]">
                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                            {/* Download Button in Modal */}
                            <button
                                onClick={() => downloadImage(selectedImage, imageNames[currentIndex] || `image-${currentIndex + 1}.jpg`)}
                                className="p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-colors"
                                title="Download image"
                            >
                                <ArrowDownTrayIcon className="h-6 w-6 text-white" />
                            </button>
                            
                            {/* Close Button */}
                            <button
                                onClick={closeImage}
                                className="p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-colors"
                            >
                                <XMarkIcon className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={() => navigateImage('prev')}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-colors"
                                >
                                    <ChevronLeftIcon className="h-6 w-6 text-white" />
                                </button>
                                
                                <button
                                    onClick={() => navigateImage('next')}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-colors"
                                >
                                    <ChevronRightIcon className="h-6 w-6 text-white" />
                                </button>
                            </>
                        )}
                        
                        <div className="w-full h-full flex items-center justify-center">
                            <img
                                src={selectedImage}
                                alt="Full size"
                                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' fill='%236b7280' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E`;
                                }}
                            />
                        </div>
                        
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full flex items-center gap-2">
                            <span>{currentIndex + 1} / {images.length}</span>
                            <button
                                onClick={() => downloadImage(selectedImage, imageNames[currentIndex] || `image-${currentIndex + 1}.jpg`)}
                                className="p-1 hover:text-indigo-300 transition-colors"
                                title="Download this image"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ImageGallery;