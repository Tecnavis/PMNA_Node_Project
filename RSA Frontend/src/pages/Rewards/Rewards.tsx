import AnimateHeight from 'react-animate-height';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import IconCaretDown from '../../components/Icon/IconCaretDown';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import Driver from '../Driver/Driver';
import IconEye from '../../components/Icon/IconEye';
import { Showroom } from '../Showroom/Showroom';


type ClientCategory = 'Driver' | 'Showroom' | 'Marketing Executive' | 'ShowroomStaff';
interface ClientRewardDetails {
  _id: string;
  name: string;
  rewardPoints: number;
  companyName?: string;
  bookingPoint?: number;
  category?: string;
  staff: Staff[];
}

interface Staff {
  _id: string; // Add this line
  name: string;
  phoneNumber: string;
  rewardPoints?: number;
}


function Rewards() {

  const [active2, setActive2] = useState<string>('1');
  const [driverRewards, setDriverRewards] = useState<ClientRewardDetails[]>([])
  const [showRoomRewards, setShowRoom] = useState<ClientRewardDetails[]>([])
  const [showroomStaffRewards, setShowroomStaffRewards] = useState<ClientRewardDetails[]>([])
  const [visibleCategory, setVisibleCategory] = useState<ClientCategory | null>(null);
  const [customerRewards, setCustomerRewards] = useState<ClientCategory | null>(null);

  const [point, setPoint] = useState<number>(0)
  const [showRoomBookingPoint, setShowRoomBookingPoint] = useState<{ bookingPoint: number; _id: string }>({
    bookingPoint: 0,
    _id: ''
  });

  const fetchDrivers = async () => {
    const response = await axiosInstance.get(`${BASE_URL}/driver`)
    setDriverRewards(response.data.map((driver: Driver) => {
      return {
        _id: driver._id,
        name: driver.name,
        rewardPoints: driver.rewardPoints,
        companyName: "RSA",
        staff: []
      }
    }))
  }

  const fetchShowRooms = async () => {
    const response = await axiosInstance.get(`${BASE_URL}/showroom`)
    setShowRoom(response.data.map((showroom: Showroom) => {
      return {
        _id: showroom._id,
        name: showroom.name,
        rewardPoints: showroom.rewardPoints,
        bookingPoints: showroom.bookingPoints,
        staff: []
      }
    }))
  }

  const fetchStaff = async () => {
    // const response = await axiosInstance.get(`${BASE_URL}/staff`)
    // console.log(response.data)
  }

  const togglePara2 = (value: string) => {
    console.log(value)
    setActive2((oldValue) => {
      return oldValue === value ? '' : value;
    });
  };

  const getCategoryRewards = (category: ClientCategory): ClientRewardDetails[] => {
    switch (category) {
      case 'Driver':
        return driverRewards;
      case 'Showroom':
        return showRoomRewards;
      case 'ShowroomStaff':
        return showroomStaffRewards;

      // case 'Marketing Executive':
      //     return customerRewards;
      default:
        return [];
    }
  };

  const getRewardsList = (): { category: ClientCategory; rewards: ClientRewardDetails[] }[] => {
    if (!visibleCategory) {
      return [
        { category: 'Driver', rewards: driverRewards },
        { category: 'Showroom', rewards: showRoomRewards },
        { category: 'Marketing Executive', rewards: [] },
        { category: 'ShowroomStaff', rewards: [] },
      ];
    } else {
      return [{ category: visibleCategory, rewards: getCategoryRewards(visibleCategory) }];
    }
  };

  const updatePoint = async () => {
    try {
      const res = await axiosInstance.put(
        `${BASE_URL}/point`,
        { point: showRoomBookingPoint?.bookingPoint },
        { params: { id: showRoomBookingPoint?._id } }
      );

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Point updated successfully.',
      });

      setPoint(showRoomBookingPoint?.bookingPoint);
    } catch (error: any) {
      console.error('Error updating point:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.error || 'Failed to update point. Please try again.',
      });
    }
  };

  useEffect(() => {
    fetchDrivers()
    fetchShowRooms()
    fetchStaff()

    async function fetchBookingPoints() {
      const res = await axiosInstance.get(`${BASE_URL}/point`)
      const data = res.data.point

      setShowRoomBookingPoint({ _id: data._id, bookingPoint: data.bookingPoint })
      setPoint(data.bookingPoint)

    }
    fetchBookingPoints()
  }, [])

  return (
    <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
      <div className="panel">
        <div className='w-full'>
          <div className=" mb-5 w-1/2">
            <h5 className="font-semibold text-lg dark:text-white-light">Client Rewards</h5>
          </div>
          <div className="mt-10">
            <div className="flex flex-wrap gap-10 justify-center">
              {[
                { category: 'Driver', rewardPoints: 100 },
                { category: 'Showroom', rewardPoints: 10 },
                { category: 'Marketing Executive', rewardPoints: 100 },
                { category: 'ShowroomStaff', rewardPoints: 100 },
              ].map((client, index) => (
                <div
                  key={index}
                  className="border border-gray-300 rounded-lg p-5 w-full sm:w-[calc(100%-40px)] md:w-[calc(50%-40px)] xl:w-[calc(25%-40px)] shadow-md transition-transform duration-200 hover:scale-105 gap-2  h-[280px] flex flex-col justify-between"
                >
                  <div className="flex justify-center text-center h-8 ">
                    <h3 className="font-bold text-xl">{client.category}</h3>
                  </div>
                  <div className="text-center h-6">
                    {['Showroom'].includes(client.category) && (
                      <p>Booking Point: {point}</p>
                    )}
                    {['ShowroomStaff'].includes(client.category) && (
                      <p>Booking Point: 40</p>
                    )}
                    {['ShowroomStaff'].includes(client.category) && (
                      <p>Booking Point For Showroom: 30</p>
                    )}
                  </div>
                  {/* Show input fields for categories other than 'Driver' */}
                  {client.category !== 'Driver' && client.category !== 'ShowroomStaff' && (
                    <div>
                      <input
                        type="text"
                        onChange={(e) =>
                          setShowRoomBookingPoint({
                            ...showRoomBookingPoint,
                            bookingPoint: Number(e.target.value)
                          })
                        }
                        className="border rounded p-2 w-full"
                        placeholder="Enter points for showroom"
                      />
                    </div>
                  )}

                  {client.category !== 'Driver' && client.category !== 'ShowroomStaff' && (
                    <div>
                      <button className="mt-1 w-full bg-blue-500 text-white text-sm rounded-md py-1.5" onClick={updatePoint}>Update</button>
                      <button className="w-full mt-2 bg-gray-200 text-gray-500 text-sm rounded-md py-1.5" onClick={() => togglePara2(client.category)}>View Rewards</button>
                    </div>
                  )}

                  <div className="w-full">
                    {/* Show two input fields for 'ShowroomStaff' */}
                    {client.category === 'ShowroomStaff' && (<>
                      <input type="text" className="border rounded p-2 w-full mt-1" placeholder="Enter points for Showroo staff" />
                      <input type="text" className="border rounded p-2 w-full mt-1" placeholder="Enter points for showroom" />
                      <button className="mt-2 w-full bg-blue-500 text-white text-sm rounded-md py-1.5">Update</button>
                      <button className="w-full mt-2 bg-gray-200 text-gray-500 text-sm rounded-md py-1.5" onClick={() => togglePara2(client.category)}>View Rewards</button>
                    </>
                    )}

                    {client.category === 'Driver' && (
                      <button className="w-full mt-2 bg-gray-200 text-gray-500 text-sm rounded-md py-1.5" onClick={() => togglePara2(client.category)}>View Rewards</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards */}
          <div className="mx-5 mt-10">
            <div className="space-y-2 font-semibold">
              {
                getRewardsList().map(({ category, rewards }, index) => (
                  <div className="border border-[#d3d3d3] dark:border-[#1b2e4b] rounded" key={category}>
                    <button
                      type="button"
                      className={`p-4 w-full flex items-center text-gray-500 dark:bg-[#1b2e4b] h-14`}
                      onClick={() => togglePara2(category)}
                    >
                      {category} Rewards
                      <div className={`ltr:ml-auto rtl:mr-auto `}>
                        <IconCaretDown className='text-black' />
                      </div>
                    </button>
                    <div>
                      <AnimateHeight duration={300} height={active2 === category ? 'auto' : 0}>
                        <div className="p-4 text-[13px] border-t border-[#d3d3d3] dark:border-[#1b2e4b]">
                          <ul className="space-y-1">
                            {
                              rewards.map((reward, index) => (
                                <li className='text-gray-800 bg-gray-200 p-5 rounded flex justify-between text-sm'>
                                  <p>{reward.name}</p>
                                  <div className='flex gap-3'>
                                    <button type="button">{reward.rewardPoints} pts</button>
                                    <IconEye className='text-purple-500' />
                                  </div>
                                </li>
                              ))
                            }
                          </ul>
                        </div>
                      </AnimateHeight>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Rewards
