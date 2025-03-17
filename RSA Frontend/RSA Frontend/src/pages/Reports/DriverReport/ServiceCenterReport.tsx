
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import Dropdown from '../../../components/Dropdown';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { useEffect, useState } from 'react';
import IconPencilPaper from '../../../components/Icon/IconPencilPaper';
import IconCoffee from '../../../components/Icon/IconCoffee';
import IconCalendar from '../../../components/Icon/IconCalendar';
import IconMapPin from '../../../components/Icon/IconMapPin';
import IconMail from '../../../components/Icon/IconMail';
import IconPhone from '../../../components/Icon/IconPhone';
import IconTwitter from '../../../components/Icon/IconTwitter';
import IconDribbble from '../../../components/Icon/IconDribbble';
import IconGithub from '../../../components/Icon/IconGithub';
import IconShoppingBag from '../../../components/Icon/IconShoppingBag';
import IconTag from '../../../components/Icon/IconTag';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import IconClock from '../../../components/Icon/IconClock';
import IconHorizontalDots from '../../../components/Icon/IconHorizontalDots';
import axios from 'axios';

interface Showroom {
  _id: string;
  name: string;
  showroomId: string;
  description?: string;
  location: string;
  latitudeAndLongitude: string;
  image?: string;
  cashInHand?: number; 

