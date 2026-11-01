import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { toggleSidebar } from '../../store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '../../store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '../Icon/IconCaretsDown';
import IconCaretDown from '../Icon/IconCaretDown';
import { MENU, pageKey } from '../../config/menu';
import { useAccess } from '../../utils/access';



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

    const role = localStorage.getItem('role') || '';
    const { can } = useAccess(); // staff permissions (Staff permissions screen); built-in role rules when not set

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
                            {MENU.map((e) => {
                                if (e.kind === 'link') {
                                    const show = e.adminOnly ? role === 'admin' : can(pageKey(e.path), e.def(role));
                                    if (!show) return null;
                                    return (
                                        <li className="nav-item" key={`${e.path}-${e.label}`}>
                                            <NavLink to={e.path} end={e.path === '/'} className="group">
                                                <div className="flex items-center">
                                                    {e.icon}
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t(e.label)}</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                    );
                                }
                                const groupDef = e.def(role);
                                const children = e.adminOnly ? (role === 'admin' ? e.children : []) : e.children.filter((c) => can(pageKey(c.path), groupDef && c.def(role)));
                                if (!children.length) return null;
                                return (
                                    <li className="menu nav-item" key={e.id}>
                                        <button type="button" className={`${currentMenu === e.id ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu(e.id)}>
                                            <div className="flex items-center">
                                                {e.icon}
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t(e.label)}</span>
                                            </div>
                                            <div className={currentMenu !== e.id ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === e.id ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                {children.map((c) => (
                                                    <li key={c.path}>
                                                        <NavLink to={c.path}>{t(c.label)}</NavLink>
                                                    </li>
                                                ))}
                                            </ul>
                                        </AnimateHeight>
                                    </li>
                                );
                            })}
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav >
        </div >
    );
};

export default Sidebar;
