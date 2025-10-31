import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiTwotoneCar } from 'react-icons/ai';
import { BsBuildings } from 'react-icons/bs';
import { HiOutlineWrenchScrewdriver } from 'react-icons/hi2';
import { IoMdCheckmarkCircleOutline } from 'react-icons/io';

import Completed from '../ShowRooms/ServiceCenter/Completed';
import CompletedBody from '../ShowRooms/BodyShopes/CompletedBody';
import CompletedShowRoom from '../ShowRooms/ShowRoom/CompletedShowroom';

const tabConfig = {
  serviceCenter: {
    label: 'Service Center',
    icon: <HiOutlineWrenchScrewdriver />,
    completed: <Completed />,
  },
  bodyParts: {
    label: 'Body Shops',
    icon: <AiTwotoneCar />,
    completed: <CompletedBody />,
  },
  showRooms: {
    label: 'Showrooms',
    icon: <BsBuildings />,
    completed: <CompletedShowRoom />,
  },
};

const Home: React.FC = () => {
  const [activeTab, setActiveTab] =
    useState<keyof typeof tabConfig>('serviceCenter');
  const { label, icon, completed } = tabConfig[activeTab];

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      {/* Main Tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-gray-200 p-1 rounded-lg">
            
          {Object.entries(tabConfig).map(([key, { label, icon }]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition ${
                activeTab === key
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-700 hover:bg-white'
              }`}
            >
              <span className="mr-2 text-lg">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Only Completed Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6  mx-auto">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <IoMdCheckmarkCircleOutline className="mr-2 text-green-500" />
          {label} — Completed Bookings
        </h2>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-completed`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {completed}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Home;
