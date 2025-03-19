import React from 'react'
import { BsBuildingAdd } from 'react-icons/bs'
import { Link } from 'react-router-dom'
import IconFile from '../../components/Icon/IconFile'
import IconPrinter from '../../components/Icon/IconPrinter'
import Dropdown from '../../components/Dropdown'
import { useSelector } from 'react-redux'
import { IRootState } from '../../store'
import IconCaretDown from '../../components/Icon/IconCaretDown'

const REWAR_CATEGORYS = {
  Staff: "Staff",
  Showroom: "Showroom",
  ShowroomStaff: "Showroom Staff",
  Driver: "Driver"
}

function RewardsItem() {

  const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;


  return (
    <div className="grid xl:grid-cols-1 gap-6 grid-cols-1">
      <div className="panel">
        <div className='w-full flex justify-center items-center'>
          <div className=" mb-5 w-1/2">
            <h5 className="font-semibold text-lg dark:text-white-light">Rewards</h5>
          </div>
          <div className="w-1/2 flex md:items-center justify-end md:flex-row flex-col mb-4.5 gap-5">
            <div className="flex items-center flex-wrap">
              <button type="button" className="btn btn-primary btn-sm m-1" >
                <IconFile className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                Add New Reward
              </button>
            </div>
            <div className="dropdown">
              <Dropdown
                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                button={
                  <>
                    <button className='btn btn-primary rounded-lg m-1 font-thin'>
                      All Categories
                      <IconCaretDown />
                    </button>
                  </>
                }
              >
                <ul className="!min-w-[170px]">
                  <li>
                    <button type="button">
                      All Categories
                    </button>
                  </li>
                  <li>
                    <button type="button">
                      Showroom
                    </button>
                  </li>
                  <li>
                    <button type="button">
                      Driver
                    </button>
                  </li>
                  <li>
                    <button type="button">
                      Staff
                    </button>
                  </li>
                  <li>
                    <button type="button">
                      Showroom Staff
                    </button>
                  </li>
                </ul>
              </Dropdown>
            </div>
          </div>
        </div>
        <div className="table-responsive mb-5">
          <div className='grid gap-5 grid-cols-3 mb-2'>
            {
              [...Array(10)].map(() => (
                <div className="mb-5 flex items-center">
                  <div className="max-w-[22rem] w-full bg-white shadow-[4px_6px_10px_-3px_#bfc9d4] rounded border border-white-light dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none">
                    <div className="py-7 px-6">
                      <div className="-mt-7 mb-7 -mx-6 rounded-tl rounded-tr h-[260px] overflow-hidden">

                        <img src="/assets/images/profile-28.jpeg" alt="profile" className="w-full h-full object-cover" />

                      </div>
                      <p className="text-primary text-xs mb-1.5 font-bold">
                        25 Sep 2020
                      </p>
                      <h5 className="text-[#3b3f5c] text-[15px] font-bold mb-4 dark:text-white-light">
                        How to Start a Blog in 5 Easy Steps.
                      </h5>
                      <p className="text-white-dark">
                        Vestibulum vestibulum tortor ut eros tincidunt, ut rutrum elit volutpat.
                      </p>
                      <div className="relative flex justify-between mt-6 pt-4 before:w-[250px] before:h-[1px] before:bg-white-light before:inset-x-0 before:top-0 before:absolute before:mx-auto dark:before:bg-[#1b2e4b]">
                        sd
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
      {/* <ConfirmationModal
        isVisible={isModalVisible}
        onConfirm={() => {
          if (itemToDelete) {
            handleDelete(itemToDelete);
          }
        }}
        onCancel={closeModal}
      /> */}
    </div>
  )
}

export default RewardsItem

