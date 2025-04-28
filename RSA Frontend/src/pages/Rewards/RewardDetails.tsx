import React, { useEffect, useState } from 'react';
import { FiAward, FiGift, FiClock, FiUser, FiDollarSign } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { getRedeemedHistory, getRedemableRewads } from '../../services/rewardService';
import { useLocation } from 'react-router';
import { fetchDrivers, fetchShowrooms, fetchShowroomStaff } from '../../services/userService';
import { CLOUD_IMAGE } from '../../constants/status';
import { PhoneCallIcon, User2Icon } from 'lucide-react';
import defaultImage from '../../assets/images/user-front-side-with-white-background.jpg';
import { formattedTime } from '../../utils/dateUtils';

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  stock: number;
  TotalRedeem: number;
  percentage: number;
  rewardFor: number;
  price: number;
  image: string;
}

interface User {
  name: string,
  _id: string,
  image: string,
  phone: string,
  rewardPoints: number
}

interface Redemption {
  image: string;
  id: string;
  reward: Reward;
  createdAt: string;
  updatedAt: string;
  redeemByModel: string;
}

const RewardDetails: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [redemableRewards, setRedemableRewards] = useState<Reward[]>([]);
  const [redemptionHistory, setRedemptionHistory] = useState<Redemption[]>([]);
  const [userData, setUserData] = useState<User | null>(null);


  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const userId = queryParams.get('id')
  const userType = queryParams.get('userType')

  const fetchRedemableRewards = async () => {
    try {
      const data = await getRedemableRewads(userType || '', userData?.rewardPoints || 0)
      setRedemableRewards(data)
    } catch (error) {
      console.log(error)
    }
  }

  const fetchHistory = async () => {
    try {
      const data = await getRedeemedHistory(userType || '', userData?._id || '')
      setRedemptionHistory(data)
    } catch (error) {
      console.log(error)
    }
  }

  const fetchUser = async () => {
    try {
      let data

      if (userType === 'Driver') {
        data = await fetchDrivers(userId || '')
      } else if (userType === "Showroom") {
        data = await fetchShowrooms(userId || '')
      } else {
        data = await fetchShowroomStaff(userId || '')
      }
      // @ts-ignore
      setUserData(data || [])
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])
  useEffect(() => {
    fetchRedemableRewards()
    fetchHistory()
  }, [userData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Rewards</h1>
          <p className="text-gray-600">Earned through your excellent work</p>
        </div>

        {/* Driver Profile and Points Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center">
            <div className="flex items-center mb-4 md:mb-0 md:mr-6">
              {
                <img
                  src={`${CLOUD_IMAGE}${userData?.image}` }
                  alt={defaultImage}
                  onError={(e) => { e.currentTarget.src = defaultImage; }}
                  className="w-16 h-16 rounded-full border-4 border-red-400 mr-4"
                />
              }
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{userData?.name}</h2>
                <div className="flex items-center text-sm text-gray-600">
                  {
                    userData?.phone && <>
                      <PhoneCallIcon className="mr-1" size={12} />
                      <span>{userData?.phone}</span>
                    </>
                  }
                </div>
              </div>
            </div>

            <div className="flex-1 bg-gradient-to-r from-red-400 to-red-500 rounded-xl p-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Total Points Earned</p>
                  <h3 className="text-3xl font-bold flex items-center">
                    <FiAward className="mr-2" />
                    {userData?.rewardPoints || 0}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rewards Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${activeTab === 'available' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('available')}
            >
              <div className="flex items-center justify-center">
                <FiGift className="mr-2" />
                Redeemable Rewards
              </div>
            </button>
            <button
              className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${activeTab === 'history' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('history')}
            >
              <div className="flex items-center justify-center">
                <FiClock className="mr-2" />
                Redemption History
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'available' ? (
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Redeem Your Points</h3>
                {
                  redemableRewards.length < 1 &&  <div className="text-center py-12">
                  <FiClock className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500">No redemable Rewards</p>
                </div>
                }
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {redemableRewards?.map((reward) => (
                    <motion.div
                      key={reward.id}
                      whileHover={{ y: -5 }}
                      className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="bg-gray-50 p-4 flex justify-center">
                        <img
                          src={`${CLOUD_IMAGE}${reward?.image}`}
                          alt={reward.name} className="h-24 object-contain" />
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-lg text-gray-800">{reward.name}</h4>
                        <p className="text-gray-600 text-sm mt-1 mb-3">{reward.description}</p>
                        <div className="flex justify-between items-center mt-4">
                          <div className="flex items-center text-red-600 font-medium">
                            <FiAward className="mr-1" />
                            <span>{reward.pointsRequired} pts</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Your Redemption History</h3>
                {redemptionHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FiClock className="mx-auto text-4xl text-gray-400 mb-4" />
                    <p className="text-gray-500">No redemption history yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {redemptionHistory.map((redemption) => (
                      <div key={redemption.id} className="border rounded-lg p-4 flex items-start">
                        <div className="bg-gray-100 p-3 rounded-lg mr-4">
                          <img
                            src={`${CLOUD_IMAGE}${redemption?.image || ''}`}
                            alt={redemption.reward.name} className="h-12 w-12 object-contain" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="font-medium text-gray-800">{redemption.reward.name}</h4>
                            <span className={`text-sm px-2 py-1 rounded-full bg-green-100 text-green-800`}>
                              Redeemed
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{redemption.reward.description}</p>
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center text-sm text-gray-500">
                              <FiClock className="mr-1" />
                              <span>Redeemed on {new Date(redemption.createdAt).toLocaleDateString()}, {formattedTime(redemption.createdAt)}</span>
                            </div>
                            <div className="text-sm font-medium text-gray-700">
                              -{redemption.reward.pointsRequired} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardDetails;