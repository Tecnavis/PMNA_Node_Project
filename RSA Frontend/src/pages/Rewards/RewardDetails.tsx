import React from 'react'
import { BASE_URL } from '../../config/axiosConfig'
import IconPencil from '../../components/Icon/IconPencil'
import IconTrashLines from '../../components/Icon/IconTrashLines'
import IconStar from '../../components/Icon/IconStar'
import IconFile from '../../components/Icon/IconFile'

const RewardDetails = () => {
    return (
        <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
            <div className="panel">
                <div className='w-full flex justify-center items-center'>
                    <div className=" mb-5 w-1/2">
                        <h5 className="font-semibold text-xl dark:text-white-light">Welcome, Sample</h5>
                    </div>
                    <div className="w-1/2 flex md:items-center justify-end md:flex-row flex-col mb-4.5 gap-5">
                        <div className="flex items-center flex-wrap">
                            <span
                                className="btn btn-primary btn-sm m-1"
                            >
                                <IconStar className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Points : 100
                            </span>
                        </div>
                        <div className="dropdown">
                        </div>
                    </div>
                </div>
                <div className="mb-5 mt-3">
                    <p className='font-semibold text-lg dark:text-white-light mb-5 text-gray-600'>Redeemable Products
                    </p>
                    <div className='grid gap-5 grid-cols-1 ms:grid-cols-2 place-items-center sm:place-items-center  md:grid-cols-3 mb-2'>
                        {
                            [1, 2]?.map((reward) => (
                                <div className="mb-5 flex items-center">
                                    <div className="max-w-[22rem] w-full bg-white shadow-[4px_6px_10px_-3px_#bfc9d4] rounded border border-white-light dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none">
                                        <div className="py-7 px-6">
                                            <div className="-mt-7 mb-7 -mx-6 rounded-tl rounded-tr h-[260px] overflow-hidden">
                                                <img src={`${BASE_URL}/images/1742453053052-947465967.jpeg`} alt="profile" className="w-full h-full object-cover" />
                                            </div>
                                            <h5 className="text-[#3b3f5c] text-[15px] font-bold mb-4 dark:text-white-light">
                                                {reward?.name || "sdfsa"}
                                            </h5>
                                            <p className="text-white-dark">
                                                {reward.description || "Dummy text is text that is used in the publishing industry or by web designers to occupy the space which will later be filled with 'real' content. This is required when, for example, the final text is not yet available. Dummy text is also known as 'fill text'."}
                                            </p>
                                            <div className="border-t flex justify-between items-center mt-4 pt-4 before:w-[250px] before:h-[1px] before:bg-white-light before:inset-x-0 before:top-0 before:absolute before:mx-auto dark:before:bg-[#1b2e4b]">
                                                <div className='flex justify-start gap-4 w-1/2'>
                                                    <span className='flex justify-center gap-1 items-center'>
                                                        <IconStar className='text-yellow-500 size-4' />
                                                        <span>
                                                            {reward.pointsRequired || 100}
                                                        </span>
                                                    </span>
                                                    <span className='flex justify-center gap-3 items-center text-primary'>
                                                        &#8377;
                                                        {reward.price || 100}
                                                    </span>
                                                </div>
                                                <div className='flex gap-4 w-1/2 justify-evenly border-l-2 items-center'>
                                                    <span
                                                    //  onClick={() => openEditModal(reward)}
                                                    >
                                                        <IconPencil className='text-primary' />
                                                    </span>
                                                    <span
                                                    //  onClick={() => handleDeleteReward(reward._id)}
                                                    >
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
                <div className="mb-5 mt-3">
                    <p className='font-semibold text-lg dark:text-white-light mb-5 text-gray-600'>Previous Redemption History
                    </p>
                    <div className='grid gap-5 grid-cols-1 ms:grid-cols-2 place-items-center sm:place-items-center  md:grid-cols-3 mb-2'>
                        {
                            [1, 2]?.map((reward) => (
                                <div className="mb-5 flex items-center">
                                    <div className="max-w-[22rem] w-full bg-white shadow-[4px_6px_10px_-3px_#bfc9d4] rounded border border-white-light dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none">
                                        <div className="py-7 px-6">
                                            <div className="-mt-7 mb-7 -mx-6 rounded-tl rounded-tr h-[260px] overflow-hidden">
                                                <img src={`${BASE_URL}/images/1742453053052-947465967.jpeg`} alt="profile" className="w-full h-full object-cover" />
                                            </div>
                                            <h5 className="text-[#3b3f5c] text-[15px] font-bold mb-4 dark:text-white-light">
                                                {reward?.name || "sdfsa"}
                                            </h5>
                                            <p className="text-white-dark">
                                                {reward.description || "Dummy text is text that is used in the publishing industry or by web designers to occupy the space which will later be filled with 'real' content. This is required when, for example, the final text is not yet available. Dummy text is also known as 'fill text'."}
                                            </p>
                                            <div className="border-t flex justify-between items-center mt-4 pt-4 before:w-[250px] before:h-[1px] before:bg-white-light before:inset-x-0 before:top-0 before:absolute before:mx-auto dark:before:bg-[#1b2e4b]">
                                                <div className='flex justify-start gap-4 w-1/2'>
                                                    <span className='flex justify-center gap-1 items-center'>
                                                        <IconStar className='text-yellow-500 size-4' />
                                                        <span>
                                                            {reward.pointsRequired || 100}
                                                        </span>
                                                    </span>
                                                    <span className='flex justify-center gap-3 items-center text-primary'>
                                                        &#8377;
                                                        {reward.price || 100}
                                                    </span>
                                                </div>
                                                <div className='flex gap-4 w-1/2 justify-evenly border-l-2 items-center'>
                                                    <span
                                                    //  onClick={() => openEditModal(reward)}
                                                    >
                                                        <IconPencil className='text-primary' />
                                                    </span>
                                                    <span
                                                    //  onClick={() => handleDeleteReward(reward._id)}
                                                    >
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

export default RewardDetails