  services: {
    serviceCenter: {
      selected: boolean;
      amount: number | null;
    };
    bodyShop: {
      selected: boolean;
      amount: number | null;
    };
    showroom: {
      selected: boolean;
    };
  };
  // Add other fields if needed (for example, a cashInHand-like property if applicable)
}

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [showroom, setShowroom] = useState<Showroom | null>(null);

  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setPageTitle('Showroom Profile'));
  }, [dispatch]);

  const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';

  // Check for token and set axios header
  const gettingToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      navigate('/auth/boxed-signin');
      console.log('Token not found');
    }
  };

  // Fetch showroom profile details from backend
  const getShowroom = async () => {
    try {
      const response = await axios.get(`${backendUrl}/showroom/${id}`);
      const data = response.data;
      setShowroom(data);
    } catch (error) {
      console.error('Error fetching showroom:', error);
    }
  };

  useEffect(() => {
    gettingToken();
    getShowroom();
  }, [id]);

  return (
    <div>
      <div className="pt-5">
        {/* Top Section: Profile Image, Name, and Basic Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 w-full">
          {/* Profile Section */}
          <div className="panel w-full">
            <div className="flex items-center justify-between mb-5">
              <h5 className="font-semibold text-lg dark:text-white-light">Showroom Details</h5>
            </div>
            <div className="mb-5">
              <div className="flex flex-col justify-center items-center">
                <img
                  src={`${backendUrl}/images/${showroom?.image}`}
                  alt="Showroom"
                  className="w-24 h-24 rounded-full object-cover mb-5"
                />
                <p className="font-semibold text-primary text-xl">{showroom?.name}</p>
                <span className="whitespace-nowrap" dir="ltr">
                  {showroom?.showroomId}
                </span>
                <span className="whitespace-nowrap mt-1" dir="ltr">
                  <IconMapPin className="inline mr-1" />
                  {showroom?.location}
                </span>
              </div>
            </div>
 {/* Cash in Hand Section */}
 <div className="panel w-full flex flex-col items-center justify-center">
        <h5 className="font-semibold text-lg dark:text-white-light mb-3">Net Total Amount in Hand</h5>
        <p className="text-2xl font-bold text-primary">₹{showroom?.cashInHand || 0}</p>
    </div>
</div>


          {/* Example Financial or Status Section (Modify as needed) */}
          <div className="panel w-full flex flex-col items-center justify-center">
            <h5 className="font-semibold text-lg dark:text-white-light mb-3">Plan / Subscription</h5>
            <p className="text-2xl font-bold text-primary">Premium Plan</p>
          </div>
        </div>

        {/* Additional Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Summary Section */}
          <div className="panel">
            <div className="mb-5">
              <h5 className="font-semibold text-lg dark:text-white-light">Summary</h5>
            </div>
            <div className="space-y-4">
              <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                <div className="flex items-center justify-between p-4 py-2">
                  <div className="grid place-content-center w-9 h-9 rounded-md bg-secondary-light dark:bg-secondary text-secondary dark:text-secondary-light">
                    <IconShoppingBag />
                  </div>
                  <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                    <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                      Service Income
                      <span className="block text-base text-[#515365] dark:text-white-light">$92,600</span>
                    </h6>
                    <p className="ltr:ml-auto rtl:mr-auto text-secondary">90%</p>
                  </div>
                </div>
              </div>
              <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                <div className="flex items-center justify-between p-4 py-2">
                  <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                    <IconTag />
                  </div>
                  <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                    <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                      Profit
                      <span className="block text-base text-[#515365] dark:text-white-light">$37,515</span>
                    </h6>
                    <p className="ltr:ml-auto rtl:mr-auto text-info">65%</p>
                  </div>
                </div>
              </div>
              <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                <div className="flex items-center justify-between p-4 py-2">
                  <div className="grid place-content-center w-9 h-9 rounded-md bg-warning-light dark:bg-warning text-warning dark:text-warning-light">
                    <IconCreditCard />
                  </div>
                  <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                    <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                      Expenses
                      <span className="block text-base text-[#515365] dark:text-white-light">$55,085</span>
                    </h6>
                    <p className="ltr:ml-auto rtl:mr-auto text-warning">80%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription / Plan Details Section */}
          <div className="panel">
            <div className="flex items-center justify-between mb-10">
              <h5 className="font-semibold text-lg dark:text-white-light">Pro Plan</h5>
              <button className="btn btn-primary">Renew Now</button>
            </div>
            <div className="group">
              <ul className="list-inside list-disc text-white-dark font-semibold mb-7 space-y-2">
                <li>10,000 Monthly Visitors</li>
                <li>Unlimited Reports</li>
                <li>2 Years Data Storage</li>
              </ul>
              <div className="flex items-center justify-between mb-4 font-semibold">
                <p className="flex items-center rounded-full bg-dark px-2 py-1 text-xs text-white-light font-semibold">
                  <IconClock className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                  5 Days Left
                </p>
                <p className="text-info">$25 / month</p>
              </div>
              <div className="rounded-full h-2.5 p-0.5 bg-dark-light overflow-hidden mb-5 dark:bg-dark-light/10">
                <div
                  className="bg-gradient-to-r from-[#f67062] to-[#fc5296] w-full h-full rounded-full relative"
                  style={{ width: '65%' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Payment History Section */}
          <div className="panel">
            <div className="flex items-center justify-between mb-5">
              <h5 className="font-semibold text-lg dark:text-white-light">Payment History</h5>
            </div>
            <div>
              <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                <div className="flex items-center justify-between py-2">
                  <h6 className="text-[#515365] font-semibold dark:text-white-dark">
                    March
                    <span className="block text-white-dark dark:text-white-light">Showroom Membership</span>
                  </h6>
                  <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                    <p className="font-semibold">90%</p>
                    <div className="dropdown ltr:ml-4 rtl:mr-4">
                      <Dropdown
                        offset={[0, 5]}
                        placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                        btnClassName="hover:text-primary"
                        button={<IconHorizontalDots className="opacity-80 hover:opacity-100" />}
                      >
                        <ul className="!min-w-[150px]">
                          <li>
                            <button type="button">View Invoice</button>
                          </li>
                          <li>
                            <button type="button">Download Invoice</button>
                          </li>
                        </ul>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              </div>
              {/* Additional payment months can be added similarly */}
            </div>
          </div>

          {/* Card Details Section */}
          <div className="panel">
            <div className="flex items-center justify-between mb-5">
              <h5 className="font-semibold text-lg dark:text-white-light">Card Details</h5>
            </div>
            <div>
              <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                <div className="flex items-center justify-between py-2">
                  <div className="flex-none">
                    <img src="/assets/images/card-americanexpress.svg" alt="American Express" />
                  </div>
                  <div className="flex items-center justify-between flex-auto ltr:ml-4 rtl:mr-4">
                    <h6 className="text-[#515365] font-semibold dark:text-white-dark">
                      American Express
                      <span className="block text-white-dark dark:text-white-light">Expires on 12/2025</span>
                    </h6>
                    <span className="badge bg-success ltr:ml-auto rtl:mr-auto">Primary</span>
                  </div>
                </div>
              </div>
              <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                <div className="flex items-center justify-between py-2">
                  <div className="flex-none">
                    <img src="/assets/images/card-mastercard.svg" alt="Mastercard" />
                  </div>
                  <div className="flex items-center justify-between flex-auto ltr:ml-4 rtl:mr-4">
                    <h6 className="text-[#515365] font-semibold dark:text-white-dark">
                      Mastercard
                      <span className="block text-white-dark dark:text-white-light">Expires on 03/2025</span>
                    </h6>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex-none">
                    <img src="/assets/images/card-visa.svg" alt="Visa" />
                  </div>
                  <div className="flex items-center justify-between flex-auto ltr:ml-4 rtl:mr-4">
                    <h6 className="text-[#515365] font-semibold dark:text-white-dark">
                      Visa
                      <span className="block text-white-dark dark:text-white-light">Expires on 10/2025</span>
                    </h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
