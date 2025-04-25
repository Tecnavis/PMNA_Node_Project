import IconFile from '../../components/Icon/IconFile'
import Dropdown from '../../components/Dropdown'
import { useSelector } from 'react-redux'
import { IRootState } from '../../store'
import IconCaretDown from '../../components/Icon/IconCaretDown'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { useState, Fragment, useEffect } from 'react';
import RewardForm, { FormState, Reward } from './RewardForm'
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig'
import Swal from 'sweetalert2'
import IconStar from '../../components/Icon/IconStar'
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconPencil from '../../components/Icon/IconPencil';
import { CLOUD_IMAGE } from '../../constants/status'


export const REWAR_CATEGORYS = {
  Staff: "Staff",
  Showroom: "Showroom",
  ShowroomStaff: "Showroom Staff",
  Driver: "Driver"
}

function RewardsItem() {

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [rewardCategory, setRewardCategory] = useState<string>('');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardToEdit, setRewardToEdit] = useState<Reward | null>(null);

  const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

  //Fetch All rewards
  const fetchRewards = async () => {
    const params: { rewardFor?: string } = {};

    if (rewardCategory) {
      params.rewardFor = rewardCategory;
    }

    const response = await axios.get(`${BASE_URL}/reward`, { params });

    setRewards(response.data);
  };

  // Handle adding a new reward
  const handleAddReward = async (newReward: FormState) => {
    const { description, image, pointsRequired, name, category: rewardFor, stock, price } = newReward;

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('description', description);
      formData.append('pointsRequired', pointsRequired);
      formData.append('stock', stock);
      formData.append('rewardFor', rewardFor);
      if (image) formData.append('image', image);

      const response = await axios.post(`${BASE_URL}/reward`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 201) {
        fetchRewards()
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Reward added successfully.',
        });
      }
    } catch (error: any) {
      console.error('Error adding reward:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to add reward. Please try again.',
      });
    }
  };

  // Handle updating an existing reward
  const handleUpdateReward = async (updatedReward: FormState, id?: number) => {
    // setRewards(rewards.map((reward) => (reward._id === rewardToEdit?._id ? { ...reward, ...updatedReward } : reward)));
    const { description, image, pointsRequired, name, category: rewardFor, stock, price } = updatedReward;
    try {

      const formData = new FormData();
      formData.append('name', name || "");
      formData.append('price', price);
      formData.append('description', description);
      formData.append('pointsRequired', pointsRequired);
      formData.append('stock', stock);
      formData.append('rewardFor', rewardFor);
      if (image) formData.append('image', image);

      const response = await axios.put(`${BASE_URL}/reward/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200) {
        fetchRewards()
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Reward updated successfully.',
        });
      }
    } catch (error: any) {
      console.error('Error updated reward:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to updated reward. Please try again.',
      });
    }
  };

  // Handle deleting a reward
  const handleDeleteReward = async (_id: number) => {
    try {
      const response = await axios.delete(`${BASE_URL}/reward/${_id}`);

      if (response.status === 200) {
        fetchRewards()
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Reward deleted successfully.',
        });
      }
    } catch (error: any) {
      console.error('Error deleted reward:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to deleted reward. Please try again.',
      });
    }
  };

  // Open edit modal with reward data
  const openEditModal = (reward: Reward) => {
    setRewardToEdit(reward);
    setIsEditMode(true);
    setModalOpen(true);
  };

  // Close modal and reset form
  const closeModal = () => {
    setModalOpen(false);
    setIsEditMode(false);
    setRewardToEdit(null);
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setRewardCategory(category); // Update the state with the selected category
  };

  useEffect(() => {
    fetchRewards()
  }, [rewardCategory])

  return (
    <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
      <div className="panel">
        <div className='w-full flex justify-center items-center'>
          <div className=" mb-5 w-1/2">
            <h5 className="font-semibold text-lg dark:text-white-light">Rewards</h5>
          </div>
          <div className="w-1/2 flex md:items-center justify-end md:flex-row flex-col mb-4.5 gap-5">
            <div className="flex items-center flex-wrap">
              <button type="button" className="btn btn-primary btn-sm m-1" onClick={() => setModalOpen(true)}>
                <IconFile className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                Add New Reward
              </button>
              {/* Reward Add/Edit Modal */}
              <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={closeModal}>
                  <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="fixed inset-0 bg-black/60" />
                  </TransitionChild>
                  <div className="fixed inset-0 bg-[black]/60 z-[999]">
                    <div className="flex items-center justify-center min-h-screen px-4">
                      <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <DialogPanel className="panel border-0 p-0 rounded-lg overflow-hidden  w-full max-w-xl my-8 text-black dark:text-white-dark">
                          <RewardForm
                            isEditMode={isEditMode}
                            rewardToEdit={rewardToEdit}
                            onClose={closeModal}
                            onSubmit={isEditMode ? handleUpdateReward : handleAddReward}
                          />
                        </DialogPanel>
                      </TransitionChild>
                    </div>
                  </div>
                </Dialog>
              </Transition>
            </div>
            <div className="dropdown">
              <Dropdown
                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                button={
                  <>
                    <button type="button" className="btn btn-primary btn-sm m-1 flex gap-2">
                      {rewardCategory ? rewardCategory : "All Categories"}
                      <IconCaretDown className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                    </button>
                  </>
                }
              >
                <ul className="!min-w-[170px]">
                  <li>
                    <button type="button" onClick={() => handleCategoryChange('')}>
                      All Categories
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => handleCategoryChange('Showroom')}>
                      Showroom
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => handleCategoryChange('Driver')}>
                      Driver
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => handleCategoryChange('Staff')}>
                      Staff
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => handleCategoryChange('Showroom Staff')}>
                      Showroom Staff
                    </button>
                  </li>
                </ul>
              </Dropdown>
            </div>
          </div>
        </div>
        <div className="mb-5 mt-5">
          <div className='grid gap-5 grid-cols-1 ms:grid-cols-2 place-items-center sm:place-items-center  md:grid-cols-3 mb-2'>
            {
              rewards?.map((reward) => (
                <div className="mb-5 flex items-center">
                  <div className="max-w-[22rem] w-full bg-white shadow-[4px_6px_10px_-3px_#bfc9d4] rounded border border-white-light dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none">
                    <div className="py-7 px-6">
                      <div className="-mt-7 mb-7 -mx-6 rounded-tl rounded-tr h-[260px] overflow-hidden">
                        <img src={`${CLOUD_IMAGE}${reward.image}`} alt="profile" className="w-full h-full object-cover" />
                      </div>
                      <h5 className="text-[#3b3f5c] text-[15px] font-bold mb-4 dark:text-white-light">
                        {reward?.name || ""}
                      </h5>
                      <p className="text-white-dark">
                        {reward.description}
                      </p>
                      <div className="border-t flex justify-between items-center mt-4 pt-4 before:w-[250px] before:h-[1px] before:bg-white-light before:inset-x-0 before:top-0 before:absolute before:mx-auto dark:before:bg-[#1b2e4b]">
                        <div className='flex justify-start gap-4 w-1/2'>
                          <span className='flex justify-center gap-1 items-center'>
                            <IconStar className='text-yellow-500 size-4' />
                            <span>
                              {reward.pointsRequired || 0}
                            </span>
                          </span>
                          <span className='flex justify-center gap-3 items-center text-primary'>
                            &#8377;
                            {reward.price}
                          </span>
                        </div>
                        <div className='flex gap-4 w-1/2 justify-evenly border-l-2 items-center'>
                          <span onClick={() => openEditModal(reward)}>
                            <IconPencil className='text-primary' />
                          </span>
                          <span onClick={() => handleDeleteReward(reward._id)}>
                            <IconTrashLines className='text-red-500' />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default RewardsItem

