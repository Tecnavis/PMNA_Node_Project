import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { toggleSidebar } from '../../store/themeConfigSlice';
import { VscFeedback } from "react-icons/vsc";
import AnimateHeight from 'react-animate-height';
import { IRootState } from '../../store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '../Icon/IconCaretsDown';
import IconCaretDown from '../Icon/IconCaretDown';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMenuCalendar from '../Icon/Menu/IconMenuCalendar';
import IconMenuUsers from '../Icon/Menu/IconMenuUsers';
import IconMenuDocumentation from '../Icon/Menu/IconMenuDocumentation';
import { TbCurrencyDollar, TbReport } from "react-icons/tb";
import IconServer from '../Icon/IconServer';
import { MdShareLocation } from 'react-icons/md';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import IconBook from '../Icon/IconBook';
import { BsCashStack } from 'react-icons/bs';
import IconAt from '../Icon/IconAt';
import IconAward from '../Icon/IconAward';
import { ROLES } from '../../constants/roles'
import { ImUserTie } from "react-icons/im";



const Sidebar = () => {
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    const role = localStorage.getItem('role') || ''

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, []);

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="bg-white dark:bg-black h-full">
                    <div className="flex justify-between items-center px-4 py-3">
                        <NavLink to="/" className="main-logo flex items-center shrink-0">
                            <img style={{ width: '183px', height: '50px', objectFit: 'cover' }} src="../../assets/images/RSALogo.png" alt="logo" />
                        </NavLink>
                        <button
                            type="button"
                            className="collapse-icon w-8 h-8 rounded-full flex items-center hover:bg-gray-500/10 dark:hover:bg-dark-light/10 dark:text-white-light transition duration-300 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="h-[calc(100vh-80px)] relative">
                        <ul className="relative font-semibold space-y-0.5 p-4 py-0">
                            <li className="nav-item">
                                <NavLink to="/" className="group">
                                    <div className="flex items-center">
                                        <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Dashboard')}</span>
                                    </div>
                                </NavLink>
                            </li>
                            <li className="menu nav-item">
                                <button type="button" className={`${currentMenu === 'bookings' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('bookings')}>
                                    <div className="flex items-center">
                                        <IconBook className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Bookings')}</span>
                                    </div>

                                    <div className={currentMenu !== 'bookings' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                        <IconCaretDown />
                                    </div>
                                </button>

                                <AnimateHeight duration={300} height={currentMenu === 'bookings' ? 'auto' : 0}>
                                    <ul className="sub-menu text-gray-500">
                                        <li>
                                            <NavLink to="/bookings">{t('Bookings')}</NavLink>
                                        </li>
                                        <li>
                                            <NavLink to="/add-booking">{t('Add Bookings')}</NavLink>
                                        </li>
                                        {![ROLES.CASHIER, ROLES.CALL_EXECUTIVE].includes(role) && (
                                            <li>
                                                <NavLink to="/completedbookings">{t('Driver Completed Bookings')}</NavLink>
                                            </li>
                                        )}
                                        {[ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (
                                            <li>
                                                <NavLink to="/approvedbookings">{t('Service Details')}</NavLink>
                                            </li>
                                        )}

                                    </ul>
                                </AnimateHeight>
                            </li>
                            {/* User */}
                            {[ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (
                                <li className="menu nav-item">
                                    <button type="button" className={`${currentMenu === 'users' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('users')}>
                                        <div className="flex items-center">
                                            <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('users')}</span>
                                        </div>

                                        <div className={currentMenu !== 'users' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                            <IconCaretDown />
                                        </div>
                                    </button>

                                    <AnimateHeight duration={300} height={currentMenu === 'users' ? 'auto' : 0}>
                                        <ul className="sub-menu text-gray-500">
                                            {![ROLES.SECONDARY_ADMIN].includes(role) && (
                                                <li>
                                                    <NavLink to="/users/staff">Staff Creation</NavLink>
                                                </li>
                                            )}
                                            <li>
                                                <NavLink to="/users/provider">Provider Creation</NavLink>
                                            </li>
                                            <li>
                                                <NavLink to="/users/driver">Driver Creation</NavLink>
                                            </li>
                                            <li>
                                                <NavLink to="/users/company">Company Creation</NavLink>
                                            </li>
                                        </ul>
                                    </AnimateHeight>
                                </li>
                            )}
                            {/* Reward */}
                            {[ROLES.VERIFIER, ROLES.ADMIN].includes(role) && (
                                <li className="menu nav-item">
                                    <button type="button" className={`${currentMenu === 'marketing executive' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('marketing executive')}>
                                        <div className="flex items-center">
                                            <ImUserTie className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Marketing Executives')}</span>
                                        </div>

                                        <div className={currentMenu !== 'rewards' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                            <IconCaretDown />
                                        </div>
                                    </button>

                                    <AnimateHeight duration={300} height={currentMenu === 'marketing executive' ? 'auto' : 0}>
                                        <ul className="sub-menu text-gray-500">
                                            {![ROLES.VERIFIER].includes(role) && (
                                                <li>
                                                    <NavLink to="/marketing-executives">Executives</NavLink>
                                                </li>
                                            )}
                                            <li>
                                                <NavLink className={'w-10'} to="/marketing-executives/showroom">Executive Showroom</NavLink>
                                            </li>
                                        </ul>
                                    </AnimateHeight>
                                </li>
                            )}
                            {/* Service Type */}
                            {[ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (
                                <li className="menu nav-item">
                                    <button type="button" className={`${currentMenu === 'service' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('service')}>
                                        <div className="flex items-center">
                                            <IconServer className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Service Types</span>
                                        </div>

                                        <div className={currentMenu !== 'service' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                            <IconCaretDown />
                                        </div>
                                    </button>
                                    <AnimateHeight duration={300} height={currentMenu === 'service' ? 'auto' : 0}>
                                        <ul className="sub-menu text-gray-500">
                                            <li>
                                                <NavLink to="/service_type">Service Types</NavLink>
                                            </li>
                                        </ul>
                                    </AnimateHeight>
                                </li>
                            )}
                            {/* Vehicle Details */}
                            {[ROLES.VERIFIER, ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (
                                <li className="menu nav-item">
                                    <button type="button" className={`${currentMenu === 'vehicle-details' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('vehicle-details')}>
                                        <div className="flex items-center">
                                            <IconMenuDocumentation className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">Vehicle Details</span>
                                        </div>

                                        <div className={currentMenu !== 'vehicle-details' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                            <IconCaretDown />
                                        </div>
                                    </button>
                                    <AnimateHeight duration={300} height={currentMenu === 'vehicle-details' ? 'auto' : 0}>
                                        <ul className="sub-menu text-gray-500">
                                            <li>
                                                <NavLink to="/vehicle">RSA Vehicle</NavLink>
                                            </li>
                                            <li>
                                                <NavLink to="/taxandinsurance">Tax And Insurance</NavLink>
                                            </li>
                                        </ul>
                                    </AnimateHeight>
                                </li>
                            )}
                            {/* Baselocation */}
                            {[ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (
                                <li className="nav-item">
                                    <NavLink to="/baselocation" className="group">
                                        <div className="flex items-center">
                                            <MdShareLocation className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Baselocation')}</span>
                                        </div>
                                    </NavLink>
                                </li>
                            )}
                            {/* Feedback */}
                            {[ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (
                                <li className="nav-item">
                                    <NavLink to="/feedback" className="group">
                                        <div className="flex items-center">
                                            <VscFeedback className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Feedback')}</span>
                                        </div>
                                    </NavLink>
                                </li>
                            )}
                            {/* // Showroom */}
                            {[ROLES.VERIFIER, ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (
                                < li className="nav-item">
                                    <NavLink to="/showroom" className="group">
                                        <div className="flex items-center">
                                            <PiBuildingApartmentLight className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Showroom')}</span>
                                        </div>
                                    </NavLink>
                                </li>
                            )}
                            {/* Payment Managment */}
                            {![ROLES.VERIFIER, ROLES.CALL_EXECUTIVE].includes(role) && (
                                <li className="menu nav-item">
                                    <button type="button" className={`${currentMenu === 'Payment Management' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('Payment Management')}>
                                        <div className="flex items-center">
                                            <BsCashStack className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Payment Management')}</span>
                                        </div>

                                        <div className={currentMenu !== 'Payment Management' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                            <IconCaretDown />
                                        </div>
                                    </button>

                                    <AnimateHeight duration={300} height={currentMenu === 'Payment Management' ? 'auto' : 0}>
                                        <ul className="sub-menu text-gray-500">
                                            <li>
                                                <NavLink to="/driver-advance-payment-managment">{t('Driver Payment Report')}</NavLink>
                                            </li>
                                            <li>
                                                <NavLink to="/provider-advance-payment-managment">{t('Provider Payment Report')}</NavLink>
                                            </li>
                                            <li>
                                                <NavLink to="/pmnr-report">{t('Payment Work Report')}</NavLink>
                                            </li>
                                        </ul>
                                    </AnimateHeight>
                                </li>
                            )}
                            {/* Report */}
                            {![ROLES.CALL_EXECUTIVE].includes(role) && (
                                <li className="menu nav-item">
                                    <button type="button" className={`${currentMenu === 'reports' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('reports')}>
                                        <div className="flex items-center">
                                            <TbReport className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Reports')}</span>
                                        </div>

                                        <div className={currentMenu !== 'reports' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                            <IconCaretDown />
                                        </div>
                                    </button>

                                    <AnimateHeight duration={300} height={currentMenu === 'reports' ? 'auto' : 0}>
                                        <ul className="sub-menu text-gray-500">
                                            <li>
                                                <NavLink to="/dcpreport">{t('Driver/Company/Provider Report')}</NavLink>
                                            </li>
                                            {![ROLES.VERIFIER, ROLES.CASHIER].includes(role) && (
                                                <li>
                                                    <NavLink to="/showroomreport">{t('ShowRoom Report')}</NavLink>
                                                </li>
                                            )}
                                            <li>
                                                <NavLink to="/staffreport">{t('Staff Report')}</NavLink>
                                            </li>

                                        </ul>
                                    </AnimateHeight>
                                </li>
                            )}
                            {/* Expence */}
                            {![ROLES.CALL_EXECUTIVE].includes(role) && (
                                <li className="menu nav-item">
                                    <button type="button" className={`${currentMenu === 'expences' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('expences')}>
                                        <div className="flex items-center">
                                            <TbCurrencyDollar className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Expences')}</span>
                                        </div>

                                        <div className={currentMenu !== 'expences' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                            <IconCaretDown />
                                        </div>
                                    </button>

                                    <AnimateHeight duration={300} height={currentMenu === 'expences' ? 'auto' : 0}>
                                        <ul className="sub-menu text-gray-500">
                                            <li>
                                                <NavLink to="/otherexpences">{t('Other Expences')}</NavLink>
                                            </li>
                                            <li>
                                                <NavLink to="/dieselexpences">{t('Diesel Expence')}</NavLink>
                                            </li>

                                        </ul>
                                    </AnimateHeight>
                                </li>
                            )}
                            {/* Reward */}
                            {[ROLES.VERIFIER, ROLES.ADMIN, ROLES.SECONDARY_ADMIN].includes(role) && (
                                <li className="menu nav-item">
                                    <button type="button" className={`${currentMenu === 'rewards' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('rewards')}>
                                        <div className="flex items-center">
                                            <IconAward className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Rewards')}</span>
                                        </div>

                                        <div className={currentMenu !== 'rewards' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                            <IconCaretDown />
                                        </div>
                                    </button>

                                    <AnimateHeight duration={300} height={currentMenu === 'rewards' ? 'auto' : 0}>
                                        <ul className="sub-menu text-gray-500">
                                            {![ROLES.VERIFIER].includes(role) && (
                                                <li>
                                                    <NavLink to="/reward-item">{t('Reward Item')}</NavLink>
                                                </li>
                                            )}
                                            <li>
                                                <NavLink to="/reward">{t('Rewards')}</NavLink>
                                            </li>
                                        </ul>
                                    </AnimateHeight>
                                </li>
                            )}
                            {/* Leaves */}
                            {![ROLES.VERIFIER, ROLES.CASHIER, ROLES.CALL_EXECUTIVE].includes(role) && (
                                <li className="nav-item">
                                    <NavLink to="/leaves" className="group">
                                        <div className="flex items-center">
                                            <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('leaves')}</span>
                                        </div>
                                    </NavLink>
                                </li>
                            )}
                            {/* Status */}
                            <li className="nav-item">
                                <NavLink to="/status" className="group">
                                    <div className="flex items-center">
                                        <IconAt className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Status')}</span>
                                    </div>
                                </NavLink>
                            </li>
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav >
        </div >
    );
};

export default Sidebar;
