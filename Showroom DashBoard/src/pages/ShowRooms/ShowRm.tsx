import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { IoCarSportOutline } from "react-icons/io5";
import { BsBuildings } from "react-icons/bs";
import { HiOutlineWrenchScrewdriver } from "react-icons/hi2";
import { IoCalendarOutline } from "react-icons/io5";
import { PiHourglassMediumDuotone } from "react-icons/pi";
import { IoCheckmarkCircleOutline } from "react-icons/io5";


import ServiceCenter from './ServiceCenter/ServiceCenter';
import CompletedBookings from './ServiceCenter/CompletedBookings';
import PendingBookings from './ServiceCenter/PendingBookings';
import BodyShopes from './BodyShopes/BodyShopes';
import CompletedBodyBookings from './BodyShopes/CompletedBodyBookings';
import PendingBodyBookings from './BodyShopes/PendingBodyBookings';
import BookingsShowRoom from './ShowRoom/BookingsShowRoom';
import CompleteShowRoom from './ShowRoom/CompleteShowRoom';
import PendingBookingsShowRoom from './ShowRoom/PendingBookingShowRoom';

const COLORS = {
  primary: '#6366F1',
  secondary: '#34D399',
  accent: '#FBBF24',
  background: '#F8FAFC',
  text: '#4B5563',
  lightText: '#9CA3AF',
  border: '#E2E8F0',
  cardBg: '#FFFFFF',
  activeBg: '#EEF2FF',
  hoverBg: '#F1F5F9',
};

const tabConfig = {
  serviceCenter: {
    label: 'Service Center',
    icon: <HiOutlineWrenchScrewdriver />,
    components: {
      bookings: <ServiceCenter />,
      pendingBookings: <PendingBookings />,
      completedBookings: <CompletedBookings />,
    },
  },
  bodyParts: {
    label: 'Body Shops',
    icon: <IoCarSportOutline />,
    components: {
      bookings: <BodyShopes />,
      pendingBookings: <PendingBodyBookings />,
      completedBookings: <CompletedBodyBookings />,
    },
  },
  showRooms: {
    label: 'Showrooms',
    icon: <BsBuildings />,
    components: {
      bookings: <BookingsShowRoom />,
      pendingBookings: <PendingBookingsShowRoom />,
      completedBookings: <CompleteShowRoom />,
    },
  },
};

const subTabLabels = {
  bookings: { label: 'Bookings', icon: <IoCalendarOutline /> },
  pendingBookings: { label: 'Pending', icon: <PiHourglassMediumDuotone /> },
  completedBookings: { label: 'Completed', icon: <IoCheckmarkCircleOutline /> },
};

const ShowRm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<keyof typeof tabConfig>('serviceCenter');
  const [selectedOption, setSelectedOption] = useState<keyof typeof subTabLabels>('bookings');

  const ActiveComponent = tabConfig[activeTab].components[selectedOption];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: COLORS.background }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg p-1 " style={{ backgroundColor: COLORS.border }}>
            {Object.entries(tabConfig).map(([key, { label, icon }]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key as keyof typeof tabConfig);
                  setSelectedOption('bookings'); // Reset to default sub-tab
                }}
                className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${activeTab === key
                  ? 'shadow-sm text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                style={{
                  backgroundColor: activeTab === key ? COLORS.primary : 'transparent',
                }}
              >
                <span className="mr-2 text-lg">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full p-1" style={{ backgroundColor: COLORS.border }}>
            {Object.entries(subTabLabels).map(([key, { label, icon }]) => (
              <button
                key={key}
                onClick={() => setSelectedOption(key as keyof typeof subTabLabels)}
                className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-300 ${selectedOption === key
                  ? 'text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                style={{
                  backgroundColor: selectedOption === key ? COLORS.secondary : 'transparent',
                }}
              >
                <span className="mr-1">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Status Bar */}
          <div
            className="h-1 w-full"
            style={{
              backgroundColor:
                selectedOption === 'bookings' ? COLORS.primary :
                  selectedOption === 'pendingBookings' ? COLORS.accent :
                    COLORS.secondary
            }}
          />

          {/* Animated Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${selectedOption}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {ActiveComponent}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 text-center text-sm" style={{ color: COLORS.lightText }}>
          Showing {tabConfig[activeTab].label.toLowerCase()} - {subTabLabels[selectedOption].label.toLowerCase()} bookings
        </div>
      </div>
    </div>
  );
};

export default ShowRm;