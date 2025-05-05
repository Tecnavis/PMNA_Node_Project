import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import { IShowroomStaff } from '../../interface/staff';
import IconPencilPaper from '../../components/Icon/IconPencilPaper';
import IconPhone from '../../components/Icon/IconPhone';
import IconUser from '../../components/Icon/IconUser';
import IconLock from '../../components/Icon/IconLock';
import IconMessage from '../../components/Icon/IconMessage';
import IconMenuMailbox from '../../components/Icon/Menu/IconMenuMailbox';
import IconTwitter from '../../components/Icon/IconTwitter';
import { motion } from 'framer-motion';
import { CLOUD_IMAGE } from '../../constants/status';

const Profile = () => {
  const [staffData, setStaffData] = useState<IShowroomStaff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const res = await axiosInstance.get(`${BASE_URL}showroom/showroom-staff-profile`);
        setStaffData(res.data.data);
      } catch (error) {
        console.error("Error fetching staff data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        loading
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Profile not found</h2>
          <p className="text-gray-500">Unable to load staff profile</p>
        </div>
      </div>
    );
  }

  const showroom = typeof staffData.showroomId === 'object' ? staffData.showroomId : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Profile Card */}
          <div className="w-full lg:w-1/3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="relative">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                  <div className="h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-700 overflow-hidden shadow-lg">
                    <div className="flex items-center justify-center h-full bg-indigo-100 dark:bg-gray-600 text-indigo-500 dark:text-gray-300 text-4xl font-bold">
                      {staffData.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-20 pb-6 px-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{staffData.name}</h2>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">{staffData.designation}</p>

                <div className="mt-6">
                  <div className="flex justify-center space-x-4">
                    <button className="bg-indigo-100 dark:bg-gray-700 hover:bg-indigo-200 dark:hover:bg-gray-600 text-indigo-600 dark:text-indigo-400 p-2 rounded-full transition-colors">
                      <IconPencilPaper className="w-5 h-5" />
                    </button>
                    <button className="bg-indigo-100 dark:bg-gray-700 hover:bg-indigo-200 dark:hover:bg-gray-600 text-indigo-600 dark:text-indigo-400 p-2 rounded-full transition-colors">
                      <IconMessage className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">Reward Points</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {staffData.rewardPoints || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min((staffData.rewardPoints || 0) * 5, 100)}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>

            {/* Contact Info Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Contact Information</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-indigo-100 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 mr-4">
                    <IconPhone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-800 dark:text-white">{staffData.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-indigo-100 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 mr-4">
                    <IconMessage className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">WhatsApp</p>
                    <p className="font-medium text-gray-800 dark:text-white">{staffData.whatsappNumber}</p>
                  </div>
                </div>
                {showroom && (
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-indigo-100 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 mr-4">
                      <IconMenuMailbox className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Showroom</p>
                      <p className="font-medium text-gray-800 dark:text-white">{showroom.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Content Area */}
          <div className="w-full lg:w-2/3 space-y-6">
            {/* Showroom Information Card */}
            {showroom && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Showroom Details</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Showroom Name</h4>
                      <p className="mt-1 text-gray-800 dark:text-white">{showroom.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</h4>
                      <p className="mt-1 text-gray-800 dark:text-white">{showroom.location}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Helpline</h4>
                      <p className="mt-1 text-gray-800 dark:text-white">{showroom.helpline}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Services</h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {showroom.services.serviceCenter.selected && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            Service Center
                          </span>
                        )}
                        {showroom.services.bodyShop.selected && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            Body Shop 
                          </span>
                        )}
                        {showroom.services.showroom.selected && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                            Showroom
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {showroom.image && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Showroom Image</h4>
                      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={`${CLOUD_IMAGE}${showroom.image}`}
                          alt={showroom.name}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Reward Points Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Reward Points</h3>
              </div>
              <div className="p-6">
                <div className="bg-indigo-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                  <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                    {staffData.rewardPoints || 0}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">Available Points</p>
                  <div className="mt-4">
                    <Link
                      to="/reward"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      Redeem Rewards
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;