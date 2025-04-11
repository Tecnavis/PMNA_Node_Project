import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import IconLogout from '../Icon/IconLogout';
import Dropdown from '../Dropdown';
import { axiosInstance, BASE_URL } from "../../config/axiosConfig";
import { IShowroom } from "../../interface/showroom";
import { getShowroomById } from "../../service/showroom";

const Header: React.FC = () => {
  const [tollFreeNumber, setTollFreeNumber] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showroomName, setShowroomName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [img, setImg] = useState<string>("");

  const navigate = useNavigate();
  const showroomId = localStorage.getItem("showroomId");

  const logOut = async () => {
    navigate("/");
  };

  useEffect(() => {
    const fetchTollFreeNumber = async () => {
      try {
        if (showroomId) {
          const data = await getShowroomById(showroomId)
          setTollFreeNumber(data.helpline || "");
          setShowroomName(data.name || "Showroom Name");
          setMobileNumber(data.mobile || "Showroom Name");
          setImg(data.image || "Showroom Name");

        }
      } catch (error) {
        console.error("Error fetching toll-free number:", error);
      }
    };

    fetchTollFreeNumber();
  }, [showroomId]);

  return (
    <header className="shadow-lg text-white font-poppins bg-slate-50">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo Section */}
        <div className="flex flex-col items-start">
          <Link to="/index" className="flex items-center">
            <img
              className="w-36"
              src="/assets/images/auth/rsa-png.png"
              alt="logo"
            />
          </Link>
          <div
            className="toll-free-number text-lg font-extrabold text-red-700 mt-2"
          >
            Help-Line: {tollFreeNumber || "N/A"}
          </div>
        </div>

        {/* Navigation Menu and Profile */}
        <div className="flex items-center space-x-4">  {/* Adjusted space-x to space them closer */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/showrm"
              className="text-red-700 font-semibold text-lg hover:text-red-500 transition duration-200"
            >
              Home
            </Link>
            <Link
              to="/staff"
              className="text-red-700 font-semibold text-lg hover:text-red-500 transition duration-200"
            >
              Staffs
            </Link>
            <Link
              to="/showrm/qr"
              className="text-red-700 font-semibold text-lg hover:text-red-500 transition duration-200"
            >
              QRCode Login
            </Link>
            <Link
              to="/addbook"
              className="text-red-700 font-semibold text-lg hover:text-red-500 transition duration-200"
            >
              Add Booking
            </Link>
            <Link
              to="/cashreport"
              className="text-red-700 font-semibold text-lg hover:text-red-500 transition duration-200"
            >
              Cash Report
            </Link>
          </nav>

          {/* Profile Dropdown */}
          <div className="dropdown shrink-0 flex">
            <Dropdown
              offset={[0, 8]}
              placement="bottom-end"
              btnClassName="relative group block"
              button={
                <img
                  className="w-14 h-14 rounded-full object-cover saturate-50 group-hover:saturate-100 border-2 border-red-500"
                  src={`${BASE_URL}/images/${img}` || "/default-avatar.png"} // Use img URL or fallback to a default image
                  alt="userProfile"
                />
              }
            >
              <ul className="text-dark dark:text-white-dark !py-0 w-[230px] font-semibold dark:text-white-light/90">
                <li>
                  <div className="flex items-center px-4 py-4">
                    <img
                      className="rounded-md w-10 h-10 object-cover border border-red-500"
                      src={`${BASE_URL}/images/${img}` || "/default-avatar.png"} // Use img URL or fallback to a default image
                      alt="userProfile"
                    />
                    <div className="ltr:pl-4 rtl:pr-4 truncate">
                      <h4 className="text-base">{showroomName}</h4>
                      <button type="button" className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white">
                        {mobileNumber}
                      </button>
                    </div>
                  </div>
                </li>
                <li className="border-t border-white-light dark:border-white-light/10">
                  <button
                    type="button"
                    className="text-danger !py-3 flex items-center w-full"
                    onClick={logOut}
                  >
                    <IconLogout className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 rotate-90 shrink-0" />
                    Sign Out
                  </button>
                </li>
              </ul>
            </Dropdown>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-red-700 focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden  shadow-lg rounded-lg border border-gray-200">
          <ul className="flex flex-col space-y-2 px-6 py-4">
            <li>
              <Link
                to="/showrm"
                className="block text-lg font-medium text-gray-800 hover:bg-gray-100 transition-all duration-200 rounded-md px-4 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/staff"
                className="block text-lg font-medium text-gray-800 hover:bg-gray-100 transition-all duration-200 rounded-md px-4 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Staffs
              </Link>
            </li>
            <li>
              <Link
                to="/showrm/qr"
                className="block text-lg font-medium text-gray-800 hover:bg-gray-100 transition-all duration-200 rounded-md px-4 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                QRCode Login
              </Link>
            </li>
            <li>
              <Link
                to="/addbook"
                className="block text-lg font-medium text-gray-800 hover:bg-gray-100 transition-all duration-200 rounded-md px-4 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Add Booking
              </Link>
            </li>
            <li>
              <Link
                to="/cashreport"
                className="block text-lg font-medium text-gray-800 hover:bg-gray-100 transition-all duration-200 rounded-md px-4 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Cash Report
              </Link>
            </li>
          </ul>
        </nav>
      )}

    </header>



  );
};

export default Header;
