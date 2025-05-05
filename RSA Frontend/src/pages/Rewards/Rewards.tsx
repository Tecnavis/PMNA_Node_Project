import AnimateHeight from 'react-animate-height';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import IconCaretDown from '../../components/Icon/IconCaretDown';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import Driver from '../Driver/Driver';
import IconEye from '../../components/Icon/IconEye';
import { Showroom } from '../Showroom/Showroom';
import { ClientRewardDetails } from '../../interface/Rewards';
import { useNavigate } from 'react-router-dom';


type ClientCategory = 'Driver' | 'Showroom' | 'Marketing Executive' | 'ShowroomStaff';
// Corrected Interfaces

export interface Staff {
  _id: string;
  name: string;
  phoneNumber: string;
  rewardPoints?: number;
  showroomId?: {
    bookingPoint?: number;
    _id?: string;
  };
}


function Rewards() {

  const [active2, setActive2] = useState<string>('1');
  const [driverRewards, setDriverRewards] = useState<ClientRewardDetails[]>([])
  const [showRoomRewards, setShowRoom] = useState<ClientRewardDetails[]>([])
  const [showroomStaffRewards, setShowroomStaffRewards] = useState<ClientRewardDetails[]>([])
  const [visibleCategory, setVisibleCategory] = useState<ClientCategory | null>(null);
  const [customerRewards, setCustomerRewards] = useState<ClientCategory | null>(null);
  const [showroomPoints, setShowroomPoints] = useState("");
  const [showroomStaffPoints, setShowroomStaffPoints] = useState("");
  const [point, setPoint] = useState<number>(0)
  const [points, setPoints] = useState<{ showroomPoints: number, showroomStaffPoints: number }>(
    { showroomPoints: 0, showroomStaffPoints: 0 });
  const [showRoomBookingPoint, setShowRoomBookingPoint] = useState<{ bookingPoint: number; _id: string }>({
    bookingPoint: 0,
    _id: ''
  });
  const [inputValue, setInputValue] = useState("");
  const [nestedAccord, setNestedAccord] = useState("");

  const navigate = useNavigate()

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
    try {
      const response = await axiosInstance.get(`${BASE_URL}/showroom`);

      if (!response.data || !Array.isArray(response.data)) {
        console.error("Invalid showroom data received");
        return;
      }
      // Fetch staff data only once
      const staffData = await fetchStaff();

      // Map over showrooms and attach staff
      const formattedShowrooms = response.data.map((showroom: Showroom) => ({
        _id: showroom._id,
        name: showroom.name,
        rewardPoints: showroom.rewardPoints,
        bookingPoints: showroom.bookingPoints || 0,
        category: "Showroom",
        staff: staffData.filter((staff: Staff) => staff.showroomId === showroom._id) || [],
      }));
      // @ts-ignore
      setShowRoom(formattedShowrooms);
    } catch (error) {
      console.error("Error fetching showrooms:", error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await axiosInstance.get(`${BASE_URL}/showroom/showroom-staff`);

      if (!response.data || !Array.isArray(response.data.data)) {
        console.error("Invalid staff data received");
        return [];
      }

      const formattedData = response.data.data.map((staff: Staff) => ({
        _id: staff._id,
        name: staff.name,
        rewardPoints: staff.rewardPoints,
        bookingPoint: staff.showroomId?.bookingPoint || 0,
        showroomId: staff.showroomId?._id || 0,
        category: "ShowroomStaff",
        staff: [],
      }));

      setShowroomStaffRewards(formattedData);
      return formattedData;
    } catch (error) {
      console.error("Error fetching staff:", error);
      return [];
    }
  };

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
        { category: 'ShowroomStaff', rewards: showroomStaffRewards },
        { category: 'Marketing Executive', rewards: [] },
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

      setInputValue("");

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

  const handleUpdatePoints = async () => {
    const requestData = {
      showroomBookingPoints: showroomPoints ? parseInt(showroomPoints) : undefined,
      showroomStaffBookingPoints: showroomStaffPoints ? parseInt(showroomStaffPoints) : undefined,
    };

    try {
      const response = await axiosInstance.put(`${BASE_URL}/point/showroom`, requestData)

      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Showroom points updated successfully!",
        });
        setPoints({ showroomPoints: requestData.showroomBookingPoints || points.showroomPoints, showroomStaffPoints: requestData.showroomStaffBookingPoints || points.showroomStaffPoints })
        setShowroomPoints("");
        setShowroomStaffPoints("");
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: response.data.message || "Failed to update points.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong! Please try again.",
      });
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDrivers()
    fetchShowRooms()
    fetchStaff()

    async function fetchShowroomPoints() {
      const res = await axiosInstance.get(`${BASE_URL}/point/showroom`)
      const data = res.data

      setPoints({
        showroomPoints: data.bookingPointsForShowroom,
        showroomStaffPoints: data.bookingPointsForShowroomStaff
      })
      setShowRoomBookingPoint({ _id: data._id, bookingPoint: data.bookingPoints })
      setPoint(data.bookingPoints)
    }
    fetchShowroomPoints()
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
                { category: 'ShowroomStaff', rewardPoints: 100 },
                { category: 'Marketing Executive', rewardPoints: 100 },
              ].map((client, index) => (
                <div
                  key={index}
                  className="border border-gray-300 rounded-lg p-5 w-full sm:w-[calc(100%-40px)] md:w-[calc(50%-40px)] xl:w-[calc(25%-40px)] shadow-md transition-transform duration-200 hover:scale-105 gap-2  h-[320px] flex flex-col justify-between"
                >
                  <div className="flex justify-center text-center h-8 ">
                    <h3 className="font-bold text-xl">{client.category}</h3>
                  </div>
                  <div className="text-center h-8">
                    {['Showroom'].includes(client.category) && (
                      <p>Booking Point: {point}</p>
                    )}
                    {['ShowroomStaff'].includes(client.category) && (
                      <p>Booking Point Staff: {points.showroomPoints}</p>
                    )}
                    {['ShowroomStaff'].includes(client.category) && (
                      <p>Booking Point For <br /> Showroom: {points.showroomStaffPoints}</p>
                    )}
                  </div>
                  {/* Show input fields for categories other than 'Driver' */}
                  {client.category !== 'Driver' && client.category !== 'ShowroomStaff' && client.category !== 'Marketing Executive' && (
                    <div>
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                          setShowRoomBookingPoint({
                            ...showRoomBookingPoint,
                            bookingPoint: Number(e.target.value)
                          })
                          setInputValue(e.target.value)
                        }
                        }
                        className="border rounded p-2 w-full"
                        placeholder="Enter showroom points"
                      />
                    </div>
                  )}
                  {client.category === 'Marketing Executive' && (
                    <div>
                      <input
                        type="text"
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
                      <input
                        type="text"
                        className="border rounded p-2 w-full mt-1"
                        placeholder="Points for showroom"
                        value={showroomStaffPoints}
                        onChange={(e) => setShowroomStaffPoints(e.target.value)}
                      />
                      <input
                        type="text"
                        className="border rounded p-2 w-full mt-1"
                        placeholder="Points for Showroostaff"
                        value={showroomPoints}
                        onChange={(e) => setShowroomPoints(e.target.value)}
                      />
                      <button
                        className="mt-2 w-full bg-blue-500 text-white text-sm rounded-md py-1.5"
                        onClick={handleUpdatePoints}>
                        Update
                      </button>
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
              {getRewardsList().map(({ category, rewards }, index) => (
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
                          {rewards.map((reward, index) => (<>
                            <li className='text-gray-800 bg-gray-200 p-5 rounded sm:flex justify-between'>
                              <p className='sm:text-left text-center sm:font-normal  underline sm:no-underline'>{reward.name}</p>
                              <div className='flex flex-col sm:flex-row gap-3 text-center sm:text-nowrap'>
                                {
                                  reward.category === "Showroom" && (<>
                                    <span className='mt-1.5'>Reward Points : {reward.bookingPoint || 0}</span>
                                    <div className="hidden sm:inline-block  h-[30px] min-h-[1em] w-0.5 self-stretch bg-gray-600 dark:bg-white/10"></div>
                                  </>
                                  )
                                }
                                <button type="button">Points : {reward.rewardPoints}</button>
                                <button
                                  onClick={() => navigate(`/reward-details?userType=${active2.split(' ')[0]}&id=${reward._id}`, {
                                    replace: true
                                  })}
                                >
                                  <IconEye className='text-purple-500 hover:cursor-pointer m-auto' />
                                </button>
                                {
                                  reward.category === "Showroom" && (<>
                                    <button onClick={() => setNestedAccord(reward.name)}>
                                      <IconCaretDown className='text-black sm:ml-5 m-auto sm:m-0' />
                                    </button>
                                  </>
                                  )
                                }
                              </div>
                            </li>
                            {reward.category === 'Showroom' && <AnimateHeight duration={300} height={nestedAccord === reward.name ? 'auto' : 0}>
                              <div className="pl-5 p-1 text-[13px] border-[#d3d3d3] dark:border-[#1b2e4b]">
                                <ul className="space-y-1">
                                  {reward.staff.length > 0 ? (
                                    reward.staff.map((staff: Staff) => (
                                      <li key={staff._id} className="text-gray-800 bg-gray-100 p-5 rounded flex justify-between text-sm">
                                        <p>{staff.name}</p>
                                        <div className="flex gap-3">
                                          <button type="button">Points : {staff.rewardPoints || 0}</button>
                                          <IconEye className="text-purple-500 hover:cursor-pointer" />
                                        </div>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-gray-800 bg-gray-100 p-5 rounded flex justify-between text-sm">
                                      <p>No staff found for this showroom.</p>
                                    </li>
                                  )}
                                </ul>
                              </div >
                            </AnimateHeight>
                            }
                          </>))}
                        </ul>
                      </div>
                    </AnimateHeight >
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div >
    </div >
  )
}

export default Rewards