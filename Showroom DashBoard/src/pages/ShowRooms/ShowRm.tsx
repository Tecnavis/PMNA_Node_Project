import React, { useState } from 'react';

// Import your components for each section and status
import ServiceCenter from './ServiceCenter/ServiceCenter';
import CompletedBookings from './ServiceCenter/CompletedBookings';
import PendingBookings from './ServiceCenter/PendingBookings';

import BodyShopes from './BodyShopes/BodyShopes';
import CompletedBodyBookings from './BodyShopes/CompletedBodyBookings';
import PendingBodyBookings from './BodyShopes/PendingBodyBookings';

import BookingsShowRoom from './ShowRoom/BookingsShowRoom';
import CompleteShowRoom from './ShowRoom/CompleteShowRoom';
import PendingBookingsShowRoom from './ShowRoom/PendingBookingShowRoom';

const ShowRm: React.FC = () => {
  // Main tab state: serviceCenter, bodyParts, or showRooms
  const [activeTab, setActiveTab] = useState<'serviceCenter' | 'bodyParts' | 'showRooms'>('serviceCenter');
  // Sub-tab state: bookings, completedBookings, or pendingBookings
  const [selectedOption, setSelectedOption] = useState<'bookings' | 'completedBookings' | 'pendingBookings'>('bookings');

  return (
    <div className="container mx-auto p-4">
      {/* Main Tabs Navigation */}
      <div className="flex justify-center border-b border-gray-300 mb-4">
  <button
    onClick={() => setActiveTab('serviceCenter')}
    className={`px-4 py-2 text-xl font-semibold transition-colors duration-300 
      ${activeTab === 'serviceCenter' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600 hover:text-blue-500'}`}
  >
    Service Center
  </button>
  <button
    onClick={() => setActiveTab('bodyParts')}
    className={`px-4 py-2 text-xl font-semibold transition-colors duration-300 
      ${activeTab === 'bodyParts' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600 hover:text-blue-500'}`}
  >
    Body Shopes
  </button>
  <button
    onClick={() => setActiveTab('showRooms')}
    className={`px-4 py-2 text-xl font-semibold transition-colors duration-300 
      ${activeTab === 'showRooms' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600 hover:text-blue-500'}`}
  >
    Showrooms
  </button>
</div>

      {/* Sub Tabs Navigation */}
      <div className="flex justify-center border-b border-gray-200 mb-6">
        <button
          onClick={() => setSelectedOption('bookings')}
          className={`px-3 py-1 mx-2 text-sm font-medium transition-colors duration-300 
            ${selectedOption === 'bookings' ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-600 hover:text-green-500'}`}
        >
          Bookings
        </button>
       
        <button
          onClick={() => setSelectedOption('pendingBookings')}
          className={`px-3 py-1 mx-2 text-sm font-medium transition-colors duration-300 
            ${selectedOption === 'pendingBookings' ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-600 hover:text-green-500'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setSelectedOption('completedBookings')}
          className={`px-3 py-1 mx-2 text-sm font-medium transition-colors duration-300 
            ${selectedOption === 'completedBookings' ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-600 hover:text-green-500'}`}
        >
          Completed
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'serviceCenter' && selectedOption === 'bookings' && <ServiceCenter />}
        {activeTab === 'serviceCenter' && selectedOption === 'completedBookings' && <CompletedBookings />}
        {activeTab === 'serviceCenter' && selectedOption === 'pendingBookings' && <PendingBookings />}

        {activeTab === 'bodyParts' && selectedOption === 'bookings' && <BodyShopes />}
        {activeTab === 'bodyParts' && selectedOption === 'completedBookings' && <CompletedBodyBookings />}
        {activeTab === 'bodyParts' && selectedOption === 'pendingBookings' && <PendingBodyBookings />}

        {activeTab === 'showRooms' && selectedOption === 'bookings' && <BookingsShowRoom />}
        {activeTab === 'showRooms' && selectedOption === 'completedBookings' && <CompleteShowRoom />}
        {activeTab === 'showRooms' && selectedOption === 'pendingBookings' && <PendingBookingsShowRoom />}
      </div>
    </div>
  );
};

export default ShowRm;
