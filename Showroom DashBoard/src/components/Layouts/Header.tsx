import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, CalendarPlus, Users, QrCode, Wallet, CheckCircle2, LogOut, Menu, X, Phone } from 'lucide-react';
import { getShowroomById } from '../../service/showroom';
import { getImageUrl } from '../../utils/imageUrl';

const NAV = [
    { to: '/index', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/addbook', label: 'New booking', icon: CalendarPlus },
    { to: '/showrm', label: 'Bookings', icon: ClipboardList },
    { to: '/home', label: 'Completed', icon: CheckCircle2 },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/showrm/qr', label: 'Staff QR', icon: QrCode },
    { to: '/report', label: 'Cash report', icon: Wallet },
];

const Header: React.FC = () => {
    const navigate = useNavigate();
    const showroomId = localStorage.getItem('showroomId');
    const [open, setOpen] = useState(false);
    const [menu, setMenu] = useState(false);
    const [info, setInfo] = useState<{ name: string; helpline: string; mobile: string; image: string }>({ name: '', helpline: '', mobile: '', image: '' });

    useEffect(() => {
        if (!showroomId) return;
        getShowroomById(showroomId)
            .then((d: any) => {
                setInfo({ name: d?.name || '', helpline: d?.helpline || '', mobile: d?.mobile || d?.phone || '', image: d?.image || '' });
                localStorage.setItem('showroomRewardPoints', String(d?.rewardPoints ?? 0));
            })
            .catch(() => undefined);
    }, [showroomId]);

    const logOut = () => {
        ['token', 'showroomId', 'userName', 'password', 'showroomRewardPoints'].forEach((k) => localStorage.removeItem(k));
        navigate('/');
    };

    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold transition ${isActive ? 'bg-red-700 text-white' : 'text-slate-700 hover:bg-red-50 hover:text-red-700 dark:text-white-light dark:hover:bg-[#1b2e4b]'}`;
    const avatar = getImageUrl(info.image);

    return (
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0e1726]/95 backdrop-blur border-b border-slate-100 dark:border-[#1b2e4b] shadow-sm">
            <div className="container mx-auto flex items-center gap-3 px-3 sm:px-6 py-2">
                <Link to="/index" className="flex items-center gap-3 shrink-0">
                    <img className="h-12 w-[150px] sm:w-[176px] object-cover" src="/assets/images/RSALogo.png" alt="RSA Kerala" />
                </Link>
                {info.helpline && (
                    <a href={`tel:${info.helpline}`} className="hidden sm:flex xl:hidden 2xl:flex items-center gap-1 whitespace-nowrap text-xs font-bold text-red-700 border border-red-200 rounded-full px-2 py-1">
                        <Phone className="w-3.5 h-3.5" /> Help-line {info.helpline}
                    </a>
                )}

                <nav className="hidden xl:flex items-center gap-1 ml-auto" aria-label="Main">
                    {NAV.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} end className={linkClass}><Icon className="w-4 h-4" />{label}</NavLink>
                    ))}
                </nav>

                <div className="relative ml-auto xl:ml-2 flex items-center gap-2">
                    <button type="button" onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-[#1b2e4b] pl-1 pr-3 py-1" aria-haspopup="menu" aria-expanded={menu}>
                        {avatar ? (
                            <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                        ) : (
                            <span className="w-8 h-8 rounded-full bg-red-700 text-white grid place-content-center text-sm font-bold">{(info.name || 'S')[0]}</span>
                        )}
                        <span className="hidden sm:block xl:hidden 2xl:block max-w-[160px] truncate text-sm font-semibold text-slate-700 dark:text-white-light">{info.name || 'Showroom'}</span>
                    </button>
                    {menu && (
                        <div role="menu" className="absolute right-0 top-12 w-56 rounded-lg border border-slate-100 dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726] shadow-lg p-2" onMouseLeave={() => setMenu(false)}>
                            <div className="px-2 py-2 border-b border-slate-100 dark:border-[#1b2e4b] mb-1">
                                <div className="font-semibold text-sm truncate">{info.name}</div>
                                {info.mobile && <div className="text-xs text-slate-500">{info.mobile}</div>}
                            </div>
                            <button type="button" role="menuitem" onClick={logOut} className="w-full flex items-center gap-2 rounded px-2 py-2 text-sm text-red-700 hover:bg-red-50">
                                <LogOut className="w-4 h-4" /> Sign out
                            </button>
                        </div>
                    )}
                    <button type="button" className="xl:hidden p-2 rounded-lg text-red-700 hover:bg-red-50" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
                        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>
            {open && (
                <nav className="xl:hidden border-t border-slate-100 dark:border-[#1b2e4b] px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-1" aria-label="Main">
                    {NAV.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} end className={linkClass} onClick={() => setOpen(false)}><Icon className="w-4 h-4" />{label}</NavLink>
                    ))}
                    {info.helpline && <a href={`tel:${info.helpline}`} className="sm:hidden col-span-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-700"><Phone className="w-4 h-4" /> Help-line {info.helpline}</a>}
                </nav>
            )}
        </header>
    );
};

export default Header;
